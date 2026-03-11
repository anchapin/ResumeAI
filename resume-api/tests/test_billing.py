"""
Tests for Billing and Subscription API.

Tests cover:
- Subscription plans listing
- Subscription management
- Payment methods
- Invoices
- Usage tracking
"""

import pytest
import pytest_asyncio
from unittest.mock import patch, MagicMock, AsyncMock
import stripe

from database import (
    Subscription,
    SubscriptionPlan,
    Invoice,
    PaymentMethod,
    async_session_maker,
    Base,
    engine,
)
from main import app
from config import settings


@pytest_asyncio.fixture(scope="function", autouse=True)
async def setup_database():
    """Create database tables before each test."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture(autouse=True)
def disable_security_middleware(monkeypatch):
    """Disable CSRF and Request Signing middleware for tests."""
    monkeypatch.setattr("config.settings.enable_csrf", False)
    monkeypatch.setattr("config.settings.enable_request_signing", False)


@pytest_asyncio.fixture
async def test_user_id():
    """Test user ID fixture (numeric string as required by UserUsage model)."""
    return "1"


@pytest_asyncio.fixture
async def setup_subscription_plans():
    """Create test subscription plans."""
    async with async_session_maker() as session:
        # Create free plan
        free_plan = SubscriptionPlan(
            name="free",
            display_name="Free Plan",
            description="Basic resume generation",
            price_cents=0,
            currency="USD",
            interval="month",
            stripe_price_id=None,
            stripe_product_id=None,
            features=["3 resumes per month", "Basic templates"],
            max_resumes_per_month=3,
            max_ai_tailorings_per_month=0,
            max_templates=3,
            include_priority_support=False,
            include_custom_domains=False,
            is_active=True,
            is_popular=False,
        )

        # Create basic plan
        basic_plan = SubscriptionPlan(
            name="basic",
            display_name="Basic Plan",
            description="Perfect for individuals getting started",
            price_cents=999,  # $9.99
            currency="USD",
            interval="month",
            stripe_price_id="price_test_basic_123",
            stripe_product_id="prod_test_basic",
            features=["5 resumes per month", "3 AI tailorings", "3 templates"],
            max_resumes_per_month=5,
            max_ai_tailorings_per_month=3,
            max_templates=3,
            include_priority_support=False,
            include_custom_domains=False,
            is_active=True,
            is_popular=False,
        )

        # Create premium plan
        premium_plan = SubscriptionPlan(
            name="premium",
            display_name="Premium Plan",
            description="For professionals who need more",
            price_cents=1999,  # $19.99
            currency="USD",
            interval="month",
            stripe_price_id="price_test_premium_456",
            stripe_product_id="prod_test_premium",
            features=[
                "Unlimited resumes",
                "Unlimited AI tailorings",
                "All templates",
                "Priority support",
                "Custom domains",
            ],
            max_resumes_per_month=-1,  # -1 means unlimited
            max_ai_tailorings_per_month=-1,
            max_templates=-1,
            include_priority_support=True,
            include_custom_domains=True,
            is_active=True,
            is_popular=True,
        )

        session.add(free_plan)
        session.add(basic_plan)
        session.add(premium_plan)
        await session.commit()

        yield {"free": free_plan, "basic": basic_plan, "premium": premium_plan}


@pytest.mark.asyncio
async def test_list_plans(setup_subscription_plans):
    """Test listing available subscription plans."""
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(f"{settings.api_v1_prefix}/billing/plans")

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) == 3

        plan_names = [p["name"] for p in data]
        assert "free" in plan_names
        assert "basic" in plan_names
        assert "premium" in plan_names


@pytest.mark.asyncio
async def test_get_plan_by_name(setup_subscription_plans):
    """Test getting a specific plan by name."""
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(f"{settings.api_v1_prefix}/billing/plans/premium")

        assert response.status_code == 200
        data = response.json()

        assert data["name"] == "premium"
        assert data["display_name"] == "Premium Plan"
        assert data["price_cents"] == 1999
        assert data["is_popular"] is True


@pytest.mark.asyncio
async def test_get_plan_not_found():
    """Test getting a non-existent plan."""
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(f"{settings.api_v1_prefix}/billing/plans/nonexistent")

        assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_subscription_inactive(test_user_id):
    """Test getting subscription for user without subscription."""
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"{settings.api_v1_prefix}/billing/subscription", headers={"X-User-ID": test_user_id}
        )

        assert response.status_code == 200
        data = response.json()

        assert data["status"] == "inactive"
        assert data["user_id"] == test_user_id


@pytest.mark.asyncio
async def test_get_usage(test_user_id):
    """Test getting usage statistics."""
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"{settings.api_v1_prefix}/billing/usage", headers={"X-User-ID": test_user_id}
        )

        assert response.status_code == 200
        data = response.json()

        assert "resume_generated" in data
        assert "ai_tailored" in data

        # Free tier should have limits
        assert data["resume_generated"]["allowed"] is True
        assert data["ai_tailored"]["allowed"] is False  # Free tier has 0 ai tailoring limit


@pytest.mark.asyncio
async def test_check_usage_limit_allowed(test_user_id):
    """Test checking usage limit for allowed action."""
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"{settings.api_v1_prefix}/billing/usage/check?action=resume_generation",
            headers={"X-User-ID": test_user_id},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["allowed"] is True
        assert data["limit"] == 3
        assert data["remaining"] == 3


@pytest.mark.asyncio
async def test_checkout_session_missing_user_id():
    """Test checkout session creation without user ID."""
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"{settings.api_v1_prefix}/billing/checkout",
            json={
                "plan_name": "basic",
                "success_url": "http://localhost:3000/success",
                "cancel_url": "http://localhost:3000/cancel",
            },
        )

        assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_checkout_session_success(test_user_id, setup_subscription_plans):
    """Test successful checkout session creation."""
    from httpx import AsyncClient, ASGITransport

    with patch("stripe.Customer.create") as mock_customer_create, patch(
        "stripe.checkout.Session.create"
    ) as mock_session_create:
        mock_customer_create.return_value = MagicMock(id="cus_test_123")
        mock_session_create.return_value = MagicMock(id="cs_test_123", url="http://stripe.com/test")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post(
                f"{settings.api_v1_prefix}/billing/checkout",
                json={
                    "plan_name": "basic",
                    "success_url": "http://localhost:3000/success",
                    "cancel_url": "http://localhost:3000/cancel",
                },
                headers={"X-User-ID": test_user_id},
            )

            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == "cs_test_123"
            assert data["url"] == "http://stripe.com/test"


@pytest.mark.asyncio
async def test_list_invoices_empty(test_user_id):
    """Test listing invoices for user with no invoices."""
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"{settings.api_v1_prefix}/billing/invoices", headers={"X-User-ID": test_user_id}
        )

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) == 0


@pytest.mark.asyncio
async def test_list_payment_methods_empty(test_user_id):
    """Test listing payment methods for user with no payment methods."""
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get(
            f"{settings.api_v1_prefix}/billing/payment-methods",
            headers={"X-User-ID": test_user_id},
        )

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) == 0


@pytest.mark.asyncio
async def test_add_payment_method_missing_user_id():
    """Test adding payment method without user ID."""
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"{settings.api_v1_prefix}/billing/payment-methods",
            json={"payment_method_id": "pm_test_123"},
        )

        assert response.status_code == 401


@pytest.mark.asyncio
async def test_cancel_subscription_no_subscription(test_user_id):
    """Test canceling subscription when user has none."""
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"{settings.api_v1_prefix}/billing/cancel", headers={"X-User-ID": test_user_id}
        )

        assert response.status_code == 404


@pytest.mark.asyncio
async def test_resume_subscription_no_subscription(test_user_id):
    """Test resuming subscription when user has none."""
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"{settings.api_v1_prefix}/billing/resume", headers={"X-User-ID": test_user_id}
        )

        assert response.status_code == 404


@pytest.mark.asyncio
async def test_upgrade_subscription_no_subscription(test_user_id):
    """Test upgrading subscription when user has none."""
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"{settings.api_v1_prefix}/billing/upgrade?new_plan_name=premium",
            headers={"X-User-ID": test_user_id},
        )

        assert response.status_code == 404


@pytest.mark.asyncio
async def test_portal_session_no_subscription(test_user_id):
    """Test creating portal session without subscription."""
    from httpx import AsyncClient, ASGITransport

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            f"{settings.api_v1_prefix}/billing/portal",
            json={"return_url": "http://localhost:3000/settings"},
            headers={"X-User-ID": test_user_id},
        )

        assert response.status_code == 404


# ========== Database Model Tests ==========


@pytest.mark.asyncio
async def test_subscription_plan_creation():
    """Test creating subscription plan in database."""
    async with async_session_maker() as session:
        plan = SubscriptionPlan(
            name="test_plan",
            display_name="Test Plan",
            description="A test plan",
            price_cents=500,
            currency="USD",
            interval="month",
            features=["Feature 1", "Feature 2"],
            max_resumes_per_month=10,
            max_ai_tailorings_per_month=5,
            is_active=True,
        )

        session.add(plan)
        await session.commit()
        await session.refresh(plan)

        assert plan.id is not None
        assert plan.name == "test_plan"
        assert plan.price_cents == 500

        # Cleanup
        await session.delete(plan)
        await session.commit()


@pytest.mark.asyncio
async def test_subscription_creation(test_user_id):
    """Test creating subscription in database."""
    async with async_session_maker() as session:
        subscription = Subscription(
            user_id=test_user_id,
            status="active",
            stripe_customer_id="cus_test_123",
            stripe_subscription_id="sub_test_456",
            resumes_generated_this_period=2,
            ai_tailorings_this_period=1,
        )

        session.add(subscription)
        await session.commit()
        await session.refresh(subscription)

        assert subscription.id is not None
        assert subscription.user_id == test_user_id
        assert subscription.status == "active"

        # Cleanup
        await session.delete(subscription)
        await session.commit()


@pytest.mark.asyncio
async def test_invoice_creation(test_user_id):
    """Test creating invoice in database."""
    async with async_session_maker() as session:
        invoice = Invoice(
            user_id=test_user_id,
            amount_cents=999,
            currency="USD",
            status="paid",
            description="Monthly subscription",
            stripe_invoice_id="in_test_123",
        )

        session.add(invoice)
        await session.commit()
        await session.refresh(invoice)

        assert invoice.id is not None
        assert invoice.amount_cents == 999
        assert invoice.status == "paid"

        # Cleanup
        await session.delete(invoice)
        await session.commit()


@pytest.mark.asyncio
async def test_payment_method_creation(test_user_id):
    """Test creating payment method in database."""
    async with async_session_maker() as session:
        payment_method = PaymentMethod(
            user_id=test_user_id,
            type="card",
            brand="visa",
            last4="4242",
            exp_month=12,
            exp_year=2025,
            billing_name="Test User",
            is_default=True,
        )

        session.add(payment_method)
        await session.commit()
        await session.refresh(payment_method)

        assert payment_method.id is not None
        assert payment_method.type == "card"
        assert payment_method.last4 == "4242"
        assert payment_method.is_default is True

        # Cleanup
        await session.delete(payment_method)
        await session.commit()


# ========== Stripe Service Tests (Mocked) ==========


@pytest.mark.asyncio
async def test_stripe_service_check_usage_limits_free_tier(test_user_id):
    """Test usage limit check for free tier user."""
    from lib.stripe import stripe_service

    # Mock billing enabled
    with patch("lib.stripe.BILLING_ENABLED", True):
        result = await stripe_service.check_usage_limits(test_user_id, "resume_generation")

        assert result["allowed"] is True
        assert result["limit"] == 3
        assert result["remaining"] == 3


@pytest.mark.asyncio
async def test_stripe_service_check_usage_limits_ai_tailoring(test_user_id):
    """Test AI tailoring usage limit check for free tier user."""
    from lib.stripe import stripe_service

    # Mock billing enabled
    with patch("lib.stripe.BILLING_ENABLED", True):
        result = await stripe_service.check_usage_limits(test_user_id, "ai_tailoring")

        # Free tier has 0 limit for AI tailoring
        assert result["allowed"] is False
        assert result["limit"] == 0
        assert result["remaining"] == 0


@pytest.mark.asyncio
async def test_usage_tracking_flow(test_user_id):
    """Test full usage tracking flow."""
    from lib.stripe import stripe_service
    from database import UserUsage, async_session_maker, Subscription, SubscriptionPlan
    from sqlalchemy import select, and_
    import datetime

    # Enable billing for test
    with patch("lib.stripe.BILLING_ENABLED", True):
        # 1. Setup a user with a plan that has limits
        async with async_session_maker() as session:
            plan = SubscriptionPlan(
                name="limited_plan",
                display_name="Limited Plan",
                price_cents=500,
                max_resumes_per_month=3,
                max_ai_tailorings_per_month=2,
            )
            session.add(plan)
            await session.commit()
            await session.refresh(plan)

            sub = Subscription(user_id="1", plan_id=plan.id, status="active")
            session.add(sub)
            await session.commit()

        # 2. Record usage
        await stripe_service.record_usage("1", "resume_generation")

        # 3. Verify usage recorded in DB
        async with async_session_maker() as session:
            now = datetime.datetime.now(datetime.UTC)
            stmt = select(UserUsage).where(
                and_(
                    UserUsage.user_id == 1,
                    UserUsage.month == now.month,
                    UserUsage.year == now.year,
                )
            )
            result = await session.execute(stmt)
            usage = result.scalar_one()
            assert usage.resumes_generated == 1

            # 4. Check limits
            status = await stripe_service.check_usage_limits("1", "resume_generation")
            assert status["allowed"] is True
            assert status["used"] == 1
            assert status["remaining"] == 2  # 3 - 1

            # 5. Fill up usage
            usage.resumes_generated = 3
            await session.commit()

            # 6. Check limit exceeded
            status = await stripe_service.check_usage_limits("1", "resume_generation")
            assert status["allowed"] is False
            assert status["remaining"] == 0


@pytest.mark.asyncio
async def test_verify_webhook_signature_success():
    """Test successful webhook signature verification."""
    from lib.stripe import stripe_service

    payload = b'{"id": "evt_test", "type": "checkout.session.completed"}'
    signature = "whsec_test_sig"
    secret = "whsec_test_secret"

    with patch("stripe.Webhook.construct_event") as mock_construct:
        mock_construct.return_value = {"id": "evt_test", "type": "checkout.session.completed"}

        event = stripe_service.verify_webhook_signature(payload, signature, secret)

        assert event["id"] == "evt_test"
        mock_construct.assert_called_once_with(payload, signature, secret)


@pytest.mark.asyncio
async def test_verify_webhook_signature_invalid():
    """Test failed webhook signature verification."""
    from lib.stripe import stripe_service

    payload = b'invalid'
    signature = "invalid"
    secret = "secret"

    with patch("stripe.Webhook.construct_event") as mock_construct:
        mock_construct.side_effect = stripe.error.SignatureVerificationError(
            "Invalid signature", "sig_header"
        )

        with pytest.raises(stripe.error.SignatureVerificationError):
            stripe_service.verify_webhook_signature(payload, signature, secret)
