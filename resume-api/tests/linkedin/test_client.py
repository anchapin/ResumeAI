"""
Tests for LinkedIn API Client.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from lib.linkedin.client import LinkedInClient


class TestLinkedInClient:
    """Test LinkedInClient class."""

    @pytest.fixture
    def client(self):
        """Create client instance."""
        return LinkedInClient(
            access_token="test_access_token",
            refresh_token="test_refresh_token",
            token_expires_at=datetime.utcnow() + timedelta(hours=1),
        )

    @pytest.mark.asyncio
    async def test_get_profile(self, client):
        """Test profile fetching."""
        with patch('httpx.AsyncClient.request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value={
                    "id": "test_id",
                    "firstName": {"localized": "Test"},
                    "lastName": {"localized": "User"},
                    "headline": "Test Headline",
                })
            )
            
            profile = await client.get_profile()
            
            assert profile["id"] == "test_id"
            assert profile["firstName"] == "Test"
            assert profile["lastName"] == "User"

    @pytest.mark.asyncio
    async def test_get_email(self, client):
        """Test email fetching."""
        with patch('httpx.AsyncClient.request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value={
                    "elements": [
                        {"handle~": {"emailAddress": "test@example.com"}}
                    ]
                })
            )
            
            email = await client.get_email()
            
            assert email == "test@example.com"

    @pytest.mark.asyncio
    async def test_get_positions(self, client):
        """Test positions fetching."""
        with patch('httpx.AsyncClient.request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value={
                    "elements": [
                        {
                            "companyName": "Test Corp",
                            "title": "Engineer",
                            "startDate": {"year": 2020, "month": 1},
                        }
                    ]
                })
            )
            
            positions = await client.get_positions()
            
            assert len(positions) == 1
            assert positions[0]["companyName"] == "Test Corp"
            assert positions[0]["title"] == "Engineer"

    @pytest.mark.asyncio
    async def test_get_education(self, client):
        """Test education fetching."""
        with patch('httpx.AsyncClient.request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value={
                    "elements": [
                        {
                            "schoolName": "Test University",
                            "degreeName": "Bachelor",
                            "fieldOfStudy": "Computer Science",
                        }
                    ]
                })
            )
            
            education = await client.get_education()
            
            assert len(education) == 1
            assert education[0]["schoolName"] == "Test University"

    @pytest.mark.asyncio
    async def test_get_skills(self, client):
        """Test skills fetching."""
        with patch('httpx.AsyncClient.request', new_callable=AsyncMock) as mock_request:
            mock_request.return_value = MagicMock(
                status_code=200,
                json=MagicMock(return_value={
                    "elements": [
                        {"name": "Python"},
                        {"name": "JavaScript"},
                    ]
                })
            )
            
            skills = await client.get_skills()
            
            assert len(skills) == 2
            assert "Python" in skills
            assert "JavaScript" in skills

    @pytest.mark.asyncio
    async def test_get_full_profile(self, client):
        """Test full profile fetching."""
        with patch.object(client, 'get_profile', new_callable=AsyncMock) as mock_profile:
            mock_profile.return_value = {
                "id": "test_id",
                "firstName": "Test",
                "lastName": "User",
            }
            
            with patch.object(client, 'get_email', new_callable=AsyncMock) as mock_email:
                mock_email.return_value = "test@example.com"
                
                with patch.object(client, 'get_positions', new_callable=AsyncMock) as mock_positions:
                    mock_positions.return_value = []
                    
                    with patch.object(client, 'get_education', new_callable=AsyncMock) as mock_education:
                        mock_education.return_value = []
                        
                        with patch.object(client, 'get_skills', new_callable=AsyncMock) as mock_skills:
                            mock_skills.return_value = []
                            
                            profile = await client.get_full_profile()
                            
                            assert profile["id"] == "test_id"
                            assert profile["email"] == "test@example.com"

    @pytest.mark.asyncio
    async def test_rate_limiting(self, client):
        """Test rate limiting."""
        # Set client at rate limit
        client._request_count = 100
        client._last_request_time = datetime.utcnow()
        
        with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
            with patch('httpx.AsyncClient.request', new_callable=AsyncMock) as mock_request:
                mock_request.return_value = MagicMock(
                    status_code=200,
                    json=MagicMock(return_value={})
                )
                
                await client._make_request("GET", "me")
                
                # Should have waited
                mock_sleep.assert_called_once()

    @pytest.mark.asyncio
    async def test_token_expiry_check(self, client):
        """Test token expiry checking."""
        # Set token to expire soon
        client.token_expires_at = datetime.utcnow() + timedelta(minutes=3)
        
        # Should trigger refresh callback if set
        refresh_called = False
        
        async def mock_refresh():
            nonlocal refresh_called
            refresh_called = True
        
        client.token_refresh_callback = mock_refresh
        
        await client._check_token_expiry()
        
        assert refresh_called == True

    @pytest.mark.asyncio
    async def test_401_triggers_refresh(self, client):
        """Test 401 response triggers token refresh."""
        refresh_called = False
        
        async def mock_refresh():
            nonlocal refresh_called
            refresh_called = True
            client.access_token = "new_token"
        
        client.token_refresh_callback = mock_refresh
        
        with patch('httpx.AsyncClient.request', new_callable=AsyncMock) as mock_request:
            # First call returns 401, second returns 200
            mock_request.side_effect = [
                MagicMock(status_code=401),
                MagicMock(
                    status_code=200,
                    json=MagicMock(return_value={})
                ),
            ]
            
            await client._make_request("GET", "me")
            
            assert refresh_called == True

    @pytest.mark.asyncio
    async def test_429_triggers_retry(self, client):
        """Test 429 response triggers retry."""
        with patch('httpx.AsyncClient.request', new_callable=AsyncMock) as mock_request:
            # First call returns 429, second returns 200
            mock_request.side_effect = [
                MagicMock(
                    status_code=429,
                    headers={"Retry-After": "1"}
                ),
                MagicMock(
                    status_code=200,
                    json=MagicMock(return_value={})
                ),
            ]
            
            with patch('asyncio.sleep', new_callable=AsyncMock):
                await client._make_request("GET", "me")
                
                # Should have been called twice
                assert mock_request.call_count == 2
