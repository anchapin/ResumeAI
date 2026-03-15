"""
Tests for LinkedIn OAuth.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from lib.linkedin.oauth import LinkedInOAuth
from lib.linkedin.models import LinkedInOAuthState


class TestLinkedInOAuth:
    """Test LinkedInOAuth class."""

    @pytest.fixture
    def oauth(self):
        """Create OAuth instance."""
        return LinkedInOAuth(
            client_id="test_client_id",
            client_secret="test_client_secret",
            redirect_uri="http://localhost:3000/auth/linkedin/callback",
        )

    @pytest.fixture
    def db_session(self):
        """Create mock database session."""
        session = MagicMock()
        session.commit = MagicMock()
        session.refresh = MagicMock()
        return session

    def test_generate_code_verifier(self, oauth):
        """Test code verifier generation."""
        verifier = oauth.generate_code_verifier()
        
        assert len(verifier) >= 43
        assert len(verifier) <= 128
        # Should be URL-safe base64
        assert verifier.replace('-', '').replace('_', '').isalnum()

    def test_generate_code_challenge(self, oauth):
        """Test code challenge generation."""
        verifier = "test_verifier_12345678901234567890123456789012"
        challenge = oauth.generate_code_challenge(verifier)
        
        # Should be base64url encoded SHA256
        assert len(challenge) == 43  # SHA256 = 32 bytes = 43 base64url chars
        assert challenge.replace('-', '').replace('_', '').isalnum()

    def test_create_oauth_state(self, oauth, db_session):
        """Test OAuth state creation."""
        oauth_state = oauth.create_oauth_state(db_session, user_id=123)
        
        assert oauth_state.state is not None
        assert len(oauth_state.state) >= 32
        assert oauth_state.code_verifier is not None
        assert oauth_state.user_id == 123
        assert oauth_state.used == False
        assert oauth_state.expires_at > datetime.utcnow()

    def test_get_authorization_url(self, oauth, db_session):
        """Test authorization URL generation."""
        oauth_state = oauth.create_oauth_state(db_session)
        auth_url = oauth.get_authorization_url(oauth_state)
        
        assert auth_url.startswith("https://www.linkedin.com/oauth/v2/authorization")
        assert "response_type=code" in auth_url
        assert "client_id=test_client_id" in auth_url
        assert f"state={oauth_state.state}" in auth_url
        assert "scope=" in auth_url
        assert "code_challenge=" in auth_url
        assert "code_challenge_method=S256" in auth_url

    def test_initiate_oauth(self, oauth, db_session):
        """Test OAuth initiation."""
        result = oauth.initiate_oauth(db_session, user_id=123)
        
        assert "authorization_url" in result
        assert "state" in result
        assert result["authorization_url"].startswith("https://")

    @pytest.mark.asyncio
    async def test_handle_callback_success(self, oauth, db_session):
        """Test successful OAuth callback handling."""
        # Create state
        oauth_state = oauth.create_oauth_state(db_session)
        
        # Mock token exchange
        with patch.object(oauth, '_exchange_code', new_callable=AsyncMock) as mock_exchange:
            mock_exchange.return_value = {
                "access_token": "test_access_token",
                "refresh_token": "test_refresh_token",
                "expires_in": 3600,
            }
            
            # Mock user info fetch
            with patch.object(oauth, '_fetch_user_info', new_callable=AsyncMock) as mock_user:
                mock_user.return_value = {
                    "id": "test_user_id",
                    "firstName": "Test",
                    "lastName": "User",
                    "email": "test@example.com",
                }
                
                result = await oauth.handle_callback(
                    db_session,
                    code="test_code",
                    state=oauth_state.state,
                )
                
                assert result["access_token"] == "test_access_token"
                assert result["user_info"]["id"] == "test_user_id"
                assert oauth_state.used == True

    @pytest.mark.asyncio
    async def test_handle_callback_invalid_state(self, oauth, db_session):
        """Test OAuth callback with invalid state."""
        with pytest.raises(ValueError, match="Invalid OAuth state"):
            await oauth.handle_callback(
                db_session,
                code="test_code",
                state="invalid_state",
            )

    @pytest.mark.asyncio
    async def test_handle_callback_expired_state(self, oauth, db_session):
        """Test OAuth callback with expired state."""
        # Create expired state
        oauth_state = oauth.create_oauth_state(db_session)
        oauth_state.expires_at = datetime.utcnow() - timedelta(minutes=1)
        
        with pytest.raises(ValueError, match="OAuth state expired"):
            await oauth.handle_callback(
                db_session,
                code="test_code",
                state=oauth_state.state,
            )

    @pytest.mark.asyncio
    async def test_handle_callback_used_state(self, oauth, db_session):
        """Test OAuth callback with already used state."""
        oauth_state = oauth.create_oauth_state(db_session)
        oauth_state.used = True
        
        with pytest.raises(ValueError, match="OAuth state already used"):
            await oauth.handle_callback(
                db_session,
                code="test_code",
                state=oauth_state.state,
            )

    @pytest.mark.asyncio
    async def test_verify_state(self, oauth, db_session):
        """Test state verification."""
        oauth_state = oauth.create_oauth_state(db_session)
        
        # Should return valid state
        result = await oauth._verify_state(db_session, oauth_state.state)
        assert result == oauth_state

    @pytest.mark.asyncio
    async def test_exchange_code(self, oauth, db_session):
        """Test code exchange."""
        oauth_state = oauth.create_oauth_state(db_session)
        
        with patch('httpx.AsyncClient.post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value={
                    "access_token": "test_token",
                    "refresh_token": "test_refresh",
                    "expires_in": 3600,
                })
            )
            
            result = await oauth._exchange_code(db_session, "test_code", oauth_state)
            
            assert result["access_token"] == "test_token"
            assert result["refresh_token"] == "test_refresh"

    @pytest.mark.asyncio
    async def test_fetch_user_info(self, oauth):
        """Test user info fetching."""
        with patch('httpx.AsyncClient.get', new_callable=AsyncMock) as mock_get:
            # Mock profile response
            mock_get.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value={
                    "id": "test_id",
                    "firstName": {"localized": "Test"},
                    "lastName": {"localized": "User"},
                })
            )
            
            result = await oauth._fetch_user_info("test_token")
            
            assert result["id"] == "test_id"
            assert result["firstName"] == "Test"

    @pytest.mark.asyncio
    async def test_refresh_tokens(self, oauth, db_session):
        """Test token refresh."""
        with patch('httpx.AsyncClient.post', new_callable=AsyncMock) as mock_post:
            mock_post.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value={
                    "access_token": "new_access_token",
                    "refresh_token": "new_refresh_token",
                    "expires_in": 3600,
                })
            )
            
            result = await oauth.refresh_tokens(db_session, "test_refresh_token")
            
            assert result["access_token"] == "new_access_token"
            assert result["refresh_token"] == "new_refresh_token"

    @pytest.mark.asyncio
    async def test_revoke_tokens(self, oauth, db_session):
        """Test token revocation."""
        result = await oauth.revoke_tokens(db_session, "test_token")
        
        assert result == True

    def test_extract_email(self, oauth):
        """Test email extraction from LinkedIn response."""
        email_data = {
            "elements": [
                {
                    "handle~": {
                        "emailAddress": "test@example.com"
                    }
                }
            ]
        }
        
        email = oauth._extract_email(email_data)
        assert email == "test@example.com"

    def test_extract_email_empty(self, oauth):
        """Test email extraction with empty data."""
        assert oauth._extract_email(None) is None
        assert oauth._extract_email({}) is None
        assert oauth._extract_email({"elements": []}) is None
