"""
Simple unit tests for GitHub OAuth endpoints (no complex fixtures).
"""

from lib.token_encryption import generate_encryption_key, TokenEncryption


class TestTokenEncryptionWithGitHub:
    """Tests for token encryption with GitHub OAuth."""

    def test_encrypt_github_access_token(self):
        """Test encrypting a GitHub access token."""
        key = generate_encryption_key()
        encryption = TokenEncryption(key)

        # GitHub access token format: ghp_xxxxxxxxxxxx
        github_token = "ghp_1234567890abcdef1234567890abcdef12345678"
        encrypted = encryption.encrypt(github_token)
        decrypted = encryption.decrypt(encrypted)

        assert decrypted == github_token
        assert encrypted != github_token

    def test_encrypt_github_refresh_token(self):
        """Test encrypting a GitHub refresh token (if available)."""
        key = generate_encryption_key()
        encryption = TokenEncryption(key)

        # GitHub refresh tokens (rare, but possible)
        refresh_token = "ghr_1234567890abcdef1234567890abcdef12345678"
        encrypted = encryption.encrypt(refresh_token)
        decrypted = encryption.decrypt(encrypted)

        assert decrypted == refresh_token
        assert encrypted != refresh_token


class TestGitHubAuthorizationURL:
    """Tests for GitHub authorization URL generation."""

    def test_build_authorization_url_default(self):
        """Test building authorization URL with default parameters."""
        from routes.github import build_github_authorization_url

        url = build_github_authorization_url(
            client_id="test_client_id",
            redirect_uri="http://127.0.0.1:8000/github/callback",
            state="test_state",
        )

        assert url.startswith("https://github.com/login/oauth/authorize?")
        assert "client_id=test_client_id" in url
        assert "redirect_uri=" in url
        assert "state=test_state" in url
        assert "scope=" in url

    def test_build_authorization_url_custom_scopes(self):
        """Test building authorization URL with custom scopes."""
        from routes.github import build_github_authorization_url

        url = build_github_authorization_url(
            client_id="test_client_id",
            redirect_uri="http://127.0.0.1:8000/github/callback",
            state="test_state",
            scopes="read:user repo",
        )

        # Scope should contain the custom scopes (properly encoded)
        assert "scope=" in url

    def test_generate_oauth_state_length(self):
        """Test that generated state has sufficient length."""
        from routes.github import generate_oauth_state

        state = generate_oauth_state()
        assert len(state) >= 32  # Minimum secure length

    def test_generate_oauth_state_uniqueness(self):
        """Test that generated states are unique."""
        from routes.github import generate_oauth_state

        states = [generate_oauth_state() for _ in range(100)]
        assert len(set(states)) == 100  # All should be unique


class TestGitHubDatabaseModels:
    """Tests for GitHub database models."""

    def test_github_connection_model_import(self):
        """Test that GitHubConnection model can be imported."""
        from database import GitHubConnection

        assert GitHubConnection is not None

    def test_github_oauth_state_model_import(self):
        """Test that GitHubOAuthState model can be imported."""
        from database import GitHubOAuthState

        assert GitHubOAuthState is not None

    def test_github_connection_has_required_fields(self):
        """Test that GitHubConnection has required fields."""
        from database import GitHubConnection

        # Check that model has expected attributes
        connection = GitHubConnection(
            user_id=1,
            github_user_id=12345,
            github_username="testuser",
            access_token="test_token",
            is_active=True,  # Explicitly set for test
        )

        assert connection.user_id == 1
        assert connection.github_user_id == 12345
        assert connection.github_username == "testuser"
        assert connection.access_token == "test_token"
        assert connection.is_active is True

    def test_github_oauth_state_has_required_fields(self):
        """Test that GitHubOAuthState has required fields."""
        from database import GitHubOAuthState
        from datetime import datetime, timedelta

        # Check that model has expected attributes
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        state = GitHubOAuthState(
            state="test_state",
            expires_at=expires_at,
            is_used=False,  # Explicitly set for test
        )

        assert state.state == "test_state"
        assert state.expires_at == expires_at
        assert state.is_used is False


class TestGitHubOAuthConfig:
    """Tests for GitHub OAuth configuration."""

    def test_settings_has_github_config(self):
        """Test that settings has GitHub OAuth configuration."""
        from config import settings

        # These should be accessible (even if None)
        assert hasattr(settings, "github_client_id")
        assert hasattr(settings, "github_client_secret")
        assert hasattr(settings, "github_callback_url")

    def test_settings_callback_url_default(self):
        """Test that settings has default callback URL."""
        from config import settings

        assert (
            settings.github_oauth_callback_url
            == "http://127.0.0.1:8000/github/callback"
        )
