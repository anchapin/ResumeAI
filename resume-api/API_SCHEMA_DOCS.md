# API Schema Documentation

This document provides an overview of the ResumeAI API endpoints. The API is documented using OpenAPI/Swagger and can be accessed at:

- **Swagger UI**: `/docs`
- **ReDoc**: `/redoc`

## Base URL

```
Production: https://api.resumeai.com
Development: http://127.0.0.1:8000
```

## API Versioning

All API endpoints are prefixed with `/api/v1`.

## Authentication

### JWT Authentication
Most endpoints require JWT authentication via the `Authorization` header:

```
Authorization: Bearer <token>
```

### API Key Authentication
Third-party integrations can use API key authentication:

```
X-API-Key: <api_key>
```

## Endpoints Overview

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Basic health check |
| GET | `/api/v1/health/detailed` | Detailed health status |
| GET | `/api/v1/health/ready` | Readiness probe |
| GET | `/api/v1/health/oauth` | OAuth service health |

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/refresh` | Refresh token |
| POST | `/api/v1/auth/logout` | User logout |

### Resumes
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/resumes` | List user resumes |
| POST | `/api/v1/resumes` | Create new resume |
| GET | `/api/v1/resumes/{id}` | Get resume details |
| PUT | `/api/v1/resumes/{id}` | Update resume |
| DELETE | `/api/v1/resumes/{id}` | Delete resume |
| POST | `/api/v1/resumes/{id}/generate` | Generate PDF |

### API Keys
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/api-keys` | List API keys |
| POST | `/api/v1/api-keys` | Create API key |
| PUT | `/api/v1/api-keys/{id}` | Update API key |
| DELETE | `/api/v1/api-keys/{id}` | Revoke API key |

### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/teams` | List teams |
| POST | `/api/v1/teams` | Create team |
| GET | `/api/v1/teams/{id}` | Get team details |
| PUT | `/api/v1/teams/{id}` | Update team |
| DELETE | `/api/v1/teams/{id}` | Delete team |

### Interviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/interviews/generate-questions` | Generate interview questions |
| POST | `/api/v1/interviews/submit-answer` | Submit interview answer |

### Job Descriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/jd/parse` | Parse job description |
| POST | `/api/v1/jd/tailor` | Tailor resume to JD |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/summary` | Analytics summary |
| GET | `/api/v1/analytics/endpoints` | Endpoint analytics |

### Webhooks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/webhooks` | List webhooks |
| POST | `/api/v1/webhooks` | Create webhook |
| PUT | `/api/v1/webhooks/{id}` | Update webhook |
| DELETE | `/api/v1/webhooks/{id}` | Delete webhook |

### Feature Flags
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/flags` | List feature flags |
| POST | `/api/v1/flags` | Create feature flag |
| PUT | `/api/v1/flags/{id}` | Update feature flag |
| DELETE | `/api/v1/flags/{id}` | Delete feature flag |

### Billing
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/billing/subscription` | Get subscription |
| POST | `/api/v1/billing/checkout` | Create checkout session |

### LinkedIn Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/linkedin/auth` | LinkedIn OAuth |
| POST | `/api/v1/linkedin/callback` | OAuth callback |

### GitHub Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/github/auth` | GitHub OAuth |
| POST | `/api/v1/github/callback` | OAuth callback |

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {}
  }
}
```

See [API_ERROR_CODES.md](./API_ERROR_CODES.md) for complete error code reference.

## Rate Limiting

- Auth endpoints: 5 requests/minute
- API endpoints: 100 requests/minute
- PDF generation: 10 requests/minute

## OpenAPI Schema

The complete OpenAPI schema is available at:
- JSON: `/api/v1/docs/openapi.json`
- YAML: `/api/v1/docs/openapi.yaml`

## SDKs

Official SDKs are available for:
- Python: `pip install resumeai`
- TypeScript: `npm install @resumeai/sdk`

## Version History

| Version | Release Date | Changes |
|---------|--------------|---------|
| 1.0.0 | 2024-01-01 | Initial release |
| 1.1.0 | 2024-03-01 | Added team features |
| 1.2.0 | 2024-06-01 | Added webhooks |
