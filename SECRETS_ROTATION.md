# Secrets Rotation Procedure

## Overview

This document provides step-by-step guidance for rotating secrets in ResumeAI. Regular secret rotation is a critical security practice to limit the impact of potential compromises.

## Rotation Schedule

| Environment     | Frequency      | Urgency      |
| --------------- | -------------- | ------------ |
| **Production**  | Every 90 days  | **Critical** |
| **Staging**     | Every 180 days | High         |
| **Development** | As needed      | Low          |

## Types of Secrets to Rotate

1. **API Keys** - Backend authentication (MASTER_API_KEY, API_KEYS)
2. **JWT Secrets** - Session signing (SECRET_KEY, JWT_SECRET)
3. **AI Provider Keys** - OpenAI, Claude, Gemini API keys
4. **OAuth Secrets** - GitHub, LinkedIn client secrets
5. **Database Passwords** - If using database
6. **Encryption Keys** - Token encryption key (TOKEN_ENCRYPTION_KEY)
7. **Stripe Credentials** - Webhook secret, API keys
8. **Third-party API Keys** - Any external service credentials

## Prerequisites

Before starting rotation:

- [ ] Access to GitHub Secrets (repository Settings → Secrets and variables → Actions)
- [ ] Ability to deploy new code
- [ ] Access to monitoring/alerting dashboard
- [ ] Database access (if rotating DB credentials)
- [ ] Communication channel with team
- [ ] Planned maintenance window (for production)

## Step-by-Step Rotation Procedures

### 1. API Key Rotation (MASTER_API_KEY)

Used by: Frontend authentication, third-party integrations

**Duration:** ~15 minutes

**Procedure:**

```bash
# Step 1: Generate new API key
NEW_KEY=$(python -c "import secrets; print('rai_' + secrets.token_hex(32))")
echo "New API Key: $NEW_KEY"
# Save this securely!
```

**Step 2: Update GitHub Secrets**

- Navigate to: GitHub → Settings → Secrets and variables → Actions
- Find: MASTER_API_KEY
- Click: Edit
- Replace value with NEW_KEY
- Click: Update secret

**Step 3: Update environment configs**

- Update `.env` file (if testing locally)
- Update any configuration files that reference this key

**Step 4: Deploy new version**

```bash
# Push deployment trigger (via GitHub Actions or manual)
# This will use the new MASTER_API_KEY
git push origin main
# Monitor: GitHub → Actions → Monitor deployment
```

**Step 5: Verify new key is active**

```bash
# Test API call with new key
curl -H "X-API-KEY: $NEW_KEY" https://api.resumeai.com/health
# Expected: {"status": "healthy", ...}
```

**Step 6: Monitor for issues**

- Check application logs for authentication errors
- Monitor error rates in dashboard
- Verify no client connection failures
- Wait 5-10 minutes for stability

**Step 7: Revoke old key (optional but recommended)**

- If comfortable with cutover, document old key as revoked
- Keep record of rotation date in SECRETS_ROTATION_LOG.txt

---

### 2. JWT Secret Rotation (SECRET_KEY)

Used by: Token signing, session management

**Duration:** ~20 minutes

**Caution:** Existing tokens will become invalid after rotation!

**Procedure:**

```bash
# Step 1: Generate new JWT secret
NEW_JWT=$(python -c "import secrets; print(secrets.token_urlsafe(32))")
echo "New JWT Secret: $NEW_JWT"
```

**Step 2: Understand impact**

- All active JWT tokens will become invalid
- Users will be logged out
- Browser sessions will end
- Consider doing during low-traffic period

**Step 3: Update GitHub Secrets**

- Navigate to: GitHub → Settings → Secrets and variables → Actions
- Find: SECRET_KEY
- Click: Edit
- Replace with NEW_JWT
- Click: Update secret

**Step 4: Update local environment (if testing)**

```bash
# In resume-api/.env
SECRET_KEY=$NEW_JWT
```

**Step 5: Deploy new version**

```bash
# Deploy during off-peak hours to minimize user impact
git push origin main
```

**Step 6: Communicate to users (if many active sessions)**

- Consider posting notice: "Planned security update in progress"
- Mention brief service interruption expected

**Step 7: Monitor for issues**

- Watch for authentication failures in logs
- Monitor login attempt rates
- Check for any 401/403 errors spikes
- Verify new tokens are being issued

**Step 8: Verify rotation successful**

```bash
# Check logs show successful token generation
grep -i "token.*generated\|jwt.*issued" logs/app.log | tail -20
```

---

### 3. AI Provider API Key Rotation

#### OpenAI API Key

Used by: Resume generation, tailoring, variant creation

**Duration:** ~10 minutes

**Procedure:**

```bash
# Step 1: Generate new OpenAI API key
# Go to: https://platform.openai.com/account/api-keys
# Click: "Create new secret key"
# Copy: New key starting with "sk-"
# Note: Old key is immediately revoked

# Step 2: Update GitHub Secrets
# Repository → Settings → Secrets → Actions
# Find: OPENAI_API_KEY
# Replace with new key
# Save
```

**Step 3: Deploy**

```bash
git push origin main
# Monitor deployment
```

**Step 4: Verify**

```bash
# Test API call
curl -X POST https://api.resumeai.com/v1/tailor \
  -H "X-API-KEY: $MASTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"resume_id": "test"}'
# Should succeed with valid OpenAI response
```

#### Claude (Anthropic) API Key

Used by: Alternative AI provider for resume generation

**Procedure:** Similar to OpenAI

```bash
# 1. Go to: https://console.anthropic.com/account/keys
# 2. Create new key
# 3. Update ANTHROPIC_API_KEY in GitHub Secrets
# 4. Deploy and test
```

#### Google Gemini API Key

Used by: Alternative AI provider

**Procedure:**

```bash
# 1. Go to: https://aistudio.google.com/app/apikey
# 2. Create new key or regenerate existing
# 3. Update GEMINI_API_KEY in GitHub Secrets
# 4. Deploy and test
```

---

### 4. OAuth Secrets Rotation

#### GitHub OAuth Secret

Used by: GitHub social login

**Duration:** ~15 minutes

**Procedure:**

```bash
# Step 1: Go to OAuth App settings
# GitHub → Settings → Developer settings → OAuth Apps
# Select: ResumeAI application
# Click: Generate new client secret

# Step 2: Copy new secret and update GitHub Secrets
# Repository → Settings → Secrets → Actions
# Update: GITHUB_CLIENT_SECRET
```

**Step 3: Update callback URL if changed**

```bash
# Verify callback URL matches:
# https://api.resumeai.com/auth/github/callback
# Or your deployment URL + /auth/github/callback
```

**Step 4: Deploy**

```bash
git push origin main
```

**Step 5: Test OAuth login**

- Go to: https://resumeai.com/login
- Click: "Sign in with GitHub"
- Complete OAuth flow
- Verify successful login

#### LinkedIn OAuth Secret

Used by: LinkedIn social login (optional)

**Procedure:** Similar to GitHub OAuth

```bash
# 1. Go to: https://www.linkedin.com/developers/apps
# 2. Select app → Auth
# 3. Regenerate client secret
# 4. Update LINKEDIN_CLIENT_SECRET in GitHub Secrets
# 5. Deploy and test login
```

---

### 5. Database Password Rotation

Used by: Database access (if using PostgreSQL)

**Duration:** ~30 minutes

**Prerequisites:**

- [ ] Database admin access
- [ ] Can create new users
- [ ] Can drop old users after migration

**Procedure:**

```bash
# Step 1: Generate new database password
NEW_DB_PASS=$(python -c "import secrets; print(secrets.token_hex(24))")
echo "New DB Password: $NEW_DB_PASS"
```

**Step 2: Create new database user**

```sql
-- Connect to database as admin
-- Create new user with new password
CREATE USER resumeai_new WITH PASSWORD 'NEW_DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE resumeai TO resumeai_new;
```

**Step 3: Update DATABASE_URL**

```bash
# Old: postgresql://resumeai:old_pass@db.example.com:5432/resumeai
# New: postgresql://resumeai_new:NEW_DB_PASS@db.example.com:5432/resumeai
# Update in GitHub Secrets: DATABASE_URL
```

**Step 4: Test connection**

```bash
# Local testing
psql postgresql://resumeai_new:$NEW_DB_PASS@db.example.com:5432/resumeai -c "SELECT 1;"
```

**Step 5: Deploy**

```bash
git push origin main
```

**Step 6: Monitor database connections**

```sql
-- Check active connections
SELECT * FROM pg_stat_activity WHERE datname = 'resumeai';
```

**Step 7: Remove old user (after 24 hours)**

```sql
-- Terminate old user's connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity
WHERE usename = 'resumeai';

-- Drop old user
DROP USER resumeai;
```

---

### 6. Encryption Key Rotation (TOKEN_ENCRYPTION_KEY)

Used by: Encrypting OAuth tokens in database

**Duration:** ~30 minutes

**Complex:** Requires re-encrypting all stored tokens

**Procedure:**

```bash
# Step 1: Generate new encryption key
NEW_ENCRYPTION_KEY=$(python -c "import os; print(os.urandom(32).hex())")
echo "New Encryption Key: $NEW_ENCRYPTION_KEY"
```

**Step 2: Create migration script**

```python
# scripts/rotate_encryption_key.py
import os
from database import get_db
from config.security import encrypt_token, decrypt_token

def rotate_encryption_key(old_key, new_key):
    """Re-encrypt all tokens with new key."""
    db = get_db()

    # Get all users with OAuth tokens
    users = db.query(User).filter(User.oauth_token != None).all()

    for user in users:
        # Decrypt with old key
        decrypted = decrypt_token(user.oauth_token, old_key)

        # Re-encrypt with new key
        encrypted = encrypt_token(decrypted, new_key)
        user.oauth_token = encrypted

    db.commit()
```

**Step 3: Run migration**

```bash
# Backup database first!
python scripts/rotate_encryption_key.py
```

**Step 4: Update GitHub Secrets**

- Update: TOKEN_ENCRYPTION_KEY
- Save new key

**Step 5: Deploy**

```bash
git push origin main
```

---

## Emergency Rotation (Compromised Secret)

**If you suspect a secret has been compromised:**

### Immediate Actions (< 5 minutes)

1. **Notify team immediately**

```bash
# Slack/Discord: "#security" channel
# Subject: "URGENT: Suspected secret compromise - [SECRET_NAME]"
```

2. **Revoke the secret immediately**

```bash
# GitHub Secrets → Delete the compromised secret
# Or mark as revoked in configuration
```

3. **Check logs for unauthorized access**

```bash
# Search logs for unusual activity
grep "authentication_failed\|unauthorized" logs/app.log | tail -100
```

### Short Term (< 1 hour)

4. **Generate and deploy new secret**

```bash
# Follow standard rotation procedure above
# Mark as EMERGENCY ROTATION in change log
```

5. **Audit access logs**

```bash
# Check who accessed what
# Look for unusual patterns
# Check timestamps around compromise discovery
```

6. **Monitor for exploitation**

```bash
# Watch for:
# - Unauthorized API calls
# - Unusual data access
# - New user accounts created
# - Permission changes
```

### Medium Term (< 24 hours)

7. **Post-incident analysis**

- How was secret exposed?
- When was it compromised?
- Who/what accessed it?
- What data was exposed?
- Update process to prevent recurrence

8. **Document incident**

```
SECRETS_ROTATION_LOG.txt entry:
[DATE] EMERGENCY - [SECRET_TYPE] compromised
- Exposed: [DETAILS]
- Revoked: [TIMESTAMP]
- Rotated: [TIMESTAMP]
- Impact: [WHAT WAS AFFECTED]
- RCA: [ROOT CAUSE ANALYSIS]
```

---

## Verification Checklist

After each rotation, verify:

### API Key Rotation

- [ ] New key works with API calls
- [ ] Old key is rejected (401)
- [ ] No authentication errors in logs
- [ ] Clients can authenticate

### JWT Secret Rotation

- [ ] New tokens are issued correctly
- [ ] Old tokens are rejected
- [ ] Users can login
- [ ] No session errors in logs

### AI Provider Rotation

- [ ] Resume generation works
- [ ] Tailoring requests succeed
- [ ] Variant generation works
- [ ] No API rate limit errors

### OAuth Secrets

- [ ] Social login works
- [ ] User can authenticate
- [ ] Token refresh works
- [ ] User data syncs correctly

### Database Rotation

- [ ] App connects successfully
- [ ] Queries execute properly
- [ ] No connection timeouts
- [ ] Backup/restore works

### General

- [ ] No error spikes in monitoring
- [ ] Response times normal
- [ ] No unexpected 5xx errors
- [ ] Logs show clean startup
- [ ] Health check endpoints pass

---

## Automation Options

### Scheduled Rotation with GitHub Actions

```yaml
# .github/workflows/rotate-secrets-quarterly.yml
name: Quarterly Secret Rotation

on:
  schedule:
    - cron: '0 0 1 */3 *' # First day of every 3 months

jobs:
  rotate-secrets:
    runs-on: ubuntu-latest
    steps:
      - name: Notify team
        run: |
          echo "Quarterly secret rotation due"
          # Send notification to team

      - name: Check GitHub Actions logs
        run: |
          # Check for recent deployments
          # Ensure production is stable

      - name: Create rotation checklist issue
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Quarterly Secret Rotation Due',
              body: '- [ ] MASTER_API_KEY\n- [ ] SECRET_KEY\n- [ ] OPENAI_API_KEY\n- [ ] etc.'
            })
```

### Third-Party Solutions

- **AWS Secrets Manager**: Automatic rotation for AWS resources
- **HashiCorp Vault**: Encrypted secret storage and rotation
- **1Password Secrets Automation**: Integrate with CI/CD
- **GitHub Advanced Security**: Secret scanning and rotation alerts

---

## Documentation

### Rotation Log

Keep `SECRETS_ROTATION_LOG.txt` in root directory:

```
[2025-01-15] MASTER_API_KEY rotated
  - Previous key: rai_abc123***
  - Deployed: 2025-01-15 14:30 UTC
  - Verified: OK
  - Issues: None

[2025-01-15] SECRET_KEY rotated
  - Duration: 8 minutes
  - User impact: ~200 users logged out
  - Deployed: 2025-01-15 15:00 UTC
  - Verified: OK

[2025-02-01] EMERGENCY - OPENAI_API_KEY compromised
  - Compromised: 2025-02-01 10:15 UTC
  - Discovered: 2025-02-01 10:45 UTC
  - Rotated: 2025-02-01 10:50 UTC
  - Impact: No unauthorized API calls detected
  - RCA: Dev left key in GitHub issue (public repo)
  - Action: Code review process updated
```

---

## Related Documentation

- [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md) - General secrets overview
- [.env.example](.env.example) - All environment variables
- [CONTRIBUTING.md](CONTRIBUTING.md#secrets-management) - Contributing guide secrets section

---

## Questions?

1. **How often should I rotate?**
   - Production: Every 90 days
   - Staging: Every 180 days
   - Dev: As needed

2. **Will rotation cause downtime?**
   - API keys: No (gradual rollover)
   - JWT secrets: Possible (users logged out, minutes only)
   - Database: Requires planning (coordination needed)

3. **What if rotation fails?**
   - Rollback to previous version via GitHub
   - Restore previous secret value
   - Investigate issue and retry

4. **How to test rotation safely?**
   - Test in development first
   - Test in staging environment
   - Then rotate in production

5. **Should I keep old secrets?**
   - No, revoke immediately after verification
   - Keep rotation log for audit trail
   - Never store old secrets in code/git
