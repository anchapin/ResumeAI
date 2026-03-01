# [S1-Security-1] httpOnly and Secure Cookies Implementation

**Issue**: Implement httpOnly and secure flags for authentication cookies
**Status**: COMPLETE ✅
**Implementation Date**: 2026-03-01

## Summary

This document confirms that authentication cookies in the ResumeAI API are properly configured with `httpOnly` and `secure` flags to prevent XSS and MITM attacks.

## Security Flags Implemented

All authentication cookies are set with the following security flags:

### 1. **httpOnly Flag**

- **Purpose**: Prevents JavaScript access to cookies via `document.cookie`
- **Benefit**: Protects against XSS (Cross-Site Scripting) attacks
- **Implementation**: All cookies set with `httponly=True`
- **Impact**: Even if attacker injects malicious JavaScript, tokens cannot be stolen

### 2. **Secure Flag**

- **Purpose**: Ensures cookies are only transmitted over HTTPS
- **Benefit**: Protects against MITM (Man-in-the-Middle) attacks
- **Implementation**: All cookies set with `secure=True`
- **Impact**: Cookies cannot be intercepted on unencrypted connections

### 3. **SameSite Flag**

- **Purpose**: Prevents CSRF (Cross-Site Request Forgery) attacks
- **Value**: `SameSite="strict"` (most restrictive)
- **Benefit**: Cookies only sent in same-site requests
- **Impact**: Cannot be sent from third-party websites

## Implementation Details

### Authentication Endpoints

#### 1. **POST /auth/register** (Lines 167-175)

```python
response.set_cookie(
    key="csrf_token",
    value=csrf_token,
    httponly=True,  # ✅ XSS Protection
    secure=True,    # ✅ HTTPS Only
    samesite="strict",  # ✅ CSRF Protection
    max_age=3600,  # 1 hour
)
```

#### 2. **POST /auth/login** (Lines 286-303)

Sets both `access_token` and `csrf_token`:

**Access Token Cookie:**

```python
response.set_cookie(
    key="access_token",
    value=access_token,
    httponly=True,  # ✅ XSS Protection
    secure=True,    # ✅ HTTPS Only
    samesite="strict",  # ✅ CSRF Protection
    max_age=1800,  # 30 minutes
)
```

**CSRF Token Cookie:**

```python
response.set_cookie(
    key="csrf_token",
    value=csrf_token,
    httponly=True,  # ✅ XSS Protection
    secure=True,    # ✅ HTTPS Only
    samesite="strict",  # ✅ CSRF Protection
    max_age=3600,  # 1 hour
)
```

#### 3. **POST /auth/refresh** (Lines 401-409)

```python
response.set_cookie(
    key="access_token",
    value=new_access_token,
    httponly=True,  # ✅ XSS Protection
    secure=True,    # ✅ HTTPS Only
    samesite="strict",  # ✅ CSRF Protection
    max_age=1800,  # 30 minutes
)
```

#### 4. **POST /auth/logout** (Lines 460-471)

Clears cookies with proper security flags:

```python
response.delete_cookie(
    key="access_token",
    httponly=True,  # ✅ XSS Protection
    secure=True,    # ✅ HTTPS Only
    samesite="strict",  # ✅ CSRF Protection
)
response.delete_cookie(
    key="csrf_token",
    httponly=True,  # ✅ XSS Protection
    secure=True,    # ✅ HTTPS Only
    samesite="strict",  # ✅ CSRF Protection
)
```

## Cookie Types and Their Configuration

### Access Token Cookie

- **Name**: `access_token`
- **Content**: JWT access token
- **HttpOnly**: ✅ Yes
- **Secure**: ✅ Yes
- **SameSite**: strict
- **Max-Age**: 1800 seconds (30 minutes)
- **Purpose**: Bearer token for API requests

### CSRF Token Cookie

- **Name**: `csrf_token`
- **Content**: Random 64-character hex string
- **HttpOnly**: ✅ Yes
- **Secure**: ✅ Yes
- **SameSite**: strict
- **Max-Age**: 3600 seconds (1 hour)
- **Purpose**: CSRF attack prevention

## Token Extraction Logic

The authentication system uses a dual-token approach:

### For Access Token

- **Primary**: Authorization header (`Bearer {token}`)
- **Fallback**: HttpOnly `access_token` cookie
- **Validation**: JWT signature verification

### For CSRF Token

- **Source**: `X-CSRF-Token` header
- **Validation**: Compared against `csrf_token` cookie using `secrets.compare_digest()`
- **Protection**: Prevents CSRF attacks on state-changing requests

**Reference**: [resume-api/config/dependencies.py#L190-L225](file:///home/alex/Projects/ResumeAI/resume-api/config/dependencies.py#L190-L225)

## CSRF Middleware Configuration

**File**: [resume-api/middleware/csrf.py](file:///home/alex/Projects/ResumeAI/resume-api/middleware/csrf.py)

### Features:

- Validates CSRF tokens on POST, PUT, DELETE, PATCH requests
- Uses `secrets.compare_digest()` for timing attack prevention
- Generates new CSRF tokens on each response
- Exempts health check and authentication endpoints

### Protected Methods

```python
CSRF_PROTECTED_METHODS = {"POST", "PUT", "DELETE", "PATCH"}
```

### Exempt Paths

```python
CSRF_EXEMPT_PATHS = {
    "/auth/login",
    "/auth/register",
    "/health",
    "/health/detailed",
    "/health/oauth",
    "/health/ready",
}
```

## Security Headers

**File**: [resume-api/main.py#L53-L89](file:///home/alex/Projects/ResumeAI/resume-api/main.py#L53-L89)

Additional security headers are set by `SecurityHeadersMiddleware`:

```python
response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
response.headers["X-Content-Type-Options"] = "nosniff"
response.headers["X-Frame-Options"] = "DENY"
response.headers["X-XSS-Protection"] = "1; mode=block"
response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
response.headers["Content-Security-Policy"] = "default-src 'self'; ..."
```

## Attack Vectors Mitigated

### 1. **Cross-Site Scripting (XSS)**

- **httpOnly Flag**: Prevents JavaScript from accessing cookies
- **Content-Security-Policy**: Restricts script execution
- **X-XSS-Protection**: Browser-level XSS protection
- **Status**: ✅ Protected

### 2. **Man-in-the-Middle (MITM)**

- **Secure Flag**: Forces HTTPS-only transmission
- **Strict-Transport-Security**: HSTS header enforces HTTPS
- **Status**: ✅ Protected

### 3. **Cross-Site Request Forgery (CSRF)**

- **SameSite=strict**: Prevents cross-site cookie transmission
- **CSRF Token Validation**: Double-submit pattern
- **CSRF Middleware**: Validates tokens on state-changing requests
- **Status**: ✅ Protected

### 4. **Token Theft**

- **HttpOnly + Secure**: Prevents theft via XSS or MITM
- **Token Expiration**: Access tokens expire after 30 minutes
- **Token Revocation**: Refresh tokens can be revoked
- **Status**: ✅ Protected

## Testing

Comprehensive test suite created in [tests/test_auth_cookies.py](file:///home/alex/Projects/ResumeAI/tests/test_auth_cookies.py)

### Test Coverage:

- ✅ Login sets httpOnly access_token cookie
- ✅ Login sets secure access_token cookie
- ✅ Login sets SameSite access_token cookie
- ✅ Login sets httpOnly csrf_token cookie
- ✅ Register sets httpOnly csrf_token cookie
- ✅ Refresh sets httpOnly access_token cookie
- ✅ Logout clears cookies with proper flags
- ✅ Cookies have appropriate max_age values

### Running Tests:

```bash
# Run all cookie security tests
pytest tests/test_auth_cookies.py -v

# Run specific test
pytest tests/test_auth_cookies.py::TestAuthCookieSecurity::test_login_sets_httponly_access_token_cookie -v
```

## Configuration Environment Variables

Controlled by FastAPI settings in `config/settings.py`:

- Cookies are set as `secure=True` in all environments
- In development with `SECURE_COOKIES=false`, local testing can bypass this
- Production environment enforces HTTPS via HSTS headers

## Compliance

- ✅ OWASP Top 10 - A01: Broken Access Control
- ✅ OWASP Top 10 - A07: Cross-Site Scripting (XSS)
- ✅ CWE-79: Improper Neutralization of Input During Web Page Generation
- ✅ CWE-352: Cross-Site Request Forgery (CSRF)
- ✅ CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute
- ✅ CWE-1004: Sensitive Cookie Without 'HttpOnly' Flag

## Verification Checklist

- [x] All authentication cookies set with httpOnly flag
- [x] All authentication cookies set with secure flag
- [x] All authentication cookies set with SameSite flag
- [x] CSRF protection middleware implemented
- [x] Security headers configured
- [x] Cookie max_age values appropriate
- [x] Test suite created and passing
- [x] Documentation complete

## Related Files

| File                                                                                                       | Purpose                                | Lines   |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------- |
| [resume-api/routes/auth.py](file:///home/alex/Projects/ResumeAI/resume-api/routes/auth.py)                 | Auth endpoints with cookie settings    | 1-781   |
| [resume-api/middleware/csrf.py](file:///home/alex/Projects/ResumeAI/resume-api/middleware/csrf.py)         | CSRF validation middleware             | 1-94    |
| [resume-api/main.py](file:///home/alex/Projects/ResumeAI/resume-api/main.py)                               | App setup with security headers        | 1-364   |
| [resume-api/config/dependencies.py](file:///home/alex/Projects/ResumeAI/resume-api/config/dependencies.py) | Auth dependencies and token extraction | 190-225 |
| [tests/test_auth_cookies.py](file:///home/alex/Projects/ResumeAI/tests/test_auth_cookies.py)               | Cookie security test suite             | 1-198   |

## Future Enhancements

1. **Refresh Token Rotation**: Implement token rotation on each refresh
2. **Device Fingerprinting**: Validate requests from known devices
3. **Geo-IP Validation**: Alert on suspicious geographic changes
4. **Rate Limiting**: Enhanced rate limiting on auth endpoints
5. **Hardware Security Keys**: FIDO2/WebAuthn support

## References

- [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [MDN: Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [CWE-614: Sensitive Cookie Without 'Secure' Attribute](https://cwe.mitre.org/data/definitions/614.html)
- [RFC 6265: HTTP State Management Mechanism](https://tools.ietf.org/html/rfc6265)

---

**Issue Status**: ✅ COMPLETE
**PR**: [To be created upon review]
**Reviewer**: [@Your Name]
**Merge Date**: [To be merged upon approval]
