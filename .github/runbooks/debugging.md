# Debugging Runbook

## Common Issues

### Backend Issues

#### API Returns 500 Error

1. Check backend logs:
```bash
tail -f resume-api/logs/app.log
```

2. Verify environment variables:
```bash
cat resume-api/.env
```

3. Check database connection:
```bash
curl http://localhost:8000/api/v1/health
```

#### Authentication Errors

1. Verify API key is set in frontend
2. Check backend authentication middleware
3. Verify JWT_SECRET is configured

### Frontend Issues

#### Blank Page

1. Check browser console for errors
2. Verify API URL is correct in .env.local
3. Check network requests

#### Build Failures

1. Clear cache: `rm -rf node_modules dist`
2. Reinstall: `npm install`
3. Check TypeScript: `npx tsc --noEmit`

## Debug Mode

Enable debug mode:

```bash
# Backend
DEBUG=true python main.py

# Frontend
npm run dev
```

## Collecting Debug Info

When reporting issues, include:

1. Error messages/logs
2. Steps to reproduce
3. Environment details
4. Screenshots if applicable
