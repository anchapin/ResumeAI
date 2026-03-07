# Database Schema Management

This document describes the database schema management for the ResumeAI project.

## Overview

The ResumeAI project uses SQLAlchemy with async support for database operations. The database schema is defined in `database.py` and includes models for:

- User authentication and management
- Resume storage and versioning
- Comments and collaboration
- Sharing functionality
- Analytics and monitoring
- Billing and subscriptions
- Team collaboration

## Database Models

### Core Models

| Model | Table | Description |
|-------|-------|-------------|
| User | users | User accounts with authentication |
| Resume | resumes | Resume data storage |
| ResumeVersion | resume_versions | Version history for resumes |
| Tag | tags | Resume categorization tags |
| Comment | comments | Collaboration comments |
| ResumeShare | resume_shares | Shared resume links |
| UserSettings | user_settings | User preferences |

### Authentication Models

| Model | Table | Description |
|-------|-------|-------------|
| RefreshToken | refresh_tokens | OAuth refresh tokens |
| EmailVerificationToken | email_verification_tokens | Email verification tokens |

### Analytics Models

| Model | Table | Description |
|-------|-------|-------------|
| UsageAnalytics | usage_analytics | API request tracking |
| EndpointUsage | endpoint_usage | Endpoint usage statistics |
| UserEngagement | user_engagement | User action tracking |
| ErrorResponse | error_responses | Error logging |

### Billing Models

| Model | Table | Description |
|-------|-------|-------------|
| SubscriptionPlan | subscription_plans | Available subscription plans |
| Subscription | subscriptions | User subscriptions |
| Invoice | invoices | Billing history |

### Team Models

| Model | Table | Description |
|-------|-------|-------------|
| Team | teams | Team organizations |
| TeamMember | team_members | Team membership |
| TeamResume | team_resumes | Team-owned resumes |
| TeamActivity | team_activities | Team activity log |

## Schema Management Utilities

The `lib/db/schema_manager.py` module provides utilities for:

- Schema inspection and documentation
- Table and index management
- Database initialization
- Schema versioning

### Usage

```python
from resume_api.lib.db.schema_manager import SchemaManager

# Initialize schema manager
manager = SchemaManager(engine)

# Get schema information
schema_info = await manager.get_schema_info()

# Get table information
table_info = await manager.get_table_info("users")

# List all indexes
indexes = await manager.list_indexes()
```

## Schema Validation

The `lib/db/schema_validation.py` module provides utilities for:

- Validating table existence
- Checking column constraints
- Verifying indexes
- Database integrity checks

### Usage

```python
from resume_api.lib.db.schema_validation import SchemaValidator

# Initialize validator
validator = SchemaValidator(engine)

# Validate all tables
results = await validator.validate_all_tables()

# Validate specific table
result = await validator.validate_table("users")
```

## Database Initialization

The database can be initialized using the `create_db_and_tables()` function:

```python
from resume_api.database import create_db_and_tables

# Create all tables
await create_db_and_tables()
```

## Migration Support

The project uses Alembic for database migrations. See `alembic/` directory for migration scripts.

### Running Migrations

```bash
# Apply migrations
alembic upgrade head

# Create a new migration
alembic revision --autogenerate -m "description"

# Rollback last migration
alembic downgrade -1
```

## Indexes

The schema includes various indexes for performance optimization:

- `idx_resume_updated_at` - Resume update tracking
- `idx_version_number` - Resume version lookups
- `idx_comment_resume_created` - Comment queries
- `idx_analytics_timestamp_status` - Analytics queries
- `idx_engagement_user_timestamp` - User engagement tracking
- `idx_error_type_timestamp` - Error tracking
- `idx_endpoint_usage_date` - Usage statistics

## Database Connection

The database connection is configured in `database.py`:

```python
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./resumeai.db")
```

Supported database backends:
- SQLite (development)
- PostgreSQL (production)
- MySQL (production)

## Best Practices

1. **Use Async Operations**: Always use async/await for database operations
2. **Connection Pooling**: Configure appropriate pool settings for production
3. **Indexing**: Add indexes for frequently queried columns
4. **Migrations**: Always use Alembic for schema changes
5. **Validation**: Run schema validation after major changes
6. **Backups**: Regular database backups are recommended
