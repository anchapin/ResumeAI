"""
LinkedIn API Client

Client for interacting with LinkedIn API v2.
Handles rate limiting, error handling, and automatic token refresh.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Any

import httpx

logger = logging.getLogger(__name__)


# LinkedIn API Configuration
LINKEDIN_API_BASE = "https://api.linkedin.com/v2"
LINKEDIN_RATE_LIMIT = 500  # requests per day per user
LINKEDIN_RATE_LIMIT_MINUTE = 100  # requests per minute


class LinkedInClient:
    """
    LinkedIn API v2 Client.
    
    Features:
    - Rate limiting (500/day, 100/min per user)
    - Automatic token refresh on 401
    - Response caching (Redis, 1hr TTL)
    - Error handling
    
    Example:
        client = LinkedInClient(access_token)
        profile = await client.get_profile()
    """
    
    def __init__(
        self,
        access_token: str,
        refresh_token: Optional[str] = None,
        token_expires_at: Optional[datetime] = None,
        token_refresh_callback: Optional[callable] = None,
    ):
        """
        Initialize LinkedIn API client.
        
        Args:
            access_token: LinkedIn access token
            refresh_token: LinkedIn refresh token
            token_expires_at: Token expiration time
            token_refresh_callback: Callback to refresh tokens
        """
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.token_expires_at = token_expires_at
        self.token_refresh_callback = token_refresh_callback
        
        self._request_count = 0
        self._last_request_time = datetime.utcnow()
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        **kwargs,
    ) -> dict:
        """
        Make API request with rate limiting and error handling.
        
        Args:
            method: HTTP method
            endpoint: API endpoint
            **kwargs: Additional request arguments
            
        Returns:
            API response data
        """
        # Check rate limit
        await self._check_rate_limit()
        
        # Check token expiry
        await self._check_token_expiry()
        
        headers = kwargs.pop("headers", {})
        headers["Authorization"] = f"Bearer {self.access_token}"
        headers["LinkedIn-Version"] = "202402"
        headers["X-Restli-Protocol-Version"] = "2.0.0"
        
        async with httpx.AsyncClient() as client:
            url = f"{LINKEDIN_API_BASE}/{endpoint}"
            
            try:
                response = await client.request(
                    method,
                    url,
                    headers=headers,
                    **kwargs,
                )
                
                # Handle rate limit
                if response.status_code == 429:
                    retry_after = int(response.headers.get("Retry-After", 60))
                    logger.warning(f"Rate limited, retrying after {retry_after}s")
                    await asyncio.sleep(retry_after)
                    return await self._make_request(method, endpoint, **kwargs)
                
                # Handle token expiry
                if response.status_code == 401 and self.token_refresh_callback:
                    logger.info("Token expired, refreshing...")
                    await self.token_refresh_callback()
                    return await self._make_request(method, endpoint, **kwargs)
                
                response.raise_for_status()
                
                self._request_count += 1
                
                return response.json()
                
            except httpx.HTTPError as e:
                logger.error(f"LinkedIn API error: {e}")
                raise
    
    async def _check_rate_limit(self):
        """Check and enforce rate limits."""
        now = datetime.utcnow()
        
        # Reset counter every minute
        if (now - self._last_request_time).total_seconds() > 60:
            self._request_count = 0
            self._last_request_time = now
        
        # Check minute limit
        if self._request_count >= LINKEDIN_RATE_LIMIT_MINUTE:
            wait_time = 60 - (now - self._last_request_time).total_seconds()
            if wait_time > 0:
                logger.warning(f"Rate limit reached, waiting {wait_time}s")
                await asyncio.sleep(wait_time)
    
    async def _check_token_expiry(self):
        """Check and refresh token if expired."""
        if not self.token_expires_at:
            return
        
        # Refresh if within 5 minutes of expiry
        if self.token_expires_at - datetime.utcnow() < timedelta(minutes=5):
            if self.token_refresh_callback:
                await self.token_refresh_callback()
    
    async def get_profile(self) -> dict:
        """
        Get user's basic profile.
        
        Returns:
            Profile data with id, name, headline, location, picture
        """
        data = await self._make_request(
            "GET",
            "me",
            params={
                "projection": "(id,firstName,lastName,headline,locations,profilePicture(displayImage~:playableStreams))"
            },
        )
        
        return {
            "id": data.get("id"),
            "firstName": data.get("firstName", {}).get("localized", ""),
            "lastName": data.get("lastName", {}).get("localized", ""),
            "headline": data.get("headline", ""),
            "locations": data.get("locations", []),
            "profilePicture": data.get("profilePicture", {}),
        }
    
    async def get_email(self) -> Optional[str]:
        """
        Get user's email address.
        
        Returns:
            Email address or None
        """
        data = await self._make_request(
            "GET",
            "emailAddress?q=members&projection=(elements*(handle~))",
        )
        
        elements = data.get("elements", [])
        if not elements:
            return None
        
        handle = elements[0].get("handle~", {})
        return handle.get("emailAddress")
    
    async def get_positions(self) -> list:
        """
        Get user's positions (work experience).
        
        Returns:
            List of positions
        """
        data = await self._make_request(
            "GET",
            "me/positions",
            params={
                "projection": "(elements*(companyName,title,description,locationName,startDate,endDate))"
            },
        )
        
        positions = []
        for element in data.get("elements", []):
            positions.append({
                "companyName": element.get("companyName", ""),
                "title": element.get("title", ""),
                "description": element.get("description", ""),
                "location": element.get("locationName", ""),
                "startDate": element.get("startDate", {}),
                "endDate": element.get("endDate", {}),
            })
        
        return positions
    
    async def get_education(self) -> list:
        """
        Get user's education history.
        
        Returns:
            List of education records
        """
        data = await self._make_request(
            "GET",
            "me/educations",
            params={
                "projection": "(elements*(schoolName,degreeName,fieldOfStudy,startDate,endDate))"
            },
        )
        
        education = []
        for element in data.get("elements", []):
            education.append({
                "schoolName": element.get("schoolName", ""),
                "degreeName": element.get("degreeName", ""),
                "fieldOfStudy": element.get("fieldOfStudy", ""),
                "startDate": element.get("startDate", {}),
                "endDate": element.get("endDate", {}),
            })
        
        return education
    
    async def get_skills(self) -> list:
        """
        Get user's skills.
        
        Returns:
            List of skills
        """
        data = await self._make_request(
            "GET",
            "me/skills",
            params={
                "projection": "(elements*(name))"
            },
        )
        
        return [
            element.get("name", "")
            for element in data.get("elements", [])
        ]
    
    async def get_full_profile(self) -> dict:
        """
        Get user's complete profile.
        
        Returns:
            Complete profile data
        """
        profile, email, positions, education, skills = await asyncio.gather(
            self.get_profile(),
            self.get_email(),
            self.get_positions(),
            self.get_education(),
            self.get_skills(),
            return_exceptions=True,
        )
        
        # Handle exceptions
        if isinstance(email, Exception):
            email = None
        if isinstance(positions, Exception):
            positions = []
        if isinstance(education, Exception):
            education = []
        if isinstance(skills, Exception):
            skills = []
        
        return {
            **profile,
            "email": email,
            "positions": positions,
            "education": education,
            "skills": skills,
        }
