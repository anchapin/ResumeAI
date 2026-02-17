"""
Stripe Service Module

Provides integration with Stripe API for:
- Subscription plan management
- Customer management
- Payment processing
- Webhook handling
- Usage tracking
"""

import stripe
from typing import List, Dict, Any, Optional
from config import settings

# Initialize Stripe
stripe.api_key = settings.stripe_secret_key


class StripeService:
    """Service for interacting with Stripe API."""

    async def get_available_plans(self) -> List[Dict[str, Any]]:
        """Get all available subscription plans."""
        # TODO: Implement with Stripe Prices API
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
        # TODO: Implement with Stripe Customers API
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
        # TODO: Implement with Stripe Checkout API
        return {
            "id": "cs_test_123",
            "url": f"https://checkout.stripe.com/c/pay/cs_test_123",
        }

    async def create_portal_session(
        self, customer_id: str, return_url: str
    ) -> Dict[str, str]:
        """Create a Stripe billing portal session."""
        # TODO: Implement with Stripe Billing Portal API
        return {"url": "https://billing.stripe.com/p/session/test_123"}

    async def cancel_subscription(
        self, stripe_subscription_id: str
    ) -> Dict[str, Any]:
        """Cancel a Stripe subscription."""
        # TODO: Implement with Stripe Subscriptions API
        return {"status": "canceled", "cancel_at_period_end": False}

    async def resume_subscription(
        self, stripe_subscription_id: str
    ) -> Dict[str, Any]:
        """Resume a canceled subscription."""
        # TODO: Implement with Stripe Subscriptions API
        return {"status": "active", "cancel_at_period_end": False}

    async def update_subscription_plan(
        self, stripe_subscription_id: str, new_price_id: str
    ) -> Dict[str, Any]:
        """Update subscription to a different plan."""
        # TODO: Implement with Stripe Subscriptions API
        return {"status": "active", "plan": new_price_id}

    async def attach_payment_method(
        self, payment_method_id: str, customer_id: str
    ) -> Dict[str, Any]:
        """Attach a payment method to a customer."""
        # TODO: Implement with Stripe Payment Methods API
        return {
            "id": payment_method_id,
            "customer": customer_id,
            "type": "card",
        }

    async def set_default_payment_method(
        self, customer_id: str, payment_method_id: str
    ) -> Dict[str, Any]:
        """Set default payment method for a customer."""
        # TODO: Implement with Stripe Customers API
        return {"id": payment_method_id, "is_default": True}

    async def detach_payment_method(self, payment_method_id: str) -> Dict[str, Any]:
        """Detach a payment method from a customer."""
        # TODO: Implement with Stripe Payment Methods API
        return {"id": payment_method_id, "detached": True}

    async def check_usage_limits(
        self, user_id: str, action: str
    ) -> Dict[str, Any]:
        """Check if user has exceeded usage limits."""
        # TODO: Implement with database usage tracking
        return {"allowed": True, "remaining": -1, "limit": -1}

    def verify_webhook_signature(
        self, payload: bytes, signature: str, webhook_secret: str
    ) -> stripe.Event:
        """Verify Stripe webhook signature."""
        # TODO: Implement with Stripe Webhooks API
        # For now, parse the payload without verification
        import json
        event_data = json.loads(payload.decode("utf-8"))
        return stripe.Event.construct_from(event_data, stripe.api_key)


# Singleton instance
stripe_service = StripeService()
