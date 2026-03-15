"""
Tests for Notification Sender.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from lib.alerts.sender import NotificationSender
from lib.alerts.models import NotificationPreference


class TestNotificationSender:
    """Test NotificationSender class."""

    @pytest.fixture
    def sender(self):
        """Create sender instance."""
        db_session = AsyncMock()
        email_client = AsyncMock()
        sms_client = AsyncMock()
        return NotificationSender(db_session, email_client, sms_client)

    @pytest.fixture
    def mock_user(self):
        """Create mock user."""
        user = MagicMock()
        user.id = 1
        user.email = "test@example.com"
        return user

    @pytest.fixture
    def mock_alert(self):
        """Create mock alert."""
        alert = MagicMock()
        alert.id = 1
        alert.name = "Test Alert"
        return alert

    @pytest.fixture
    def mock_jobs(self):
        """Create mock jobs."""
        return [
            MagicMock(
                id="job1",
                title="Engineer",
                company="Tech Corp",
                location="San Francisco",
                remote=True,
                salary_min=100000,
                salary_max=150000,
                url="https://example.com/job1",
            )
        ]

    @pytest.mark.asyncio
    async def test_send_email_alert(self, sender, mock_user, mock_alert, mock_jobs):
        """Test sending email alert."""
        # Mock preferences
        prefs = MagicMock(spec=NotificationPreference)
        prefs.email_enabled = True
        prefs.email_address = "test@example.com"
        sender._get_preferences = AsyncMock(return_value=prefs)
        
        # Mock send_email
        sender._send_email = AsyncMock()
        
        result = await sender.send_email_alert(mock_user, mock_alert, mock_jobs)
        
        assert result == True
        sender._send_email.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_email_alert_disabled(self, sender, mock_user, mock_alert, mock_jobs):
        """Test sending email when disabled."""
        prefs = MagicMock(spec=NotificationPreference)
        prefs.email_enabled = False
        sender._get_preferences = AsyncMock(return_value=prefs)
        
        result = await sender.send_email_alert(mock_user, mock_alert, mock_jobs)
        
        assert result == False

    @pytest.mark.asyncio
    async def test_send_email_alert_no_jobs(self, sender, mock_user, mock_alert):
        """Test sending email with no jobs."""
        result = await sender.send_email_alert(mock_user, mock_alert, [])
        
        assert result == False

    @pytest.mark.asyncio
    async def test_send_sms_alert(self, sender, mock_user, mock_alert, mock_jobs):
        """Test sending SMS alert."""
        prefs = MagicMock(spec=NotificationPreference)
        prefs.sms_enabled = True
        prefs.phone_number = "5551234567"
        prefs.phone_country_code = "+1"
        sender._get_preferences = AsyncMock(return_value=prefs)
        
        sender._send_sms = AsyncMock()
        
        result = await sender.send_sms_alert(mock_user, mock_alert, mock_jobs)
        
        assert result == True
        sender._send_sms.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_sms_alert_disabled(self, sender, mock_user, mock_alert, mock_jobs):
        """Test sending SMS when disabled."""
        prefs = MagicMock(spec=NotificationPreference)
        prefs.sms_enabled = False
        sender._get_preferences = AsyncMock(return_value=prefs)
        
        result = await sender.send_sms_alert(mock_user, mock_alert, mock_jobs)
        
        assert result == False

    @pytest.mark.asyncio
    async def test_send_daily_digest(self, sender, mock_user, mock_jobs):
        """Test sending daily digest."""
        prefs = MagicMock(spec=NotificationPreference)
        prefs.email_enabled = True
        prefs.daily_digest = True
        sender._get_preferences = AsyncMock(return_value=prefs)
        
        sender._send_email = AsyncMock()
        
        result = await sender.send_daily_digest(mock_user, mock_jobs)
        
        assert result == True

    @pytest.mark.asyncio
    async def test_send_daily_digest_disabled(self, sender, mock_user, mock_jobs):
        """Test sending daily digest when disabled."""
        prefs = MagicMock(spec=NotificationPreference)
        prefs.daily_digest = False
        sender._get_preferences = AsyncMock(return_value=prefs)
        
        result = await sender.send_daily_digest(mock_user, mock_jobs)
        
        assert result == False

    @pytest.mark.asyncio
    async def test_send_weekly_digest(self, sender, mock_user, mock_jobs):
        """Test sending weekly digest."""
        prefs = MagicMock(spec=NotificationPreference)
        prefs.email_enabled = True
        prefs.weekly_digest = True
        sender._get_preferences = AsyncMock(return_value=prefs)
        
        sender._send_email = AsyncMock()
        
        result = await sender.send_weekly_digest(mock_user, mock_jobs)
        
        assert result == True

    @pytest.mark.asyncio
    async def test_get_preferences(self, sender, mock_user):
        """Test getting user preferences."""
        mock_prefs = MagicMock(spec=NotificationPreference)
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_prefs
        sender.db.execute = AsyncMock(return_value=mock_result)
        
        prefs = await sender._get_preferences(mock_user.id)
        
        assert prefs == mock_prefs

    def test_render_email_template(self, sender, mock_user, mock_alert, mock_jobs):
        """Test rendering email template."""
        html = sender._render_email_template(mock_user, mock_alert, mock_jobs)
        
        assert "Test Alert" in html
        assert "Engineer" in html
        assert "Tech Corp" in html
        assert "https://example.com/job1" in html

    def test_render_text_template(self, sender, mock_user, mock_alert, mock_jobs):
        """Test rendering text template."""
        text = sender._render_text_template(mock_user, mock_alert, mock_jobs)
        
        assert "Test Alert" in text
        assert "Engineer" in text
        assert "Tech Corp" in text

    def test_render_sms_template(self, sender, mock_alert, mock_jobs):
        """Test rendering SMS template."""
        sms = sender._render_sms_template(mock_alert, mock_jobs)
        
        # SMS should be short
        assert len(sms) <= 160
        assert "Test Alert" in sms

    def test_render_digest_template(self, sender, mock_user, mock_jobs):
        """Test rendering digest template."""
        html = sender._render_digest_template(mock_user, mock_jobs, "daily")
        
        assert "Daily Digest" in html
        assert "Engineer" in html
