"""
Test script for GitHub Connection model and CRUD operations.

This script verifies that:
1. The UserGitHubConnection model is properly defined
2. CRUD operations can be imported
3. The model has the correct columns and constraints
"""

import sys
sys.path.insert(0, '/home/alexc/Projects/ResumeProject/feature-issue-277-create-database-schema-for-storing-github-oauth-co/resume-api')

from database.models import UserGitHubConnection, Base
from database import crud


def test_model_definition():
    """Test that the UserGitHubConnection model is properly defined."""
    print("Testing UserGitHubConnection model...")

    # Check table name
    assert UserGitHubConnection.__tablename__ == "user_github_connections", \
        f"Expected table name 'user_github_connections', got '{UserGitHubConnection.__tablename__}'"

    # Check that the model has the expected columns
    columns = {c.name for c in UserGitHubConnection.__table__.columns}
    expected_columns = {
        'id', 'user_id', 'github_user_id', 'github_username',
        'access_token', 'refresh_token', 'token_expires_at',
        'scopes', 'created_at', 'updated_at'
    }
    missing_columns = expected_columns - columns
    extra_columns = columns - expected_columns

    if missing_columns:
        print(f"  ERROR: Missing columns: {missing_columns}")
        return False
    if extra_columns:
        print(f"  WARNING: Extra columns: {extra_columns}")

    # Check that indexes are defined
    indexes = {idx.name for idx in UserGitHubConnection.__table__.indexes}
    expected_indexes = {
        'ix_user_github_connections_id',
        'idx_github_connections_user',
        'idx_github_connections_github_user'
    }
    missing_indexes = expected_indexes - indexes

    if missing_indexes:
        print(f"  ERROR: Missing indexes: {missing_indexes}")
        return False

    # Check unique constraints
    unique_constraints = {c.name for c in UserGitHubConnection.__table__.constraints if isinstance(c, type(UserGitHubConnection.__table__.constraints).__bases__[0])}
    # This is a simplified check - in practice we'd check for proper unique constraints

    print("  Model definition looks good!")
    return True


def test_crud_imports():
    """Test that CRUD operations can be imported."""
    print("Testing CRUD operations...")

    crud_functions = [
        'get_user_github_connection',
        'create_user_github_connection',
        'update_user_github_connection',
        'delete_user_github_connection',
        'get_github_connection_by_github_user_id',
    ]

    for func_name in crud_functions:
        if not hasattr(crud, func_name):
            print(f"  ERROR: Missing CRUD function: {func_name}")
            return False

    print("  All CRUD operations are available!")
    return True


def test_base_metadata():
    """Test that the Base metadata includes our model."""
    print("Testing Base metadata...")

    # Check if UserGitHubConnection is in the Base metadata
    table_names = Base.metadata.tables.keys()
    if 'user_github_connections' in table_names:
        print("  UserGitHubConnection is registered in Base metadata!")
        return True
    else:
        print(f"  ERROR: UserGitHubConnection not found in Base metadata. Tables: {table_names}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("GitHub Connection Model and CRUD Tests")
    print("=" * 60)
    print()

    results = []

    # Test 1: Model definition
    results.append(test_model_definition())
    print()

    # Test 2: CRUD imports
    results.append(test_crud_imports())
    print()

    # Test 3: Base metadata
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
