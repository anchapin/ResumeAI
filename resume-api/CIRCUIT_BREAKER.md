# Circuit Breaker Pattern Implementation

## Overview

The circuit breaker pattern protects the ResumeAI system from cascading failures when calling external AI providers (OpenAI, Claude, Gemini). It prevents repeated calls to failing services and allows graceful degradation.

## Architecture

### States

The circuit breaker operates in three states:

```
CLOSED → (5 failures) → OPEN → (60 seconds timeout) → HALF_OPEN → (1 failure) ↘
  ↑                                                         ↓            OPEN
  └─ (2 successes) ← HALF_OPEN ←────────────────────────────┘
```

- **CLOSED**: Normal operation. All calls pass through. Track failures.
- **OPEN**: Service is failing. Immediately reject calls without attempting. 
- **HALF_OPEN**: Testing if service recovered. Allow limited calls to verify recovery.

### Configuration

Default thresholds (per provider):
```python
failure_threshold = 5      # Failures before opening circuit
success_threshold = 2      # Successes in HALF_OPEN to close
timeout = 60               # Seconds before OPEN → HALF_OPEN
```

## Implementation Files

### Core Module
- **`lib/utils/circuit_breaker.py`**: Circuit breaker implementation
  - `CircuitBreaker` class: Main circuit breaker logic
  - `CircuitBreakerOpen` exception: Raised when circuit is open
  - Global instances: `openai_breaker`, `claude_breaker`, `gemini_breaker`

### Integration
- **`lib/utils/ai.py`**: AI providers integrated with circuit breakers
  - `OpenAIProvider.generate_response()`: Wrapped with circuit breaker
  - `AnthropicProvider.generate_response()`: Wrapped with circuit breaker  
  - `GeminiProvider.generate_response()`: Wrapped with circuit breaker

### Tests
- **`tests/test_circuit_breaker.py`**: Comprehensive unit tests
  - State transitions
  - Threshold testing
  - Timeout handling
  - Exception propagation
  - Manual reset

## Usage

### Basic Usage with AI Provider

```python
from lib.utils.ai import OpenAIProvider
from lib.utils.circuit_breaker import CircuitBreakerOpen

provider = OpenAIProvider(api_key="sk-...")

try:
    response = provider.generate_response("Write a summary")
except CircuitBreakerOpen as e:
    # Circuit is open, service unavailable
    logger.error(f"OpenAI service unavailable: {e}")
    # Use fallback provider or return cached response
except Exception as e:
    # Original API error
    logger.error(f"OpenAI API error: {e}")
```

### Using Circuit Breaker Directly

```python
from lib.utils.circuit_breaker import CircuitBreaker, CircuitBreakerOpen

breaker = CircuitBreaker(
    name="my_service",
    failure_threshold=5,
    success_threshold=2,
    timeout=60
)

def call_external_api(param):
    # Your API call
    return api.call(param)

try:
    result = breaker.call(call_external_api, "param")
except CircuitBreakerOpen:
    # Service is unavailable
    result = get_cached_result()
except Exception:
    # Original exception
    raise
```

### Checking Circuit State

```python
from lib.utils.circuit_breaker import openai_breaker

state = openai_breaker.get_state()  # Returns "CLOSED", "OPEN", or "HALF_OPEN"

if state == "OPEN":
    logger.warning("OpenAI circuit is OPEN")
```

### Manual Reset

```python
from lib.utils.circuit_breaker import claude_breaker

# After issue is resolved, manually reset
claude_breaker.reset()
```

## State Transitions

### CLOSED → OPEN
- Triggered when: `failure_count >= failure_threshold` (default: 5)
- Behavior: Circuit opens, rejects subsequent calls immediately
- Logging: WARNING level logged with failure count

### OPEN → HALF_OPEN
- Triggered when: `timeout` seconds elapsed since opening (default: 60s)
- Behavior: Circuit transitions on next call attempt, allowing test call
- Logging: INFO level logged

### HALF_OPEN → CLOSED
- Triggered when: `success_count >= success_threshold` consecutive successes (default: 2)
- Behavior: Circuit closes, returns to normal operation
- Logging: INFO level logged, service marked as recovered
- Counters reset: `success_count = 0`, `failure_count = 0`

### HALF_OPEN → OPEN
- Triggered when: Any failure occurs in HALF_OPEN state
- Behavior: Circuit immediately reopens, resets timeout
- Logging: WARNING level logged

## Exception Handling

### CircuitBreakerOpen Exception

Raised when circuit is OPEN and call is rejected:

```python
try:
    breaker.call(func)
except CircuitBreakerOpen as e:
    # e.args[0] contains message like:
    # "Circuit breaker 'openai' is OPEN. Service unavailable. Retry in 45s."
    print(e)
```

### Original Exceptions Propagated

All exceptions from the wrapped function are propagated normally:

```python
breaker.call(func)
# If func raises ValueError, ValueError is raised
# If func raises Exception, Exception is raised
# etc.
```

## Monitoring and Observability

### Logging

The circuit breaker logs at INFO and WARNING levels:

```python
import logging
logger = logging.getLogger("lib.utils.circuit_breaker")

# INFO logs:
# - Transition to HALF_OPEN
# - Recovery to CLOSED
# - Manual reset

# WARNING logs:
# - Circuit opened after threshold
# - Failure in HALF_OPEN (reopening)
# - Circuit breaker open exception
```

### Getting Statistics

```python
breaker = openai_breaker

print(f"State: {breaker.get_state()}")
print(f"Failures: {breaker.failure_count}")
print(f"Successes (in HALF_OPEN): {breaker.success_count}")
print(f"Time until retry: {breaker._time_until_retry()}s")
```

## Testing

Run circuit breaker tests:

```bash
cd resume-api
python -m pytest tests/test_circuit_breaker.py -v
```

Test categories:
- **Basic functionality**: Initialization, successful calls
- **Failure handling**: Accumulation, threshold triggering
- **Open state**: Immediate rejection
- **HALF_OPEN state**: Recovery testing
- **Timeout logic**: State transitions
- **Reset**: Manual recovery
- **Global instances**: Provider-specific breakers
- **Integration**: Full state cycles

## Configuration Guide

### For Production
```python
# Conservative settings for critical services
CircuitBreaker(
    name="payment_api",
    failure_threshold=3,      # Quick response to failures
    success_threshold=3,      # Conservative recovery
    timeout=120,              # Longer wait before retry
)
```

### For Development/Testing
```python
# Aggressive settings for testing
CircuitBreaker(
    name="test_service",
    failure_threshold=1,      # Fail immediately
    success_threshold=1,      # Quick recovery
    timeout=1,                # Quick timeout
)
```

### For Graceful Degradation
```python
# Balanced settings
CircuitBreaker(
    name="ai_provider",
    failure_threshold=5,      # Multiple failures allowed
    success_threshold=2,      # Quick recovery once stable
    timeout=60,               # Standard timeout
)
```

## Best Practices

1. **Use global instances for providers**
   - Reuse `openai_breaker`, `claude_breaker`, `gemini_breaker`
   - Prevents multiple breakers for same service

2. **Handle CircuitBreakerOpen gracefully**
   - Provide fallback responses
   - Use cached data if available
   - Inform user about service status

3. **Log state transitions**
   - Monitor circuit openings in production
   - Set up alerts for repeated openings

4. **Test recovery scenarios**
   - Write tests that simulate service recovery
   - Verify HALF_OPEN transitions work

5. **Configure thresholds appropriately**
   - Balance responsiveness vs. false positives
   - Adjust for service reliability characteristics

## Example: Complete Integration

```python
from lib.utils.ai import OpenAIProvider
from lib.utils.circuit_breaker import CircuitBreakerOpen, openai_breaker
import logging

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self, api_key):
        self.provider = OpenAIProvider(api_key)
        
    def generate_tailored_resume(self, resume, job_desc):
        """Generate resume with automatic fallback."""
        try:
            # Wrapped with circuit breaker internally
            return self.provider.generate_response(
                f"Tailor resume to job: {job_desc}"
            )
        except CircuitBreakerOpen:
            logger.warning("OpenAI service unavailable, using cached response")
            return self._get_cached_response(resume, job_desc)
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            raise
    
    def get_service_status(self):
        """Check service health."""
        state = openai_breaker.get_state()
        if state == "OPEN":
            return {
                "status": "unavailable",
                "retry_in_seconds": openai_breaker._time_until_retry()
            }
        return {"status": state.lower()}
```

## Troubleshooting

### Circuit Won't Close
- Check that `success_threshold` is being reached in HALF_OPEN
- Verify underlying service has actually recovered
- Check timeout is appropriate for service recovery time

### Circuit Opens Too Quickly
- Increase `failure_threshold` if service is unreliable
- Reduce `failure_threshold` if you want faster failure detection
- Consider transient errors vs. permanent failures

### Too Many Circuit Resets Needed
- May indicate service is unstable
- Consider increasing `timeout` for longer cooldown
- Investigate underlying service issues
