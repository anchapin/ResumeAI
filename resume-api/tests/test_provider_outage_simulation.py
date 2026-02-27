"""Simulated AI Provider Outage Tests."""

import sys
import pytest
from pathlib import Path
from unittest.mock import MagicMock
from datetime import datetime, timedelta

sys.path.insert(0, str(Path("resume-api").absolute()))

from lib.utils.ai_provider_manager import AIProviderManager, ProviderType
from lib.utils.circuit_breaker import (
    CircuitState,
    openai_breaker,
    claude_breaker,
    gemini_breaker,
)


class TestProviderOutageScenarios:
    """Test real-world provider outage scenarios."""

    def setup_method(self):
        openai_breaker.reset()
        claude_breaker.reset()
        gemini_breaker.reset()

    def teardown_method(self):
        openai_breaker.reset()
        claude_breaker.reset()
        gemini_breaker.reset()

    def test_scenario_primary_provider_goes_down(self):
        """OpenAI API becomes unavailable - fallback to Claude."""
        primary = MagicMock()
        secondary = MagicMock()
        primary.generate_response.side_effect = Exception("OpenAI unavailable")
        secondary.generate_response.return_value = "Claude response"

        manager = AIProviderManager(
            providers={
                ProviderType.OPENAI: primary,
                ProviderType.CLAUDE: secondary,
            }
        )

        for i in range(6):
            try:
                manager.generate_response(f"Request {i+1}")
            except RuntimeError:
                pass

        assert openai_breaker.get_state() == "OPEN"
        response, provider = manager.generate_response("Request after outage")
        assert provider == ProviderType.CLAUDE
        assert response == "Claude response"

    def test_scenario_cascading_failures(self):
        """Multiple providers fail - system degrades gracefully."""
        providers = {
            ProviderType.OPENAI: MagicMock(),
            ProviderType.CLAUDE: MagicMock(),
            ProviderType.GEMINI: MagicMock(),
        }

        for provider in providers.values():
            provider.generate_response.side_effect = Exception("Service unavailable")

        manager = AIProviderManager(providers=providers)

        for _ in range(15):
            try:
                manager.generate_response("Request")
            except RuntimeError:
                pass

        assert openai_breaker.get_state() == "OPEN"
        assert claude_breaker.get_state() == "OPEN"
        assert gemini_breaker.get_state() == "OPEN"

        with pytest.raises(RuntimeError, match="All AI providers unavailable"):
            manager.generate_response("Final request")

    def test_scenario_partial_failure(self):
        """One provider fails, others work."""
        primary = MagicMock()
        secondary = MagicMock()
        tertiary = MagicMock()

        primary.generate_response.side_effect = Exception("OpenAI rate limited")
        secondary.generate_response.return_value = "Claude response"
        tertiary.generate_response.return_value = "Gemini response"

        manager = AIProviderManager(
            providers={
                ProviderType.OPENAI: primary,
                ProviderType.CLAUDE: secondary,
                ProviderType.GEMINI: tertiary,
            }
        )

        for _ in range(5):
            try:
                manager.generate_response("Request")
            except RuntimeError:
                pass

        status = manager.get_provider_status()
        assert status["openai"]["unavailable"] is True
        assert status["claude"]["available"] is True

        response, provider = manager.generate_response("Request")
        assert provider == ProviderType.CLAUDE


class TestCircuitBreakerMetrics:
    """Test circuit breaker metrics during outages."""

    def setup_method(self):
        openai_breaker.reset()

    def test_track_failure_progression(self):
        """Track failure count during outage."""
        provider = MagicMock()
        provider.generate_response.side_effect = Exception("Error")

        manager = AIProviderManager(providers={ProviderType.OPENAI: provider})

        for i in range(5):
            try:
                manager.generate_response("Request")
            except RuntimeError:
                pass

            failure_count = openai_breaker.failure_count
            assert failure_count == i + 1

        assert openai_breaker.get_state() == "OPEN"

    def test_retry_window_calculation(self):
        """Test retry window is properly calculated."""
        openai_breaker.timeout = 60
        openai_breaker.state = CircuitState.OPEN
        openai_breaker.open_time = datetime.utcnow() - timedelta(seconds=30)

        retry_delay = openai_breaker._time_until_retry()
        assert 25 <= retry_delay <= 35
