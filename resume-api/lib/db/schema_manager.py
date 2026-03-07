"""
Database Schema Management

Utilities for inspecting and managing database schema,
including table information, indexes, and schema documentation.
"""

import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

from sqlalchemy import (
    inspect,
    text,
)
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)


class SchemaManager:
    """
    Manages database schema inspection and documentation.

    Provides utilities to:
    - Get comprehensive schema information
    - Inspect tables, columns, and indexes
    - Generate schema documentation
    - Export schema definitions
    """

    def __init__(self, engine: AsyncEngine):
        """
        Initialize schema manager.

        Args:
            engine: SQLAlchemy async engine
        """
        self.engine = engine

    async def get_schema_info(self) -> Dict[str, Any]:
        """
        Get comprehensive schema information.

        Returns:
            Dictionary with all schema details
        """
        async with self.engine.connect() as conn:
            # Use run_sync to get inspector in async context
            tables = await conn.run_sync(self._get_tables_sync)
            views = await conn.run_sync(self._get_views_sync)
            indexes = await conn.run_sync(self._get_indexes_sync)
            foreign_keys = await conn.run_sync(self._get_foreign_keys_sync)

        return {
            "timestamp": datetime.utcnow().isoformat(),
            "database_type": self._get_database_type(),
            "tables": tables,
            "views": views,
            "indexes": indexes,
            "foreign_keys": foreign_keys,
            "table_count": len(tables),
            "view_count": len(views),
        }

    def _get_tables_sync(self, conn) -> List[Dict[str, Any]]:
        """Get detailed table information (sync version for run_sync)."""
        inspector = inspect(conn)
        tables = []
        table_names = inspector.get_table_names()

        for table_name in table_names:
            columns = inspector.get_columns(table_name)
            pk_constraint = inspector.get_pk_constraint(table_name)
            unique_constraints = inspector.get_unique_constraints(table_name)

            columns_info = []
            for col in columns:
                columns_info.append(
                    {
                        "name": col["name"],
                        "type": str(col["type"]),
                        "nullable": col["nullable"],
                        "default": str(col.get("default", "")) if col.get("default") else None,
                        "is_primary_key": col["name"]
                        in pk_constraint.get("constrained_columns", []),
                    }
                )

            tables.append(
                {
                    "name": table_name,
                    "columns": columns_info,
                    "primary_key": pk_constraint.get("constrained_columns", []),
                    "unique_constraints": [uc.get("column_names", []) for uc in unique_constraints],
                    "row_count": None,  # Will be populated separately
                }
            )

        return tables

    def _get_views_sync(self, conn) -> List[Dict[str, Any]]:
        """Get detailed view information (sync version for run_sync)."""
        inspector = inspect(conn)
        views = []
        view_names = inspector.get_view_names()

        for view_name in view_names:
            columns = inspector.get_columns(view_name)
            columns_info = []
            for col in columns:
                columns_info.append(
                    {
                        "name": col["name"],
                        "type": str(col["type"]),
                        "nullable": col["nullable"],
                    }
                )

            views.append(
                {
                    "name": view_name,
                    "columns": columns_info,
                }
            )

        return views

    def _get_indexes_sync(self, conn) -> List[Dict[str, Any]]:
        """Get detailed index information (sync version for run_sync)."""
        inspector = inspect(conn)
        indexes = []
        table_names = inspector.get_table_names()

        for table_name in table_names:
            table_indexes = inspector.get_indexes(table_name)
            for idx in table_indexes:
                indexes.append(
                    {
                        "name": idx["name"],
                        "table_name": table_name,
                        "columns": idx["column_names"],
                        "unique": idx["unique"],
                    }
                )

        return indexes

    def _get_foreign_keys_sync(self, conn) -> List[Dict[str, Any]]:
        """Get detailed foreign key information (sync version for run_sync)."""
        inspector = inspect(conn)
        foreign_keys = []
        table_names = inspector.get_table_names()

        for table_name in table_names:
            fks = inspector.get_foreign_keys(table_name)
            for fk in fks:
                foreign_keys.append(
                    {
                        "name": fk.get("name"),
                        "table_name": table_name,
                        "columns": fk["constrained_columns"],
                        "referred_table": fk["referred_table"],
                        "referred_columns": fk["referred_columns"],
                        "ondelete": fk.get("options", {}).get("ondelete"),
                        "onupdate": fk.get("options", {}).get("onupdate"),
                    }
                )

        return foreign_keys

    async def _get_table_row_count(self, table_name: str) -> Optional[int]:
        """Get row count for a table."""
        try:
            async with self.engine.connect() as conn:
                result = await conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                return result.scalar()
        except Exception as e:
            logger.debug(f"Could not get row count for {table_name}: {e}")
            return None

    def _get_database_type(self) -> str:
        """Get database type from engine URL."""
        url = str(self.engine.url)
        if "sqlite" in url:
            return "sqlite"
        elif "postgresql" in url or "postgres" in url:
            return "postgresql"
        elif "mysql" in url:
            return "mysql"
        return "unknown"

    async def get_table_info(self, table_name: str) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific table.

        Args:
            table_name: Name of the table

        Returns:
            Dictionary with table details or None if table doesn't exist
        """
        async with self.engine.connect() as conn:
            result = await conn.run_sync(self._get_table_info_sync, table_name)
            return result

    def _get_table_info_sync(self, conn, table_name: str) -> Optional[Dict[str, Any]]:
        """Get detailed table information (sync version for run_sync)."""
        inspector = inspect(conn)

        try:
            columns = inspector.get_columns(table_name)
            pk_constraint = inspector.get_pk_constraint(table_name)
            indexes = inspector.get_indexes(table_name)
            foreign_keys = inspector.get_foreign_keys(table_name)
            unique_constraints = inspector.get_unique_constraints(table_name)

            columns_info = []
            for col in columns:
                columns_info.append(
                    {
                        "name": col["name"],
                        "type": str(col["type"]),
                        "nullable": col["nullable"],
                        "default": str(col.get("default", "")) if col.get("default") else None,
                        "is_primary_key": col["name"]
                        in pk_constraint.get("constrained_columns", []),
                    }
                )

            return {
                "name": table_name,
                "columns": columns_info,
                "primary_key": pk_constraint.get("constrained_columns", []),
                "indexes": [
                    {
                        "name": idx["name"],
                        "columns": idx["column_names"],
                        "unique": idx["unique"],
                    }
                    for idx in indexes
                ],
                "foreign_keys": foreign_keys,
                "unique_constraints": [
                    {
                        "name": uc.get("name"),
                        "columns": uc.get("column_names", []),
                    }
                    for uc in unique_constraints
                ],
                "row_count": None,
            }
        except Exception as e:
            logger.error(f"Error getting table info for {table_name}: {e}")
            return None

    async def list_tables(self) -> List[str]:
        """
        List all table names in the database.

        Returns:
            List of table names
        """
        async with self.engine.connect() as conn:
            result = await conn.run_sync(self._list_tables_sync)
            return result

    def _list_tables_sync(self, conn) -> List[str]:
        """List all table names (sync version for run_sync)."""
        inspector = inspect(conn)
        return inspector.get_table_names()

    async def list_indexes(self, table_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        List all indexes in the database or for a specific table.

        Args:
            table_name: Optional table name to filter indexes

        Returns:
            List of index definitions
        """
        async with self.engine.connect() as conn:
            return await conn.run_sync(self._list_indexes_sync, table_name)

    def _list_indexes_sync(self, conn, table_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all indexes (sync version for run_sync)."""
        inspector = inspect(conn)

        if table_name:
            indexes = inspector.get_indexes(table_name)
            return [
                {
                    "name": idx["name"],
                    "table_name": table_name,
                    "columns": idx["column_names"],
                    "unique": idx["unique"],
                }
                for idx in indexes
            ]

        # Get all indexes
        all_indexes = []
        for table in inspector.get_table_names():
            table_indexes = inspector.get_indexes(table)
            for idx in table_indexes:
                all_indexes.append(
                    {
                        "name": idx["name"],
                        "table_name": table,
                        "columns": idx["column_names"],
                        "unique": idx["unique"],
                    }
                )

        return all_indexes

    async def table_exists(self, table_name: str) -> bool:
        """
        Check if a table exists.

        Args:
            table_name: Name of the table

        Returns:
            True if table exists
        """
        async with self.engine.connect() as conn:
            return await conn.run_sync(self._table_exists_sync, table_name)

    def _table_exists_sync(self, conn, table_name: str) -> bool:
        """Check if a table exists (sync version for run_sync)."""
        inspector = inspect(conn)
        return table_name in inspector.get_table_names()

    async def get_table_relationships(self) -> Dict[str, List[str]]:
        """
        Get table relationships (foreign key connections).

        Returns:
            Dictionary mapping table names to related tables
        """
        async with self.engine.connect() as conn:
            return await conn.run_sync(self._get_table_relationships_sync)

    def _get_table_relationships_sync(self, conn) -> Dict[str, List[str]]:
        """Get table relationships (sync version for run_sync)."""
        relationships: Dict[str, List[str]] = {}
        inspector = inspect(conn)

        for table_name in inspector.get_table_names():
            fks = inspector.get_foreign_keys(table_name)
            if fks:
                relationships[table_name] = [fk["referred_table"] for fk in fks]

        return relationships

    async def generate_schema_report(self) -> str:
        """
        Generate a text-based schema report.

        Returns:
            Formatted schema report
        """
        schema_info = await self.get_schema_info()

        lines = [
            "=" * 60,
            "Database Schema Report",
            "=" * 60,
            f"Generated: {schema_info['timestamp']}",
            f"Database Type: {schema_info['database_type']}",
            f"Total Tables: {schema_info['table_count']}",
            f"Total Views: {schema_info['view_count']}",
            "",
        ]

        # Tables
        lines.append("TABLES")
        lines.append("-" * 40)
        for table in schema_info.get("tables", []):
            lines.append(f"\n{table['name']}")
            lines.append(f"  Columns: {len(table['columns'])}")
            lines.append(
                f"  Primary Key: {', '.join(table['primary_key']) if table['primary_key'] else 'None'}"
            )
            if table.get("row_count") is not None:
                lines.append(f"  Row Count: {table['row_count']}")
            lines.append("  Columns:")
            for col in table["columns"]:
                pk = " (PK)" if col["is_primary_key"] else ""
                nullable = " NULL" if col["nullable"] else " NOT NULL"
                lines.append(f"    - {col['name']}: {col['type']}{pk}{nullable}")

        # Indexes
        lines.append("\n\nINDEXES")
        lines.append("-" * 40)
        for idx in schema_info.get("indexes", []):
            unique = "UNIQUE " if idx["unique"] else ""
            lines.append(
                f"  {idx['name']} ({unique}on {idx['table_name']}): {', '.join(idx['columns'])}"
            )

        # Foreign Keys
        lines.append("\n\nFOREIGN KEYS")
        lines.append("-" * 40)
        for fk in schema_info.get("foreign_keys", []):
            lines.append(
                f"  {fk['table_name']}.{', '.join(fk['columns'])} -> {fk['referred_table']}.{', '.join(fk['referred_columns'])}"
            )

        lines.append("\n" + "=" * 60)

        return "\n".join(lines)


class SchemaExporter:
    """
    Exports schema definitions to various formats.

    Supports exporting schema as:
    - JSON for programmatic use
    - SQL DDL statements
    - Markdown documentation
    """

    def __init__(self, engine: AsyncEngine):
        """
        Initialize schema exporter.

        Args:
            engine: SQLAlchemy async engine
        """
        self.engine = engine
        self.schema_manager = SchemaManager(engine)

    async def export_to_json(self) -> Dict[str, Any]:
        """
        Export schema to JSON format.

        Returns:
            Dictionary with complete schema
        """
        return await self.schema_manager.get_schema_info()

    async def export_to_markdown(self) -> str:
        """
        Export schema to Markdown format.

        Returns:
            Markdown formatted schema documentation
        """
        schema_info = await self.schema_manager.get_schema_info()

        lines = [
            "# Database Schema",
            "",
            f"**Generated:** {schema_info['timestamp']}",
            f"**Database Type:** {schema_info['database_type']}",
            f"**Tables:** {schema_info['table_count']}",
            "",
            "## Tables",
            "",
        ]

        for table in schema_info.get("tables", []):
            lines.append(f"### {table['name']}")
            lines.append("")
            lines.append("| Column | Type | Nullable | Primary Key |")
            lines.append("|--------|------|----------|-------------|")
            for col in table["columns"]:
                nullable = "Yes" if col["nullable"] else "No"
                pk = "Yes" if col["is_primary_key"] else "No"
                lines.append(f"| {col['name']} | {col['type']} | {nullable} | {pk} |")
            lines.append("")

            if table.get("indexes"):
                lines.append("**Indexes:**")
                for idx in table.get("indexes", []):
                    lines.append(f"- `{idx['name']}`: {', '.join(idx['columns'])}")
                lines.append("")

            lines.append("")

        # Foreign Keys
        if schema_info.get("foreign_keys"):
            lines.append("## Foreign Keys")
            lines.append("")
            for fk in schema_info["foreign_keys"]:
                lines.append(
                    f"- `{fk['table_name']}`.{', '.join(fk['columns'])} → `{fk['referred_table']}`.{', '.join(fk['referred_columns'])}"
                )
            lines.append("")

        return "\n".join(lines)
