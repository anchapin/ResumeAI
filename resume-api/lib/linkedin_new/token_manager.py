"""
Token Manager Service

Manages LinkedIn token lifecycle including automatic refresh.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Callable, Awaitable

from .models import LinkedInConnection
from .oauth import LinkedInOAuth

logger = logging.getLogger(__name__)


class TokenManager:
    """
    Manages LinkedIn access tokens.
    
    Features:
    - Automatic token refresh before expiry
    - Token encryption/decryption
    - Refresh callback integration
    
    Example:
        manager = TokenManager(oauth, db_session)
        await manager.ensure_valid_token(connection)
    """
    
    def __init__(
        self,
        oauth: LinkedInOAuth,
        db_session,
        encrypt_fn: Optional[Callable] = None,
        decrypt_fn: Optional[Callable] = None,
    ):
        """
        Initialize Token Manager.
        
        Args:
            oauth: LinkedInOAuth instance
            db_session: Database session
            encrypt_fn: Token encryption function
            decrypt_fn: Token decryption function
        """
        self.oauth = oauth
        self.db = db_session
        self.encrypt_fn = encrypt_fn
        self.decrypt_fn = decrypt_fn
    
    def encrypt_token(self, token: str) -> str:
        """Encrypt token for storage."""
        if self.encrypt_fn:
            return self.encrypt_fn(token)
        return token
    
    def decrypt_token(self, encrypted_token: str) -> str:
        """Decrypt token from storage."""
        if self.decrypt_fn:
            return self.decrypt_fn(encrypted_token)
        return encrypted_token
    
    async def ensure_valid_token(
        self,
        connection: LinkedInConnection,
        buffer_minutes: int = 5,
    ) -> str:
        """
        Ensure access token is valid, refresh if needed.
        
        Args:
            connection: LinkedInConnection object
            buffer_minutes: Refresh buffer before expiry
            
        Returns:
            Valid access token
        """
        # Check if token needs refresh
        if self._needs_refresh(connection, buffer_minutes):
            await self.refresh_token(connection)
        
        return self.decrypt_token(connection.access_token)
    
    def _needs_refresh(
        self,
        connection: LinkedInConnection,
        buffer_minutes: int,
    ) -> bool:
        """Check if token needs refresh."""
        if not connection.token_expires_at:
            return True
        
        # Refresh if within buffer of expiry
        threshold = datetime.utcnow() + timedelta(minutes=buffer_minutes)
        return connection.token_expires_at < threshold
    
    async def refresh_token(self, connection: LinkedInConnection) -> dict:
        """
        Refresh access token.
        
        Args:
            connection: LinkedInConnection object
            
        Returns:
            New token data
        """
        if not connection.refresh_token:
            raise ValueError("No refresh token available")
        
        logger.info(f"Refreshing token for user {connection.user_id}")
        
        try:
            # Exchange refresh token for new access token
            token_data = await self.oauth.refresh_tokens(
                self.db,
                self.decrypt_token(connection.refresh_token),
            )
            
            # Update connection
            connection.access_token = self.encrypt_token(token_data["access_token"])
            connection.refresh_token = self.encrypt_token(token_data.get(
                "refresh_token",
                self.decrypt_token(connection.refresh_token),
            ))
            connection.token_expires_at = datetime.utcnow() + timedelta(
                seconds=token_data["expires_in"]
            )
            
            self.db.commit()
            
            logger.info(f"Token refreshed for user {connection.user_id}")
            
            return token_data
            
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            connection.sync_status = "failed"
            self.db.commit()
            raise
    
    async def revoke_tokens(self, connection: LinkedInConnection) -> bool:
        """
        Revoke tokens (disconnect LinkedIn).
        
        Args:
            connection: LinkedInConnection object
            
        Returns:
            True if successful
        """
        logger.info(f"Revoking tokens for user {connection.user_id}")
        
        try:
            await self.oauth.revoke_tokens(
                self.db,
                self.decrypt_token(connection.access_token),
            )
        except Exception as e:
            logger.warning(f"Token revocation failed: {e}")
        
        # Clear local tokens
        connection.access_token = None
        connection.refresh_token = None
        connection.token_expires_at = None
        connection.is_active = False
        connection.sync_status = "disconnected"
        
        self.db.commit()
        
        logger.info(f"Tokens revoked for user {connection.user_id}")
        
        return True
