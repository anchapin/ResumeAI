# ResumeAI Runbooks

This directory contains operational runbooks for ResumeAI.

## Available Runbooks

- [Deployment](./deployment.md) - Deploy the application
- [Rollback](./rollback.md) - Rollback to a previous version
- [Debugging](./debugging.md) - Debug common issues

## Quick Reference

### Restart Services

```bash
# Backend
cd resume-api && pkill -f "python main.py" && python main.py

# Frontend  
npm run dev
```

### Check Logs

```bash
# Backend logs
tail -f resume-api/logs/app.log

# Frontend logs
npm run dev  # Check terminal output
```

### Database Operations

```bash
# Connect to database
psql $DATABASE_URL

# Run migrations
cd resume-api && python -m alembic upgrade head
```

## Emergency Contacts

- On-call: [Add your team contact]
- Escalation: [Add manager contact]
