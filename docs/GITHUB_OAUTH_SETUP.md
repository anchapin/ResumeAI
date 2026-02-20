# GitHub OAuth Setup Guide

This guide walks you through creating and configuring a GitHub OAuth App for ResumeAI.

## Overview

ResumeAI uses GitHub OAuth to allow users to connect their GitHub accounts and import repositories as projects. This integration enables:

- Secure, per-user GitHub authentication
- Importing public repositories
- Multi-user support in production
- Proper rate limiting per user

## Step 1: Create GitHub OAuth App

1. Navigate to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"** button
3. Fill in the application details:

### Application Information
- **Application name**: `ResumeAI`
- **Homepage URL**:
  - Development: `http://localhost:5173` (or your dev frontend URL)
  - Staging: `https://staging.resumeai.example.com`
  - Production: `https://resumeai.example.com`
- **Application description**: `Resume builder with GitHub integration`
- **Authorization callback URL**:
  - Development: `http://127.0.0.1:8000/github/callback`
  - Staging: `https://api-staging.resumeai.example.com/github/callback`
  - Production: `https://api.resumeai.example.com/github/callback`

### Important Notes
- You can create separate OAuth Apps for development, staging, and production
- The callback URL MUST be HTTPS in production
- You can add multiple callback URLs for different environments

## Step 2: Get OAuth Credentials

After creating the OAuth App, you'll receive:

1. **Client ID**: A public identifier (starts with `Iv1.`)
   - Example: `Iv1.1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h`

2. **Client Secret**: A confidential token
   - Click **"Generate a new client secret"** if not shown
   - Save this securely - you won't see it again!
   - Example: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4`

## Step 3: Configure Environment Variables

Add the following environment variables to your `.env` file:

### Development (.env.local)
```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=Iv1.1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b9c0d1e2f3g4h
GITHUB_CLIENT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4
GITHUB_CALLBACK_URL=http://127.0.0.1:8000/github/callback
```

### Production / Staging
For production deployments, configure these as secrets in your deployment platform:

#### Vercel (Frontend)
```bash
# Not needed for frontend - these are backend-only
```

#### Docker / Cloud (Backend)
```bash
GITHUB_CLIENT_ID=Iv1.production_client_id_here
GITHUB_CLIENT_SECRET=production_secret_here
GITHUB_CALLBACK_URL=https://api.resumeai.example.com/github/callback
```

### Docker Compose
```yaml
services:
  resume-api:
    environment:
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
      - GITHUB_CALLBACK_URL=${GITHUB_CALLBACK_URL}
```

## Step 4: Configure Deployment Secrets

### Vercel / Railway / Render
1. Go to your project settings
2. Navigate to **Environment Variables** or **Secrets**
3. Add the following secrets:
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET`
   - `GITHUB_CALLBACK_URL`

### AWS / GCP / Azure
Use the platform's secret management service:

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name resumeai/github-client-id \
  --secret-string "Iv1.xxxxxx"
```

**Google Secret Manager:**
```bash
gcloud secrets create github-client-id \
  --data-file=- <<< "Iv1.xxxxxx"
```

### Kubernetes
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: github-oauth
type: Opaque
stringData:
  client-id: "Iv1.xxxxxx"
  client-secret: "xxxxxx"
  callback-url: "https://api.resumeai.example.com/github/callback"
```

## Step 5: Verify Configuration

### Test the OAuth Flow

1. Start your development server:
```bash
cd resume-api
python main.py
```

2. Check that environment variables are loaded:
```python
from config import settings

print(f"GitHub Client ID: {settings.github_client_id}")
print(f"GitHub Callback URL: {settings.github_callback_url}")
```

3. Visit the health endpoint to verify API is running:
```bash
curl http://127.0.0.1:8000/health
```

### Test OAuth Endpoints (When Implemented)

```bash
# Generate OAuth URL (when /github/connect endpoint is ready)
curl http://127.0.0.1:8000/github/connect

# Check connection status (when /github/status endpoint is ready)
curl -H "X-API-KEY: your_api_key" http://127.0.0.1:8000/github/status
```

## Security Best Practices

### 1. Never Commit Secrets
```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

### 2. Use Separate Apps for Environments
- Development OAuth App for local testing
- Staging OAuth App for pre-production
- Production OAuth App for live traffic

### 3. Monitor OAuth Usage
- Regularly review GitHub OAuth App usage
- Revoke any unauthorized tokens
- Monitor API rate limits

### 4. Rotate Secrets
- Rotate `GITHUB_CLIENT_SECRET` every 90 days
- Update deployment secrets after rotation
- Test after rotation to ensure smooth transition

### 5. Limit OAuth Scopes
ResumeAI only requests minimal scopes:
- `read:user` - Read user profile data
- `public_repo` - Read public repositories

## Troubleshooting

### Common Issues

**Issue**: "redirect_uri_mismatch" error
- **Solution**: Ensure the callback URL in your `.env` matches exactly what's configured in GitHub OAuth App

**Issue**: "client_id_invalid" error
- **Solution**: Verify `GITHUB_CLIENT_ID` is set correctly and starts with `Iv1.`

**Issue**: "client_secret_invalid" error
- **Solution**: Regenerate the client secret in GitHub and update your environment variables

**Issue**: Environment variables not loading
- **Solution**:
  - Check that `.env` file exists in the `resume-api/` directory
  - Ensure `pydantic-settings` is installed
  - Verify file permissions on `.env`

### Debug Mode

Enable debug logging to troubleshoot OAuth issues:

```bash
# In .env
DEBUG=true
LOG_LEVEL=DEBUG
```

## OAuth Flow Overview

The complete OAuth flow consists of these steps:

1. **User initiates connection** - User clicks "Connect GitHub" in settings
2. **Generate OAuth URL** - Server creates authorization URL with state parameter
3. **Redirect to GitHub** - User is redirected to GitHub's authorization page
4. **User authorizes** - User grants permissions to ResumeAI
5. **Callback handling** - GitHub redirects back with authorization code
6. **Token exchange** - Server exchanges code for access token
7. **Token storage** - Access token is encrypted and stored in database
8. **API usage** - Stored token is used for GitHub API requests

## Rate Limits

With OAuth, each user has their own rate limit:

- **Authenticated requests**: 5,000 requests/hour per user
- **Unauthenticated**: 60 requests/hour per IP

This makes ResumeAI scalable as each user gets their own quota.

## Additional Resources

- [GitHub OAuth Documentation](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GitHub OAuth API Reference](https://docs.github.com/en/rest/oauth-authorizations)
- [OAuth 2.0 Specification](https://oauth.net/2/)

## Next Steps

After configuring OAuth:

1. Implement OAuth endpoints (`/github/connect`, `/github/callback`, `/github/disconnect`)
2. Add database schema for storing GitHub connections
3. Update frontend to show GitHub connection status
4. Test the complete OAuth flow
5. Deploy to staging and verify production configuration

## Support

If you encounter issues:

1. Check the logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure the GitHub OAuth App is configured properly
4. Review the OAuth flow documentation
5. Open an issue on GitHub with error details
