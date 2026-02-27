"""
Test suite for database indexing strategy (Issue #415)

Tests verify that:
1. All indexes are properly created
2. Index columns are correct
3. Query performance improves with indexes
4. No negative side effects occur
"""

import pytest
import asyncio
import time
from sqlalchemy import text, inspect, select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os
from typing import List, Dict, Any

# Import models
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import (
    Base, Resume, ResumeVersion, APIKey, User,
    UsageAnalytics, Subscription, Invoice,
    GitHubConnection, GitHubOAuthState,
    create_db_and_tables
)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./test_indexes.db")
TEST_ENGINE = create_async_engine(DATABASE_URL, echo=False)
TestAsyncSession = sessionmaker(TEST_ENGINE, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="function")
async def test_db():
    """Create and cleanup test database."""
    # Create tables
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield TEST_ENGINE

    # Cleanup
    async with TEST_ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


class TestIndexExistence:
    """Test that all expected indexes exist."""

    @pytest.mark.asyncio
    async def test_resume_indexes_exist(self, test_db):
        """Test that resume table indexes are created."""
        async with test_db.begin() as conn:
            if "sqlite" in DATABASE_URL:
                # SQLite
                result = await conn.execute(text(
                    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='resumes'"
                ))
                index_names = [row[0] for row in result.fetchall()]

                # Check for key indexes
                assert any("user" in idx.lower() and "created" in idx.lower() for idx in index_names), \
                    "Missing index on resumes(owner_id, created_at)"
                assert any("updated" in idx.lower() for idx in index_names), \
                    "Missing index on resumes(updated_at)"
            else:
                # PostgreSQL
                result = await conn.execute(text(
                    "SELECT indexname FROM pg_indexes WHERE tablename='resumes'"
                ))
                index_names = [row[0] for row in result.fetchall()]
                assert len(index_names) >= 4, f"Expected at least 4 indexes on resumes, found {len(index_names)}"

    @pytest.mark.asyncio
    async def test_resume_version_indexes_exist(self, test_db):
        """Test that resume_versions table indexes are created."""
        async with test_db.begin() as conn:
            if "sqlite" in DATABASE_URL:
                result = await conn.execute(text(
                    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='resume_versions'"
                ))
                index_names = [row[0] for row in result.fetchall()]

                assert any("resume" in idx.lower() and "created" in idx.lower() for idx in index_names), \
                    "Missing composite index on resume_versions(resume_id, created_at)"

    @pytest.mark.asyncio
    async def test_api_key_indexes_exist(self, test_db):
        """Test that api_keys table indexes are created."""
        async with test_db.begin() as conn:
            if "sqlite" in DATABASE_URL:
                result = await conn.execute(text(
                    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='api_keys'"
                ))
                index_names = [row[0] for row in result.fetchall()]

                assert any("hash" in idx.lower() for idx in index_names), \
                    "Missing index on api_keys(key_hash)"
                assert any("user" in idx.lower() and "active" in idx.lower() for idx in index_names), \
                    "Missing index on api_keys(user_id, is_active)"

    @pytest.mark.asyncio
    async def test_user_indexes_exist(self, test_db):
        """Test that users table indexes are created."""
        async with test_db.begin() as conn:
            if "sqlite" in DATABASE_URL:
                result = await conn.execute(text(
                    "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='users'"
                ))
                index_names = [row[0] for row in result.fetchall()]

                # SQLite creates some default indexes
                assert len(index_names) >= 1, "No indexes found on users table"


class TestIndexColumns:
    """Test that indexes have correct columns."""

    @pytest.mark.asyncio
    async def test_resume_user_created_index_columns(self, test_db):
        """Test resume user_created composite index columns."""
        async with test_db.begin() as conn:
            if "sqlite" in DATABASE_URL:
                result = await conn.execute(text(
                    "SELECT sql FROM sqlite_master WHERE type='index' AND name LIKE '%user%created%'"
                ))
                sql = result.scalar()

                if sql:
                    # Index should contain both owner_id and created_at
                    assert "owner_id" in sql or "user_id" in sql.lower(), \
                        "Index missing owner_id column"
                    assert "created_at" in sql, \
                        "Index missing created_at column"

    @pytest.mark.asyncio
    async def test_api_key_hash_index_columns(self, test_db):
        """Test api_key_hash index contains key_hash column."""
        async with test_db.begin() as conn:
            if "sqlite" in DATABASE_URL:
                result = await conn.execute(text(
                    "SELECT sql FROM sqlite_master WHERE type='index' AND name LIKE '%key_hash%'"
                ))
                sql = result.scalar()

                if sql:
                    assert "key_hash" in sql, \
                        "Index missing key_hash column"


class TestQueryPerformance:
    """Test that queries benefit from indexes."""

    @pytest.mark.asyncio
    async def test_resume_lookup_by_user_and_date(self, test_db):
        """Test that resume lookup by user and date is efficient."""
        async with TestAsyncSession() as session:
            # Create test user
            user = User(
                email="test@example.com",
                username="testuser",
                hashed_password="hashed_password"
            )
            session.add(user)
            await session.flush()

            # Create multiple resumes
            for i in range(100):
                resume = Resume(
                    owner_id=user.id,
                    title=f"Resume {i}",
                    data={"content": f"test resume {i}"}
                )
                session.add(resume)

            await session.commit()

        # Query should use index
        async with TestAsyncSession() as session:
            start = time.time()

            # This query should use the idx_resume_user_created index
            result = await session.execute(
                select(Resume).where(Resume.owner_id == user.id)
            )
            resumes = result.scalars().all()

            elapsed = time.time() - start

            assert len(resumes) == 100, "Should find all user resumes"
            assert elapsed < 1.0, f"Query took {elapsed:.2f}s, should be <1s with index"

    @pytest.mark.asyncio
    async def test_api_key_lookup_performance(self, test_db):
        """Test that API key lookup by hash is fast."""
        async with TestAsyncSession() as session:
            # Create test user
            user = User(
                email="test2@example.com",
                username="testuser2",
                hashed_password="hashed_password"
            )
            session.add(user)
            await session.flush()

            # Create API keys
            for i in range(50):
                api_key = APIKey(
                    user_id=user.id,
                    key_hash=f"hash_{i:03d}",
                    key_prefix=f"rai_{i:03d}",
                    name=f"Key {i}"
                )
                session.add(api_key)

            await session.commit()

        # Query should use index on key_hash
        async with TestAsyncSession() as session:
            start = time.time()

            # This query should use the idx_api_key_hash index
            result = await session.execute(
                select(APIKey).where(APIKey.key_hash == "hash_025")
            )
            api_key = result.scalar()

            elapsed = time.time() - start

            assert api_key is not None, "Should find the API key"
            assert api_key.key_prefix == "rai_025", "Should find correct key"
            assert elapsed < 0.5, f"Key lookup took {elapsed:.2f}s, should be <0.5s with index"

    @pytest.mark.asyncio
    async def test_version_history_lookup(self, test_db):
        """Test that resume version history is retrieved efficiently."""
        async with TestAsyncSession() as session:
            # Create test data
            user = User(
                email="test3@example.com",
                username="testuser3",
                hashed_password="hashed_password"
            )
            session.add(user)
            await session.flush()

            resume = Resume(
                owner_id=user.id,
                title="Test Resume",
                data={"content": "test"}
            )
            session.add(resume)
            await session.flush()

            # Create multiple versions
            for i in range(50):
                version = ResumeVersion(
                    resume_id=resume.id,
                    data={"content": f"version {i}"},
                    version_number=i + 1
                )
                session.add(version)

            await session.commit()

        # Query should use index
        async with TestAsyncSession() as session:
            start = time.time()

            # This query should use the idx_resume_version_resume_created index
            result = await session.execute(
                select(ResumeVersion).where(ResumeVersion.resume_id == resume.id)
            )
            versions = result.scalars().all()

            elapsed = time.time() - start

            assert len(versions) == 50, "Should find all versions"
            assert elapsed < 1.0, f"Version lookup took {elapsed:.2f}s, should be <1s with index"


class TestIndexNoNegativeEffects:
    """Test that indexes don't cause negative side effects."""

    @pytest.mark.asyncio
    async def test_insert_performance_acceptable(self, test_db):
        """Test that inserts are still reasonably fast with indexes."""
        async with TestAsyncSession() as session:
            # Create base user
            user = User(
                email="test4@example.com",
                username="testuser4",
                hashed_password="hashed_password"
            )
            session.add(user)
            await session.flush()
            user_id = user.id
            await session.commit()

        # Insert many resumes and measure performance
        async with TestAsyncSession() as session:
            start = time.time()

            for i in range(100):
                resume = Resume(
                    owner_id=user_id,
                    title=f"Resume {i}",
                    data={"content": f"test {i}"}
                )
                session.add(resume)

            await session.commit()
            elapsed = time.time() - start

            # Should be able to insert 100 resumes in < 5 seconds
            # This is reasonable with indexes
            assert elapsed < 5.0, f"Bulk insert took {elapsed:.2f}s, indexes may cause excessive overhead"

    @pytest.mark.asyncio
    async def test_update_with_indexes(self, test_db):
        """Test that updates work correctly with indexes."""
        async with TestAsyncSession() as session:
            # Create test resume
            user = User(
                email="test5@example.com",
                username="testuser5",
                hashed_password="hashed_password"
            )
            session.add(user)
            await session.flush()

            resume = Resume(
                owner_id=user.id,
                title="Original Title",
                data={"content": "test"}
            )
            session.add(resume)
            await session.flush()
            resume_id = resume.id
            await session.commit()

        # Update the resume
        async with TestAsyncSession() as session:
            resume = await session.get(Resume, resume_id)
            resume.title = "Updated Title"
            resume.data = {"content": "updated"}
            await session.commit()

        # Verify update worked
        async with TestAsyncSession() as session:
            resume = await session.get(Resume, resume_id)
            assert resume.title == "Updated Title", "Update failed"
            assert resume.data["content"] == "updated", "Data not updated"

    @pytest.mark.asyncio
    async def test_delete_with_indexes(self, test_db):
        """Test that deletes work correctly with indexes."""
        async with TestAsyncSession() as session:
            # Create test resume
            user = User(
                email="test6@example.com",
                username="testuser6",
                hashed_password="hashed_password"
            )
            session.add(user)
            await session.flush()

            resume = Resume(
                owner_id=user.id,
                title="To Delete",
                data={"content": "test"}
            )
            session.add(resume)
            await session.flush()
            resume_id = resume.id
            await session.commit()

        # Delete the resume
        async with TestAsyncSession() as session:
            resume = await session.get(Resume, resume_id)
            await session.delete(resume)
            await session.commit()

        # Verify delete worked
        async with TestAsyncSession() as session:
            resume = await session.get(Resume, resume_id)
            assert resume is None, "Delete failed"


class TestIndexCoverage:
    """Test that all critical tables have indexes."""

    @pytest.mark.asyncio
    async def test_critical_tables_have_indexes(self, test_db):
        """Test that critical tables have appropriate indexes."""
        critical_tables = [
            "resumes",
            "resume_versions",
            "api_keys",
            "users",
            "usage_analytics",
            "subscriptions",
            "invoices",
        ]

        async with test_db.begin() as conn:
            if "sqlite" in DATABASE_URL:
                for table_name in critical_tables:
                    result = await conn.execute(text(
                        f"SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name='{table_name}'"
                    ))
                    index_count = result.scalar()

                    # Allow for system indexes
                    if table_name in ["resumes", "resume_versions", "api_keys"]:
                        assert index_count >= 2, \
                            f"Table {table_name} should have at least 2 indexes, found {index_count}"
                    else:
                        assert index_count >= 1, \
                            f"Table {table_name} should have at least 1 index, found {index_count}"


class TestIndexIntegration:
    """Integration tests with actual query patterns."""

    @pytest.mark.asyncio
    async def test_user_resume_listing(self, test_db):
        """Test typical user resume listing query."""
        async with TestAsyncSession() as session:
            # Create users with resumes
            for u in range(3):
                user = User(
                    email=f"user{u}@example.com",
                    username=f"user{u}",
                    hashed_password="hashed"
                )
                session.add(user)
                await session.flush()

                for i in range(20):
                    resume = Resume(
                        owner_id=user.id,
                        title=f"Resume {i}",
                        data={"content": f"content {i}"}
                    )
                    session.add(resume)

            await session.commit()

        # Query resumes for first user
        async with TestAsyncSession() as session:
            # Typical query: get user's resumes ordered by creation
            result = await session.execute(
                select(Resume)
                .where(Resume.owner_id == user.id)
                .order_by(Resume.created_at.desc())
            )
            resumes = result.scalars().all()

            assert len(resumes) == 20, "Should get user's resumes"

    @pytest.mark.asyncio
    async def test_public_resume_discovery(self, test_db):
        """Test public resume discovery query."""
        async with TestAsyncSession() as session:
            user = User(
                email="public@example.com",
                username="publicuser",
                hashed_password="hashed"
            )
            session.add(user)
            await session.flush()

            # Create public and private resumes
            for i in range(50):
                resume = Resume(
                    owner_id=user.id,
                    title=f"Resume {i}",
                    data={"content": f"content {i}"},
                    is_public=(i % 2 == 0)  # 50% public
                )
                session.add(resume)

            await session.commit()

        # Query public resumes
        async with TestAsyncSession() as session:
            result = await session.execute(
                select(Resume)
                .where(Resume.is_public == True)
                .order_by(Resume.created_at.desc())
            )
            resumes = result.scalars().all()

            assert len(resumes) == 25, "Should find all public resumes"


# Pytest configuration
def pytest_configure(config):
    """Configure pytest."""
    config.addinivalue_line(
        "markers", "asyncio: mark test as async"
    )


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "-s"])
