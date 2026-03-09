---
name: database-inspect
description: "Inspect and query the SQLite database used by the ResumeAI application."
---

# Database Inspect Skill

This skill provides tools for inspecting and querying the SQLite database used by the ResumeAI application.

## Capabilities

- **Database Discovery**: Find database files
- **Schema Inspection**: View table structures
- **Data Querying**: Run SQL queries
- **Table Listing**: List all tables
- **Record Counting**: Count records in tables
- **Migration Checking**: Verify database migrations

## Database Locations

The ResumeAI project uses SQLite databases in multiple locations:

```bash
# Main application database
resumeai.db

# Test database (created during tests)
test_auth.db
```

## Usage

### Find Database Files

```bash
# Find all .db files in the project
find . -name "*.db" -type f

# Check for specific database
ls -la resumeai.db
```

### Inspect Schema

```bash
# Using sqlite3 command line
sqlite3 resumeai.db ".schema"

# List all tables
sqlite3 resumeai.db ".tables"

# Show table schema
sqlite3 resumeai.db ".schema table_name"
```

### Query Data

```bash
# Select all from a table
sqlite3 resumeai.db "SELECT * FROM users LIMIT 10;"

# Count records
sqlite3 resumeai.db "SELECT COUNT(*) FROM users;"

# Query specific columns
sqlite3 resumeai.db "SELECT id, email FROM users;"

# Join tables
sqlite3 resumeai.db "SELECT * FROM users u JOIN resumes r ON u.id = r.user_id;"
```

### Common Tables

The application typically uses these tables:
- `users` - User accounts
- `resumes` - Resume data
- `sessions` - User sessions
- `oauth_tokens` - OAuth tokens

### Python Usage

```python
import sqlite3

# Connect to database
conn = sqlite3.connect('resumeai.db')
cursor = conn.cursor()

# Execute query
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()

# Get table info
cursor.execute("PRAGMA table_info(users);")
columns = cursor.fetchall()

# Close connection
conn.close()
```

## Backend Database Configuration

The backend uses SQLAlchemy with SQLite. Database configuration is in:
- `resume-api/config/database.py` or similar
- Environment variables for database path

## Testing with Database

```bash
# Run tests that use test database
pytest resume-api/tests/

# The test database is typically created in the current directory
ls -la test_auth.db
```

## Tips

- Always backup the database before making changes
- Use transactions for write operations
- The test database is isolated from production data
- Check schema version if migrations are used
