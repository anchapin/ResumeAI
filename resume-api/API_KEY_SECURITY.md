# API Key Security

## Overview

The Resume API now uses **bcrypt** to securely hash API keys, protecting them from exposure if configuration files are compromised. This document explains the security model and how to migrate existing keys.

## Security Features

### 1. **Bcrypt Hashing**
- API keys are hashed using bcrypt with a cost factor of 12
- Bcrypt hashes include a random salt, so the same key produces different hashes
- Bcrypt uses constant-time comparison to prevent timing attacks

### 2. **Backward Compatibility**
- The system supports both plaintext and hashed keys during migration
- Existing plaintext keys continue to work
- New keys should be hashed for maximum security

### 3. **Key Verification**
- When an API request is made with `X-API-KEY` header:
  1. The header value is checked against the master key
  2. If not the master key, it's checked against the list of user keys
  3. Both hashed and plaintext keys are properly verified

## Migration Guide

### Step 1: Generate Hashed Keys

Use the migration script to hash your existing plaintext keys:

```bash
cd resume-api

# Option A: Hash keys from command line
python scripts/migrate_api_keys.py --keys "rai_key1,rai_key2,rai_key3"

# Option B: Hash keys from .env file
python scripts/migrate_api_keys.py --env-file .env

# Option C: Hash keys from production .env file
python scripts/migrate_api_keys.py --env-file .env.production
```

### Step 2: Update Environment Configuration

The script will output:

```
API_KEYS="$2b$12$hash1...,$2b$12$hash2...,$2b$12$hash3..."
MASTER_API_KEY="$2b$12$master_hash..."
```

Add these hashed values to your `.env` file:

```bash
# Before (plaintext)
MASTER_API_KEY=rai_1234567890abcdef
API_KEYS=rai_xyz...,rai_abc...

# After (hashed)
MASTER_API_KEY=$2b$12$slYQmyNdGzin7olVN3p5Be7DlH.PKZbv5H8KnzzVgXXbVxzy86qke
API_KEYS=$2b$12$hash1...,$2b$12$hash2...
```

### Step 3: Restart the API Server

```bash
# Stop the running server
# Then restart it to load the new configuration

python main.py
# or
docker-compose up
```

### Step 4: Verify Authentication Works

Test that your hashed keys work:

```bash
# Using a plaintext key against hashed configuration
curl -X GET "http://localhost:8000/v1/variants" \
  -H "X-API-KEY: rai_your_plaintext_key"

# Should return 200 if the plaintext key matches the hash
```

## Technical Details

### Hashing Function

```python
from lib.security import hash_api_key

# Hash a key
plaintext_key = "rai_1234567890abcdef"
hashed_key = hash_api_key(plaintext_key)
# Returns: $2b$12$slYQmyNdGzin7olVN3p5Be7DlH.PKZbv5H8KnzzVgXXbVxzy86qke
```

### Verification Function

```python
from lib.security import verify_api_key

# Verify a plaintext key against a hash
plaintext_key = "rai_1234567890abcdef"
hashed_key = "$2b$12$slYQmyNdGzin7olVN3p5Be7DlH.PKZbv5H8KnzzVgXXbVxzy86qke"

if verify_api_key(plaintext_key, hashed_key):
    print("Key is valid!")
else:
    print("Key is invalid!")
```

### How Authentication Works

1. **User sends request** with `X-API-KEY: rai_plaintext_key` header
2. **Server receives** the plaintext key from the header
3. **Server checks** if the key matches:
   - Master key (hashed or plaintext)
   - Any user key in the list (hashed or plaintext)
4. **For hashed keys**: Uses bcrypt to verify (constant-time comparison)
5. **For plaintext keys**: Uses `secrets.compare_digest` (constant-time comparison)
6. **Returns**: 200 OK if valid, 403 Forbidden if invalid

## Architecture

### Key Storage Model

```
┌─────────────────────────────────────────────────┐
│  Environment Variables (.env, deployment config) │
├─────────────────────────────────────────────────┤
│  MASTER_API_KEY: $2b$12$hash...                │
│  API_KEYS: $2b$12$hash1..., $2b$12$hash2...   │
└─────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────┐
        │   Settings (config/__init__.py) │
        └───────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────┐
        │  Authentication Middleware            │
        │  (config/dependencies.py)             │
        │                                       │
        │  1. Extract X-API-KEY header         │
        │  2. Check if it matches any key      │
        │  3. Grant or deny access             │
        └───────────────────────────────────────┘
```

### Key Verification Flow

```
Client Request with X-API-KEY header
        │
        ▼
┌─────────────────────────────┐
│ Is API key required?        │
│ (REQUIRE_API_KEY=true)      │
└─────────────────────────────┘
        │ Yes                  │ No
        ▼                      ▼
Check Master Key          Return "anonymous"
        │
        ├─ Is it hashed?
        │  ├─ Yes → Use bcrypt verification
        │  └─ No → Use constant-time comparison
        │
        ▼
Check User Keys (same verification logic)
        │
        ├─ Match found → Return 200 OK
        └─ No match → Return 403 Forbidden
```

## Security Best Practices

### ✅ DO:
- **Hash all new API keys** before storing them
- **Use strong, random keys** (at least 32 characters)
- **Rotate keys regularly** (quarterly or when compromised)
- **Store hashes in secure config** (environment variables, secrets manager)
- **Enable API key requirement** in production (`REQUIRE_API_KEY=true`)
- **Monitor API key usage** through logs and metrics

### ❌ DON'T:
- **Never commit plaintext keys** to version control
- **Never expose hashes in logs** (they're still sensitive)
- **Never share API keys** via email or chat
- **Don't disable API key requirement** in production
- **Don't reuse keys** across environments
- **Don't store unencrypted keys** in databases (use hashes)

## Troubleshooting

### "Invalid API key" Error

**Problem**: Valid API key is being rejected.

**Solutions**:
1. Verify the key matches (check for typos, spaces)
2. Check that `REQUIRE_API_KEY=true`
3. Check that the key is in `MASTER_API_KEY` or `API_KEYS`
4. For hashed keys, ensure the plaintext key matches what was hashed

### "API key is required" Error

**Problem**: Request missing the `X-API-KEY` header.

**Solution**:
1. Add `X-API-KEY: your_api_key` header to your requests
2. Or set `REQUIRE_API_KEY=false` for development only

### Migration Issues

**Problem**: Migration script fails or doesn't find keys.

**Solutions**:
1. Check that `.env` file exists in the right location
2. Verify `API_KEYS` and `MASTER_API_KEY` are in the `.env` file
3. Check that keys are not wrapped in quotes (script handles this)
4. Use `--keys` option for manual key hashing if `.env` parsing fails

## Testing

### Unit Tests

```bash
# Run security-focused tests
cd resume-api
python -m pytest tests/test_key_management.py -v
python -m pytest tests/test_api_key_verification.py -v
```

### Integration Tests

```bash
# Test API with hashed key
curl -X GET "http://localhost:8000/v1/variants" \
  -H "X-API-KEY: rai_your_test_key" \
  -H "Content-Type: application/json"

# Should return 200 OK if key is valid
```

### Manual Testing

```bash
# In Python REPL
from lib.security import hash_api_key, verify_api_key

# Create a test key
test_key = "rai_test_12345678"
hashed = hash_api_key(test_key)
print(f"Hashed: {hashed}")

# Verify it works
assert verify_api_key(test_key, hashed) == True
assert verify_api_key("wrong_key", hashed) == False
print("✓ Verification works correctly")
```

## References

- [bcrypt Documentation](https://github.com/pyca/bcrypt)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [OWASP API Key Storage](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

## Support

For issues with API key security:
1. Check this documentation
2. Review test files in `tests/test_key_management.py`
3. Check API logs for authentication errors
4. Review the migration script output for syntax issues

---

**Last Updated**: 2026-02-26  
**Status**: Production-Ready  
**Backward Compatible**: Yes (supports both hashed and plaintext keys during migration)
