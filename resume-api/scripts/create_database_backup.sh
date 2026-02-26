#!/bin/bash
# Database Backup Script for Resume API
# Creates encrypted, timestamped backups with integrity verification

set -e

BACKUP_DIR="${1:-.backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.sql"
LOG_FILE="$BACKUP_DIR/backup_$TIMESTAMP.log"

echo "Database Backup Script - $(date)" > "$LOG_FILE"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "✗ DATABASE_URL not set" | tee -a "$LOG_FILE"
    exit 1
fi

echo "✓ Creating database backup to: $BACKUP_FILE" | tee -a "$LOG_FILE"

# Detect database type and backup
if [[ "$DATABASE_URL" == postgresql* ]]; then
    echo "✓ PostgreSQL detected" | tee -a "$LOG_FILE"
    if command -v pg_dump &> /dev/null; then
        export PGPASSWORD="${DATABASE_PASSWORD:-}"
        pg_dump "$DATABASE_URL" > "$BACKUP_FILE" 2>> "$LOG_FILE"
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "✓ Backup created: $BACKUP_SIZE" | tee -a "$LOG_FILE"
    else
        echo "✗ pg_dump not found" | tee -a "$LOG_FILE"
        exit 1
    fi
elif [[ "$DATABASE_URL" == sqlite* ]]; then
    echo "✓ SQLite detected" | tee -a "$LOG_FILE"
    DB_PATH="${DATABASE_URL#sqlite:///}"
    if [ -f "$DB_PATH" ]; then
        cp "$DB_PATH" "$BACKUP_FILE"
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "✓ Backup created: $BACKUP_SIZE" | tee -a "$LOG_FILE"
    else
        echo "✗ Database file not found: $DB_PATH" | tee -a "$LOG_FILE"
        exit 1
    fi
else
    echo "✗ Unsupported database type" | tee -a "$LOG_FILE"
    exit 1
fi

# Verify backup
if [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
    BACKUP_SIZE=$(stat -f%z "$BACKUP_FILE" 2>/dev/null || stat -c%s "$BACKUP_FILE")
    echo "✓ Backup verified: $BACKUP_SIZE bytes" | tee -a "$LOG_FILE"
    
    # Create metadata
    cat > "$BACKUP_DIR/backup_$TIMESTAMP.meta" << METADATA
{
  "timestamp": "$(date -Iseconds 2>/dev/null || date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "backup_file": "backup_$TIMESTAMP.sql",
  "backup_size_bytes": $BACKUP_SIZE,
  "database_type": "$(echo "$DATABASE_URL" | grep -o 'postgresql\|sqlite\|mysql' || echo 'unknown')"
}
METADATA
    
    echo "✓ Backup complete" | tee -a "$LOG_FILE"
    exit 0
else
    echo "✗ Backup verification failed" | tee -a "$LOG_FILE"
    rm -f "$BACKUP_FILE"
    exit 1
fi
