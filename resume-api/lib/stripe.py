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
from config import settings
from database import async_session_maker, UserUsage
from monitoring import logging_config

# Configure logging
logger = logging_config.get_logger(__name__)

# Billing availability flag
BILLING_ENABLED = False  # Set to True when Stripe integration is complete

# Initialize Stripe (only if billing is enabled and key is available)
if BILLING_ENABLED and settings.stripe_secret_key:
    stripe.api_key = settings.stripe_secret_key

class StripeService:
    """Service for interacting with Stripe API."""

    async def get_available_plans(self) -> List[Dict[str, Any]]:
        """Get all available subscription plans."""
        # TODO(#1007): Implement with Stripe Prices API
        # For now, return hardcoded plans
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
            },
            {
                "id": 2,
                "name": "basic",
                "display_name": "Basic",
                "description": "For job seekers",
                "price_cents": 999,
                "currency": "usd",
                "interval": "month",
                "features": ["10 resumes/month", "5 AI tailorings", "All templates"],
                "max_resumes_per_month": 10,
                "max_ai_tailorings_per_month": 5,
                "max_templates": 10,
                "include_priority_support": False,
                "include_custom_domains": False,
                "is_popular": True,
                "stripe_price_id": "price_basic_monthly",
            },
            {
                "id": 3,
                "name": "premium",
                "display_name": "Premium",
                "description": "For serious job seekers",
                "price_cents": 1999,
                "currency": "usd",
                "interval": "month",
                "features": [
                    "Unlimited resumes",
                    "20 AI tailorings",
                    "All templates",
                    "Priority support",
                ],
                "max_resumes_per_month": -1,
                "max_ai_tailorings_per_month": 20,
                "max_templates": -1,
                "include_priority_support": True,
                "include_custom_domains": False,
                "is_popular": False,
                "stripe_price_id": "price_premium_monthly",
            },
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
        # TODO(#1007): Implement with Stripe Customers API
        return {"stripe_customer_id": f"cus_{user_id}"}

    async def create_checkout_session(
        self,
        customer_id: str,
        price_id: str,
        success_url: str,
        cancel_url: str,
        trial_period_days: int = 0,
    ) -> Dict[str, str]:
        """Create a Stripe checkout session."""
        # TODO(#1007): Implement with Stripe Checkout API
        return {
            "id": "cs_test_123",
            "url": "https://checkout.stripe.com/c/pay/cs_test_123",
        }

    async def create_portal_session(self, customer_id: str, return_url: str) -> Dict[str, str]:
        """Create a Stripe billing portal session."""
        # TODO(#1007): Implement with Stripe Billing Portal API
        return {"url": "https://billing.stripe.com/p/session/test_123"}

    async def cancel_subscription(self, stripe_subscription_id: str) -> Dict[str, Any]:
        """Cancel a Stripe subscription."""
        # TODO(#1007): Implement with Stripe Subscriptions API
        return {"status": "canceled", "cancel_at_period_end": False}

    async def resume_subscription(self, stripe_subscription_id: str) -> Dict[str, Any]:
        """Resume a canceled subscription."""
        # TODO(#1007): Implement with Stripe Subscriptions API
        return {"status": "active", "cancel_at_period_end": False}

    async def update_subscription_plan(
        self, stripe_subscription_id: str, new_price_id: str
    ) -> Dict[str, Any]:
        """Update subscription to a different plan."""
        # TODO(#1007): Implement with Stripe Subscriptions API
        return {"status": "active", "plan": new_price_id}

    async def attach_payment_method(
        self, payment_method_id: str, customer_id: str
    ) -> Dict[str, Any]:
        """Attach a payment method to a customer."""
        # TODO(#1007): Implement with Stripe Payment Methods API
        return {
            "id": payment_method_id,
            "customer": customer_id,
            "type": "card",
        }

    async def set_default_payment_method(
        self, customer_id: str, payment_method_id: str
    ) -> Dict[str, Any]:
        """Set default payment method for a customer."""
        # TODO(#1007): Implement with Stripe Customers API
        return {"id": payment_method_id, "is_default": True}

    async def detach_payment_method(self, payment_method_id: str) -> Dict[str, Any]:
        """Detach a payment method from a customer."""
        # TODO(#1007): Implement with Stripe Payment Methods API
        return {"id": payment_method_id, "detached": True}

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

        # Get limits based on action
        # TODO: Integrate with subscription plan data
        limit = 3
        used = 0

        if action == "resume_generation":
            limit = 3  # Free tier limit
            used = usage.resumes_generated
        elif action == "ai_tailoring":
            limit = 5  # Free tier limit
            used = usage.ai_tailorings_used

        allowed = used < limit

        return {
            "allowed": allowed,
            "remaining": max(0, limit - used),
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
