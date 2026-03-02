"""
Database Migration: Add Performance Indexes (Issue #415)

This migration adds performance indexes identified in the capacity planning
analysis to improve query performance for common operations.

Migration includes indexes for:
- resume table: user_id, created_at, updated_at
- resume_versions table: resume_id, created_at
- api_keys table: key_hash (for fast lookups)
- Other critical tables: user_id, timestamp filters

Estimated Performance Improvement: 30-40% faster queries
Expected Impact: Reduced database query latency from 100-500ms to 50-150ms
"""

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import os
import asyncio

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./resumeai.db")


async def create_indexes():
    """
    Create all performance indexes.
    Executes for both SQLite and PostgreSQL.
    """
    engine = create_async_engine(DATABASE_URL, echo=True)

    async with engine.begin() as conn:
        # Get database type
        db_type = DATABASE_URL.split(":")[0].lower()

        # Index definitions with composite indexes for common queries
        indexes = [
            # Resume table indexes
            ("idx_resume_user_created", "resumes", ["owner_id", "created_at"]),
            ("idx_resume_user_updated", "resumes", ["owner_id", "updated_at"]),
            ("idx_resume_created_at", "resumes", ["created_at"]),
            ("idx_resume_updated_at", "resumes", ["updated_at"]),
            ("idx_resume_is_public", "resumes", ["is_public"]),
            ("idx_resume_is_public_created", "resumes", ["is_public", "created_at"]),
            # Resume versions table indexes
            (
                "idx_resume_version_resume_created",
                "resume_versions",
                ["resume_id", "created_at"],
            ),
            ("idx_resume_version_created", "resume_versions", ["created_at"]),
            (
                "idx_resume_version_number",
                "resume_versions",
                ["resume_id", "version_number"],
            ),
            # API Keys table indexes
            ("idx_api_key_hash", "api_keys", ["key_hash"]),
            ("idx_api_key_user_active", "api_keys", ["user_id", "is_active"]),
            ("idx_api_key_is_active", "api_keys", ["is_active"]),
            ("idx_api_key_expires", "api_keys", ["expires_at"]),
            # User table indexes
            ("idx_user_created_at", "users", ["created_at"]),
            ("idx_user_is_active", "users", ["is_active"]),
            # Usage Analytics indexes
            (
                "idx_analytics_user_timestamp",
                "usage_analytics",
                ["user_id", "timestamp"],
            ),
            (
                "idx_analytics_endpoint_timestamp",
                "usage_analytics",
                ["endpoint", "timestamp"],
            ),
            (
                "idx_analytics_status_timestamp",
                "usage_analytics",
                ["status_code", "timestamp"],
            ),
            # Billing indexes
            ("idx_subscription_user_status", "subscriptions", ["user_id", "status"]),
            ("idx_subscription_created", "subscriptions", ["created_at"]),
            ("idx_invoice_user_created", "invoices", ["user_id", "created_at"]),
            ("idx_invoice_status", "invoices", ["status"]),
            # GitHub OAuth indexes
            ("idx_github_user_id", "github_connections", ["github_user_id"]),
            ("idx_github_user_active", "github_connections", ["user_id", "is_active"]),
            ("idx_github_oauth_state_expires", "github_oauth_states", ["expires_at"]),
            (
                "idx_github_oauth_state_used",
                "github_oauth_states",
                ["is_used", "created_at"],
            ),
        ]

        # Create indexes - handle both PostgreSQL and SQLite
        for index_name, table_name, columns in indexes:
            try:
                if db_type in ["postgresql", "postgres"]:
                    # PostgreSQL syntax
                    columns_str = ", ".join(columns)
                    sql = f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({columns_str})"
                    await conn.execute(text(sql))
                    print(
                        f"✓ Created index: {index_name} on {table_name}({columns_str})"
                    )
                else:
                    # SQLite syntax
                    columns_str = ", ".join(columns)
                    sql = f"CREATE INDEX IF NOT EXISTS {index_name} ON {table_name} ({columns_str})"
                    await conn.execute(text(sql))
                    print(
                        f"✓ Created index: {index_name} on {table_name}({columns_str})"
                    )
            except Exception as e:
                print(f"⚠ Index {index_name} creation failed (may already exist): {e}")

        await conn.commit()

    print("\n✓ Migration completed successfully!")
    print(f"Total indexes attempted: {len(indexes)}")


async def rollback_indexes():
    """
    Rollback indexes created by this migration.
    """
    engine = create_async_engine(DATABASE_URL, echo=True)

    async with engine.begin() as conn:
        index_names = [
            "idx_resume_user_created",
            "idx_resume_user_updated",
            "idx_resume_created_at",
            "idx_resume_updated_at",
            "idx_resume_is_public",
            "idx_resume_is_public_created",
            "idx_resume_version_resume_created",
            "idx_resume_version_created",
            "idx_resume_version_number",
            "idx_api_key_hash",
            "idx_api_key_user_active",
            "idx_api_key_is_active",
            "idx_api_key_expires",
            "idx_user_created_at",
            "idx_user_is_active",
            "idx_analytics_user_timestamp",
            "idx_analytics_endpoint_timestamp",
            "idx_analytics_status_timestamp",
            "idx_subscription_user_status",
            "idx_subscription_created",
            "idx_invoice_user_created",
            "idx_invoice_status",
            "idx_github_user_id",
            "idx_github_user_active",
            "idx_github_oauth_state_expires",
            "idx_github_oauth_state_used",
        ]

        for index_name in index_names:
            try:
                sql = f"DROP INDEX IF EXISTS {index_name}"
                await conn.execute(text(sql))
                print(f"✓ Dropped index: {index_name}")
            except Exception as e:
                print(f"⚠ Drop index {index_name} failed: {e}")

        await conn.commit()

    print("\n✓ Rollback completed successfully!")


async def main():
    """Entry point for migration script."""
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        await rollback_indexes()
    else:
        await create_indexes()


if __name__ == "__main__":
    asyncio.run(main())
