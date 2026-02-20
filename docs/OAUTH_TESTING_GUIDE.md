# OAuth Testing and Validation Guide

This document provides comprehensive testing plans and validation procedures for the GitHub OAuth integration in ResumeAI.

## Table of Contents

- [End-to-End OAuth Flow Testing](#end-to-end-oauth-flow-testing)
- [Load Testing for Concurrent Users](#load-testing-for-concurrent-users)
- [Security Audit Checklist](#security-audit-checklist)
- [Error Scenario Testing](#error-scenario-testing)
- [User Acceptance Testing](#user-acceptance-testing)
- [Performance Requirements](#performance-requirements)
- [Test Report Template](#test-report-template)
- [Rollback Plan](#rollback-plan)

---

## End-to-End OAuth Flow Testing

### Test Environment Setup

**Prerequisites:**
1. GitHub OAuth App configured for test environment
2. Backend server running with test database
3. Frontend application accessible
4. Test user accounts created

**Test URLs:**
- Backend: `http://localhost:8000` or `https://api.test.resumeai.app`
- Frontend: `http://localhost:5173` or `https://test.resumeai.app`
- GitHub OAuth App: Created at https://github.com/settings/developers

### E2E Test Scenarios

#### Test Case 1: Successful OAuth Flow

**Preconditions:**
- User has a ResumeAI account
- User is not connected to GitHub
- GitHub OAuth App is properly configured

**Steps:**
1. User logs in to ResumeAI with email/password
2. Navigate to Settings page
3. Click "Connect GitHub" button
4. Verify frontend calls `POST /api/auth/login` and receives JWT token
5. Verify frontend stores JWT token in localStorage
6. Verify frontend calls `GET /github/connect` with Authorization header
7. Verify backend returns 302 redirect to GitHub
8. User is redirected to GitHub authorization page
9. User clicks "Authorize" button on GitHub
10. User is redirected back to `/github/callback` with `code` parameter
11. Backend exchanges code for access token
12. Backend fetches GitHub user profile
13. Backend encrypts and stores token in database
14. User is redirected to frontend with `?status=success`
15. Frontend displays "GitHub connected successfully" message
16. Verify `/github/status` returns `"connection_status": "connected"`
17. Verify user's GitHub username is displayed in UI

**Expected Results:**
- OAuth flow completes without errors
- User is redirected back to application
- GitHub username is displayed
- Token is stored encrypted in database
- No CLI mode fallback is used

**Test Data:**
```json
{
  "email": "test@example.com",
  "password": "TestPassword123!",
  "github_username": "testuser"
}
```

#### Test Case 2: OAuth Flow with State Validation

**Preconditions:**
- User has a ResumeAI account
- GitHub OAuth App is configured

**Steps:**
1. Initiate OAuth flow (as in Test Case 1)
2. Before callback, capture the `state` parameter from the redirect URL
3. Modify the `state` parameter in the callback URL
4. Attempt to access the modified callback URL

**Expected Results:**
- Backend rejects the request with "Invalid state" error
- User is redirected to frontend with `?status=error&error=invalid_state`
- Error message is displayed in UI
- Database entry for the OAuth state is cleaned up
- Security log records the invalid state attempt

#### Test Case 3: OAuth Flow with Expired State

**Preconditions:**
- User has a ResumeAI account
- GitHub OAuth App is configured

**Steps:**
1. Initiate OAuth flow
2. Wait for 11 minutes (OAuth state expires after 10 minutes)
3. Complete GitHub authorization
4. Attempt to access callback URL

**Expected Results:**
- Backend rejects the request with "Expired state" error
- User is redirected to frontend with `?status=error&error=expired_state`
- Error message is displayed in UI
- Database entry for the expired OAuth state is cleaned up

#### Test Case 4: OAuth Flow with Invalid Client Credentials

**Preconditions:**
- User has a ResumeAI account
- GitHub OAuth App has invalid client secret

**Steps:**
1. Set `GITHUB_CLIENT_SECRET` to an invalid value in backend
2. Restart backend
3. Attempt OAuth flow

**Expected Results:**
- Backend returns error when exchanging code for token
- User is redirected to frontend with error status
- Error is logged with monitoring metrics
- Alert is triggered for OAuth connection failure

#### Test Case 5: Disconnect GitHub Account

**Preconditions:**
- User has GitHub account connected

**Steps:**
1. Navigate to Settings page
2. Verify GitHub connection status shows "Connected"
3. Click "Disconnect GitHub" button
4. Confirm disconnection in modal dialog
5. Verify frontend calls `DELETE /github/disconnect` with JWT token
6. Backend revokes token with GitHub API (best-effort)
7. Backend deletes token from database
8. Frontend updates UI to show "Not connected"

**Expected Results:**
- Token is removed from database
- GitHub connection status shows "not_connected"
- No errors occur
- User can reconnect if desired

#### Test Case 6: Disconnect Non-Existent Connection

**Preconditions:**
- User does not have GitHub account connected

**Steps:**
1. Navigate to Settings page
2. Verify GitHub connection status shows "Not connected"
3. Call `DELETE /github/disconnect` directly via API

**Expected Results:**
- Backend returns 204 No Content (idempotent)
- No errors occur
- Operation is safe to call multiple times

---

## Load Testing for Concurrent Users

### Test Objectives

- Verify OAuth flow handles concurrent users without errors
- Ensure database operations scale under load
- Identify performance bottlenecks
- Validate token encryption performance

### Test Tools

- **Locust**: Python-based load testing framework
- **k6**: Modern load testing tool
- **Artillery**: Node.js load testing framework

### Load Test Scenarios

#### Scenario 1: Concurrent OAuth Initiations

**Test Parameters:**
- Users: 100 concurrent users
- Duration: 5 minutes
- Ramp-up: 10 users per second

**Script (k6):**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://api.test.resumeai.app';

export let options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up to 10 users
    { duration: '3m', target: 100 }, // Ramp up to 100 users
    { duration: '1m', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  // Step 1: Login to get JWT
  const loginPayload = JSON.stringify({
    email: `user${__VU}@test.com`,
    password: 'TestPassword123!',
  });

  const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(loginRes, {
    'login successful': (r) => r.status === 200,
    'has access token': (r) => JSON.parse(r.body).access_token,
  });

  const token = JSON.parse(loginRes.body).access_token;

  // Step 2: Initiate OAuth
  const oauthRes = http.get(`${BASE_URL}/github/connect`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  check(oauthRes, {
    'OAuth initiation successful': (r) => r.status === 302,
  });

  sleep(1);
}
```

**Success Criteria:**
- 95% of requests complete in <500ms
- Error rate < 1%
- No database deadlocks
- State parameter uniqueness maintained

#### Scenario 2: Concurrent OAuth Callbacks

**Test Parameters:**
- Users: 50 concurrent users
- Duration: 5 minutes
- Simulate callback flow after authorization

**Script (k6):**
```javascript
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = 'https://api.test.resumeai.app';

export let options = {
  stages: [
    { duration: '1m', target: 10 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  // Simulate callback with mock authorization code
  const state = `test_state_${__VU}_${__ITER}`;
  const code = `test_code_${__VU}_${__ITER}`;

  // Note: This would need to be pre-seeded in database for testing
  const callbackRes = http.get(
    `${BASE_URL}/github/callback?code=${code}&state=${state}`
  );

  check(callbackRes, {
    'callback successful': (r) => r.status === 302,
  });
}
```

**Success Criteria:**
- 95% of callbacks complete in <500ms
- All tokens encrypted successfully
- No race conditions in database
- State validation works correctly

#### Scenario 3: Status Check Load

**Test Parameters:**
- Users: 200 concurrent users
- Duration: 10 minutes
- Read-only operation (safe for production)

**Script (k6):**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://api.test.resumeai.app';

export let options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '6m', target: 200 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<100'], // Should be faster than OAuth
    http_req_failed: ['rate<0.005'],  // Error rate < 0.5%
  },
};

export default function () {
  // Check GitHub status (with JWT token)
  const token = 'test_jwt_token'; // Would be pre-generated

  const statusRes = http.get(`${BASE_URL}/github/status`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  check(statusRes, {
    'status check successful': (r) => r.status === 200,
    'has connection status': (r) => JSON.parse(r.body).connection_status,
  });

  sleep(1);
}
```

**Success Criteria:**
- 95% of requests complete in <100ms (faster than OAuth)
- Error rate < 0.5%
- Database queries are optimized
- No connection pool exhaustion

### Load Test Execution

**Setup:**
```bash
# Install k6
brew install k6  # macOS
# Or: sudo apt-get install k6  # Ubuntu

# Configure test database
cd resume-api
export DATABASE_URL=sqlite:///test_load.db
python -c "from database import create_db_and_tables; create_db_and_tables()"

# Run load test
k6 run oauth_load_test.js
```

**Monitoring:**
- Monitor CPU and memory usage
- Track database connection pool
- Monitor response times (p50, p95, p99)
- Track error rates
- Monitor token encryption performance

---

## Security Audit Checklist

### Token Storage

- [ ] Access tokens are encrypted before storage
- [ ] Encryption uses Fernet (AES-128) or stronger
- [ ] Encryption key is stored securely (environment variable, not hardcoded)
- [ ] Tokens are never logged or exposed in error messages
- [ ] Tokens are never returned in API responses
- [ ] Database access is restricted to authenticated users only

### OAuth Flow Security

- [ ] State parameter is generated with cryptographically secure random function
- [ ] State parameter is stored in database with expiration
- [ ] State parameter is validated on callback
- [ ] Expired states are rejected and cleaned up
- [ ] Invalid states trigger security alerts
- [ ] OAuth callback URL matches GitHub OAuth App configuration

### JWT Security

- [ ] JWT secret is strong (min 32 characters, random)
- [ ] JWT secret is stored in environment variables
- [ ] JWT has expiration time (default 30 minutes)
- [ ] JWT refresh mechanism is implemented
- [ ] JWT is validated on every authenticated request
- [ ] Revoked tokens cannot be used

### CSRF Protection

- [ ] State parameter prevents CSRF attacks
- [ ] SameSite cookie policy is configured
- [ ] CORS headers are properly configured
- [ ] Origin validation is implemented where applicable

### Data Privacy

- [ ] User GitHub data is not shared with third parties
- [ ] GitHub data is used only for authorized purposes
- [ ] Users can revoke GitHub access at any time
- [ ] Data retention policy is documented
- [ ] Personal data is removed on account deletion

### Network Security

- [ ] All OAuth communications use HTTPS
- [ ] Token exchange uses TLS 1.2 or higher
- [ ] Sensitive headers are not leaked
- [ ] API rate limiting is configured
- [ ] DDoS protection is in place

### Compliance

- [ ] GitHub OAuth App complies with GitHub's Terms of Service
- [ ] User consent is obtained before accessing data
- [ ] OAuth scopes are minimal (user:email, read:user)
- [ ] Privacy policy is accessible and up-to-date
- [ ] Terms of service are accessible and up-to-date

---

## Error Scenario Testing

### 1. Failed OAuth Authorization

**Scenario:**
User denies authorization on GitHub

**Steps:**
1. Initiate OAuth flow
2. On GitHub authorization page, click "Cancel"
3. Verify user is redirected back to application

**Expected Results:**
- Frontend detects error in URL parameters
- User-friendly error message is displayed
- Error is logged for monitoring
- User can retry OAuth flow

**Error Message:**
```
"GitHub authorization was cancelled. Please try again."
```

### 2. Expired JWT Token

**Scenario:**
User attempts to access protected endpoint with expired JWT

**Steps:**
1. Login and receive JWT token (30 minute expiry)
2. Wait for 31 minutes
3. Attempt to call `/github/connect` with expired token

**Expected Results:**
- Backend returns 401 Unauthorized
- Frontend detects 401 response
- User is prompted to login again
- Frontend attempts to refresh token if refresh token available

**Error Response:**
```json
{
  "error": "Unauthorized",
  "detail": "Token has expired"
}
```

### 3. Invalid JWT Token

**Scenario:**
User attempts to access protected endpoint with malformed JWT

**Steps:**
1. Modify JWT token (change one character)
2. Attempt to call `/github/connect` with invalid token

**Expected Results:**
- Backend returns 401 Unauthorized
- Security log records invalid token attempt
- Frontend prompts user to login again

### 4. GitHub API Errors

**Scenario:**
GitHub API is unavailable or returns errors

**Test Cases:**
- GitHub API returns 500 Internal Server Error
- GitHub API rate limit exceeded
- GitHub API timeout
- GitHub user not found

**Steps:**
1. Mock GitHub API responses to return errors
2. Attempt OAuth flow
3. Verify error handling

**Expected Results:**
- Error is caught and logged
- User receives friendly error message
- Database transaction is rolled back
- Monitoring metrics are updated
- Alert is triggered for API failures

### 5. Database Errors

**Scenario:**
Database is unavailable or returns errors

**Test Cases:**
- Database connection timeout
- Database deadlock
- Database constraint violation
- Database out of disk space

**Steps:**
1. Simulate database errors
2. Attempt OAuth operations
3. Verify error handling

**Expected Results:**
- Error is caught and logged
- User receives friendly error message
- No data corruption occurs
- Alert is triggered for database failures

### 6. Network Errors

**Scenario:**
Network connectivity issues

**Test Cases:**
- Connection timeout to GitHub API
- DNS resolution failure
- SSL certificate error
- Connection reset

**Steps:**
1. Simulate network errors
2. Attempt OAuth flow
3. Verify retry logic and error handling

**Expected Results:**
- Appropriate retry logic is implemented
- User receives clear error message
- No infinite loops occur
- Operation can be retried

### 7. Duplicate GitHub Connections

**Scenario:**
User attempts to connect same GitHub account twice

**Steps:**
1. Connect GitHub account (user: testuser)
2. Disconnect GitHub account
3. Reconnect same GitHub account (user: testuser)

**Expected Results:**
- Existing connection is updated with new token
- Duplicate entries are not created
- Connection status shows "connected"
- No errors occur

---

## User Acceptance Testing

### UAT Checklist

#### Registration and Login
- [ ] User can create account with valid email/password
- [ ] User receives confirmation of account creation
- [ ] User can login with correct credentials
- [ ] User cannot login with incorrect credentials
- [ ] Password strength requirements are enforced
- [ ] Error messages are clear and actionable

#### GitHub Connection
- [ ] "Connect GitHub" button is visible in Settings
- [ ] Clicking button redirects to GitHub
- [ ] GitHub authorization page displays correct app name
- [ ] Authorization page displays requested scopes
- [ ] User can authorize the application
- [ ] User is redirected back to application
- [ ] Success message is displayed
- [ ] GitHub username is shown in UI
- [ ] Connection status shows "Connected"

#### GitHub Disconnection
- [ ] "Disconnect GitHub" button is visible when connected
- [ ] Confirmation dialog is shown
- [ ] Disconnection removes GitHub data
- [ ] Success message is displayed
- [ ] Connection status shows "Not connected"
- [ ] User can reconnect if desired

#### Error Handling
- [ ] OAuth errors are displayed clearly
- [ ] Network errors are handled gracefully
- [ ] User can retry failed operations
- [ ] Error messages provide next steps
- [ ] No sensitive information is leaked in errors

#### User Experience
- [ ] OAuth flow is intuitive
- [ ] Loading states are shown during OAuth
- [ ] Success/failure states are clear
- [ ] Instructions are easy to follow
- [ ] Help documentation is accessible
- [ ] Support contact is available

#### Mobile Responsiveness
- [ ] OAuth flow works on mobile devices
- [ ] UI is responsive on small screens
- [ ] Touch targets are appropriately sized
- [ ] No horizontal scrolling required

#### Browser Compatibility
- [ ] OAuth flow works in Chrome
- [ ] OAuth flow works in Firefox
- [ ] OAuth flow works in Safari
- [ ] OAuth flow works in Edge

### UAT Sign-Off

**UAT Lead:** ________________________ **Date:** ___________

**Testers:**
- [ ] ________________________ Approved
- [ ] ________________________ Approved
- [ ] ________________________ Approved

**Overall Status:** [ ] Approved [ ] Approved with Conditions [ ] Not Approved

**Notes/Conditions:**
_____________________________________________________________________
_____________________________________________________________________

**Final Approval:** ________________________ **Date:** ___________

---

## Performance Requirements

### OAuth Flow Performance

| Operation | Target | Measured | Status |
|-----------|---------|-----------|--------|
| User Login (JWT) | <200ms | TBD | |
| OAuth Initiation | <300ms | TBD | |
| GitHub Authorization Redirect | <500ms | TBD | |
| OAuth Callback Processing | <500ms | TBD | |
| Token Exchange | <1000ms | TBD | |
| User Fetch | <500ms | TBD | |
| Token Encryption | <100ms | TBD | |
| Database Storage | <200ms | TBD | |
| **Total OAuth Flow** | **<5000ms (5s)** | TBD | |

### API Endpoint Performance

| Endpoint | P50 Target | P95 Target | P99 Target |
|----------|------------|-------------|-------------|
| POST /api/auth/login | <100ms | <200ms | <300ms |
| POST /api/auth/register | <200ms | <400ms | <600ms |
| GET /github/connect | <200ms | <300ms | <400ms |
| GET /github/status | <50ms | <100ms | <150ms |
| DELETE /github/disconnect | <200ms | <400ms | <600ms |
| GET /github/callback | <500ms | <1000ms | <1500ms |

### Database Performance

| Operation | Target | Measured | Status |
|-----------|---------|-----------|--------|
| Insert OAuth State | <50ms | TBD | |
| Query OAuth State | <50ms | TBD | |
| Delete OAuth State | <50ms | TBD | |
| Insert User Connection | <100ms | TBD | |
| Query User Connection | <50ms | TBD | |
| Update User Connection | <100ms | TBD | |
| Delete User Connection | <100ms | TBD | |

### Encryption Performance

| Operation | Target | Measured | Status |
|-----------|---------|-----------|--------|
| Token Encryption | <50ms | TBD | |
| Token Decryption | <50ms | TBD | |

### Resource Utilization

| Metric | Target | Measured | Status |
|--------|---------|-----------|--------|
| CPU Usage (Idle) | <10% | TBD | |
| CPU Usage (Load) | <50% | TBD | |
| Memory Usage (Idle) | <500MB | TBD | |
| Memory Usage (Load) | <2GB | TBD | |
| Database Connections (Idle) | <10 | TBD | |
| Database Connections (Load) | <100 | TBD | |

---

## Test Report Template

### OAuth Integration Test Report

**Test Environment:**
- Backend URL: ________________________
- Frontend URL: ________________________
- Database: ________________________
- Test Date: ________________________

**Test Team:**
- Lead: ________________________
- Testers: ________________________

---

#### Executive Summary

**Overall Status:** [ ] Pass [ ] Fail [ ] Pass with Conditions

**Test Coverage:**
- Test Cases Planned: ___________
- Test Cases Executed: ___________
- Test Cases Passed: ___________
- Test Cases Failed: ___________
- Coverage Percentage: ________%

**Critical Issues Found:** _______
**High Priority Issues:** _______
**Medium Priority Issues:** _______
**Low Priority Issues:** _______

---

#### Functional Test Results

| Test Case | ID | Status | Defect ID | Notes |
|-----------|-----|--------|------------|-------|
| Successful OAuth Flow | TC001 | [ ] Pass [ ] Fail | | |
| State Validation | TC002 | [ ] Pass [ ] Fail | | |
| Expired State | TC003 | [ ] Pass [ ] Fail | | |
| Invalid Client Credentials | TC004 | [ ] Pass [ ] Fail | | |
| Disconnect GitHub | TC005 | [ ] Pass [ ] Fail | | |
| Disconnect Non-Existent | TC006 | [ ] Pass [ ] Fail | | |

---

#### Performance Test Results

| Metric | Target | Measured | Status | Notes |
|--------|---------|-----------|--------|-------|
| Total OAuth Flow | <5000ms | ________ms | [ ] Pass [ ] Fail | |
| User Login (JWT) | <200ms | ________ms | [ ] Pass [ ] Fail | |
| OAuth Callback | <500ms | ________ms | [ ] Pass [ ] Fail | |
| Token Encryption | <100ms | ________ms | [ ] Pass [ ] Fail | |

---

#### Security Test Results

| Check | Status | Notes |
|-------|--------|-------|
| Token Encryption | [ ] Pass [ ] Fail | |
| State Parameter CSRF Protection | [ ] Pass [ ] Fail | |
| JWT Security | [ ] Pass [ ] Fail | |
| HTTPS Only | [ ] Pass [ ] Fail | |
| Minimal OAuth Scopes | [ ] Pass [ ] Fail | |

---

#### Load Test Results

| Scenario | Users | Duration | Error Rate | P95 Response | Status |
|----------|--------|-----------|-------------|--------------|--------|
| Concurrent OAuth Initiations | 100 | 5min | ____% | ______ms | [ ] Pass [ ] Fail |
| Concurrent OAuth Callbacks | 50 | 5min | ____% | ______ms | [ ] Pass [ ] Fail |
| Status Check Load | 200 | 10min | ____% | ______ms | [ ] Pass [ ] Fail |

---

#### Browser Compatibility

| Browser | Version | Status | Notes |
|---------|----------|--------|-------|
| Chrome | Latest | [ ] Pass [ ] Fail | |
| Firefox | Latest | [ ] Pass [ ] Fail | |
| Safari | Latest | [ ] Pass [ ] Fail | |
| Edge | Latest | [ ] Pass [ ] Fail |

---

#### Defect Summary

| Defect ID | Severity | Description | Status |
|------------|----------|-------------|--------|
| DEF001 | [ ] Critical [ ] High [ ] Medium [ ] Low | | [ ] Open [ ] Fixed |
| DEF002 | [ ] Critical [ ] High [ ] Medium [ ] Low | | [ ] Open [ ] Fixed |

---

#### Recommendations

1. _____________________________________________________________________
2. _____________________________________________________________________
3. _____________________________________________________________________

---

#### Sign-Off

**QA Lead:** ________________________ **Date:** ___________

**Product Owner:** ________________________ **Date:** ___________

**Development Lead:** ________________________ **Date:** ___________

---

## Rollback Plan

### Rollback Triggers

Rollback should be considered if:

1. **Security Issues:**
   - Token encryption failures
   - OAuth state bypass vulnerabilities
   - JWT token leakage
   - Unauthorized access incidents

2. **Performance Issues:**
   - OAuth flow >10 seconds
   - Error rate >5%
   - Database connection exhaustion
   - Server crashes under load

3. **Functional Issues:**
   - Users unable to connect GitHub
   - OAuth flow fails for >50% of users
   - Data corruption in database
   - Critical bugs blocking core functionality

4. **User Feedback:**
   - >10% of users report issues
   - App Store/Play Store negative reviews
   - Support ticket spike

### Rollback Procedure

#### Immediate Rollback (Zero Downtime)

**Step 1: Disable OAuth Mode**
```bash
# Connect to production server
ssh production-server

# Edit environment file
cd /app
nano .env

# Change GITHUB_AUTH_MODE to oauth (no CLI fallback available)
# Set DEBUG=true to enable logging
DEBUG=true

# Restart application
docker-compose restart resume-api
```

**Step 2: Notify Users**
- Post banner in application
- Send email notification to users
- Update status page (e.g., statuspage.io)
- Post on social media accounts

**Step 3: Monitor Logs**
```bash
# Check application logs
docker-compose logs -f resume-api

# Check OAuth error rate
curl -s http://localhost:8000/metrics | grep oauth_connection_failure
```

#### Full Rollback (Downtime Required)

**Step 1: Take Application Offline**
```bash
# Stop accepting traffic
cd /app
docker-compose stop nginx  # Stop reverse proxy

# Show maintenance page
docker run -d -p 80:80 \
  -v $(pwd)/maintenance.html:/usr/share/nginx/html \
  nginx:alpine
```

**Step 2: Revert Database**
```bash
# Backup current database
cp resumeai.db resumeai.db.backup.$(date +%Y%m%d_%H%M%S)

# Restore previous version
cp resumeai.db.previous resumeai.db

# Verify data integrity
python -c "from database import check_db_integrity; check_db_integrity()"
```

**Step 3: Revert Code**
```bash
# Rollback git commit
cd /app
git revert <commit-hash>
git push origin main

# Redeploy
docker-compose down
docker-compose up -d
```

**Step 4: Verify Rollback**
```bash
# Test health endpoint
curl http://localhost:8000/health

# Test other core functionality
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

**Step 5: Bring Application Online**
```bash
# Stop maintenance page
docker stop maintenance-container

# Start reverse proxy
docker-compose start nginx

# Verify traffic is flowing
curl https://api.resumeai.app/health
```

### Rollback Validation

After rollback, verify:

- [ ] Application is responding
- [ ] Health endpoint returns 200
- [ ] No errors in logs
- [ ] Database is accessible
- [ ] Core functionality works
- [ ] No data corruption

### Communication Plan

**Users:**
- Email notification within 15 minutes
- In-app banner immediately
- Status page updated
- Social media post

**Stakeholders:**
- Engineering team notification (Slack/Teams)
- Product team notification
- Support team notification
- Management notification

### Post-Rollback Actions

1. **Root Cause Analysis:**
   - Investigate what caused the issue
   - Document findings
   - Create action items

2. **Prevent Recurrence:**
   - Update test cases
   - Add monitoring/alerts
   - Update documentation

3. **Follow Up:**
   - Schedule follow-up meeting
   - Discuss permanent fix
   - Plan re-release

### Rollback Testing

Before production rollback, test rollback procedure in staging:

```bash
# Deploy to staging
cd staging
./deploy.sh

# Intentionally break something (e.g., invalid JWT secret)
nano .env
JWT_SECRET=invalid

# Test rollback
./rollback.sh

# Verify staging is working
curl http://staging.resumeai.app/health
```

---

## Appendices

### A. Test Environment Setup

**Docker Compose for Testing:**
```yaml
version: '3.8'
services:
  resume-api-test:
    build: ./resume-api
    environment:
      - DATABASE_URL=sqlite:///test.db
      - DEBUG=true
      - GITHUB_AUTH_MODE=oauth
      - JWT_SECRET=test-secret-change-in-production
    ports:
      - "8001:8000"
    volumes:
      - ./test-results:/app/test-results
```

### B. Test Data

**Sample Users:**
```json
{
  "users": [
    {
      "email": "test1@example.com",
      "password": "TestPass123!",
      "github_username": "testuser1"
    },
    {
      "email": "test2@example.com",
      "password": "TestPass456!",
      "github_username": "testuser2"
    }
  ]
}
```

### C. Monitoring Metrics

**Key Metrics to Monitor:**
- OAuth connection success rate
- OAuth connection failure rate
- Average OAuth flow duration
- Token encryption time
- Database query time
- Error rate by endpoint
- Active connections
- Response times (p50, p95, p99)

### D. Contact Information

**Emergency Contacts:**
- Engineering Lead: ________________________
- DevOps Lead: ________________________
- Product Owner: ________________________
- QA Lead: ________________________

**Support Channels:**
- Slack: #oauth-integration
- Email: oauth-support@resumeai.app
- PagerDuty: ____________

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-20 | Claude Sonnet | Initial version for OAuth testing |
