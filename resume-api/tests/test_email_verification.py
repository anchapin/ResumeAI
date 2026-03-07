"""
Tests for email verification functionality.
"""

import pytest
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient

from database import EmailVerificationToken


@pytest.mark.asyncio
class TestEmailVerificationToken:
    """Test email verification token creation and validation."""

    async def test_create_verification_token_on_registration(
        self, async_client: AsyncClient, test_db_session
    ):
        """Test that verification token is created on user registration."""
        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "test@example.com",
                "username": "testuser",
                "password": "TestPassword123!",
                "full_name": "Test User",
            },
        )

        assert response.status_code == 201
        user_data = response.json()

        # Check that user is not verified
        assert user_data["is_verified"] is False

        # Check that verification token was created in database
        result = await test_db_session.execute(
            EmailVerificationToken.__table__.select().where(
                EmailVerificationToken.user_id == user_data["id"]
            )
        )
        token = result.fetchone()

        assert token is not None
        assert token.is_used is False
        assert token.expires_at > datetime.now(timezone.utc)

    async def test_verify_email_with_valid_token(self, async_client: AsyncClient, test_db_session):
        """Test email verification with valid token."""
        # Register user
        register_response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "verify@example.com",
                "username": "verifyuser",
                "password": "TestPassword123!",
            },
        )

        user_data = register_response.json()

        # Get verification token
        result = await test_db_session.execute(
            EmailVerificationToken.__table__.select().where(
                EmailVerificationToken.user_id == user_data["id"]
            )
        )
        token_row = result.fetchone()
        token = token_row.token

        # Verify email
        verify_response = await async_client.post(
            "/api/v1/auth/verify-email",
            json={"token": token},
        )

        assert verify_response.status_code == 200
        verified_user = verify_response.json()
        assert verified_user["is_verified"] is True

        # Check token is marked as used
        result = await test_db_session.execute(
            EmailVerificationToken.__table__.select().where(EmailVerificationToken.token == token)
        )
        updated_token = result.fetchone()
        assert updated_token.is_used is True

    async def test_verify_email_with_invalid_token(self, async_client: AsyncClient):
        """Test email verification with invalid token."""
        response = await async_client.post(
            "/api/v1/auth/verify-email",
            json={"token": "invalid_token_12345"},
        )

        assert response.status_code == 404

    async def test_verify_email_with_expired_token(
        self, async_client: AsyncClient, test_db_session
    ):
        """Test email verification with expired token."""
        # Register user
        register_response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "expired@example.com",
                "username": "expireduser",
                "password": "TestPassword123!",
            },
        )

        user_data = register_response.json()

        # Get and expire the token
        result = await test_db_session.execute(
            EmailVerificationToken.__table__.select().where(
                EmailVerificationToken.user_id == user_data["id"]
            )
        )
        token_row = result.fetchone()

        # Update token to be expired
        await test_db_session.execute(
            EmailVerificationToken.__table__.update()
            .where(EmailVerificationToken.id == token_row.id)
            .values(expires_at=datetime.now(timezone.utc) - timedelta(hours=1))
        )
        await test_db_session.commit()

        # Try to verify with expired token
        verify_response = await async_client.post(
            "/api/v1/auth/verify-email",
            json={"token": token_row.token},
        )

        assert verify_response.status_code == 400

    async def test_resend_verification_email(self, async_client: AsyncClient, test_db_session):
        """Test resending verification email."""
        # Register user
        register_response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "resend@example.com",
                "username": "resenduser",
                "password": "TestPassword123!",
            },
        )

        user_data = register_response.json()
        user_id = user_data["id"]

        # Get original token
        result = await test_db_session.execute(
            EmailVerificationToken.__table__.select().where(
                EmailVerificationToken.user_id == user_id
            )
        )
        original_token = result.fetchone()
        original_token_value = original_token.token

        # Resend verification email
        resend_response = await async_client.post(
            "/api/v1/auth/resend-verification",
            json={"email": "resend@example.com"},
        )

        assert resend_response.status_code == 200

        # Check that a new token was created
        result = await test_db_session.execute(
            EmailVerificationToken.__table__.select().where(
                EmailVerificationToken.user_id == user_id,
                EmailVerificationToken.is_used.is_(False),
            )
        )
        new_tokens = result.fetchall()

        # Old token should be deleted, new token should exist
        assert len(new_tokens) == 1
        assert new_tokens[0].token != original_token_value

    async def test_resend_verification_already_verified(
        self, async_client: AsyncClient, test_db_session
    ):
        """Test resending verification email for already verified user."""
        # Register and verify user
        register_response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "email": "already_verified@example.com",
                "username": "verifieduser",
                "password": "TestPassword123!",
            },
        )

        user_data = register_response.json()

        # Get and use verification token
        result = await test_db_session.execute(
            EmailVerificationToken.__table__.select().where(
                EmailVerificationToken.user_id == user_data["id"]
            )
        )
        token_row = result.fetchone()

        await async_client.post(
            "/api/v1/auth/verify-email",
            json={"token": token_row.token},
        )

        # Try to resend verification email
        resend_response = await async_client.post(
            "/api/v1/auth/resend-verification",
            json={"email": "already_verified@example.com"},
        )

        assert resend_response.status_code == 404

    async def test_resend_verification_nonexistent_email(self, async_client: AsyncClient):
        """Test resending verification email for nonexistent email."""
        response = await async_client.post(
            "/api/v1/auth/resend-verification",
            json={"email": "nonexistent@example.com"},
        )

        # Should return 404 (user not found) with a generic message
        assert response.status_code == 404
