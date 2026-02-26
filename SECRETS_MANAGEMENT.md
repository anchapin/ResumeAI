# Secrets Management Guide

## Overview

This document describes how to securely manage secrets and sensitive data in ResumeAI.

## Required Secrets

### Frontend Secrets (.env.local)

```
VITE_API_URL              (URL)
RESUMEAI_API_KEY          (API key)
GITHUB_CLIENT_ID          (OAuth app)
GITHUB_CLIENT_SECRET      (OAuth app)
GITHUB_CALLBACK_URL       (OAuth app)
GEMINI_API_KEY            (AI provider)
LINKEDIN_CLIENT_ID        (Optional)
LINKEDIN_CLIENT_SECRET    (Optional)
```

### Backend Secrets (resume-api/.env)

```
MASTER_API_KEY            (REQUIRED - API authentication)
SECRET_KEY                (REQUIRED - JWT signing)
OPENAI_API_KEY            (REQUIRED - At least one AI provider)
ANTHROPIC_API_KEY         (Optional - Alternative AI provider)
GEMINI_API_KEY            (Optional - Alternative AI provider)
REQUIRE_API_KEY           (Security setting)
```

## Development Setup

### 1. Initial Setup

```bash
# Copy example configuration
cp .env.example .env.local

# Copy backend example
cp resume-api/.env.example resume-api/.env

# Fill in your secrets
nano .env.local
nano resume-api/.env
```

### 2. Getting Secrets for Development

**For team members:**

1. Request secrets from tech lead via secure channel
2. Secrets are provided individually, never in bulk
3. Store in local `.env` files (in .gitignore)
4. Rotate secrets every 90 days (production only)

### 3. Validating Secrets

```bash
# Backend validation runs at startup
python resume-api/main.py

# Should show: "Configuration loaded: ..."
# If secrets missing: "FATAL: Missing required environment variables..."
```

## Production Deployment

### GitHub Secrets Setup

1. **Go to repository settings:**
   - GitHub → Settings → Secrets and variables → Actions

2. **Add production secrets:**

   ```
   MASTER_API_KEY=rai_xxxxx...
   SECRET_KEY=xxxxx...
   OPENAI_API_KEY=sk-...
   GITHUB_CLIENT_SECRET=...
   GITHUB_CALLBACK_URL=https://api.resumeai.com/github/callback
   ```

3. **Reference in workflows:**
   ```yaml
   env:
     MASTER_API_KEY: ${{ secrets.MASTER_API_KEY }}
     SECRET_KEY: ${{ secrets.SECRET_KEY }}
   ```

### CI/CD Pipeline

**Frontend (.github/workflows/deploy-frontend.yml):**

```yaml
- name: Build
  env:
    VITE_API_URL: https://api.resumeai.com
    RESUMEAI_API_KEY: ${{ secrets.MASTER_API_KEY }}
  run: npm run build
```

**Backend (.github/workflows/deploy-backend.yml):**

```yaml
- name: Deploy to Docker
  env:
    MASTER_API_KEY: ${{ secrets.MASTER_API_KEY }}
    SECRET_KEY: ${{ secrets.SECRET_KEY }}
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  run: docker-compose -f docker-compose.prod.yml up
```

## Secret Generation

### API Keys

```bash
# Generate strong API key (32 bytes hex)
python -c "import secrets; print('rai_' + secrets.token_hex(32))"
# Output: rai_abc123def456ghi789jkl012...

# Or using OpenSSL
openssl rand -hex 32
```

### JWT Secret Key

```bash
# Generate strong JWT secret (32 bytes, URL-safe)
python -c "import secrets; print(secrets.token_urlsafe(32))"
# Output: abc123def456ghi789jkl012-_ABC123...
```

### Database Passwords

```bash
# Generate strong password (24 bytes)
python -c "import secrets; print(secrets.token_hex(24))"
```

## Secret Rotation

### Development Secrets

No rotation required for development. Secrets are local and not sensitive.

### Production Secrets

**Rotation schedule:** Every 90 days

**Procedure:**

1. Generate new secret with command above
2. Update in GitHub Secrets
3. Deploy new version with updated secret
4. Verify old secret no longer works
5. Document rotation in security log

**For API keys specifically:**

```bash
# 1. Generate new key
NEW_KEY=$(python -c "import secrets; print('rai_' + secrets.token_hex(32))")
echo $NEW_KEY

# 2. Update in GitHub Secrets
# - Go to Settings → Secrets
# - Click "New repository secret"
# - Name: MASTER_API_KEY
# - Value: $NEW_KEY

# 3. Update apps that use the old key to use new key
# 4. After 1 week, remove old key
```

## Secret Logging Prevention

### Never Log Secrets

```python
# BAD - Will log secret
logger.info(f"API key: {api_key}")

# GOOD - Redacted
logger.info(f"API key: {api_key[:4]}***")

# BETTER - Use sanitizer
from config.validation import SecretValidator
sanitized = SecretValidator.sanitize_dict(config)
logger.info(f"Config: {sanitized}")
```

### CI/CD Logging

**GitHub Actions - Automatically masks secrets:**

```yaml
# Secrets are automatically redacted in logs
- name: Deploy
  env:
    API_KEY: ${{ secrets.MASTER_API_KEY }}
  run: |
    echo $API_KEY  # Output: ***
```

**Docker Logs - Don't pass secrets as ENV:**

```dockerfile
# BAD
ENV API_KEY=$MASTER_API_KEY

# GOOD - Pass at runtime
docker run -e MASTER_API_KEY=$MASTER_API_KEY image:tag
```

## Secure Secret Sharing

### For Team Members

**Never:**

- ❌ Email secrets
- ❌ Slack/Discord messages
- ❌ Git commits
- ❌ Screenshots
- ❌ Paste in issues/PRs

**Always:**

- ✅ Use password manager (1Password, LastPass, Vault)
- ✅ Share via secure link (1Password sharing)
- ✅ Verbal handoff if in-person
- ✅ GitHub Secrets for CI/CD
- ✅ AWS Secrets Manager for production

### For Third-Party Integrations

1. Generate **unique API key** for each integration
2. Store in integration's secrets manager
3. Document which integration uses which key
4. Ability to revoke per-integration
5. Audit access regularly

## Secrets in Containers

### Docker Build Secrets

**Avoid secrets in Dockerfile:**

```dockerfile
# BAD - Secrets in image
RUN export API_KEY=secret && ...

# GOOD - Pass at runtime
docker run -e API_KEY=$SECRET_VALUE image:tag
```

### Docker Compose Secrets

**Development (.env file):**

```yaml
# .env (in .gitignore)
MASTER_API_KEY=rai_dev_key_here
```

```yaml
# docker-compose.yml
environment:
  MASTER_API_KEY: ${MASTER_API_KEY}
```

**Production (GitHub Secrets):**

```yaml
# docker-compose.prod.yml with secrets in compose file
environment:
  MASTER_API_KEY: ${MASTER_API_KEY}
```

## Auditing Secret Access

### Log Secret Access

```python
import logging

logger = logging.getLogger(__name__)

def get_api_key():
    key = os.getenv('MASTER_API_KEY')
    if key:
        logger.info('API key loaded successfully')  # No actual key
    else:
        logger.error('API key not configured')
    return key
```

### Audit Trail

Keep records of:

- When secrets were rotated
- Who accessed production secrets
- Which deployments used which secrets
- Failed auth attempts (too many = breach signal)

## Compromised Secret Response

**If you suspect a secret has been compromised:**

1. **Immediately revoke** the secret
2. **Generate new** secret
3. **Update** in GitHub Secrets
4. **Deploy** new version with new secret
5. **Monitor** logs for unauthorized access
6. **Notify** security team (if applicable)
7. **Document** the incident
8. **Review** access logs for suspicious activity

## Tools and Services

### Recommended Tools

- **Secret Manager**: 1Password, LastPass, AWS Secrets Manager
- **CI/CD Secrets**: GitHub Secrets, GitLab CI/CD Variables
- **Key Rotation**: Automated via GitHub Actions + cron
- **Secrets Scanning**: GitHub Advanced Security, TruffleHog
- **Vault**: HashiCorp Vault for advanced needs

### GitHub Security Features

- Automatic secret scanning
- Token expiration
- Automatic secret revocation
- Audit logs of secret access

## Checklist

### Before Deploying

- [ ] All secrets set in GitHub Secrets
- [ ] No secrets in .env files committed
- [ ] No secrets in code or documentation
- [ ] Secrets rotated (if not within 90 days)
- [ ] CI/CD secrets masked in logs
- [ ] Database credentials changed (new deployment)
- [ ] API keys enabled/disabled as needed

### Ongoing

- [ ] Monitor for secret leaks (GitHub alerts)
- [ ] Rotate production secrets every 90 days
- [ ] Audit secret access monthly
- [ ] Review team access to secrets
- [ ] Update this guide as practices change
- [ ] Train new team members

## FAQ

**Q: Can I commit .env to git?**  
A: Only .env.example with placeholder values. Real .env files must be .gitignored.

**Q: How often rotate secrets?**  
A: Development: Never. Production: Every 90 days.

**Q: What if I accidentally commit a secret?**  
A: 1. Revoke immediately in GitHub 2. Change in production 3. Force-push to remove from history 4. Create new branch

**Q: Can I use the same API key everywhere?**  
A: No. Use unique keys for each environment (dev, staging, production).

**Q: How to test with production secrets locally?**  
A: Request secrets from tech lead, store in .env.local (in .gitignore), never commit.

## References

- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [HashiCorp Vault](https://www.vaultproject.io/)
