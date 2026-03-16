# Writing Assistant Deployment Guide

## Overview

This guide covers deployment of the Writing Assistant feature to staging and production environments.

## Prerequisites

- Docker and Docker Compose
- API keys for LLM providers (Anthropic, OpenAI)
- Redis instance for caching
- LanguageTool Docker image access

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   FastAPI        │────▶│  LanguageTool   │
│   (React)       │     │   Writing API    │     │  (Grammar)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │       │
                              ▼       ▼
                        ┌─────────┐ ┌──────────┐
                        │ Claude  │ │ GPT-4o   │
                        │ (Primary)│ │(Fallback)│
                        └─────────┘ └──────────┘
                              │
                              ▼
                        ┌──────────┐
                        │  Redis   │
                        │ (Cache)  │
                        └──────────┘
```

## Environment Variables

### Required

```bash
# LLM Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# LanguageTool
LANGUAGETOOL_URL=http://languagetool:8010

# Redis
REDIS_URL=redis://redis:6379

# Feature Flag
ENABLE_WRITING_ASSISTANT=true
```

### Optional

```bash
# Model Configuration
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
OPENAI_MODEL=gpt-4o-mini

# Caching
CACHE_TTL_SECONDS=86400

# Rate Limiting
WRITING_RATE_LIMIT=100/minute
```

## Staging Deployment

### 1. Update Docker Compose

Add to `docker-compose.yml`:

```yaml
services:
  resume-api:
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - LANGUAGETOOL_URL=http://languagetool:8010
      - REDIS_URL=redis://redis:6379
    depends_on:
      - languagetool
      - redis
  
  languagetool:
    image: erikvl87/languagetool:latest
    ports:
      - "8081:8010"
    volumes:
      - languagetool-data:/root/.local/share/LanguageTool
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data
```

### 2. Deploy to Staging

```bash
# Set environment variables
export ANTHROPIC_API_KEY=sk-ant-staging-...
export OPENAI_API_KEY=sk-staging-...

# Start services
docker-compose up -d languagetool redis

# Wait for services to be healthy
docker-compose ps

# Deploy API
docker-compose up -d resume-api

# Verify deployment
curl http://localhost:8000/api/v1/writing/suggest \
  -H "Content-Type: application/json" \
  -d '{"text": "Test sentence"}'
```

### 3. Run Smoke Tests

```bash
# Health check
curl http://localhost:8000/api/v1/health

# API endpoint test
pytest resume-api/tests/writing_assistant/test_integration.py -v

# Load test (optional)
locust -f resume-api/locustfile.py --host=http://localhost:8000
```

## Production Deployment

### 1. Pre-Deployment Checklist

- [ ] Staging tests passing
- [ ] API keys rotated for production
- [ ] Rate limiting configured
- [ ] Monitoring dashboards ready
- [ ] Rollback procedure documented
- [ ] Load testing completed

### 2. Deploy with Blue-Green

```bash
# Deploy to green environment
docker-compose -f docker-compose.prod.yml up -d

# Run health checks
./test_docker_health.sh

# Switch traffic (update load balancer)
# ... load balancer specific commands

# Monitor for 1 hour
# Check metrics dashboard

# If successful, update blue environment
# If issues, rollback immediately
```

### 3. Rollback Procedure

```bash
# Stop green environment
docker-compose -f docker-compose.prod.yml down

# Start blue environment
docker-compose -f docker-compose.prod.blue.yml up -d

# Verify rollback
curl http://localhost:8000/api/v1/health
```

## Monitoring

### Key Metrics

| Metric | Threshold | Alert |
|--------|-----------|-------|
| API Latency p95 | <1000ms | >2000ms |
| Error Rate | <1% | >5% |
| Cache Hit Rate | >60% | <40% |
| LLM Fallback Rate | <10% | >30% |
| LanguageTool Health | Up | Down |

### Logs

```bash
# API logs
docker-compose logs -f resume-api

# LanguageTool logs
docker-compose logs -f languagetool

# Redis logs
docker-compose logs -f redis
```

### Alerts

Configure alerts for:
- API error rate > 5%
- Latency p95 > 2s
- LanguageTool health check failures
- Redis connection failures
- LLM circuit breaker trips

## Performance Optimization

### Caching Strategy

```python
# Multi-layer caching
# 1. In-memory (fastest, per-instance)
# 2. Redis (shared, 24hr TTL)
# 3. LLM response caching

# Cache key generation
cache_key = sha256(f"{operation}:{text}:{context}")
```

### Rate Limiting

```python
# Per-user rate limiting
# 100 requests/minute
# 20 requests/10 seconds burst

@router.post("/suggest")
@rate_limit(limit="100/minute")
async def get_suggestions(...):
    ...
```

### Load Balancing

For multiple API instances:
- Use round-robin load balancing
- Enable sticky sessions for caching
- Configure health check endpoints

## Troubleshooting

### LanguageTool Connection Issues

```bash
# Check service status
docker-compose ps languagetool

# Test endpoint
curl http://localhost:8081/v2/check \
  -H "Content-Type: application/json" \
  -d '{"text": "test", "language": "en-US"}'

# Restart if needed
docker-compose restart languagetool
```

### Redis Connection Issues

```bash
# Check Redis status
docker-compose exec redis redis-cli ping

# Should return: PONG

# Check memory usage
docker-compose exec redis redis-cli INFO memory
```

### LLM API Failures

```bash
# Check circuit breaker status
curl http://localhost:8000/api/v1/health/detailed

# Verify API keys
echo $ANTHROPIC_API_KEY | head -c 10
echo $OPENAI_API_KEY | head -c 10

# Test LLM connectivity
pytest resume-api/tests/writing_assistant/test_ai_enhancer.py -v
```

## Cost Management

### Estimated Monthly Costs (10K DAU)

| Service | Tier | Cost |
|---------|------|------|
| LanguageTool | Self-hosted | $50-100 |
| Redis | Self-hosted | $0 |
| Claude | Pay-per-use | $2,000-3,000 |
| GPT-4o-mini | Fallback | $500-800 |
| **Total** | | **$2,550-3,900** |

### Cost Optimization

1. **Aggressive Caching**: 60-70% cache hit rate
2. **Hybrid LLM Strategy**: Use GPT-4o-mini when possible
3. **Request Batching**: Combine multiple suggestions
4. **Text Truncation**: Limit text length for analysis

## Security

### API Key Management

- Store keys in environment variables
- Never commit keys to version control
- Rotate keys monthly
- Use separate keys for staging/production

### Data Privacy

- Don't store resume content in logs
- Anonymize user data in analytics
- Comply with GDPR/CCPA requirements
- Implement data retention policies

### Rate Limiting

Protect against abuse:
- Per-API-key limits
- IP-based rate limiting
- Request size limits
- Timeout configuration

## Support

For deployment issues:
1. Check logs: `docker-compose logs -f`
2. Review monitoring dashboard
3. Consult troubleshooting guide
4. Open GitHub issue if needed

---

Last updated: 2026-03-13
