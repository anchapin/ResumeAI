"""
Stripe Service Module

NOTE: Billing functionality is currently in 'Coming Soon' status.
The Stripe integration is not yet fully implemented. This module provides
placeholder responses for billing endpoints.

For updates on billing availability, please check the project roadmap.

Provides integration with Stripe API for:
- Subscription plan management
- Customer management
- Payment processing
- Webhook handling
- Usage tracking
"""

import stripe
import datetime
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from config import settings
from database import async_session_maker, UserUsage, SubscriptionPlan, Subscription
from monitoring import logging_config

# Configure logging
logger = logging_config.get_logger(__name__)

# Billing availability flag
BILLING_ENABLED = True  # Set to True when Stripe integration is complete

# Initialize Stripe (only if billing is enabled and key is available)
if settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key

class StripeService:
    """Service for interacting with Stripe API."""

    async def get_available_plans(self) -> List[Dict[str, Any]]:
        """Get all available subscription plans."""
        async with async_session_maker() as session:
            stmt = select(SubscriptionPlan).where(SubscriptionPlan.is_active == True)
            result = await session.execute(stmt)
            plans = result.scalars().all()
            
            if not plans:
                # Return default free plan if none in DB
                return [
                    {
                        "id": 1,
                        "name": "free",
                        "display_name": "Free",
                        "description": "Basic resume generation",
                        "price_cents": 0,
                        "currency": "usd",
                        "interval": "month",
                        "features": ["3 resumes/month", "Basic templates"],
                        "max_resumes_per_month": 3,
                        "max_ai_tailorings_per_month": 0,
                        "max_templates": 3,
                        "include_priority_support": False,
                        "include_custom_domains": False,
                        "is_popular": False,
                        "stripe_price_id": None,
                    }
                ]
            
            return [
                {
                    "id": p.id,
                    "name": p.name,
                    "display_name": p.display_name,
                    "description": p.description,
                    "price_cents": p.price_cents,
                    "currency": p.currency,
                    "interval": p.interval,
                    "features": p.features,
                    "max_resumes_per_month": p.max_resumes_per_month,
                    "max_ai_tailorings_per_month": p.max_ai_tailorings_per_month,
                    "max_templates": p.max_templates,
                    "include_priority_support": p.include_priority_support,
                    "include_custom_domains": p.include_custom_domains,
                    "is_popular": p.is_popular,
                    "stripe_price_id": p.stripe_price_id,
                }
                for p in plans
            ]

    async def get_plan_by_name(self, plan_name: str) -> Optional[Dict[str, Any]]:
        """Get a specific plan by name."""
        plans = await self.get_available_plans()
        for plan in plans:
            if plan["name"] == plan_name:
                return plan
        return None

    async def create_or_get_customer(
        self, user_id: str, email: Optional[str] = None
    ) -> Dict[str, str]:
        """Create or get a Stripe customer."""
        async with async_session_maker() as session:
            stmt = select(Subscription).where(Subscription.user_id == str(user_id))
            result = await session.execute(stmt)
            subscription = result.scalar_one_or_none()
            
            if subscription and subscription.stripe_customer_id:
                return {"stripe_customer_id": subscription.stripe_customer_id}
            
            # Create new customer in Stripe
            customer = stripe.Customer.create(
                email=email,
                metadata={"user_id": user_id}
            )
            
            if not subscription:
                subscription = Subscription(user_id=str(user_id), stripe_customer_id=customer.id)
                session.add(subscription)
            else:
                subscription.stripe_customer_id = customer.id
            
            await session.commit()
            return {"stripe_customer_id": customer.id}

    async def create_checkout_session(
        self,
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        trial_period_days: int = 0,
    ) -> Dict[str, str]:
        """Create a Stripe checkout session."""
        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[
                {
                    "price": price_id,
                    "quantity": 1,
                },
            ],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            subscription_data={
                "trial_period_days": trial_period_days,
            } if trial_period_days > 0 else None,
        )
        return {
            "id": session.id,
            "url": session.url,
        }

    async def create_portal_session(self, customer_id: str, return_url: str) -> Dict[str, str]:
        """Create a Stripe billing portal session."""
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url,
        )
        return {"url": session.url}

    async def cancel_subscription(self, stripe_subscription_id: str) -> Dict[str, Any]:
        """Cancel a Stripe subscription at the end of the period."""
        subscription = stripe.Subscription.modify(
            stripe_subscription_id,
            cancel_at_period_end=True,
        )
        return {
            "status": subscription.status,
            "cancel_at_period_end": subscription.cancel_at_period_end,
            "current_period_end": subscription.current_period_end,
        }

    async def resume_subscription(self, stripe_subscription_id: str) -> Dict[str, Any]:
        """Resume a subscription that was set to cancel."""
        subscription = stripe.Subscription.modify(
            stripe_subscription_id,
            cancel_at_period_end=False,
        )
        return {
            "status": subscription.status,
            "cancel_at_period_end": subscription.cancel_at_period_end,
        }

    async def update_subscription_plan(
        self, stripe_subscription_id: str, new_price_id: str
    ) -> Dict[str, Any]:
        """Update subscription to a different plan."""
        subscription = stripe.Subscription.retrieve(stripe_subscription_id)
        item_id = subscription["items"]["data"][0].id
        
        updated_subscription = stripe.Subscription.modify(
            stripe_subscription_id,
            items=[
                {
                    "id": item_id,
                    "price": new_price_id,
                },
            ],
            proration_behavior="always_invoice",
        )
        return {
            "status": updated_subscription.status,
            "plan": new_price_id,
        }

    async def attach_payment_method(
        self, payment_method_id: str, customer_id: str
    ) -> Dict[str, Any]:
        """Attach a payment method to a customer."""
        pm = stripe.PaymentMethod.attach(
            payment_method_id,
            customer=customer_id,
        )
        return {
            "id": pm.id,
            "customer": pm.customer,
            "type": pm.type,
            "card": pm.card if hasattr(pm, "card") else None,
        }

    async def set_default_payment_method(
        self, customer_id: str, payment_method_id: str
    ) -> Dict[str, Any]:
        """Set default payment method for a customer."""
        stripe.Customer.modify(
            customer_id,
            invoice_settings={"default_payment_method": payment_method_id},
        )
        return {"id": payment_method_id, "is_default": True}

    async def detach_payment_method(self, payment_method_id: str) -> Dict[str, Any]:
        """Detach a payment method from a customer."""
        pm = stripe.PaymentMethod.detach(payment_method_id)
        return {"id": pm.id, "detached": True}

    async def check_usage_limits(
        self, user_id: str, action: str, db: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """Check if user has exceeded usage limits."""
        # If billing is not enabled, return allowed
        if not BILLING_ENABLED:
            return {"allowed": True, "remaining": -1, "limit": -1, "used": 0}

        now = datetime.datetime.now(datetime.timezone.utc)
        month, year = now.month, now.year

        if db:
            return await self._check_limits_with_session(db, user_id, action, month, year)

        async with async_session_maker() as session:
            return await self._check_limits_with_session(session, user_id, action, month, year)

    async def _check_limits_with_session(
        self, session: AsyncSession, user_id: str, action: str, month: int, year: int
    ) -> Dict[str, Any]:
        """Internal helper for limit checking."""
        # Normalize action names
        action = "resume_generation" if action in ["resume_generation", "resume_generated"] else action
        action = "ai_tailoring" if action in ["ai_tailoring", "ai_tailored"] else action

        # Get current usage
        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return {"allowed": True, "remaining": -1, "limit": -1, "used": 0}

        stmt = select(UserUsage).where(
            and_(
                UserUsage.user_id == user_id_int,
                UserUsage.month == month,
                UserUsage.year == year,
            )
        )
        result = await session.execute(stmt)
        usage = result.scalar_one_or_none()

        if not usage:
            usage = UserUsage(user_id=user_id_int, month=month, year=year)
            usage.resumes_generated = 0
            usage.ai_tailorings_used = 0
            session.add(usage)
            await session.commit()
            await session.refresh(usage)

        # Get user's current subscription and plan
        sub_stmt = select(Subscription).options(selectinload(Subscription.plan)).where(
            and_(
                Subscription.user_id == str(user_id),
                Subscription.status == "active"
            )
        )
        sub_result = await session.execute(sub_stmt)
        subscription = sub_result.scalar_one_or_none()
        
        # Default limits (Free plan)
        limit = 3
        if action == "ai_tailoring":
            limit = 0
            
        if subscription and subscription.plan:
            plan = subscription.plan
            if action == "resume_generation":
                limit = plan.max_resumes_per_month
            elif action == "ai_tailoring":
                limit = plan.max_ai_tailorings_per_month

        used = 0
        if action == "resume_generation":
            used = usage.resumes_generated
        elif action == "ai_tailoring":
            used = usage.ai_tailorings_used

        # Handle unlimited (-1)
        if limit == -1:
            allowed = True
            remaining = -1
        else:
            allowed = used < limit
            remaining = max(0, limit - used)

        return {
            "allowed": allowed,
            "remaining": remaining,
            "limit": limit,
            "used": used,
        }

    async def record_usage(
        self, user_id: str, action: str, db: Optional[AsyncSession] = None
    ) -> None:
        """Record usage of a billable action."""
        if not BILLING_ENABLED:
            return

        now = datetime.datetime.now(datetime.timezone.utc)
        month, year = now.month, now.year

        if db:
            await self._record_usage_with_session(db, user_id, action, month, year)
            return

        async with async_session_maker() as session:
            await self._record_usage_with_session(session, user_id, action, month, year)

    async def _record_usage_with_session(
        self, session: AsyncSession, user_id: str, action: str, month: int, year: int
    ) -> None:
        """Internal helper for recording usage."""
        # Normalize action names
        action = "resume_generation" if action in ["resume_generation", "resume_generated"] else action
        action = "ai_tailoring" if action in ["ai_tailoring", "ai_tailored"] else action

        try:
            user_id_int = int(user_id)
        except (ValueError, TypeError):
            return

        stmt = select(UserUsage).where(
            and_(
                UserUsage.user_id == user_id_int,
                UserUsage.month == month,
                UserUsage.year == year,
            )
        )
        result = await session.execute(stmt)
        usage = result.scalar_one_or_none()

        if not usage:
            usage = UserUsage(user_id=user_id_int, month=month, year=year)
            usage.resumes_generated = 0
            usage.ai_tailorings_used = 0
            session.add(usage)

        if action == "resume_generation":
            usage.resumes_generated = (usage.resumes_generated or 0) + 1
        elif action == "ai_tailoring":
            usage.ai_tailorings_used = (usage.ai_tailorings_used or 0) + 1

        await session.commit()


    def verify_webhook_signature(
        self, payload: bytes, signature: str, webhook_secret: str
    ) -> stripe.Event:
        """Verify Stripe webhook signature."""
        return stripe.Webhook.construct_event(payload, signature, webhook_secret)


# Singleton instance
stripe_service = StripeService()
