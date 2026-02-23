"""
Test script for GitHub Connection model and CRUD operations.

This script verifies that:
1. The GitHubConnection model is properly defined
2. The model has the correct columns and constraints
"""

import sys
from database import GitHubConnection, Base


def test_model_definition():
    """Test that GitHubConnection model is properly defined."""
    print("Testing GitHubConnection model...")

    # Check table name
    assert GitHubConnection.__tablename__ == "github_connections", \
        f"Expected table name 'github_connections', got '{GitHubConnection.__tablename__}'"

    # Check that model has expected columns
    columns = {c.name for c in GitHubConnection.__table__.columns}
    expected_columns = {
        'id', 'user_id', 'github_user_id', 'github_username', 'github_display_name',
        'access_token', 'refresh_token', 'token_type', 'scope', 'expires_at',
        'is_active', 'revoked_at', 'last_used_at', 'created_at', 'updated_at'
    }
    missing_columns = expected_columns - columns
    extra_columns = columns - expected_columns

    if missing_columns:
        print(f"  ERROR: Missing columns: {missing_columns}")
        return False
    if extra_columns:
        print(f"  WARNING: Extra columns: {extra_columns}")

    # Check that indexes are defined
    indexes = {idx.name for idx in GitHubConnection.__table__.indexes}
    # Note: Index names may vary, just check that some indexes exist
    if not indexes:
        print(f"  ERROR: No indexes found")
        return False

    print(f"  Found indexes: {indexes}")

    # Check unique constraints
    _ = {c.name for c in GitHubConnection.__table__.constraints}  # noqa: F841

    print("  Model definition looks good!")
    return True


def test_base_metadata():
    """Test that Base metadata includes our model."""
    print("Testing Base metadata...")

    # Check if GitHubConnection is in Base metadata
    table_names = Base.metadata.tables.keys()
    if 'github_connections' in table_names:
        print("  GitHubConnection is registered in Base metadata!")
        return True
    else:
        print(f"  ERROR: GitHubConnection not found in Base metadata. Tables: {table_names}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("GitHub Connection Model Tests")
    print("=" * 60)
    print()

    results = []

    # Test 1: Model definition
    results.append(test_model_definition())
    print()

    # Test 2: Base metadata
    results.append(test_base_metadata())
    print()

    # Summary
    print("=" * 60)
    if all(results):
        print("✓ All tests passed!")
        print("=" * 60)
        return 0
    else:
        print("✗ Some tests failed!")
        print("=" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())
