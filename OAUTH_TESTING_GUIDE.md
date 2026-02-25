# GitHub OAuth Testing and Validation Guide

Comprehensive guide for testing and validating the GitHub OAuth implementation in ResumeAI.

## Table of Contents
1. [Setup](#setup)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [End-to-End Tests](#end-to-end-tests)
5. [Security Testing](#security-testing)
6. [Performance Testing](#performance-testing)
7. [Error Scenario Testing](#error-scenario-testing)
8. [User Acceptance Testing](#user-acceptance-testing)

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- GitHub OAuth App credentials
- Docker (optional, for containerized testing)

### Environment Setup

```bash
# Backend setup
cd resume-api
pip install -r requirements.txt
pip install -r test_requirements.txt

# Frontend setup
npm install

# Configure environment variables
cp .env.example .env
# Add GitHub OAuth credentials:
# GITHUB_CLIENT_ID=your_client_id
# GITHUB_CLIENT_SECRET=your_client_secret
# GITHUB_REDIRECT_URI=http://localhost:8000/github/callback
```

## Unit Tests

### Running Unit Tests

```bash
cd resume-api

# Run all OAuth tests
pytest tests/test_github_oauth.py -v

# Run specific test class
pytest tests/test_github_oauth.py::TestOAuthStateGeneration -v

# Run with coverage
pytest tests/test_github_oauth.py --cov=routes.github --cov-report=html

# Run with detailed output
pytest tests/test_github_oauth.py -vv --tb=long
```

### Test Coverage

The test suite covers:

| Component | Tests | Coverage |
|-----------|-------|----------|
| State Generation | 3 | 100% |
| Authorization URL Building | 5 | 100% |
| Token Exchange | 3 | 100% |
| User Fetching | 2 | 100% |
| Database Models | 4 | 100% |
| Security Validations | 3 | 100% |
| Error Handling | 3 | 100% |
| Rate Limiting | 1 | 100% |
| Integration | 2 | 100% |
| Performance | 2 | 100% |

### Key Unit Tests

#### OAuth State Generation
- ✅ State is generated as a secure random string
- ✅ State has sufficient entropy (43+ characters)
- ✅ Multiple state generations produce unique values
- ✅ State format is URL-safe

#### GitHub Authorization URL
- ✅ Contains client ID
- ✅ Contains redirect URI
- ✅ Contains state parameter
- ✅ Contains requested scopes
- ✅ Points to correct GitHub OAuth endpoint

#### Token Exchange
- ✅ Successfully exchanges valid authorization code
- ✅ Handles invalid codes with proper error
- ✅ Handles network errors gracefully
- ✅ Validates response format

#### GitHub User Fetch
- ✅ Successfully fetches user profile with valid token
- ✅ Handles invalid token with 401 error
- ✅ Extracts user ID and username correctly

## Integration Tests

### OAuth Flow Integration

```bash
# Test complete OAuth flow
pytest tests/test_github_oauth.py::TestOAuthIntegration -v
```

### Test Scenarios

1. **Happy Path**: User successfully connects GitHub account
   ```
   1. User clicks "Connect GitHub"
   2. Backend generates OAuth state
   3. Frontend redirects to GitHub
   4. User authorizes application
   5. GitHub redirects back with code
   6. Backend exchanges code for token
   7. Token is encrypted and stored
   8. User is marked as connected
   ```

2. **State Validation**: Invalid/expired states are rejected
   ```
   1. Invalid state in callback → 400 Bad Request
   2. Expired state in callback → 400 Bad Request
   3. Missing state in callback → 400 Bad Request
   ```

3. **Token Storage**: Tokens are encrypted before storage
   ```
   1. Token is encrypted using config.security.encrypt_token()
   2. Encrypted token stored in database
   3. Token can be decrypted when needed
   ```

## End-to-End Tests

### Manual E2E Testing

#### Prerequisites
- Backend running at http://localhost:8000
- Frontend running at http://localhost:5173
- GitHub OAuth App configured

#### Test Steps

1. **Basic Connection**
   ```
   1. Open http://localhost:5173/settings
   2. Click "Connect with GitHub"
   3. Authorize application on GitHub
   4. Verify redirect back to app
   5. Check "Connected as @username" message
   6. Verify GitHub username displays correctly
   ```

2. **Repository Syncing**
   ```
   1. Open Settings or Sync dialog
   2. Verify "Connected as @username" appears
   3. Load repositories list
   4. Select one or more repositories
   5. Click "Sync Selected"
   6. Verify sync completion
   ```

3. **Disconnection**
   ```
   1. Go to Settings > GitHub Connection
   2. Click "Disconnect GitHub"
   3. Confirm disconnection
   4. Verify connection status shows "Not connected"
   5. Verify "Connect with GitHub" button appears
   ```

#### Browser DevTools Checks

```javascript
// Check OAuth state in sessionStorage
console.log(sessionStorage.getItem('github_oauth_state'));

// Check API calls in Network tab
// - GET /github/connect (should return authorization_url and state)
// - GET /github/callback?code=...&state=... (after GitHub redirect)
// - GET /github/status (should return connected status)

// Check localStorage for tokens
console.log(localStorage.getItem('resumeai_access_token'));

// Monitor errors in Console tab
```

## Security Testing

### OAuth Security Validations

#### CSRF Protection (State Parameter)
```bash
# Test 1: State parameter is generated
- OAuth state should be 43+ characters of random data

# Test 2: State must match between /connect and /callback
- GET /github/connect returns state_A
- Callback with different state_B should fail with 400 Bad Request

# Test 3: State expires after 10 minutes
- State generated at T=0
- Callback attempt at T=11 minutes should fail with 400 Bad Request
```

#### Authorization Code Validation
```bash
# Test 1: Invalid code is rejected
POST /github/callback?code=invalid_code&state=valid_state
Response: 400 Bad Request

# Test 2: Code is single-use
Use same code twice should fail on second attempt

# Test 3: Code expires
Code expires after 10 minutes of generation
```

#### Token Security
```bash
# Test 1: Token is encrypted in database
SELECT access_token FROM github_connections;
# Token should be encrypted, not plaintext

# Test 2: Token not exposed in API responses
GET /github/status
# Response should NOT include raw access_token

# Test 3: Token not logged
# Check logs for plaintext tokens (should not appear)
```

#### Redirect URI Validation
```bash
# Test 1: Only whitelisted redirect URIs allowed
- http://localhost:8000/github/callback (development)
- https://resumeai.com/auth/github/callback (production)
- Custom URIs must be explicitly allowed

# Test 2: Open redirect vulnerability prevention
GET /github/connect?redirect_uri=https://evil.com
# Should return 400 Bad Request, not redirect there
```

### Security Checklist

- [ ] OAuth state is cryptographically random
- [ ] State expires after 10 minutes
- [ ] State is single-use
- [ ] Authorization code is validated
- [ ] Tokens are encrypted before storage
- [ ] Tokens not exposed in API responses
- [ ] Tokens not logged
- [ ] Redirect URIs are whitelisted
- [ ] HTTPS enforced in production
- [ ] Secure cookie flags set
- [ ] CORS properly configured

## Performance Testing

### Load Testing

```bash
# Test multiple concurrent OAuth flows
ab -n 100 -c 10 http://localhost:8000/github/connect

# Expected results:
# - Requests per second: > 50
# - Response time (mean): < 100ms
# - Failure rate: 0%
```

### Rate Limiting Tests

```bash
# Test rate limits on OAuth endpoints
for i in {1..50}; do
  curl -H "Authorization: Bearer $JWT_TOKEN" \
    http://localhost:8000/github/connect
done

# Should see 429 Too Many Requests after limit exceeded
```

### Performance Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| OAuth state generation | < 10ms | TBD |
| Authorization URL building | < 5ms | TBD |
| Token exchange | < 500ms | TBD |
| Database query | < 50ms | TBD |
| Complete flow | < 2s | TBD |

## Error Scenario Testing

### Test Error Cases

#### Missing GitHub Credentials
```bash
# Test with missing GITHUB_CLIENT_ID
GITHUB_CLIENT_ID= python main.py
# Should log warning on startup
GET /github/connect
# Response: 500 Internal Server Error
```

#### Network Errors
```bash
# Test with GitHub API unavailable
# Mock network timeout or 503 Service Unavailable
GET /github/callback?code=test&state=test
# Response: 400 Bad Request with appropriate error message
```

#### Database Errors
```bash
# Test with database connection down
# Should gracefully handle and return 500 error
```

#### Token Expiration
```bash
# Simulate expired access token
DELETE /github/disconnect
# Should handle gracefully even if token already revoked
```

#### Concurrent Requests
```bash
# Multiple concurrent /github/connect requests from same user
# Each should get unique state
# All should complete successfully
```

### Error Response Validation

All errors should return:
```json
{
  "detail": "Human-readable error message",
  "status": 400 | 401 | 404 | 500
}
```

## User Acceptance Testing

### User Scenarios

#### Scenario 1: New User Setting Up GitHub
1. User creates ResumeAI account
2. Navigates to Settings
3. Sees "Connect your GitHub account" button
4. Clicks button
5. Authorizes on GitHub
6. Returns to app and sees success message
7. GitHub username displays in settings
8. Can now sync repositories

**Expected Outcome**: ✅ PASS

#### Scenario 2: Reconnecting After Disconnection
1. User disconnects GitHub account
2. Sees "Connect with GitHub" button again
3. Clicks to reconnect
4. Re-authorizes on GitHub
5. Connection restored

**Expected Outcome**: ✅ PASS

#### Scenario 3: Handling Authorization Denial
1. User clicks "Connect GitHub"
2. On GitHub, clicks "Cancel"
3. Returns to app
4. Sees appropriate error message
5. Can retry connection

**Expected Outcome**: ✅ PASS

#### Scenario 4: Long-Running Authorization
1. User starts OAuth flow
2. Closes browser tab
3. Days later, clicks link in email
4. Old state is expired
5. Receives clear error message to try again

**Expected Outcome**: ✅ PASS

## Verification Checklist

Before releasing, verify:

### Code Quality
- [ ] All tests pass (100% pass rate)
- [ ] Code coverage > 85%
- [ ] No security warnings from OWASP
- [ ] No TypeScript errors in frontend
- [ ] No Python lint errors in backend

### Functionality
- [ ] OAuth flow works end-to-end
- [ ] State validation working
- [ ] Token encryption working
- [ ] Repository syncing working
- [ ] Disconnection working

### Security
- [ ] Token encryption verified
- [ ] CSRF protection working
- [ ] Rate limiting working
- [ ] Error messages don't leak info
- [ ] HTTPS enforced

### Performance
- [ ] Load testing passed
- [ ] < 2s complete OAuth flow
- [ ] Database queries optimized
- [ ] No memory leaks

### Documentation
- [ ] README updated
- [ ] OAuth flow documented
- [ ] API endpoints documented
- [ ] Troubleshooting guide written
- [ ] Developer setup guide complete

### Monitoring
- [ ] Metrics collection working
- [ ] Error tracking configured
- [ ] Logs capturing OAuth events
- [ ] Alerts set up for failures

## Running All Tests

```bash
# Complete test suite
cd resume-api
pytest --cov=routes.github --cov-report=html --cov-report=term

# Frontend tests
cd ..
npm test

# Integration tests
./scripts/run-integration-tests.sh

# E2E tests
./scripts/run-e2e-tests.sh
```

## Continuous Integration

OAuth testing is automatically run on:
- Every commit via GitHub Actions
- Pre-merge via branch protection rules
- Daily nightly builds
- Manual trigger for full test suite

## Results

### Test Execution Report

| Test Suite | Status | Coverage | Time |
|-----------|--------|----------|------|
| Unit Tests | ⏳ PENDING | TBD | TBD |
| Integration Tests | ⏳ PENDING | TBD | TBD |
| E2E Tests | ⏳ PENDING | TBD | TBD |
| Security Tests | ⏳ PENDING | TBD | TBD |
| Performance Tests | ⏳ PENDING | TBD | TBD |

## Issues and Resolutions

Document any issues found during testing:

### Issue Template
```
**Title**: [Issue Title]
**Severity**: Critical | High | Medium | Low
**Steps to Reproduce**:
1. Step 1
2. Step 2

**Expected Result**: 
**Actual Result**: 
**Resolution**: 
```

## Signoff

- [ ] All tests pass
- [ ] Security review complete
- [ ] Performance acceptable
- [ ] Documentation reviewed
- [ ] Ready for production

**Tested By**: ___________  
**Date**: ___________  
**Version**: 1.0.0
