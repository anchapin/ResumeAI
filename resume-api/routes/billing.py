"""
Billing and Subscription API Routes

NOTE: Billing functionality is currently in 'Coming Soon' status.
Most endpoints will return a 503 Service Unavailable response until
the Stripe integration is complete. Plan listing is available for
display purposes.

For updates on billing availability, please check the project roadmap.

Provides endpoints for:
- Managing subscription plans
- Creating and managing subscriptions
- Payment method management
- Invoice history
- Usage tracking
- Stripe webhook handling
"""

from datetime import datetime
from fastapi import APIRouter, HTTPException, Header, Request, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from sqlalchemy import select
from sqlalchemy.sql import func
from sqlalchemy.ext.asyncio import AsyncSession

from database import (
    Subscription,
    SubscriptionPlan,
    Invoice,
    PaymentMethod,
    BillingEvent,
    get_db,
    async_session_maker,
)
from lib.stripe import stripe_service, BILLING_ENABLED
from config import settings

router = APIRouter(prefix="/api/billing", tags=["billing"])


# ========== Billing Status Response ==========


class BillingStatusResponse(BaseModel):
    """Billing availability status."""

    enabled: bool
    message: str


@router.get("/status", response_model=BillingStatusResponse)
async def get_billing_status():
    """
    Check if billing functionality is available.

    Returns billing availability status and a message.
    """
    if BILLING_ENABLED:
        return BillingStatusResponse(
            enabled=True, message="Billing is fully operational."
        )
    return BillingStatusResponse(
        enabled=False,
        message="Billing is coming soon. Subscription plans will be available shortly. "
        "You can currently use the free tier with basic features.",
    )


# ========== Request/Response Models ==========


class PlanResponse(BaseModel):
    """Subscription plan details."""

    id: int
    name: str
    display_name: str
    description: Optional[str]
    price_cents: int
    currency: str
    interval: str
    features: List[str]
    max_resumes_per_month: int
    max_ai_tailorings_per_month: int
    max_templates: int
    include_priority_support: bool
    include_custom_domains: bool
    is_popular: bool


class SubscriptionResponse(BaseModel):
    """User subscription details."""

    id: int
    user_id: str
    status: str
    plan: Optional[PlanResponse]
    current_period_start: Optional[str]
    current_period_end: Optional[str]
    cancel_at_period_end: bool
    resumes_generated_this_period: int
    ai_tailorings_this_period: int
    created_at: str


class CheckoutSessionRequest(BaseModel):
    """Request to create checkout session."""

    plan_name: str = Field(..., description="Plan name (e.g., 'basic', 'premium')")
    success_url: str = Field(..., description="URL to redirect after success")
    cancel_url: str = Field(..., description="URL to redirect after cancel")
    trial_period_days: int = Field(default=0, description="Trial period in days")


class CheckoutSessionResponse(BaseModel):
    """Checkout session response."""

    session_id: str
    url: str


class PortalSessionRequest(BaseModel):
    """Request to create billing portal session."""

    return_url: str = Field(..., description="URL to redirect after portal session")


class PortalSessionResponse(BaseModel):
    """Billing portal session response."""

    url: str


class PaymentMethodRequest(BaseModel):
    """Request to attach payment method."""

    payment_method_id: str = Field(..., description="Stripe payment method ID")
    set_as_default: bool = Field(
        default=False, description="Set as default payment method"
    )


class PaymentMethodResponse(BaseModel):
    """Payment method details."""

    id: int
    type: str
    brand: Optional[str]
    last4: Optional[str]
    exp_month: Optional[int]
    exp_year: Optional[int]
    billing_name: Optional[str]
    is_default: bool


class InvoiceResponse(BaseModel):
    """Invoice details."""

    id: int
    amount_cents: int
    currency: str
    status: str
    description: Optional[str]
    created_at: str
    paid_at: Optional[str]
    invoice_pdf_url: Optional[str]


class UsageCheckResponse(BaseModel):
    """Usage limit check response."""

    allowed: bool
    limit: Optional[int]
    used: int
    remaining: Optional[int]


class WebhookRequest(BaseModel):
    """Webhook payload (raw)."""

    pass


# ========== Helper Functions ==========


async def get_user_id_from_header(x_user_id: Optional[str] = Header(None)) -> str:
    """
    Extract user ID from request header.

    In production, this should be extracted from JWT token or session.
    For now, we use X-User-ID header for simplicity.
    """
    if not x_user_id:
        raise HTTPException(
            status_code=401, detail="X-User-ID header required. Please authenticate."
        )
    return x_user_id


# ========== Subscription Plans ==========


@router.get("/plans", response_model=List[PlanResponse])
async def list_plans():
    """
    Get all available subscription plans.

    Returns a list of available plans with pricing and features.
    """
    plans = await stripe_service.get_available_plans()
    return plans


@router.get("/plans/{plan_name}", response_model=PlanResponse)
async def get_plan(plan_name: str):
    """
    Get details for a specific subscription plan.

    Args:
        plan_name: Plan identifier (e.g., 'basic', 'premium')
    """
    plan = await stripe_service.get_plan_by_name(plan_name)
    if not plan:
        raise HTTPException(status_code=404, detail=f"Plan '{plan_name}' not found")
    return plan


# ========== Subscription Management ==========


@router.get("/subscription", response_model=SubscriptionResponse)
async def get_subscription(
    user_id: str = Depends(get_user_id_from_header), db: AsyncSession = Depends(get_db)
):
    """
    Get current user subscription details.

    Returns subscription status, plan, and usage information.
    """
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription:
        # Return inactive subscription
        return SubscriptionResponse(
            id=0,
            user_id=user_id,
            status="inactive",
            plan=None,
            current_period_start=None,
            current_period_end=None,
            cancel_at_period_end=False,
            resumes_generated_this_period=0,
            ai_tailorings_this_period=0,
            created_at="",
        )

    plan_response = None
    if subscription.plan:
        plan_response = PlanResponse(
            id=subscription.plan.id,
            name=subscription.plan.name,
            display_name=subscription.plan.display_name,
            description=subscription.plan.description,
            price_cents=subscription.plan.price_cents,
            currency=subscription.plan.currency,
            interval=subscription.plan.interval,
            features=subscription.plan.features or [],
            max_resumes_per_month=subscription.plan.max_resumes_per_month,
            max_ai_tailorings_per_month=subscription.plan.max_ai_tailorings_per_month,
            max_templates=subscription.plan.max_templates,
            include_priority_support=subscription.plan.include_priority_support,
            include_custom_domains=subscription.plan.include_custom_domains,
            is_popular=subscription.plan.is_popular,
        )

    return SubscriptionResponse(
        id=subscription.id,
        user_id=subscription.user_id,
        status=subscription.status,
        plan=plan_response,
        current_period_start=(
            subscription.current_period_start.isoformat()
            if subscription.current_period_start
            else None
        ),
        current_period_end=(
            subscription.current_period_end.isoformat()
            if subscription.current_period_end
            else None
        ),
        cancel_at_period_end=subscription.cancel_at_period_end,
        resumes_generated_this_period=subscription.resumes_generated_this_period,
        ai_tailorings_this_period=subscription.ai_tailorings_this_period,
        created_at=(
            subscription.created_at.isoformat() if subscription.created_at else ""
        ),
    )


@router.post("/checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CheckoutSessionRequest,
    user_id: str = Depends(get_user_id_from_header),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Stripe checkout session for subscription purchase.

    Args:
        plan_name: Name of the plan to subscribe to
        success_url: URL to redirect after successful payment
        cancel_url: URL to redirect after canceled payment
        trial_period_days: Optional trial period in days
        
    Note: This endpoint is currently disabled as billing is in 'coming soon' status.
    """
    # Check if billing is enabled
    if not BILLING_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Billing is coming soon. Subscription purchases will be available shortly. "
            "You can currently use the free tier with basic features.",
        )
    
    # Get plan details
    plan = await stripe_service.get_plan_by_name(request.plan_name)
    if not plan:
        raise HTTPException(
            status_code=404, detail=f"Plan '{request.plan_name}' not found"
        )

    if not plan.get("stripe_price_id"):
        raise HTTPException(
            status_code=500,
            detail="Plan not configured with Stripe. Please contact support.",
        )

    # Get or create Stripe customer
    customer = await stripe_service.create_or_get_customer(user_id=user_id)

    # Update subscription record with Stripe customer ID
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    subscription = result.scalar_one_or_none()

    if subscription:
        subscription.stripe_customer_id = customer.stripe_customer_id
    else:
        subscription = Subscription(
            user_id=user_id,
            stripe_customer_id=customer.stripe_customer_id,
            status="inactive",
        )
        db.add(subscription)

    await db.commit()

    # Create checkout session
    checkout = await stripe_service.create_checkout_session(
        stripe_customer_id=customer.stripe_customer_id,
        price_id=plan["stripe_price_id"],
        success_url=request.success_url,
        cancel_url=request.cancel_url,
        trial_period_days=request.trial_period_days,
    )

    return CheckoutSessionResponse(session_id=checkout.session_id, url=checkout.url)


@router.post("/portal", response_model=PortalSessionResponse)
async def create_portal_session(
    request: PortalSessionRequest,
    user_id: str = Depends(get_user_id_from_header),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a Stripe billing portal session for self-service management.

    Users can manage their subscription, update payment methods,
    and view invoice history through the portal.
    """
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription or not subscription.stripe_customer_id:
        raise HTTPException(
            status_code=404,
            detail="No active subscription found. Please subscribe first.",
        )

    portal = await stripe_service.create_portal_session(
        stripe_customer_id=subscription.stripe_customer_id,
        return_url=request.return_url,
    )

    return PortalSessionResponse(url=portal["url"])


@router.post("/cancel")
async def cancel_subscription(
    at_period_end: bool = True,
    user_id: str = Depends(get_user_id_from_header),
    db: AsyncSession = Depends(get_db),
):
    """
    Cancel current subscription.

    Args:
        at_period_end: If True, subscription remains active until period ends
    """
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription or not subscription.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="No active subscription found.")

    # Cancel in Stripe
    stripe_sub = await stripe_service.cancel_subscription(
        stripe_subscription_id=subscription.stripe_subscription_id,
        at_period_end=at_period_end,
    )

    if not stripe_sub:
        raise HTTPException(status_code=500, detail="Failed to cancel subscription")

    # Update local record
    subscription.cancel_at_period_end = at_period_end
    if not at_period_end:
        subscription.status = "canceled"
        subscription.canceled_at = func.now()

    await db.commit()

    return {"success": True, "status": stripe_sub["status"]}


@router.post("/resume")
async def resume_subscription(
    user_id: str = Depends(get_user_id_from_header), db: AsyncSession = Depends(get_db)
):
    """
    Resume a canceled subscription (before period ends).
    """
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription or not subscription.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="No subscription found to resume.")

    if not subscription.cancel_at_period_end:
        raise HTTPException(
            status_code=400, detail="Subscription is not canceled. Nothing to resume."
        )

    # Resume in Stripe
    stripe_sub = await stripe_service.resume_subscription(
        stripe_subscription_id=subscription.stripe_subscription_id
    )

    if not stripe_sub:
        raise HTTPException(status_code=500, detail="Failed to resume subscription")

    # Update local record
    subscription.cancel_at_period_end = False

    await db.commit()

    return {"success": True, "status": stripe_sub["status"]}


@router.post("/upgrade")
async def upgrade_subscription(
    new_plan_name: str,
    user_id: str = Depends(get_user_id_from_header),
    db: AsyncSession = Depends(get_db),
):
    """
    Upgrade or downgrade to a different subscription plan.

    Args:
        new_plan_name: Name of the new plan
    """
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription or not subscription.stripe_subscription_id:
        raise HTTPException(status_code=404, detail="No active subscription found.")

    # Get new plan
    new_plan = await stripe_service.get_plan_by_name(new_plan_name)
    if not new_plan:
        raise HTTPException(status_code=404, detail=f"Plan '{new_plan_name}' not found")

    if not new_plan.get("stripe_price_id"):
        raise HTTPException(status_code=500, detail="Plan not configured with Stripe.")

    # Update in Stripe
    stripe_sub = await stripe_service.update_subscription_plan(
        stripe_subscription_id=subscription.stripe_subscription_id,
        new_price_id=new_plan["stripe_price_id"],
    )

    if not stripe_sub:
        raise HTTPException(status_code=500, detail="Failed to update subscription")

    # Update local record
    result = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.name == new_plan_name)
    )
    plan = result.scalar_one_or_none()
    if plan:
        subscription.plan_id = plan.id

    await db.commit()

    return {"success": True, "status": stripe_sub["status"]}


# ========== Payment Methods ==========


@router.get("/payment-methods", response_model=List[PaymentMethodResponse])
async def list_payment_methods(
    user_id: str = Depends(get_user_id_from_header), db: AsyncSession = Depends(get_db)
):
    """
    Get all saved payment methods for the user.
    """
    result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.user_id == user_id, PaymentMethod.is_active
        )
    )
    payment_methods = result.scalars().all()

    return [
        PaymentMethodResponse(
            id=pm.id,
            type=pm.type,
            brand=pm.brand,
            last4=pm.last4,
            exp_month=pm.exp_month,
            exp_year=pm.exp_year,
            billing_name=pm.billing_name,
            is_default=pm.is_default,
        )
        for pm in payment_methods
    ]


@router.post("/payment-methods", response_model=PaymentMethodResponse)
async def add_payment_method(
    request: PaymentMethodRequest,
    user_id: str = Depends(get_user_id_from_header),
    db: AsyncSession = Depends(get_db),
):
    """
    Add a new payment method.

    Args:
        payment_method_id: Stripe payment method ID (from frontend Elements)
        set_as_default: Whether to set as default payment method
    """
    result = await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )
    subscription = result.scalar_one_or_none()

    if not subscription or not subscription.stripe_customer_id:
        raise HTTPException(
            status_code=404, detail="No subscription found. Please subscribe first."
        )

    # Attach to Stripe customer
    pm_data = await stripe_service.attach_payment_method(
        payment_method_id=request.payment_method_id,
        stripe_customer_id=subscription.stripe_customer_id,
    )

    # Set as default if requested
    if request.set_as_default:
        await stripe_service.set_default_payment_method(
            stripe_customer_id=subscription.stripe_customer_id,
            payment_method_id=request.payment_method_id,
        )

    # Save to database
    card = pm_data.get("card", {})
    billing_details = pm_data.get("billing_details", {})
    address = billing_details.get("address", {})

    payment_method = PaymentMethod(
        user_id=user_id,
        stripe_payment_method_id=request.payment_method_id,
        type=pm_data.get("type", "card"),
        brand=card.get("brand"),
        last4=card.get("last4"),
        exp_month=card.get("exp_month"),
        exp_year=card.get("exp_year"),
        billing_name=billing_details.get("name"),
        billing_email=billing_details.get("email"),
        billing_address_line1=address.get("line1"),
        billing_address_line2=address.get("line2"),
        billing_city=address.get("city"),
        billing_state=address.get("state"),
        billing_postal_code=address.get("postal_code"),
        billing_country=address.get("country"),
        is_default=request.set_as_default,
    )

    db.add(payment_method)
    await db.commit()
    await db.refresh(payment_method)

    return PaymentMethodResponse(
        id=payment_method.id,
        type=payment_method.type,
        brand=payment_method.brand,
        last4=payment_method.last4,
        exp_month=payment_method.exp_month,
        exp_year=payment_method.exp_year,
        billing_name=payment_method.billing_name,
        is_default=payment_method.is_default,
    )


@router.delete("/payment-methods/{payment_method_id}")
async def remove_payment_method(
    payment_method_id: int,
    user_id: str = Depends(get_user_id_from_header),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove a payment method.
    """
    result = await db.execute(
        select(PaymentMethod).where(
            PaymentMethod.id == payment_method_id, PaymentMethod.user_id == user_id
        )
    )
    payment_method = result.scalar_one_or_none()

    if not payment_method:
        raise HTTPException(status_code=404, detail="Payment method not found")

    # Detach from Stripe
    if payment_method.stripe_payment_method_id:
        await stripe_service.detach_payment_method(
            payment_method.stripe_payment_method_id
        )

    # Remove from database
    payment_method.is_active = False
    await db.commit()

    return {"success": True}


# ========== Invoices ==========


@router.get("/invoices", response_model=List[InvoiceResponse])
async def list_invoices(
    user_id: str = Depends(get_user_id_from_header), db: AsyncSession = Depends(get_db)
):
    """
    Get invoice history for the user.
    """
    result = await db.execute(select(Invoice).where(Invoice.user_id == user_id))
    invoices = result.scalars().all()

    return [
        InvoiceResponse(
            id=inv.id,
            amount_cents=inv.amount_cents,
            currency=inv.currency,
            status=inv.status,
            description=inv.description,
            created_at=inv.created_at.isoformat() if inv.created_at else "",
            paid_at=inv.paid_at.isoformat() if inv.paid_at else None,
            invoice_pdf_url=inv.invoice_pdf_url,
        )
        for inv in invoices
    ]


@router.get("/invoices/{invoice_id}")
async def get_invoice(
    invoice_id: int,
    user_id: str = Depends(get_user_id_from_header),
    db: AsyncSession = Depends(get_db),
):
    """
    Get details for a specific invoice.
    """
    result = await db.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.user_id == user_id)
    )
    invoice = result.scalar_one_or_none()

    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    return {
        "id": invoice.id,
        "amount_cents": invoice.amount_cents,
        "currency": invoice.currency,
        "status": invoice.status,
        "description": invoice.description,
        "created_at": invoice.created_at.isoformat() if invoice.created_at else "",
        "paid_at": invoice.paid_at.isoformat() if invoice.paid_at else None,
        "invoice_pdf_url": invoice.invoice_pdf_url,
    }


# ========== Usage Tracking ==========


@router.get("/usage", response_model=Dict[str, UsageCheckResponse])
async def get_usage(
    user_id: str = Depends(get_user_id_from_header), db: AsyncSession = Depends(get_db)
):
    """
    Get current usage statistics for the billing period.
    """
    resume_check = await stripe_service.check_usage_limits(user_id, "resume_generated")
    tailoring_check = await stripe_service.check_usage_limits(user_id, "ai_tailored")

    return {
        "resume_generated": UsageCheckResponse(**resume_check),
        "ai_tailored": UsageCheckResponse(**tailoring_check),
    }


@router.post("/usage/check")
async def check_usage_limit(
    action: str, user_id: str = Depends(get_user_id_from_header)
):
    """
    Check if user can perform a specific action based on usage limits.

    Args:
        action: Action type ('resume_generated' or 'ai_tailored')
    """
    result = await stripe_service.check_usage_limits(user_id, action)

    if not result["allowed"]:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Usage limit exceeded for {action}. "
                f"Limit: {result['limit']}, Used: {result['used']}"
            ),
        )

    return result


# ========== Webhooks ==========


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """
    Handle Stripe webhook events.

    Stripe sends events to this endpoint when:
    - Checkout session completed
    - Subscription created/updated/canceled
    - Invoice paid/failed
    - Payment method updated
    """
    payload = await request.body()

    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=500, detail="Webhook secret not configured")

    try:
        event = stripe_service.verify_webhook_signature(
            payload=payload,
            signature=stripe_signature,
            webhook_secret=settings.stripe_webhook_secret,
        )
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid webhook signature: {str(e)}"
        )

    # Handle different event types
    event_type = event["type"]
    data = event["data"]["object"]

    async with async_session_maker() as session:
        if event_type == "checkout.session.completed":
            await handle_checkout_completed(session, data)

        elif event_type == "customer.subscription.created":
            await handle_subscription_created(session, data)

        elif event_type == "customer.subscription.updated":
            await handle_subscription_updated(session, data)

        elif event_type == "customer.subscription.deleted":
            await handle_subscription_deleted(session, data)

        elif event_type == "invoice.paid":
            await handle_invoice_paid(session, data)

        elif event_type == "invoice.payment_failed":
            await handle_invoice_failed(session, data)

        elif event_type == "customer.subscription.trial_will_end":
            await handle_trial_will_end(session, data)

    return {"status": "success"}


# ========== Webhook Event Handlers ==========


async def handle_checkout_completed(session: AsyncSession, data: Dict[str, Any]):
    """Handle checkout.session.completed event."""
    subscription_id = data.get("subscription")
    customer_id = data.get("customer")

    if not customer_id:
        return

    # Find user by Stripe customer ID
    result = await session.execute(
        select(Subscription).where(Subscription.stripe_customer_id == customer_id)
    )
    subscription = result.scalar_one_or_none()

    if subscription:
        if subscription_id:
            subscription.stripe_subscription_id = subscription_id
        subscription.status = "active"

        # Log event
        event = BillingEvent(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            event_type="checkout.session.completed",
            event_data=data,
        )
        session.add(event)
        await session.commit()


async def handle_subscription_created(session: AsyncSession, data: Dict[str, Any]):
    """Handle customer.subscription.created event."""
    customer_id = data.get("customer")

    result = await session.execute(
        select(Subscription).where(Subscription.stripe_customer_id == customer_id)
    )
    subscription = result.scalar_one_or_none()

    if subscription:
        subscription.stripe_subscription_id = data.get("id")
        subscription.status = data.get("status", "active")
        subscription.current_period_start = (
            datetime.fromtimestamp(data.get("current_period_start", 0))
            if data.get("current_period_start")
            else None
        )
        subscription.current_period_end = (
            datetime.fromtimestamp(data.get("current_period_end", 0))
            if data.get("current_period_end")
            else None
        )

        event = BillingEvent(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            event_type="customer.subscription.created",
            event_data=data,
        )
        session.add(event)
        await session.commit()


async def handle_subscription_updated(session: AsyncSession, data: Dict[str, Any]):
    """Handle customer.subscription.updated event."""
    stripe_sub_id = data.get("id")

    result = await session.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    )
    subscription = result.scalar_one_or_none()

    if subscription:
        subscription.status = data.get("status", subscription.status)
        subscription.cancel_at_period_end = data.get("cancel_at_period_end", False)

        if data.get("current_period_start"):
            subscription.current_period_start = datetime.fromtimestamp(
                data["current_period_start"]
            )
        if data.get("current_period_end"):
            subscription.current_period_end = datetime.fromtimestamp(
                data["current_period_end"]
            )

        event = BillingEvent(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            event_type="customer.subscription.updated",
            event_data=data,
        )
        session.add(event)
        await session.commit()


async def handle_subscription_deleted(session: AsyncSession, data: Dict[str, Any]):
    """Handle customer.subscription.deleted event."""
    stripe_sub_id = data.get("id")

    result = await session.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    )
    subscription = result.scalar_one_or_none()

    if subscription:
        subscription.status = "canceled"
        subscription.canceled_at = func.now()

        event = BillingEvent(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            event_type="customer.subscription.deleted",
            event_data=data,
        )
        session.add(event)
        await session.commit()


async def handle_invoice_paid(session: AsyncSession, data: Dict[str, Any]):
    """Handle invoice.paid event."""
    customer_id = data.get("customer")

    result = await session.execute(
        select(Subscription).where(Subscription.stripe_customer_id == customer_id)
    )
    subscription = result.scalar_one_or_none()

    if subscription:
        invoice = Invoice(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            stripe_invoice_id=data.get("id"),
            stripe_payment_intent_id=data.get("payment_intent"),
            amount_cents=data.get("amount_paid", 0),
            currency=data.get("currency", "USD"),
            status="paid",
            description=data.get("description"),
            period_start=(
                datetime.fromtimestamp(data.get("period_start", 0))
                if data.get("period_start")
                else None
            ),
            period_end=(
                datetime.fromtimestamp(data.get("period_end", 0))
                if data.get("period_end")
                else None
            ),
            invoice_pdf_url=data.get("hosted_invoice_url"),
            paid_at=func.now(),
        )
        session.add(invoice)

        event = BillingEvent(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            event_type="invoice.paid",
            event_data=data,
        )
        session.add(event)
        await session.commit()


async def handle_invoice_failed(session: AsyncSession, data: Dict[str, Any]):
    """Handle invoice.payment_failed event."""
    customer_id = data.get("customer")

    result = await session.execute(
        select(Subscription).where(Subscription.stripe_customer_id == customer_id)
    )
    subscription = result.scalar_one_or_none()

    if subscription:
        subscription.status = "past_due"

        invoice = Invoice(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            stripe_invoice_id=data.get("id"),
            amount_cents=data.get("amount_due", 0),
            currency=data.get("currency", "USD"),
            status="failed",
            period_start=(
                datetime.fromtimestamp(data.get("period_start", 0))
                if data.get("period_start")
                else None
            ),
            period_end=(
                datetime.fromtimestamp(data.get("period_end", 0))
                if data.get("period_end")
                else None
            ),
        )
        session.add(invoice)

        event = BillingEvent(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            event_type="invoice.payment_failed",
            event_data=data,
        )
        session.add(event)
        await session.commit()


async def handle_trial_will_end(session: AsyncSession, data: Dict[str, Any]):
    """Handle customer.subscription.trial_will_end event."""
    stripe_sub_id = data.get("id")

    result = await session.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    )
    subscription = result.scalar_one_or_none()

    if subscription:
        event = BillingEvent(
            user_id=subscription.user_id,
            subscription_id=subscription.id,
            event_type="customer.subscription.trial_will_end",
            event_data=data,
        )
        session.add(event)
        await session.commit()
