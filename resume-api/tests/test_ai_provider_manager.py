"""Unit tests for AI Provider Manager with fallback logic."""
import sys
import pytest
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path("resume-api").absolute()))

from lib.utils.ai_provider_manager import AIProviderManager, ProviderType, ProviderStatus
from lib.utils.circuit_breaker import CircuitBreaker, CircuitState, openai_breaker, claude_breaker, gemini_breaker


class TestProviderStatus:
    """Test ProviderStatus class."""

    def test_is_available_when_closed(self):
        breaker = CircuitBreaker(name="test")
        status = ProviderStatus(ProviderType.OPENAI, breaker)
        assert status.is_available() is True
        assert status.is_degraded() is False
        assert status.is_unavailable() is False

    def test_is_unavailable_when_open(self):
        breaker = CircuitBreaker(name="test")
        breaker.state = CircuitState.OPEN
        status = ProviderStatus(ProviderType.GEMINI, breaker)
        assert status.is_available() is False
        assert status.is_unavailable() is True


class TestAIProviderManagerInitialization:
    """Test AIProviderManager initialization."""

    def test_initialization_no_providers(self):
        manager = AIProviderManager()
        assert len(manager.providers) == 0

    def test_initialization_with_providers(self):
        providers = {
            ProviderType.OPENAI: MagicMock(),
            ProviderType.CLAUDE: MagicMock(),
        }
        manager = AIProviderManager(providers=providers)
        assert ProviderType.OPENAI in manager.providers
        assert ProviderType.CLAUDE in manager.providers

    def test_default_provider_priority(self):
        manager = AIProviderManager()
        assert manager.provider_priority == [
            ProviderType.OPENAI, ProviderType.CLAUDE, ProviderType.GEMINI,
        ]


class TestAIProviderManagerFallback:
    """Test fallback logic when providers fail."""

    def setup_method(self):
        openai_breaker.reset()
        claude_breaker.reset()
        gemini_breaker.reset()

    def test_fallback_on_circuit_breaker_open(self):
        primary = MagicMock()
        secondary = MagicMock()
        manager = AIProviderManager(
            providers={ProviderType.OPENAI: primary, ProviderType.CLAUDE: secondary}
        )
        openai_breaker.failure_count = 5
        openai_breaker.state = CircuitState.OPEN
        secondary.generate_response.return_value = "Claude response"
        response, provider = manager.generate_response("Test prompt")
        assert response == "Claude response"
        assert provider == ProviderType.CLAUDE

    def test_all_providers_unavailable_raises_error(self):
        openai_breaker.state = CircuitState.OPEN
        claude_breaker.state = CircuitState.OPEN
        manager = AIProviderManager(
            providers={
                ProviderType.OPENAI: MagicMock(),
                ProviderType.CLAUDE: MagicMock(),
            }
        )
        with pytest.raises(RuntimeError, match="All AI providers unavailable"):
            manager.generate_response("Test prompt")

    def test_no_providers_configured_raises_error(self):
        manager = AIProviderManager()
        with pytest.raises(ValueError, match="No AI providers configured"):
            manager.generate_response("Test prompt")


class TestAIProviderManagerStatus:
    """Test status reporting methods."""

    def setup_method(self):
        openai_breaker.reset()
        claude_breaker.reset()

    def test_get_provider_status(self):
        manager = AIProviderManager(
            providers={
                ProviderType.OPENAI: MagicMock(),
                ProviderType.CLAUDE: MagicMock(),
            }
        )
        status = manager.get_provider_status()
        assert "openai" in status
        assert "claude" in status
        assert status["openai"]["available"] is True
        assert status["openai"]["unavailable"] is False


class TestAIProviderManagerReset:
    """Test circuit breaker reset methods."""

    def test_reset_provider(self):
        openai_breaker.state = CircuitState.OPEN
        manager = AIProviderManager(
            providers={ProviderType.OPENAI: MagicMock()}
        )
        assert openai_breaker.get_state() == "OPEN"
        manager.reset_provider(ProviderType.OPENAI)
        assert openai_breaker.get_state() == "CLOSED"

    def test_reset_all_providers(self):
        openai_breaker.state = CircuitState.OPEN
        claude_breaker.state = CircuitState.OPEN
        manager = AIProviderManager(
            providers={
                ProviderType.OPENAI: MagicMock(),
                ProviderType.CLAUDE: MagicMock(),
            }
        )
        manager.reset_all_providers()
        assert openai_breaker.get_state() == "CLOSED"
        assert claude_breaker.get_state() == "CLOSED"
