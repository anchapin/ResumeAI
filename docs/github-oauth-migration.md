# GitHub CLI to OAuth Migration Guide

## Overview

GitHub CLI mode (`GITHUB_AUTH_MODE=cli`) is deprecated and will be removed in a future release. This guide helps you migrate your deployment to OAuth mode (`GITHUB_AUTH_MODE=oauth`).

**Migration Deadline**: TBA (check release notes)

## Why Migrate?

### OAuth Mode Benefits

- **Per-user Authentication**: Each user authenticates with their own GitHub account
- **Security**: No shared credentials on the server
- **Rate Limits**: Per-user GitHub API rate limits (5,000 requests/hour per user)
- **Multi-User Support**: Multiple users can connect their accounts independently
- **Browser-Based Flow**: Users authorize via standard OAuth web flow
- **Revocable**: Users can revoke access at any time from GitHub settings

### CLI Mode Limitations (Deprecated)

- **Single User**: Only one GitHub account can be connected
- **Shared Credentials**: Server-side authentication credentials
- **Limited Rate Limits**: Shared across all users
- **Security Risk**: CLI must be authenticated on the server
- **Not Production-Ready**: Not designed for multi-user applications

## Pre-Migration Checklist

Before migrating, ensure you have:

- [ ] GitHub OAuth App created and configured
- [ ] `GITHUB_CLIENT_ID` environment variable set
- [ ] `GITHUB_CLIENT_SECRET` environment variable set
- [ ] `GITHUB_CALLBACK_URL` configured correctly
- [ ] Frontend URL configured (`FRONTEND_URL`)
- [ ] Database migration run to add OAuth tables (if upgrading from old version)

## Step-by-Step Migration

### Step 1: Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the form:
   - **Application name**: ResumeAI
   - **Homepage URL**: `https://yourdomain.com`
   - **Application description**: Professional resume builder with GitHub integration
   - **Authorization callback URL**: `https://api.yourdomain.com/github/callback`
4. Click "Register application"
5. Copy the **Client ID** and generate a **Client Secret**

### Step 2: Update Environment Variables

Update your deployment configuration to include OAuth credentials:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GITHUB_CALLBACK_URL=https://api.yourdomain.com/github/callback
GITHUB_AUTH_MODE=oauth

# Frontend URL (for OAuth redirect)
FRONTEND_URL=https://yourdomain.com
```

**Important**:

- Never commit `GITHUB_CLIENT_SECRET` to version control
- Use secrets management (Kubernetes secrets, AWS Secrets Manager, etc.)
- Update `GITHUB_CALLBACK_URL` for each environment (dev, staging, production)

### Step 3: Remove gh CLI Dependency (Production Only)

**For Production Deployments**:

- Remove `gh` CLI from Dockerfile (if present)
- Remove CLI-related environment variables
- Ensure Docker image does not include `gh` installation

**For Local Development** (Optional):

- You may keep `gh` CLI installed for other purposes
- But set `GITHUB_AUTH_MODE=oauth` to use OAuth

### Step 4: Update Application Configuration

Update `resume-api/.env`:

```bash
# Set OAuth mode
GITHUB_AUTH_MODE=oauth

# Verify GitHub credentials are set
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
```

### Step 5: Test OAuth Flow Locally

Before deploying to production, test the OAuth flow:

1. **Start the Backend**

   ```bash
   cd resume-api
   python main.py
   ```

2. **Start the Frontend**

   ```bash
   npm run dev
   ```

3. **Test Connection Flow**
   - Open http://localhost:5173
   - Navigate to Settings > GitHub Integration
   - Click "Connect GitHub"
   - Authorize with GitHub
   - Verify connection appears successful

4. **Check Health Endpoint**

   ```bash
   curl http://localhost:8000/health/oauth
   ```

   Expected response:

   ```json
   {
     "healthy": true,
     "success_rate": 1.0,
     "success_count": 1,
     "failure_count": 0,
     "github_configured": true,
     ...
   }
   ```

### Step 6: Deploy to Staging

1. **Update Staging Environment Variables**

   ```bash
   # In your deployment system (Kubernetes, Cloud Run, etc.)
   # Set the following for staging:
   GITHUB_AUTH_MODE=oauth
   GITHUB_CLIENT_ID=staging_client_id
   GITHUB_CLIENT_SECRET=staging_client_secret
   GITHUB_CALLBACK_URL=https://staging-api.yourdomain.com/github/callback
   ```

2. **Deploy and Verify**

   ```bash
   # Deploy to staging
   ./deploy-cloudrun.sh

   # Verify health
   curl https://staging-api.yourdomain.com/health/oauth
   ```

3. **Test End-to-End**
   - Test OAuth flow in staging environment
   - Verify GitHub project import works
   - Check monitoring metrics

### Step 7: Deploy to Production

Once staging is verified:

1. **Update Production Environment Variables**

   ```bash
   GITHUB_AUTH_MODE=oauth
   GITHUB_CLIENT_ID=production_client_id
   GITHUB_CLIENT_SECRET=production_client_secret
   GITHUB_CALLBACK_URL=https://api.yourdomain.com/github/callback
   ```

2. **Deploy**

   ```bash
   ./deploy-cloudrun.sh
   ```

3. **Verify Production Health**

   ```bash
   curl https://api.yourdomain.com/health/oauth
   ```

4. **Monitor Metrics**

   ```bash
   # Check OAuth metrics
   curl https://api.yourdomain.com/metrics | grep oauth_

   # Set up monitoring alerts if not already configured
   ```

## Post-Migration Steps

### 1. Remove CLI Code (Future Release)

Once CLI mode is removed from the codebase:

- Remove `GITHUB_AUTH_MODE` configuration
- Remove CLI-related code paths
- Update documentation

### 2. Update User Documentation

Update user-facing documentation:

- Remove any mentions of "server-side GitHub authentication"
- Document the OAuth connection flow
- Update troubleshooting guides

### 3. Monitor Performance

Monitor OAuth performance metrics:

- Connection success rate
- Token refresh events
- Rate limit utilization
- API response times

### 4. Set Up Alerts

Configure alerts for:

- High authentication failure rate
- Rate limit approaching
- Token storage errors
- Unusual activity patterns

## Rollback Plan

If you encounter issues after migration, you can temporarily revert to CLI mode:

```bash
# Revert environment variable
GITHUB_AUTH_MODE=cli

# Redeploy
./deploy-cloudrun.sh
```

**Note**: CLI mode is deprecated and rollback is only temporary. Please fix OAuth issues and migrate as soon as possible.

## Troubleshooting

### Issue: OAuth Callback URL Mismatch

**Error**: "Redirect URI mismatch"

**Solution**:

1. Verify `GITHUB_CALLBACK_URL` in environment variables
2. Update GitHub OAuth App with correct callback URL
3. URL must match exactly (including https:// and trailing slash if applicable)

### Issue: CORS Errors

**Error**: CORS policy blocks request

**Solution**:

1. Add frontend domain to `CORS_ORIGINS` environment variable
2. Restart application
3. Verify frontend can reach backend

### Issue: Rate Limit Exceeded

**Error**: GitHub API rate limit (403)

**Solution**:

1. Verify each user has their own OAuth token (not shared)
2. Implement request caching
3. Reduce API call frequency

### Issue: Token Not Persisted

**Error**: OAuth flow succeeds but connection not saved

**Solution**:

1. Check database connection: `curl /health | jq .checks.database`
2. Verify encryption key is set
3. Check storage error metrics: `curl /metrics | grep oauth_storage_errors_total`

## Support

If you encounter issues during migration:

1. **Check Logs**:

   ```bash
   kubectl logs -f deployment/resume-api | grep -i oauth
   ```

2. **Review Runbook**:
   - See `docs/oauth-monitoring-runbook.md` for detailed troubleshooting

3. **Check Health**:

   ```bash
   curl https://api.yourdomain.com/health/detailed
   ```

4. **Contact Support**:
   - Create GitHub issue with details
   - Include error logs and health check output

## Additional Resources

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [OAuth Monitoring Runbook](docs/oauth-monitoring-runbook.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [API Documentation](API_DOCUMENTATION.md)

## Migration Checklist

Use this checklist to track your migration progress:

- [ ] Create GitHub OAuth App
- [ ] Set `GITHUB_CLIENT_ID` in all environments
- [ ] Set `GITHUB_CLIENT_SECRET` in all environments
- [ ] Set `GITHUB_CALLBACK_URL` correctly
- [ ] Set `FRONTEND_URL` correctly
- [ ] Set `GITHUB_AUTH_MODE=oauth`
- [ ] Test OAuth flow locally
- [ ] Deploy to staging
- [ ] Verify staging deployment
- [ ] Deploy to production
- [ ] Verify production deployment
- [ ] Set up monitoring alerts
- [ ] Update user documentation
- [ ] Remove `gh` CLI from production (if present)
- [ ] Monitor for 1 week after migration

---

**Migration Date**: [Fill in date]
**Migrated By**: [Fill in name]
**Notes**: [Any additional notes or issues encountered]
