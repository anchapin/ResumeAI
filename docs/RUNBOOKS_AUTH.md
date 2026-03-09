# Authentication Troubleshooting Runbook

**Last Updated:** March 9, 2026  
**Maintained By:** DevOps / Platform Team  
**Status:** Production Ready

---

## Table of Contents

1. [Authentication Overview](#authentication-overview)
2. [Session Management](#session-management)
3. [OAuth Issues](#oauth-issues)
4. [Token Issues](#token-issues)
5. [Password Authentication](#password-authentication)
6. [MFA/2FA Issues](#mfa2fa-issues)
7. [Security Events](#security-events)

---

## Authentication Overview

ResumeAI supports multiple authentication methods:
- **OAuth 2.0**: GitHub, LinkedIn
- **Email/Password**: Traditional authentication
- **Session-based**: JWT tokens with refresh tokens
- **MFA**: TOTP-based two-factor authentication

**Session Configuration:**
- Access Token: 15 minutes
- Refresh Token: 7 days (stored in Redis)
- Session data: Redis with 24-hour TTL

---

## Session Management

### View Active Sessions

```bash
# List all sessions
redis-cli KEYS "session:*"

# Count sessions
redis-cli KEYS "session:*" | wc -l

# Get specific session data
redis-cli GET "session:12345"

# Get session TTL
redis-cli TTL "session:12345"
```

### Invalidate Sessions

```bash
# Invalidate single user session
redis-cli DEL "session:12345"

# Invalidate all sessions for user
redis-cli KEYS "session:*" | grep "user:12345" | xargs redis-cli DEL

# Invalidate all sessions (global logout)
redis-cli FLUSHDB

# Invalidate expired sessions only
redis-cli --scan --pattern "session:*" | while read key; do
  ttl=$(redis-cli TTL "$key")
  if [ $ttl -eq -1 ]; then
    redis-cli DEL "$key"
  fi
done
```

### Session Debugging

```bash
# Check session storage
redis-cli GET "session:abc123"

# Decode JWT (for debugging)
# Using python
python3 -c "
import jwt
token = 'eyJ...'
print(jwt.decode(token, options={'verify_signature': False}))
"

# Check session errors in logs
kubectl logs -n production deployment/resume-api | grep -i "session\|auth" | tail -50
```

---

## OAuth Issues

### GitHub OAuth Not Working

**Symptoms:**
- Users cannot log in with GitHub
- 401/403 errors during OAuth flow

**Diagnosis:**

```bash
# Check OAuth credentials
echo $GITHUB_CLIENT_ID
echo $GITHUB_CLIENT_SECRET

# Test OAuth endpoint
curl -X POST "https://github.com/login/oauth/access_token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"client_id":"xxx","client_secret":"xxx","code":"xxx"}'

# Check redirect URI
echo $GITHUB_REDIRECT_URI
```

**Resolution:**

1. Verify credentials in GitHub Developer Settings
2. Check redirect URI matches exactly
3. Verify required scopes are enabled
4. Check GitHub OAuth rate limits

### OAuth Token Refresh

**Symptoms:**
- Users logged out unexpectedly
- 401 errors after short period

**Diagnosis:**

```bash
# Check token storage
redis-cli KEYS "oauth:*"

# View OAuth tokens
redis-cli GET "oauth:12345:token"

# Check token expiration
python3 -c "
import jwt
token = 'eyJ...'
decoded = jwt.decode(token, options={'verify_signature': False})
import time
print('Expires:', time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(decoded['exp'])))
"
```

**Resolution:**

1. Implement token refresh logic:
   ```python
   async def refresh_token(user_id):
       refresh_token = await get_refresh_token(user_id)
       new_token = await oauth_client.refresh_token(refresh_token)
       await store_token(user_id, new_token)
   ```

2. Check token storage expiry:
   ```python
   # Ensure refresh token has correct TTL
   redis.setex(f"refresh:{user_id}", 7 * 24 * 3600, token)
   ```

### OAuth State Validation Failed

**Symptoms:**
- Users see "state mismatch" error
- OAuth flow fails intermittently

**Diagnosis:**

```bash
# Check state storage
redis-cli GET "oauth:state:abc123"

# Check state TTL (should be 10 minutes)
redis-cli TTL "oauth:state:abc123"
```

**Resolution:**

1. Check state storage:
   ```python
   # Store state with correct TTL
   redis.setex(f"oauth:state:{state}", 600, user_id)  # 10 minutes
   ```

2. Verify state generation:
   ```python
   # Generate cryptographically secure state
   state = secrets.token_urlsafe(32)
   ```

---

## Token Issues

### JWT Token Invalid

**Symptoms:**
- 401 Unauthorized errors
- Users logged out immediately

**Diagnosis:**

```bash
# Decode JWT for debugging
python3 -c "
import jwt
token = 'eyJ...'
try:
    decoded = jwt.decode(token, 'secret', algorithms=['HS256'])
    print(decoded)
except jwt.ExpiredSignatureError:
    print('Token expired')
except jwt.InvalidTokenError as e:
    print(f'Invalid: {e}')
"

# Check token blacklist
redis-cli KEYS "blacklist:*"
```

**Resolution:**

1. Verify JWT secret configuration:
   ```bash
   echo $JWT_SECRET_KEY
   ```

2. Check token expiration:
   ```python
   # Configure appropriate expiration
   access_token = create_access_token(
       identity=user.id,
       expires_delta=timedelta(minutes=15)
   )
   ```

3. Check for token in blacklist:
   ```bash
   # Remove from blacklist if legitimate
   redis-cli DEL "blacklist:old_token"
   ```

### Token Blacklist Issues

**Symptoms:**
- Users cannot log in after logout
- Valid tokens rejected

**Diagnosis:**

```bash
# Check blacklist
redis-cli KEYS "blacklist:*"

# Check blacklist TTL
redis-cli TTL "blacklist:token_hash"
```

**Resolution:**

1. Check blacklist key:
   ```python
   # Ensure blacklist key is correct
   token_hash = hashlib.sha256(token.encode()).hexdigest()
   is_blacklisted = redis.get(f"blacklist:{token_hash}")
   ```

2. Check blacklist TTL (should match token lifetime):
   ```python
   # Set blacklist TTL to token lifetime
   redis.setex(f"blacklist:{token_hash}", 900, "true")  # 15 minutes
   ```

---

## Password Authentication

### Password Reset Issues

**Symptoms:**
- Password reset emails not sent
- Reset links expired
- Password not changing

**Diagnosis:**

```bash
# Check password reset tokens
redis-cli KEYS "password_reset:*"

# Check email queue
redis-cli KEYS "email:*"

# Check logs for errors
kubectl logs -n production deployment/resume-api | grep -i "password\|reset" | tail -50
```

**Resolution:**

1. Verify email service:
   ```bash
   # Check SMTP configuration
   echo $SMTP_HOST
   echo $SMTP_PORT
   ```

2. Check token expiration:
   ```python
   # Set 1-hour expiration for reset tokens
   redis.setex(f"password_reset:{token}", 3600, user_id)
   ```

3. Resend reset email:
   ```python
   # Manual resend (admin only)
   await send_password_reset_email(user_id)
   ```

### Account Lockout

**Symptoms:**
- Users cannot log in
- "Account locked" message

**Diagnosis:**

```bash
# Check lockout status
redis-cli GET "lockout:user:12345"

# Check failed attempts
redis-cli GET "failed_attempts:user:12345"
```

**Resolution:**

1. Check if legitimate lockout:
   ```bash
   # View lockout details
   redis-cli GET "lockout:user:12345"
   ```

2. Unlock account:
   ```bash
   # Remove lockout
   redis-cli DEL "lockout:user:12345"
   redis-cli DEL "failed_attempts:user:12345"
   ```

3. Or wait for auto-unlock:
   ```bash
   # Check TTL
   redis-cli TTL "lockout:user:12345"
   ```

### Brute Force Protection

**Diagnosis:**

```bash
# Check rate limiting
redis-cli KEYS "ratelimit:*"

# Check blocked IPs
redis-cli KEYS "blocked:*"

# View recent failed attempts
kubectl logs -n production deployment/resume-api | grep -i "failed\|attempt" | tail -50
```

**Resolution:**

1. Unblock IP (if false positive):
   ```bash
   redis-cli DEL "blocked:ip:192.168.1.1"
   redis-cli DEL "ratelimit:192.168.1.1"
   ```

2. Adjust rate limits if needed:
   ```python
   # In rate limiter config
   RATELIMIT_DEFAULT = "100/hour"
   RATELIMIT_STORAGE_URL = "redis://..."
   ```

---

## MFA/2FA Issues

### MFA Code Not Working

**Symptoms:**
- Users cannot log in with MFA
- Invalid code errors

**Diagnosis:**

```bash
# Check MFA settings
psql $DATABASE_URL -c "
SELECT id, email, mfa_enabled, mfa_secret 
FROM users 
WHERE mfa_enabled = true;"

# Check TOTP validation
redis-cli KEYS "mfa:*"
```

**Resolution:**

1. Check device time sync:
   ```python
   # Ensure server time is correct
   # NTP should be synchronized
   import time
   print(time.time())
   ```

2. Provide backup codes:
   ```python
   # Generate new backup codes
   user.mfa_backup_codes = generate_backup_codes()
   db.commit()
   ```

3. Disable MFA (admin only):
   ```python
   # Emergency disable
   user.mfa_enabled = False
   user.mfa_secret = None
   db.commit()
   ```

### MFA Setup Issues

**Symptoms:**
- QR code not scanning
- Cannot enable MFA

**Diagnosis:**

```bash
# Check MFA secret generation
kubectl logs -n production deployment/resume-api | grep -i "mfa\|totp" | tail -20
```

**Resolution:**

1. Verify TOTP issuer:
   ```python
   # Configure correct issuer
   import pyotp
   totp = pyotp.TOTP(secret)
     .provisioning_name(
       name="user@example.com",
       issuer_name="ResumeAI"
     )
   ```

2. Check QR code generation:
   ```python
   # Generate proper otpauth URL
   import qrcode
   otpauth_url = pyotp.totp.TOTP(secret). provisioning_uri(
       "user@example.com",
       issuer_name="ResumeAI"
   )
   ```

---

## Security Events

### Suspicious Login Detection

**Symptoms:**
- Login from new location
- Multiple failed attempts

**Diagnosis:**

```bash
# Check login history
psql $DATABASE_URL -c "
SELECT * FROM login_history 
WHERE user_id = 12345 
ORDER BY created_at DESC 
LIMIT 20;"

# Check for suspicious activity
psql $DATABASE_URL -c "
SELECT ip_address, count(*) 
FROM login_history 
WHERE created_at > now() - interval '24 hours' 
GROUP BY ip_address 
HAVING count(*) > 10;"
```

**Resolution:**

1. Flag user account:
   ```python
   user = db.query(User).get(user_id)
   user.security_flag = True
   user.security_notes = "Suspicious login activity"
   db.commit()
   ```

2. Send security notification:
   ```python
   await send_security_alert(user_id, "New login detected")
   ```

### Unauthorized Access

**Symptoms:**
- Access from unknown IP
- Unusual API usage patterns

**Immediate Actions:**

```bash
# 1. Revoke all sessions
redis-cli KEYS "session:*" | grep "user:12345" | xargs redis-cli DEL

# 2. Revoke tokens
redis-cli KEYS "oauth:*" | grep "user:12345" | xargs redis-cli DEL
redis-cli KEYS "blacklist:*" | xargs redis-cli DEL

# 3. Force password reset
psql $DATABASE_URL -c "
UPDATE users 
SET password_hash = 'PENDING_RESET_' || id::text 
WHERE id = 12345;"

# 4. Check for changes
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20
```

---

## Quick Reference

### Common Commands

```bash
# Check session status
redis-cli GET "session:12345"

# Invalidate user session
redis-cli DEL "session:12345"

# Check OAuth tokens
redis-cli GET "oauth:12345:token"

# Check failed attempts
redis-cli GET "failed_attempts:user:12345"

# Unlock account
redis-cli DEL "lockout:user:12345"

# View auth errors
kubectl logs -n production deployment/resume-api | grep -i auth | tail -50
```

---

## Related Documentation

- [RUNBOOKS.md](./RUNBOOKS.md) - Main runbook
- [oauth-monitoring-runbook.md](./oauth-monitoring-runbook.md) - OAuth monitoring
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - General troubleshooting
- [LINKEDIN_OAUTH_IMPLEMENTATION.md](../LINKEDIN_OAUTH_IMPLEMENTATION.md) - OAuth setup
- [HTTPRONLY_SECURE_COOKIES_IMPLEMENTATION.md](../HTTPRONLY_SECURE_COOKIES_IMPLEMENTATION.md) - Cookie security

---

**Last Reviewed:** March 9, 2026  
**Next Review:** April 9, 2026 (Monthly)  
**Owner:** DevOps Team
