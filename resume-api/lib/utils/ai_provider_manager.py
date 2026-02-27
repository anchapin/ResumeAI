"""AI Provider Manager with Fallback Logic for Circuit Breaker Pattern."""
import logging
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from .circuit_breaker import (
    CircuitBreaker, CircuitBreakerOpen,
    openai_breaker, claude_breaker, gemini_breaker,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProviderType(Enum):
    """AI Provider types."""
    OPENAI = "openai"
    CLAUDE = "claude"
    GEMINI = "gemini"

class ProviderStatus:
    """Status of an AI provider."""
    def __init__(self, provider_type: ProviderType, circuit_breaker: CircuitBreaker):
        self.provider_type = provider_type
        self.circuit_breaker = circuit_breaker

    def is_available(self) -> bool:
        return self.circuit_breaker.get_state() == "CLOSED"

    def is_degraded(self) -> bool:
        return self.circuit_breaker.get_state() == "HALF_OPEN"

    def is_unavailable(self) -> bool:
        return self.circuit_breaker.get_state() == "OPEN"

    def get_state(self) -> str:
        return self.circuit_breaker.get_state()

    def get_retry_delay(self) -> int:
        if self.is_unavailable():
            return self.circuit_breaker._time_until_retry()
        return 0

class AIProviderManager:
    """Manages multiple AI providers with automatic fallback."""

    def __init__(
        self,
        providers: Optional[Dict[ProviderType, Any]] = None,
        provider_priority: Optional[List[ProviderType]] = None,
    ):
        """Initialize provider manager."""
        self.providers: Dict[ProviderType, Optional[Any]] = providers or {}
        self.breakers: Dict[ProviderType, CircuitBreaker] = {
            ProviderType.OPENAI: openai_breaker,
            ProviderType.CLAUDE: claude_breaker,
            ProviderType.GEMINI: gemini_breaker,
        }

        if provider_priority is None:
            self.provider_priority = [
                ProviderType.OPENAI, ProviderType.CLAUDE, ProviderType.GEMINI,
            ]
        else:
            self.provider_priority = provider_priority

    def generate_response(
        self,
        prompt: str,
        preferred_provider: Optional[ProviderType] = None,
    ) -> Tuple[str, ProviderType]:
        """Generate response with automatic fallback."""
        if not self.providers:
            raise ValueError("No AI providers configured")

        if preferred_provider and preferred_provider in self.providers:
            provider_order = [preferred_provider]
            provider_order.extend(p for p in self.provider_priority if p != preferred_provider)
        else:
            provider_order = self.provider_priority

        last_error: Optional[Exception] = None
        for provider_type in provider_order:
            provider = self.providers.get(provider_type)
            if not provider:
                logger.debug(f"Provider {provider_type.value} not configured")
                continue

            breaker = self.breakers[provider_type]
            if breaker.get_state() == "OPEN":
                logger.warning(
                    f"Skipping {provider_type.value}: circuit OPEN "
                    f"(retry in {breaker._time_until_retry()}s)"
                )
                continue

            try:
                logger.info(f"Attempting {provider_type.value} provider")
                response = provider.generate_response(prompt)
                logger.info(f"Success with {provider_type.value} provider")
                return response, provider_type
            except CircuitBreakerOpen as e:
                logger.warning(f"{provider_type.value} breaker opened: {e}")
                last_error = e
                continue
            except Exception as e:
                logger.warning(f"{provider_type.value} failed: {e}")
                last_error = e
                continue

        raise RuntimeError(f"All AI providers unavailable. Last error: {last_error}") from last_error

    def get_provider_status(self) -> Dict[str, Any]:
        """Get status of all providers."""
        status = {}
        for provider_type, breaker in self.breakers.items():
            provider_status = ProviderStatus(provider_type, breaker)
            status[provider_type.value] = {
                "state": breaker.get_state(),
                "available": provider_status.is_available(),
                "degraded": provider_status.is_degraded(),
                "unavailable": provider_status.is_unavailable(),
                "retry_delay_seconds": provider_status.get_retry_delay(),
                "configured": provider_type in self.providers and self.providers[provider_type] is not None,
            }
        return status

    def reset_provider(self, provider_type: ProviderType) -> bool:
        """Manually reset a provider's circuit breaker."""
        if provider_type not in self.breakers:
            return False
        self.breakers[provider_type].reset()
        logger.info(f"Reset {provider_type.value} circuit breaker")
        return True

    def reset_all_providers(self) -> None:
        """Reset all circuit breakers."""
        for breaker in self.breakers.values():
            breaker.reset()
        logger.info("Reset all provider circuit breakers")

    def get_available_providers(self) -> List[ProviderType]:
        """Get list of available providers."""
        available = []
        for provider_type, breaker in self.breakers.items():
            if (provider_type in self.providers
                and self.providers[provider_type] is not None
                and breaker.get_state() == "CLOSED"):
                available.append(provider_type)
        return available

    def set_provider_priority(self, priority: List[ProviderType]) -> None:
        """Set fallback priority order."""
        for provider_type in priority:
            if provider_type not in self.providers:
                logger.warning(f"Provider {provider_type.value} not configured")
        self.provider_priority = priority
        logger.info(f"Set provider priority: {', '.join(p.value for p in self.provider_priority)}")
