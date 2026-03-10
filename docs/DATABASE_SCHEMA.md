# Database Schema Documentation

## Overview

The ResumeAI application uses SQLAlchemy ORM with Alembic for database migrations. This document provides an overview of the database schema, entity relationships, and migration history.

## Database Models

### Core Entities

#### User
- **Table**: `users`
- **Description**: Primary user account entity
- **Key Fields**:
  - `id`: Primary key (UUID)
  - `email`: User email address (unique)
  - `name`: Display name
  - `created_at`: Account creation timestamp
  - `updated_at`: Last update timestamp

#### Resume
- **Table**: `resumes`
- **Description**: User's resume data
- **Key Fields**:
  - `id`: Primary key (UUID)
  - `user_id`: Foreign key to users
  - `title`: Resume title
  - `content`: Resume content (JSON)
  - `template`: Template used
  - `is_default`: Default resume flag
  - `created_at`, `updated_at`: Timestamps

#### Job Application
- **Table**: `job_applications`
- **Description**: Job applications tracked by users
- **Key Fields**:
  - `id`: Primary key (UUID)
  - `user_id`: Foreign key to users
  - `resume_id`: Foreign key to resumes
  - `company`: Company name
  - `position`: Job position
  - `status`: Application status
  - `applied_at`: Application date

#### API Key
- **Table**: `api_keys`
- **Description**: API keys for third-party access
- **Key Fields**:
  - `id`: Primary key (UUID)
  - `user_id`: Foreign key to users
  - `key_hash`: Hashed API key
  - `name`: Key identifier
  - `rate_limit`: Rate limit configuration
  - `is_active`: Active status
  - `last_used_at`: Last usage timestamp

#### GitHub Connection
- **Table**: `github_connections`
- **Description**: OAuth GitHub connections
- **Key Fields**:
  - `id`: Primary key (UUID)
  - `user_id`: Foreign key to users
  - `github_user_id`: GitHub user ID
  - `github_username`: GitHub username
  - `access_token`: Encrypted access token
  - `refresh_token`: Encrypted refresh token
  - `token_expires_at`: Token expiration
  - `connected_at`: Connection timestamp

#### Webhook
- **Table**: `webhooks`
- **Description**: Webhook configurations for events
- **Key Fields**:
  - `id`: Primary key (UUID)
  - `user_id`: Foreign key to users
  - `url`: Webhook endpoint URL
  - `events`: Subscribed events
  - `secret`: Webhook secret
  - `is_active`: Active status

#### Feature Flag
- **Table**: `feature_flags`
- **Description**: Feature toggle configuration
- **Key Fields**:
  - `id`: Primary key (UUID)
  - `key`: Flag key (unique)
  - `description`: Flag description
  - `enabled`: Enable/disable status

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐
│    users    │       │ resumes     │
├─────────────┤       ├─────────────┤
│ id (PK)     │◄──────│ user_id (FK)│
│ email       │       │ id (PK)     │
│ name        │       │ title       │
│ created_at  │       │ content     │
└─────────────┘       │ template    │
                      │ is_default  │
                      └─────────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │job_applications│
                      ├─────────────┤
                      │ id (PK)     │
                      │ user_id (FK)│
                      │ resume_id(FK)│
                      │ company     │
                      │ position    │
                      │ status      │
                      └─────────────┘

┌─────────────┐       ┌─────────────┐
│ api_keys    │       │github_connections│
├─────────────┤       ├─────────────┤
│ id (PK)     │       │ id (PK)     │
│ user_id (FK)│       │ user_id (FK)│
│ key_hash    │       │ github_user_id│
│ name        │       │ access_token │
│ rate_limit  │       │ refresh_token│
└─────────────┘       └─────────────┘
```

## Migration History

| Version | Date | Description |
|---------|------|-------------|
| 001 | 2024-02-27 | Create user and github_connections tables |
| 002 | 2024-02-27 | Resolve circular FK dependency |

## Migrations Directory

Alembic migrations are located in:
```
resume-api/alembic/versions/
```

### Running Migrations

```bash
# Apply all pending migrations
cd resume-api && alembic upgrade head

# Create a new migration
cd resume-api && alembic revision --autogenerate -m "description"

# Rollback one migration
cd resume-api && alembic downgrade -1
```

## Schema Validation

The application includes schema validation utilities in `resume-api/lib/db/schema_validation.py` to ensure data integrity.

## Database Configuration

Database settings are configured via environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- `DATABASE_POOL_SIZE`: Connection pool size
- `DATABASE_MAX_OVERFLOW`: Max overflow connections

See `resume-api/config/database.py` for full configuration options.
