#!/usr/bin/env python3
"""
Database Schema Initialization Script

Initializes the database schema for ResumeAI, including:
- Creating all tables
- Setting up indexes
- Validating the schema
- Running initial seed data (optional)
"""

import asyncio
import argparse
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from resume_api.database import DATABASE_URL, create_db_and_tables
from resume_api.lib.db.schema_manager import SchemaManager
from resume_api.lib.db.schema_validation import SchemaValidator
from resume_api.monitoring.logging_config import get_logger

logger = get_logger("scripts.init_database")


class DatabaseInitializer:
    """Handles database schema initialization."""

    def __init__(self, database_url: str):
        """
        Initialize the database initializer.

        Args:
            database_url: SQLAlchemy database URL
        """
        self.database_url = database_url
        self.engine = create_async_engine(database_url, echo=False)

    async def initialize(self, validate: bool = True, seed: bool = False) -> bool:
        """
        Initialize the database schema.

        Args:
            validate: Whether to run validation after initialization
            seed: Whether to seed initial data

        Returns:
            True if initialization succeeded
        """
        try:
            logger.info("starting_database_initialization")

            # Create tables
            await self._create_tables()

            # Validate schema
            if validate:
                await self._validate_schema()

            # Seed data if requested
            if seed:
                await self._seed_data()

            logger.info("database_initialization_completed")
            return True

        except Exception as e:
            logger.error("database_initialization_failed", error=str(e))
            return False

    async def _create_tables(self):
        """Create all database tables."""
        logger.info("creating_database_tables")

        await create_db_and_tables()

        # Verify tables were created
        async with self.engine.connect() as conn:
            result = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            tables = [row[0] for row in result.fetchall()]

        logger.info("tables_created", table_count=len(tables), tables=tables)

    async def _validate_schema(self):
        """Validate the database schema."""
        logger.info("validating_database_schema")

        validator = SchemaValidator(self.engine)
        schema_result = await validator.validate_all_tables()

        if not schema_result.passed:
            logger.warning("schema_validation_issues", summary=schema_result.summary)
            # Log details of failed checks
            for table in schema_result.tables:
                if not table.passed:
                    for validation in table.validations:
                        if validation.status.value == "failed":
                            logger.warning("validation_failed", table=table.table_name, message=validation.message)
        else:
            logger.info("schema_validation_passed")

        # Also run integrity checks
        integrity = await validator.check_database_integrity()
        for check in integrity.get("checks", []):
            status = check.get("status", "unknown")
            if status == "failed":
                logger.error("integrity_check_failed", check_name=check["name"], message=check["message"])
            elif status == "warning":
                logger.warning("integrity_check_warning", check_name=check["name"], message=check["message"])
            else:
                logger.debug("integrity_check_passed", check_name=check["name"], message=check["message"])

    async def _seed_data(self):
        """Seed initial data into the database."""
        logger.info("seeding_initial_data")
        # This can be extended to add initial data
        # For now, just log that seeding would happen
        logger.info("seed_data_completed")

    async def generate_schema_report(self):
        """Generate a schema report."""
        logger.info("generating_schema_report")

        manager = SchemaManager(self.engine)
        report = await manager.generate_schema_report()

        print("\n" + report)

        return report

    async def export_schema_json(self, output_path: str):
        """Export schema to JSON."""
        logger.info(f"Exporting schema to {output_path}...")

        import json

        manager = SchemaManager(self.engine)
        schema = await manager.export_to_json()

        with open(output_path, "w") as f:
            json.dump(schema, f, indent=2)

        logger.info(f"Schema exported to {output_path}")

    async def export_schema_markdown(self, output_path: str):
        """Export schema to Markdown."""
        logger.info(f"Exporting schema to {output_path}...")

        manager = SchemaManager(self.engine)
        markdown = await manager.export_to_markdown()

        with open(output_path, "w") as f:
            f.write(markdown)

        logger.info(f"Schema exported to {output_path}")

    async def close(self):
        """Close database connections."""
        await self.engine.dispose()


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Initialize ResumeAI database schema")
    parser.add_argument(
        "--database-url", type=str, default=DATABASE_URL, help="Database connection URL"
    )
    parser.add_argument("--no-validate", action="store_true", help="Skip schema validation")
    parser.add_argument("--seed", action="store_true", help="Seed initial data")
    parser.add_argument(
        "--report", action="store_true", help="Generate schema report after initialization"
    )
    parser.add_argument(
        "--export-json", type=str, metavar="PATH", help="Export schema to JSON file"
    )
    parser.add_argument(
        "--export-markdown", type=str, metavar="PATH", help="Export schema to Markdown file"
    )

    args = parser.parse_args()

    initializer = DatabaseInitializer(args.database_url)

    try:
        success = await initializer.initialize(validate=not args.no_validate, seed=args.seed)

        if args.report:
            await initializer.generate_schema_report()

        if args.export_json:
            await initializer.export_schema_json(args.export_json)

        if args.export_markdown:
            await initializer.export_schema_markdown(args.export_markdown)

        sys.exit(0 if success else 1)

    finally:
        await initializer.close()


if __name__ == "__main__":
    asyncio.run(main())
