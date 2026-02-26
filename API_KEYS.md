# API Key Security Guide

## Overview

ResumeAI implements **bcrypt-based API key hashing** to securely store API keys at rest. This document provides a quick start guide for API key management.

## Quick Start

### For Development

1. **Generate a hashed key:**
   ```bash
   cd resume-api
   python3 scripts/migrate_api_keys.py --keys "rai_your_test_key_here"
   ```

2. **Update `.env` file:**
   ```env
   MASTER_API_KEY=$2b$12$<hash_from_script_output>
   ```

3. **Use plaintext in requests:**
   ```bash
   curl -X GET "http://localhost:8000/health" \
     -H "X-API-KEY: rai_your_test_key_here"
   ```

### For Production

1. **Hash all API keys:**
   ```bash
   python3 scripts/migrate_api_keys.py --env-file .env.production
   ```

2. **Update secrets manager:**
   - Replace plaintext keys with hashed versions
   - Store in environment variables or secrets manager (Vault, AWS Secrets, etc.)

3. **Clients still send plaintext:**
   - API clients send plaintext keys in `X-API-KEY` header
   - Server verifies against hashed version
   - **Always use HTTPS in production**

## Implementation Details

### File Structure

```
resume-api/
├── lib/security/
│   ├── __init__.py                    # Export security functions
│   └── key_management.py              # Hash and verify functions
├── config/
│   └── dependencies.py                # Authentication (uses lib.security)
├── scripts/
│   └── migrate_api_keys.py            # Migration tool
├── tests/
│   ├── test_key_management.py         # Unit tests
│   ├── test_api_key_verification.py   # Integration tests
│   └── integration/
│       └── test_api_key_management_e2e.py  # End-to-end tests
├── test_key_management_standalone.py  # Standalone test runner
└── API_KEY_SECURITY.md                # Detailed documentation
```

### Key Functions

#### `hash_api_key(key: str) -> str`
Hashes a plaintext API key using bcrypt with cost factor 12.

```python
from lib.security import hash_api_key

plaintext = "rai_my_secret_key"
hashed = hash_api_key(plaintext)
# Returns: $2b$12$slYQmyNdGzin7olVN3p5...
```

#### `verify_api_key(plaintext_key: str, key_hash: str) -> bool`
Verifies a plaintext key against a bcrypt hash.

```python
from lib.security import verify_api_key

result = verify_api_key("rai_my_secret_key", hashed)
# Returns: True if match, False otherwise
```

#### `is_hashed_key(value: str) -> bool`
Detects if a string is a bcrypt hash.

```python
from lib.security import is_hashed_key

is_hashed_key("$2b$12$...")  # True
is_hashed_key("rai_key")      # False
```

#### `migrate_plaintext_keys(plaintext_keys: list[str]) -> dict`
Batch migrate plaintext keys to hashed versions.

```python
from lib.security import migrate_plaintext_keys

keys = ["rai_key1", "rai_key2"]
migration_map = migrate_plaintext_keys(keys)
# Returns: {
#   "rai_key1": "$2b$12$hash1...",
#   "rai_key2": "$2b$12$hash2..."
# }
```

## Authentication Flow

```
Client Request
  ↓
GET /v1/variants
  X-API-KEY: rai_plaintext_key
  ↓
is_api_key_required?
  ├─ No → return "anonymous"
  ├─ Yes ↓
check MASTER_API_KEY
  ├─ is_hashed? → bcrypt.checkpw()
  ├─ plaintext? → secrets.compare_digest()
  ├─ match? → ✅ return 200
  ├─ no match ↓
check API_KEYS list
  ├─ match found? → ✅ return 200
  └─ no match? → ❌ return 403
```

## Configuration

### Environment Variables

```bash
# Master key for ResumeAI frontend (hashed or plaintext)
MASTER_API_KEY=$2b$12$slYQmyNdGzin7olVN3p5Be7DlH.PKZbv5H8KnzzVgXXbVxzy86qke

# Additional keys for 3rd-party developers (comma-separated, hashed or plaintext)
API_KEYS=$2b$12$hash1...,$2b$12$hash2...,$2b$12$hash3...

# Require API key authentication (set to false for development)
REQUIRE_API_KEY=true
```

### Backward Compatibility

The system supports **mixed plaintext and hashed keys** during migration:

```bash
# Both work - old plaintext and new hashed
MASTER_API_KEY=rai_old_plaintext_key
API_KEYS=$2b$12$new_hashed_key...,$2b$12$another_hashed_key...,rai_another_plaintext_key
```

## Migration Script

### Hash from Command Line

```bash
cd resume-api
python3 scripts/migrate_api_keys.py --keys "rai_key1,rai_key2,rai_key3"
```

Output:
```
MASTER_API_KEY=$2b$12$<hash1>
API_KEYS=$2b$12$<hash2>,$2b$12$<hash3>
```

### Hash from .env File

```bash
cd resume-api
python3 scripts/migrate_api_keys.py --env-file .env
```

Reads `MASTER_API_KEY` and `API_KEYS` from `.env` and outputs hashed versions.

## Testing

### Unit Tests

```bash
cd resume-api
python3 -m pytest tests/test_key_management.py -v
python3 -m pytest tests/test_api_key_verification.py -v
```

### Standalone Test

```bash
cd resume-api
python3 test_key_management_standalone.py
```

No dependencies required.

### Manual Testing

```bash
# Request with plaintext API key
curl -X GET "http://localhost:8000/v1/variants" \
  -H "X-API-KEY: rai_your_plaintext_key" \
  -H "Content-Type: application/json"

# Should return 200 OK if key is valid (matches hashed version in config)
# Should return 403 Forbidden if key is invalid
```

## Security Best Practices

1. **Always use HTTPS** - API keys sent in plaintext in headers
2. **Rotate keys regularly** - Change keys quarterly or when compromised
3. **Use scoped keys** - Different keys for different environments/clients
4. **Monitor usage** - Log and alert on unusual API key activity
5. **Revoke quickly** - Implement process to immediately revoke leaked keys
6. **Never commit plaintext** - Use environment variables and secrets managers
7. **Use secrets manager** - HashiCorp Vault, AWS Secrets Manager, etc.

## Troubleshooting

### "Invalid API key" Error

1. Verify header name is exactly `X-API-KEY` (case-sensitive)
2. Check plaintext key matches one of the hashed keys in config
3. Ensure `REQUIRE_API_KEY=true` is set (or authentication enabled)

### Hash Verification Fails

1. Verify bcrypt is installed: `pip install bcrypt`
2. Check hash format starts with `$2a$`, `$2b$`, or `$2y$`
3. Ensure key hasn't been modified or truncated

### Migration Issues

```bash
# Test migration script
cd resume-api
python3 -c "from lib.security import hash_api_key; print(hash_api_key('test'))"

# Should output a hash starting with $2b$
```

## Detailed Documentation

For comprehensive security documentation, see:
- [resume-api/API_KEY_SECURITY.md](resume-api/API_KEY_SECURITY.md) - Full technical guide
- [ISSUE_391_IMPLEMENTATION.md](ISSUE_391_IMPLEMENTATION.md) - Implementation details

## Architecture Decision

**Why bcrypt?**
- ✅ Built-in salt (random per hash)
- ✅ Configurable cost factor (for future-proofing)
- ✅ Constant-time comparison (timing attack resistant)
- ✅ Industry standard for password hashing
- ✅ Already a dependency (via passlib)

## Future Enhancements

- [ ] Database model for per-user API key management
- [ ] API endpoint to generate/revoke keys
- [ ] Key rotation policies (expiration dates)
- [ ] Usage analytics per key
- [ ] IP-based key restrictions
- [ ] Rate limiting per key
- [ ] Audit logging for all key operations
