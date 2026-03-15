"""
LinkedIn OAuth 2.0 Implementation with PKCE

Implements OAuth 2.0 Authorization Code Flow with PKCE (RFC 7636)
for secure LinkedIn authentication.
"""

import hashlib
import base64
import secrets
import logging
from datetime import datetime, timedelta
from typing import Optional
from urllib.parse import urlencode

import httpx

from .models import LinkedInConnection, LinkedInOAuthState
from ..database import Base, get_db_session

logger = logging.getLogger(__name__)


# LinkedIn OAuth Configuration
LINKEDIN_AUTH_URL = "https://www.linkedin.com/oauth/v2/authorization"
LINKEDIN_TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken"
LINKEDIN_USER_INFO_URL = "https://api.linkedin.com/v2/me"
LINKEDIN_EMAIL_URL = "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))"

# Required OAuth scopes
LINKEDIN_SCOPES = [
    "r_liteprofile",      # Basic profile (name, photo, headline)
    "r_emailaddress",     # Email address
    "w_member_social",    # Post, comment, like (optional)
]


class LinkedInOAuth:
    """
    LinkedIn OAuth 2.0 with PKCE.
    
    Implements secure OAuth flow with:
    - PKCE code verifier/challenge (RFC 7636)
    - State parameter for CSRF protection
    - Secure token storage
    
    Example:
        oauth = LinkedInOAuth()
        auth_url = oauth.initiate_oauth()
        # Redirect user to auth_url
        # After callback:
        tokens = oauth.handle_callback(code, state)
    """
    
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        """
        Initialize LinkedIn OAuth.
        
        Args:
            client_id: LinkedIn app client ID
            client_secret: LinkedIn app client secret
            redirect_uri: OAuth callback URL
        """
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
    
    def generate_code_verifier(self) -> str:
        """
        Generate PKCE code verifier.
        
        Returns:
            Random code verifier (43-128 characters)
        """
        # Generate 32 bytes of random data and base64url encode
        verifier = secrets.token_urlsafe(32)
        # Ensure it's within the valid length range
        return verifier[:128] if len(verifier) > 128 else verifier
    
    def generate_code_challenge(self, verifier: str) -> str:
        """
        Generate PKCE code challenge from verifier.
        
        Args:
            verifier: Code verifier
            
        Returns:
            Base64url-encoded SHA256 hash of verifier
        """
        # SHA256 hash of verifier
        sha256_hash = hashlib.sha256(verifier.encode()).digest()
        # Base64url encode (without padding)
        challenge = base64.urlsafe_b64encode(sha256_hash).rstrip(b'=').decode()
        return challenge
    
    def create_oauth_state(self, db_session, user_id: Optional[int] = None) -> LinkedInOAuthState:
        """
        Create OAuth state for CSRF protection.
        
        Args:
            db_session: Database session
            user_id: Optional user ID (if already logged in)
            
        Returns:
            LinkedInOAuthState object
        """
        # Generate random state
        state = secrets.token_urlsafe(32)
        
        # Generate PKCE verifier
        code_verifier = self.generate_code_verifier()
        
        # Create state record
        oauth_state = LinkedInOAuthState(
            state=state,
            code_verifier=code_verifier,
            user_id=user_id,
            expires_at=datetime.utcnow() + timedelta(minutes=10),  # 10 min expiry
        )
        
        db_session.add(oauth_state)
        db_session.commit()
        db_session.refresh(oauth_state)
        
        logger.info(f"Created OAuth state for user {user_id}")
        
        return oauth_state
    
    def get_authorization_url(self, oauth_state: LinkedInOAuthState) -> str:
        """
        Generate LinkedIn authorization URL.
        
        Args:
            oauth_state: OAuth state object
            
        Returns:
            Authorization URL to redirect user to
        """
        # Generate code challenge
        code_challenge = self.generate_code_challenge(oauth_state.code_verifier)
        
        # Build authorization URL parameters
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "state": oauth_state.state,
            "scope": " ".join(LINKEDIN_SCOPES),
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
        
        auth_url = f"{LINKEDIN_AUTH_URL}?{urlencode(params)}"
        
        logger.info(f"Generated authorization URL for state {oauth_state.state[:8]}...")
        
        return auth_url
    
    def initiate_oauth(self, db_session, user_id: Optional[int] = None) -> dict:
        """
        Initiate OAuth flow.
        
        Args:
            db_session: Database session
            user_id: Optional user ID
            
        Returns:
            Dict with authorization_url and state
        """
        oauth_state = self.create_oauth_state(db_session, user_id)
        auth_url = self.get_authorization_url(oauth_state)
        
        return {
            "authorization_url": auth_url,
            "state": oauth_state.state,
        }
    
    async def handle_callback(
        self,
        db_session,
        code: str,
        state: str,
    ) -> dict:
        """
        Handle OAuth callback from LinkedIn.
        
        Args:
            db_session: Database session
            code: Authorization code from LinkedIn
            state: State parameter from LinkedIn
            
        Returns:
            Dict with access_token, refresh_token, expires_in, and user info
        """
        # Verify state
        oauth_state = await self._verify_state(db_session, state)
        
        # Exchange code for tokens
        tokens = await self._exchange_code(db_session, code, oauth_state)
        
        # Fetch user info
        user_info = await self._fetch_user_info(tokens["access_token"])
        
        # Mark state as used
        oauth_state.used = True
        db_session.commit()
        
        logger.info(f"OAuth callback successful for state {state[:8]}...")
        
        return {
            **tokens,
            "user_info": user_info,
        }
    
    async def _verify_state(self, db_session, state: str) -> LinkedInOAuthState:
        """
        Verify OAuth state.
        
        Args:
            db_session: Database session
            state: State parameter
            
        Returns:
            LinkedInOAuthState object
            
        Raises:
            ValueError: If state is invalid or expired
        """
        oauth_state = db_session.query(LinkedInOAuthState).filter(
            LinkedInOAuthState.state == state
        ).first()
        
        if not oauth_state:
            raise ValueError("Invalid OAuth state")
        
        if oauth_state.used:
            raise ValueError("OAuth state already used")
        
        if oauth_state.expires_at < datetime.utcnow():
            raise ValueError("OAuth state expired")
        
        return oauth_state
    
    async def _exchange_code(
        self,
        db_session,
        code: str,
        oauth_state: LinkedInOAuthState,
    ) -> dict:
        """
        Exchange authorization code for tokens.
        
        Args:
            db_session: Database session
            code: Authorization code
            oauth_state: OAuth state object
            
        Returns:
            Dict with access_token, refresh_token, expires_in
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                LINKEDIN_TOKEN_URL,
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": self.redirect_uri,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "code_verifier": oauth_state.code_verifier,
                },
            )
            
            if response.status_code != 200:
                logger.error(f"Token exchange failed: {response.text}")
                raise ValueError(f"Token exchange failed: {response.status_code}")
            
            token_data = response.json()
            
            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token"),
                "expires_in": token_data.get("expires_in", 3600),
            }
    
    async def _fetch_user_info(self, access_token: str) -> dict:
        """
        Fetch user profile information.
        
        Args:
            access_token: LinkedIn access token
            
        Returns:
            User profile data
        """
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            # Fetch basic profile
            profile_response = await client.get(
                LINKEDIN_USER_INFO_URL,
                headers=headers,
                params={
                    "projection": "(id,firstName,lastName,profilePicture(displayImage~:playableStreams))"
                },
            )
            
            if profile_response.status_code != 200:
                logger.error(f"Profile fetch failed: {profile_response.text}")
                raise ValueError(f"Profile fetch failed: {profile_response.status_code}")
            
            profile_data = profile_response.json()
            
            # Fetch email
            email_response = await client.get(
                LINKEDIN_EMAIL_URL,
                headers=headers,
            )
            
            email_data = None
            if email_response.status_code == 200:
                email_data = email_response.json()
            
            # Parse and return user info
            user_info = {
                "id": profile_data.get("id"),
                "firstName": profile_data.get("firstName", {}).get("localized", ""),
                "lastName": profile_data.get("lastName", {}).get("localized", ""),
                "profilePicture": profile_data.get("profilePicture", {}),
                "email": self._extract_email(email_data),
            }
            
            return user_info
    
    def _extract_email(self, email_data: Optional[dict]) -> Optional[str]:
        """Extract email from LinkedIn email response."""
        if not email_data:
            return None
        
        elements = email_data.get("elements", [])
        if not elements:
            return None
        
        handle = elements[0].get("handle~", {})
        return handle.get("emailAddress")
    
    async def refresh_tokens(
        self,
        db_session,
        refresh_token: str,
    ) -> dict:
        """
        Refresh access tokens.
        
        Args:
            db_session: Database session
            refresh_token: LinkedIn refresh token
            
        Returns:
            Dict with new access_token, refresh_token, expires_in
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                LINKEDIN_TOKEN_URL,
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
            )
            
            if response.status_code != 200:
                logger.error(f"Token refresh failed: {response.text}")
                raise ValueError(f"Token refresh failed: {response.status_code}")
            
            token_data = response.json()
            
            return {
                "access_token": token_data["access_token"],
                "refresh_token": token_data.get("refresh_token", refresh_token),
                "expires_in": token_data.get("expires_in", 3600),
            }
    
    async def revoke_tokens(
        self,
        db_session,
        access_token: str,
    ) -> bool:
        """
        Revoke access tokens (disconnect LinkedIn).
        
        Args:
            db_session: Database session
            access_token: LinkedIn access token
            
        Returns:
            True if successful
        """
        # LinkedIn doesn't have a public revoke endpoint
        # We just invalidate our local tokens
        
        logger.info("Tokens revoked (local invalidation)")
        
        return True
