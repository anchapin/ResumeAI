# Rollback Runbook

## When to Rollback

- Production is broken
- Critical bug introduced
- Performance degradation

## Backend Rollback

### Option 1: Docker Rollback

```bash
# List previous images
docker images resume-api

# Rollback to previous tag
docker run -d -p 8000:8000 --env-file .env resume-api:previous-tag
```

### Option 2: Git Rollback

```bash
# Find last known good commit
git log --oneline -20

# Rollback backend
git checkout <last-good-commit> -- resume-api/
cd resume-api && pip install -r requirements.txt && python main.py
```

## Frontend Rollback

### Vercel Rollback

```bash
# List deployments
vercel ls

# Rollback to previous deployment
vercel rollback <deployment-id>
```

## Post-Rollback

1. Verify application is working
2. Check error logs
3. Notify team
4. Document incident
