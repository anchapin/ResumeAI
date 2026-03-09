# N+1 Query Detection

This document describes how N+1 query detection works in ResumeAI.

## Overview

The N+1 query detector monitors SQLAlchemy queries to identify N+1 query patterns that can cause severe performance issues.

## Usage

### Enable Detection

```python
from lib.utils.n1_detector import detect_n1_queries, get_detector

# Using context manager
with detect_n1_queries(threshold=3) as detector:
    # Run your queries here
    results = session.query(User).all()
    for user in results:
        print(user.profile.name)  # This triggers N+1

# Get report
print(detector.get_report())
```

### Manual Usage

```python
detector = get_detector()
detector.enable()

# Run queries...

patterns = detector.detect_n1_patterns()
for pattern in patterns:
    print(f"Found N+1 on table: {pattern.related_table}")
```

## How It Works

1. Records all SQL queries executed
2. Groups queries by table
3. Detects repeated similar queries (N+1 pattern)
4. Reports potential issues with query count and timing

## Configuration

- `threshold`: Number of queries to same table to flag (default: 3)
- Enable/disable detection dynamically

## Best Practices

1. Use in development to find issues before production
2. Run on critical code paths
3. Check query reports during code review
4. Use eager loading (joinedload) to fix N+1 issues
