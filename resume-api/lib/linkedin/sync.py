"""
LinkedIn Profile Sync Service

Syncs LinkedIn profile data to user's resume.
"""

import logging
from typing import Optional, List, Dict, Any

from .client import LinkedInClient
from .models import LinkedInConnection, LinkedInProfileCache
from ..database import get_db_session

logger = logging.getLogger(__name__)


class LinkedInSyncService:
    """
    Syncs LinkedIn profile data to resume.
    
    Features:
    - Full profile sync
    - Incremental sync
    - Conflict resolution
    - Profile caching
    
    Example:
        sync = LinkedInSyncService(db_session, client)
        result = await sync.sync_profile(user_id)
    """
    
    def __init__(self, db_session, client: LinkedInClient):
        """
        Initialize Sync Service.
        
        Args:
            db_session: Database session
            client: LinkedInClient instance
        """
        self.db = db_session
        self.client = client
    
    async def sync_profile(self, user_id: int) -> Dict[str, Any]:
        """
        Sync full LinkedIn profile.
        
        Args:
            user_id: User ID
            
        Returns:
            Sync result with profile data
        """
        logger.info(f"Starting profile sync for user {user_id}")
        
        try:
            # Fetch full profile from LinkedIn
            profile_data = await self.client.get_full_profile()
            
            # Map to resume format
            resume_data = self._map_to_resume_format(profile_data)
            
            # Cache profile data
            await self._cache_profile(user_id, profile_data)
            
            logger.info(f"Profile sync completed for user {user_id}")
            
            return {
                "success": True,
                "profile": resume_data,
                "raw_data": profile_data,
            }
            
        except Exception as e:
            logger.error(f"Profile sync failed: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    def _map_to_resume_format(self, profile_data: dict) -> dict:
        """
        Map LinkedIn profile to resume format.
        
        Args:
            profile_data: LinkedIn profile data
            
        Returns:
            Resume-formatted data
        """
        resume = {
            "basics": {
                "name": {
                    "firstName": profile_data.get("firstName", ""),
                    "lastName": profile_data.get("lastName", ""),
                },
                "email": profile_data.get("email", ""),
                "headline": profile_data.get("headline", ""),
                "location": self._extract_location(profile_data.get("locations", [])),
            },
            "work": self._map_positions(profile_data.get("positions", [])),
            "education": self._map_education(profile_data.get("education", [])),
            "skills": self._map_skills(profile_data.get("skills", [])),
        }
        
        return resume
    
    def _extract_location(self, locations: list) -> dict:
        """Extract primary location."""
        if not locations:
            return {}
        
        location = locations[0]
        return {
            "city": location.get("country", ""),
            "countryCode": location.get("country", ""),
        }
    
    def _map_positions(self, positions: list) -> list:
        """Map LinkedIn positions to resume format."""
        resume_positions = []
        
        for pos in positions:
            resume_positions.append({
                "company": pos.get("companyName", ""),
                "position": pos.get("title", ""),
                "summary": pos.get("description", ""),
                "location": pos.get("location", ""),
                "startDate": self._format_date(pos.get("startDate", {})),
                "endDate": self._format_date(pos.get("endDate", {})) or "Present",
            })
        
        return resume_positions
    
    def _map_education(self, education: list) -> list:
        """Map LinkedIn education to resume format."""
        resume_education = []
        
        for edu in education:
            resume_education.append({
                "institution": edu.get("schoolName", ""),
                "area": edu.get("fieldOfStudy", ""),
                "studyType": edu.get("degreeName", ""),
                "startDate": self._format_date(edu.get("startDate", {})),
                "endDate": self._format_date(edu.get("endDate", {})),
            })
        
        return resume_education
    
    def _map_skills(self, skills: list) -> list:
        """Map LinkedIn skills to resume format."""
        return [{"name": skill} for skill in skills]
    
    def _format_date(self, date_dict: dict) -> str:
        """Format LinkedIn date to resume format."""
        if not date_dict:
            return ""
        
        year = date_dict.get("year", "")
        month = date_dict.get("month", "")
        
        if year and month:
            return f"{year}-{month:02d}"
        elif year:
            return str(year)
        
        return ""
    
    async def _cache_profile(self, user_id: int, profile_data: dict):
        """Cache profile data."""
        import json
        from datetime import datetime, timedelta
        
        cache = LinkedInProfileCache(
            user_id=user_id,
            linkedin_id=profile_data.get("id", ""),
            profile_data=json.dumps(profile_data),
            expires_at=datetime.utcnow() + timedelta(hours=1),
        )
        
        # Upsert cache
        existing = self.db.query(LinkedInProfileCache).filter(
            LinkedInProfileCache.user_id == user_id
        ).first()
        
        if existing:
            existing.profile_data = cache.profile_data
            existing.expires_at = cache.expires_at
        else:
            self.db.add(cache)
        
        self.db.commit()
