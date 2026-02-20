# Database Module

This module contains SQLAlchemy models and CRUD operations for the ResumeAI database, specifically for GitHub OAuth integration.

## Structure

- `models.py`: SQLAlchemy models including `UserGitHubConnection`
- `crud.py`: CRUD operations for database models
- `__init__.py`: Module exports

## UserGitHubConnection Model

The `UserGitHubConnection` model stores encrypted OAuth tokens for GitHub API access.

### Table Schema

```python
class UserGitHubConnection(Base):
    __tablename__ = "user_github_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    github_user_id = Column(String(255), nullable=False, unique=True)
    github_username = Column(String(255), nullable=False)
    access_token = Column(String(500), nullable=False)  # Should be encrypted
    refresh_token = Column(String(500), nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    scopes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

### Indexes

- `ix_user_github_connections_id`: Primary key index
- `idx_github_connections_user`: Index on user_id for performance
- `idx_github_connections_github_user`: Index on github_user_id for performance

### Constraints

- `user_id`: Unique constraint (one GitHub connection per user)
- `github_user_id`: Unique constraint (prevent duplicate GitHub accounts)
- Foreign key to `users.id` with CASCADE delete

## CRUD Operations

### get_user_github_connection

```python
async def get_user_github_connection(user_id: int, db: AsyncSession) -> Optional[UserGitHubConnection]
```

Get a user's GitHub connection by user ID.

### create_user_github_connection

```python
async def create_user_github_connection(
    user_id: int,
    github_user_id: str,
    github_username: str,
    access_token: str,
    refresh_token: Optional[str] = None,
    token_expires_at: Optional[DateTime] = None,
    scopes: Optional[str] = None,
    db: Optional[AsyncSession] = None,
) -> UserGitHubConnection
```

Create a new GitHub connection for a user.

### update_user_github_connection

```python
async def update_user_github_connection(
    user_id: int,
    db: AsyncSession,
    access_token: Optional[str] = None,
    refresh_token: Optional[str] = None,
    token_expires_at: Optional[DateTime] = None,
    scopes: Optional[str] = None,
) -> Optional[UserGitHubConnection]
```

Update a user's GitHub connection tokens and metadata.

### delete_user_github_connection

```python
async def delete_user_github_connection(user_id: int, db: AsyncSession) -> bool
```

Delete a user's GitHub connection.

### get_github_connection_by_github_user_id

```python
async def get_github_connection_by_github_user_id(
    github_user_id: str, db: AsyncSession
) -> Optional[UserGitHubConnection]
```

Get a GitHub connection by GitHub user ID (useful for preventing duplicate connections).

## Usage Example

```python
from database import UserGitHubConnection, create_user_github_connection
from sqlalchemy.ext.asyncio import AsyncSession

async def connect_github(user_id: int, github_token: str, db: AsyncSession):
    """Connect a user's GitHub account."""
    # Get GitHub user info using the token
    github_user = await get_github_user_info(github_token)

    # Create connection in database
    connection = await create_user_github_connection(
        user_id=user_id,
        github_user_id=github_user["id"],
        github_username=github_user["login"],
        access_token=encrypt_token(github_token),  # Encrypt before storing!
        scopes="read:user,public_repo",
        db=db
    )

    return connection
```

## Security Considerations

1. **Token Encryption**: Always encrypt `access_token` and `refresh_token` before storing them in the database. Use the `TOKEN_ENCRYPTION_KEY` environment variable with Fernet encryption.

2. **Token Rotation**: Implement token rotation logic to refresh tokens before they expire.

3. **Scope Limitation**: Only request the minimum required OAuth scopes (`read:user`, `public_repo`).

4. **Token Revocation**: Support disconnecting GitHub accounts by deleting the connection record.

## Migrations

Use Alembic to manage database migrations:

```bash
# Create a new migration
alembic revision -m "description"

# Apply migrations
alembic upgrade head

# Rollback migrations
alembic downgrade -1
```

The initial migration for the `user_github_connections` table is in `alembic/versions/001_create_user_github_connections_table.py`.
