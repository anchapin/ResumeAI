"""
Database Schema Validation

Utilities for validating database schema integrity,
including table existence, column definitions, and relationships.
"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any

from sqlalchemy import inspect
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)


class ValidationStatus(Enum):
    """Validation status enumeration."""

    PASSED = "passed"
    FAILED = "failed"
    WARNING = "warning"


@dataclass
class ValidationResult:
    """Result of a single validation check."""

    check_name: str
    status: ValidationStatus
    message: str
    details: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        if isinstance(self.status, str):
            self.status = ValidationStatus(self.status)


@dataclass
class TableValidationResult:
    """Validation result for a specific table."""

    table_name: str
    passed: bool = True
    validations: List[ValidationResult] = field(default_factory=list)

    def add_validation(self, validation: ValidationResult):
        """Add a validation result."""
        self.validations.append(validation)
        if validation.status == ValidationStatus.FAILED:
            self.passed = False


@dataclass
class SchemaValidationResult:
    """Complete schema validation result."""

    passed: bool = True
    tables: List[TableValidationResult] = field(default_factory=list)
    summary: Optional[Dict[str, Any]] = None
    table_count: int = 0

    def add_table(self, table_result: TableValidationResult):
        """Add a table validation result."""
        self.tables.append(table_result)
        if not table_result.passed:
            self.passed = False
        self.table_count = len(self.tables)


class SchemaValidator:
    """
    Validates database schema integrity.

    Provides validation for:
    - Table existence
    - Column definitions
    - Primary keys
    - Foreign key relationships
    - Index existence
    - Data integrity constraints
    """

    # Expected tables in the ResumeAI database
    EXPECTED_TABLES = {
        "users",
        "resumes",
        "resume_versions",
        "resume_sections",
        "api_keys",
        "oauth_states",
        "sessions",
    }

    def __init__(self, engine: AsyncEngine):
        """
        Initialize schema validator.

        Args:
            engine: SQLAlchemy async engine
        """
        self.engine = engine

    async def validate_all_tables(self) -> SchemaValidationResult:
        """
        Validate all expected tables exist and have correct structure.

        Returns:
            Schema validation result
        """
        result = SchemaValidationResult()

        # Get existing tables using run_sync
        async with self.engine.connect() as conn:
            existing_tables = await conn.run_sync(self._get_existing_tables_sync)

        existing_tables = set(existing_tables)

        # Check for missing tables
        missing_tables = self.EXPECTED_TABLES - existing_tables
        if missing_tables:
            result.add_table(
                TableValidationResult(
                    table_name="__all_tables__",
                    passed=False,
                    validations=[
                        ValidationResult(
                            check_name="table_existence",
                            status=ValidationStatus.FAILED,
                            message=f"Missing tables: {', '.join(missing_tables)}",
                            details={"missing": list(missing_tables)},
                        )
                    ],
                )
            )

        # Validate each existing table
        for table_name in existing_tables:
            table_result = await self.validate_table(table_name)
            result.add_table(table_result)

        # Generate summary
        result.summary = {
            "total": len(existing_tables),
            "expected": len(self.EXPECTED_TABLES),
            "missing": len(missing_tables),
            "passed": sum(1 for t in result.tables if t.passed),
            "failed": sum(1 for t in result.tables if not t.passed),
        }

        return result

    def _get_existing_tables_sync(self, conn) -> List[str]:
        """Get list of existing table names (sync version for run_sync)."""
        inspector = inspect(conn)
        return inspector.get_table_names()

    async def validate_table(self, table_name: str) -> TableValidationResult:
        """
        Validate a specific table.

        Args:
            table_name: Name of the table to validate

        Returns:
            Validation result for the table
        """
        result = TableValidationResult(table_name=table_name, passed=True)

        async with self.engine.connect() as conn:
            inspector_result = await conn.run_sync(self._validate_table_sync, table_name)

        # Process validation results
        if inspector_result["error"]:
            result.add_validation(
                ValidationResult(
                    check_name="table_exists",
                    status=ValidationStatus.FAILED,
                    message=f"Table does not exist: {table_name}",
                    details={"error": inspector_result["error"]},
                )
            )
            return result

        # Table exists, check columns
        columns = inspector_result.get("columns", [])
        if not columns:
            result.add_validation(
                ValidationResult(
                    check_name="column_count",
                    status=ValidationStatus.FAILED,
                    message=f"Table {table_name} has no columns",
                )
            )

        # Check for primary key
        pk_columns = inspector_result.get("primary_key", [])
        if not pk_columns:
            result.add_validation(
                ValidationResult(
                    check_name="primary_key",
                    status=ValidationStatus.WARNING,
                    message=f"Table {table_name} has no primary key",
                )
            )

        # Validate foreign keys
        fk_issues = inspector_result.get("fk_issues", [])
        for fk_issue in fk_issues:
            result.add_validation(
                ValidationResult(
                    check_name="foreign_key",
                    status=ValidationStatus.FAILED,
                    message=fk_issue["message"],
                    details=fk_issue,
                )
            )

        return result

    def _validate_table_sync(self, conn, table_name: str) -> Dict[str, Any]:
        """Validate table structure (sync version for run_sync)."""
        inspector = inspect(conn)
        result = {
            "error": None,
            "columns": [],
            "primary_key": [],
            "foreign_keys": [],
            "indexes": [],
            "fk_issues": [],
        }

        try:
            # Check if table exists
            table_names = inspector.get_table_names()
            if table_name not in table_names:
                result["error"] = f"Table {table_name} not found"
                return result

            # Get columns
            result["columns"] = inspector.get_columns(table_name)

            # Get primary key
            pk_constraint = inspector.get_pk_constraint(table_name)
            result["primary_key"] = pk_constraint.get("constrained_columns", [])

            # Get foreign keys and validate them
            foreign_keys = inspector.get_foreign_keys(table_name)
            for fk in foreign_keys:
                # Check if referred table exists
                if fk["referred_table"] not in table_names:
                    result["fk_issues"].append(
                        {
                            "message": f"Foreign key references non-existent table: {fk['referred_table']}",
                            "table": table_name,
                            "columns": fk["constrained_columns"],
                            "referred_table": fk["referred_table"],
                        }
                    )

            result["foreign_keys"] = foreign_keys

            # Get indexes
            result["indexes"] = inspector.get_indexes(table_name)

        except Exception as e:
            result["error"] = str(e)

        return result

    async def check_database_integrity(self) -> Dict[str, Any]:
        """
        Check overall database integrity.

        Returns:
            Dictionary with integrity check results
        """
        checks = []

        async with self.engine.connect() as conn:
            # Check 1: Count tables
            table_count = await conn.run_sync(self._count_tables_sync)
            checks.append(
                {
                    "name": "table_count",
                    "status": "passed" if table_count > 0 else "failed",
                    "message": f"Found {table_count} tables",
                    "details": {"count": table_count},
                }
            )

            # Check 2: Verify foreign key integrity
            fk_result = await conn.run_sync(self._check_foreign_keys_sync)
            checks.append(
                {
                    "name": "foreign_key_integrity",
                    "status": fk_result["status"],
                    "message": fk_result["message"],
                    "details": fk_result.get("details", {}),
                }
            )

            # Check 3: Verify indexes
            index_result = await conn.run_sync(self._check_indexes_sync)
            checks.append(
                {
                    "name": "index_analysis",
                    "status": index_result["status"],
                    "message": index_result["message"],
                    "details": index_result.get("details", {}),
                }
            )

        return {
            "passed": all(c["status"] == "passed" for c in checks),
            "checks": checks,
        }

    def _count_tables_sync(self, conn) -> int:
        """Count tables (sync version)."""
        inspector = inspect(conn)
        return len(inspector.get_table_names())

    def _check_foreign_keys_sync(self, conn) -> Dict[str, Any]:
        """Check foreign key integrity (sync version)."""
        inspector = inspect(conn)
        issues = []
        table_names = inspector.get_table_names()

        for table_name in table_names:
            try:
                fks = inspector.get_foreign_keys(table_name)
                for fk in fks:
                    if fk["referred_table"] not in table_names:
                        issues.append(
                            {
                                "table": table_name,
                                "columns": fk["constrained_columns"],
                                "referred_table": fk["referred_table"],
                            }
                        )
            except Exception:
                pass

        if issues:
            return {
                "status": "failed",
                "message": f"Found {len(issues)} broken foreign key(s)",
                "details": {"issues": issues},
            }

        return {"status": "passed", "message": "All foreign keys are valid", "details": {}}

    def _check_indexes_sync(self, conn) -> Dict[str, Any]:
        """Check index status (sync version)."""
        inspector = inspect(conn)
        table_names = inspector.get_table_names()
        index_count = 0

        for table_name in table_names:
            try:
                indexes = inspector.get_indexes(table_name)
                index_count += len(indexes)
            except Exception:
                pass

        return {
            "status": "passed",
            "message": f"Found {index_count} indexes",
            "details": {"index_count": index_count},
        }

    async def validate_column(
        self,
        table_name: str,
        column_name: str,
        expected_type: Optional[str] = None,
        nullable: Optional[bool] = None,
    ) -> ValidationResult:
        """
        Validate a specific column in a table.

        Args:
            table_name: Name of the table
            column_name: Name of the column
            expected_type: Expected column type (optional)
            nullable: Expected nullable status (optional)

        Returns:
            Validation result for the column
        """
        async with self.engine.connect() as conn:
            result = await conn.run_sync(
                self._validate_column_sync, table_name, column_name, expected_type, nullable
            )

        if result["exists"]:
            messages = []
            if result["type_mismatch"]:
                messages.append(
                    f"Type mismatch: expected {expected_type}, got {result['actual_type']}"
                )
            if result["nullable_mismatch"]:
                messages.append(
                    f"Nullable mismatch: expected {nullable}, got {result['actual_nullable']}"
                )

            if messages:
                return ValidationResult(
                    check_name="column_definition",
                    status=ValidationStatus.FAILED,
                    message="; ".join(messages),
                    details=result,
                )

            return ValidationResult(
                check_name="column_definition",
                status=ValidationStatus.PASSED,
                message=f"Column {table_name}.{column_name} is valid",
                details=result,
            )

        return ValidationResult(
            check_name="column_exists",
            status=ValidationStatus.FAILED,
            message=f"Column {table_name}.{column_name} does not exist",
            details=result,
        )

    def _validate_column_sync(
        self,
        conn,
        table_name: str,
        column_name: str,
        expected_type: Optional[str],
        nullable: Optional[bool],
    ) -> Dict[str, Any]:
        """Validate column (sync version)."""
        inspector = inspect(conn)
        result = {
            "exists": False,
            "actual_type": None,
            "actual_nullable": None,
            "type_mismatch": False,
            "nullable_mismatch": False,
        }

        try:
            columns = inspector.get_columns(table_name)
            for col in columns:
                if col["name"] == column_name:
                    result["exists"] = True
                    result["actual_type"] = str(col["type"])
                    result["actual_nullable"] = col["nullable"]

                    if expected_type and str(col["type"]) != expected_type:
                        result["type_mismatch"] = True
                    if nullable is not None and col["nullable"] != nullable:
                        result["nullable_mismatch"] = True
                    break
        except Exception:
            pass

        return result
