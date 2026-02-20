# OAuth Monitoring Runbook

## Overview

This runbook covers common OAuth-related issues and troubleshooting steps for ResumeAI's GitHub OAuth integration.

## Monitoring Metrics

The following metrics are tracked for OAuth health:

- `oauth_connection_success_total` - Successful OAuth connections
- `oauth_connection_failure_total` - Failed OAuth connections (by error type)
- `oauth_token_refresh_total` - Token refresh events
- `oauth_rate_limit_hits_total` - GitHub API rate limit hits
- `oauth_token_expiration_events` - Token expiration events
- `oauth_storage_errors_total` - Token storage errors
- `oauth_active_connections` - Currently active OAuth connections

## Health Check Endpoints

- `GET /health/oauth` - OAuth-specific health check
- `GET /health/detailed` - Full system health including OAuth
- `GET /metrics` - Prometheus metrics

## Common Issues and Troubleshooting

### 1. High OAuth Authentication Failure Rate

**Symptoms:**
- Alert triggered: "High OAuth authentication failure rate"
- Users unable to connect GitHub accounts
- `oauth_connection_failure_total` metric increasing rapidly

**Possible Causes:**
- Invalid `GITHUB_CLIENT_ID` or `GITHUB_CLIENT_SECRET`
- Incorrect `GITHUB_CALLBACK_URL` configuration
- GitHub OAuth App suspended or revoked
- Network connectivity issues with GitHub API
- State parameter validation failures

**Troubleshooting Steps:**

1. **Check OAuth Configuration**
   ```bash
   # Verify environment variables are set
   curl http://your-api/health/oauth | jq '.details.oauth.github_configured'
   # Should return true
   ```

2. **Verify GitHub OAuth App**
   - Log in to https://github.com/settings/developers
   - Check that OAuth App is active
   - Verify callback URL matches exactly:
     ```
     https://api.yourdomain.com/github/callback
     ```

3. **Check Application Logs**
   ```bash
   # Look for GitHub OAuth errors
   kubectl logs -f deployment/resume-api | grep "github_oauth"
   ```

4. **Test OAuth Flow Manually**
   - Visit `GET /github/connect` endpoint
   - Follow the redirect to GitHub
   - Check for errors in the callback

**Resolution:**
- Update GitHub OAuth App configuration if callback URL is wrong
- Regenerate client secret if compromised
- Verify network connectivity to GitHub API (api.github.com)

---

### 2. GitHub API Rate Limit Approaching

**Symptoms:**
- Alert triggered: "OAuth API rate limit approaching"
- `oauth_rate_limit_hits_total` metric increasing
- API calls to GitHub failing with 403 status

**Possible Causes:**
- High volume of GitHub API requests
- Multiple users sharing same OAuth token (not expected with OAuth)
- GitHub API quota exceeded (5000 requests/hour for authenticated tokens)

**Troubleshooting Steps:**

1. **Check Rate Limit Metrics**
   ```bash
   # View rate limit hits
   curl http://your-api/metrics | grep oauth_rate_limit_hits_total
   ```

2. **Monitor GitHub API Headers**
   - Check `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers
   - Verify rate limits are per-user (OAuth tokens)

3. **Check for Token Sharing**
   - Verify `UserGitHubConnection` table has one-to-one user mapping
   ```sql
   SELECT user_id, github_user_id, COUNT(*)
   FROM user_github_connections
   GROUP BY user_id, github_user_id
   HAVING COUNT(*) > 1;
   ```

**Resolution:**
- Implement request caching to reduce API calls
- Add proper pagination handling to fetch data in batches
- Consider adding user-level rate limiting
- Monitor and tune API usage patterns

---

### 3. OAuth Token Expiration Events

**Symptoms:**
- Alert triggered: "OAuth token expiration events detected"
- Users suddenly unable to access GitHub data
- `oauth_token_expiration_events` metric incrementing

**Possible Causes:**
- OAuth tokens expire (GitHub tokens typically don't expire unless revoked)
- User revokes access in GitHub settings
- OAuth App access revoked
- Tokens are being rotated for security

**Troubleshooting Steps:**

1. **Check Token Expiration Metrics**
   ```bash
   curl http://your-api/metrics | grep oauth_token_expiration_events
   ```

2. **Review Database for Token Issues**
   ```sql
   SELECT user_id, github_username, created_at, updated_at
   FROM user_github_connections
   WHERE updated_at < datetime('now', '-1 day');
   ```

3. **Check Application Logs for Token Errors**
   ```bash
   kubectl logs -f deployment/resume-api | grep -i "token.*expir"
   ```

**Resolution:**
- User needs to reconnect their GitHub account via OAuth flow
- Provide clear UI message prompting reconnection
- Consider implementing automatic token refresh if needed
- Monitor for unusual patterns (may indicate security issue)

---

### 4. OAuth Token Storage Errors

**Symptoms:**
- Alert triggered: "OAuth token storage errors detected"
- OAuth flow appears successful but token not persisted
- `oauth_storage_errors_total` metric increasing

**Possible Causes:**
- Database connection issues
- Encryption key rotation problems
- Disk space exhausted
- Database constraints violated

**Troubleshooting Steps:**

1. **Check Database Health**
   ```bash
   curl http://your-api/health | jq '.checks.database'
   # Should be true
   ```

2. **Check Storage Error Metrics**
   ```bash
   curl http://your-api/metrics | grep oauth_storage_errors_total
   ```

3. **Review Database Logs**
   ```bash
   kubectl logs -f deployment/resume-api | grep -i "database\|sql\|storage"
   ```

4. **Check Encryption Key**
   ```bash
   # Verify TOKEN_ENCRYPTION_KEY is set
   kubectl get secret resume-api-secrets -o jsonpath='{.data.TOKEN_ENCRYPTION_KEY}'
   ```

**Resolution:**
- Restart database if connection issues
- Check disk space on database server
- Verify encryption key is valid and not rotated improperly
- Check database constraints (e.g., unique constraints)

---

### 5. Users Cannot Connect GitHub Account

**Symptoms:**
- Users report "Connection failed" errors
- OAuth flow returns error
- No specific alert triggered

**Troubleshooting Steps:**

1. **Verify OAuth Configuration**
   ```bash
   curl http://your-api/health/oauth | jq '.details.oauth'
   ```

2. **Test OAuth Flow in Production**
   - Create test account
   - Attempt GitHub connection
   - Monitor application logs during flow

3. **Check CORS Configuration**
   - Verify `CORS_ORIGINS` includes production frontend domain
   - Check for CORS errors in browser console

4. **Review GitHub OAuth App Settings**
   - Ensure Authorization callback URL is correct
   - Check Application type (Web application)
   - Verify required scopes: `user:email`, `public_repo`

**Resolution:**
- Update OAuth callback URL in GitHub App
- Add frontend domain to CORS origins
- Restart application after configuration changes

---

## Proactive Monitoring

### Set Up Alerts

Configure alerts for the following thresholds:

1. **OAuth Authentication Failure Rate**: > 10% over 5 minutes
2. **Rate Limit Hits**: > 10 in 5 minutes
3. **Token Expiration Events**: > 5 in 5 minutes
4. **Storage Errors**: > 3 in 5 minutes

### Dashboards

Create monitoring dashboards showing:

- OAuth connection success rate (success / (success + failure))
- Rate limit hits over time
- Active OAuth connections
- Token refresh events
- Storage error count

### Log Monitoring

Monitor logs for:

- `github_oauth_*` log events
- `oauth_*` errors
- Token encryption/decryption errors
- Database constraint violations in OAuth tables

## Escalation Procedures

### Severity 1 (Critical) - OAuth Completely Broken
- **Impact**: All users unable to connect GitHub
- **Response Time**: < 15 minutes
- **Actions**:
  1. Check GitHub App status
  2. Verify environment variables
  3. Restart application if needed
  4. Engage infrastructure team if database issues

### Severity 2 (High) - High Failure Rate
- **Impact**: Many users affected (> 10%)
- **Response Time**: < 1 hour
- **Actions**:
  1. Identify error patterns
  2. Check for rate limiting
  3. Review recent configuration changes
  4. Implement workaround if needed

### Severity 3 (Medium) - Intermittent Issues
- **Impact**: Some users affected (< 10%)
- **Response Time**: < 4 hours
- **Actions**:
  1. Gather metrics and logs
  2. Identify root cause
  3. Fix and test
  4. Monitor for recurrence

## Maintenance Tasks

### Daily
- Review OAuth health metrics
- Check for new alerts

### Weekly
- Review OAuth connection trends
- Check database table sizes
- Verify backup integrity

### Monthly
- Review OAuth App security settings
- Audit user connections for anomalies
- Update runbook based on incidents

## Contact Information

- **Development Team**: [email]
- **Infrastructure Team**: [email]
- **On-Call Engineer**: [phone]
