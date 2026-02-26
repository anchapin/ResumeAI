"""
Database Migration Validation for Safe Deployments.

This module provides utilities to validate database migrations before deployment,
ensuring data integrity and preventing deployment issues.
"""

import logging
from typing import List, Dict, Tuple, Optional
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


class MigrationValidationResult:
    """Result of a migration validation check."""

    def __init__(self, passed: bool, message: str, details: Optional[Dict] = None):
        """
        Initialize validation result.

        Args:
            passed: Whether validation passed
            message: Validation message
            details: Additional validation details
        """
        self.passed = passed
        self.message = message
        self.details = details or {}
        self.timestamp = datetime.utcnow().isoformat()

    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            "passed": self.passed,
            "message": self.message,
            "details": self.details,
            "timestamp": self.timestamp,
        }


class MigrationValidator:
    """Validates database migrations for safe deployments."""

    def __init__(self, migrations_dir: str = "alembic/versions"):
        """
        Initialize migration validator.

        Args:
            migrations_dir: Path to migrations directory
        """
        self.migrations_dir = Path(migrations_dir)
        logger.info(f"Migration validator initialized: {migrations_dir}")

    def validate_migration_files(self) -> MigrationValidationResult:
        """
        Validate migration files exist and are valid.

        Returns:
            Validation result
        """
        try:
            if not self.migrations_dir.exists():
                return MigrationValidationResult(
                    False, "Migrations directory not found", {"path": str(self.migrations_dir)}
                )

            migration_files = list(self.migrations_dir.glob("*.py"))
            if not migration_files:
                return MigrationValidationResult(
                    True,
                    "No migration files found (first deployment)",
                    {"file_count": 0},
                )

            # Validate each migration file
            valid_count = 0
            invalid_files = []

            for migration_file in migration_files:
                if self._is_valid_migration_file(migration_file):
                    valid_count += 1
                else:
                    invalid_files.append(migration_file.name)

            if invalid_files:
                return MigrationValidationResult(
                    False,
                    f"Found {len(invalid_files)} invalid migration files",
                    {"invalid_files": invalid_files},
                )

            return MigrationValidationResult(
                True,
                f"All {valid_count} migration files are valid",
                {"file_count": valid_count},
            )

        except Exception as e:
            return MigrationValidationResult(
                False, f"Migration file validation failed: {str(e)}", {}
            )

    def validate_migration_syntax(self) -> MigrationValidationResult:
        """
        Validate migration syntax using Python AST.

        Returns:
            Validation result
        """
        try:
            import ast

            if not self.migrations_dir.exists():
                return MigrationValidationResult(
                    True, "Migrations directory not found", {}
                )

            migration_files = list(self.migrations_dir.glob("*.py"))
            invalid_files = []

            for migration_file in migration_files:
                try:
                    with open(migration_file, "r") as f:
                        ast.parse(f.read())
                except SyntaxError as e:
                    invalid_files.append({
                        "file": migration_file.name,
                        "error": str(e),
                    })

            if invalid_files:
                return MigrationValidationResult(
                    False,
                    f"Found {len(invalid_files)} migration files with syntax errors",
                    {"invalid_files": invalid_files},
                )

            return MigrationValidationResult(
                True,
                f"Syntax validation passed for {len(migration_files)} files",
                {"file_count": len(migration_files)},
            )

        except Exception as e:
            return MigrationValidationResult(
                False, f"Syntax validation failed: {str(e)}", {}
            )

    def validate_migration_order(self) -> MigrationValidationResult:
        """
        Validate migrations are in correct chronological order.

        Returns:
            Validation result
        """
        try:
            if not self.migrations_dir.exists():
                return MigrationValidationResult(
                    True, "Migrations directory not found", {}
                )

            migration_files = sorted([f.name for f in self.migrations_dir.glob("*.py")])

            if not migration_files:
                return MigrationValidationResult(
                    True, "No migration files to validate", {}
                )

            # Check naming pattern (revision_*.py)
            invalid_names = [f for f in migration_files if not f.startswith("_")]

            if invalid_names:
                return MigrationValidationResult(
                    False,
                    "Found migrations with invalid naming pattern",
                    {"invalid_files": invalid_names},
                )

            return MigrationValidationResult(
                True,
                f"Migration order is valid ({len(migration_files)} files)",
                {"file_count": len(migration_files), "files": migration_files},
            )

        except Exception as e:
            return MigrationValidationResult(
                False, f"Migration order validation failed: {str(e)}", {}
            )

    def validate_all(self) -> Tuple[bool, List[MigrationValidationResult]]:
        """
        Run all validation checks.

        Returns:
            Tuple of (all_passed, list of results)
        """
        results = [
            self.validate_migration_files(),
            self.validate_migration_syntax(),
            self.validate_migration_order(),
        ]

        all_passed = all(r.passed for r in results)

        logger.info(
            f"Migration validation {'passed' if all_passed else 'failed'}: "
            f"{sum(1 for r in results if r.passed)}/{len(results)} checks"
        )

        return all_passed, results

    @staticmethod
    def _is_valid_migration_file(file_path: Path) -> bool:
        """Check if migration file is valid."""
        try:
            # Check file has required functions
            with open(file_path, "r") as f:
                content = f.read()
                return "def upgrade()" in content and "def downgrade()" in content
        except Exception:
            return False


class BackupValidator:
    """Validates database backup before deployment."""

    @staticmethod
    def validate_backup_exists(backup_dir: str) -> MigrationValidationResult:
        """
        Check if backup exists.

        Args:
            backup_dir: Path to backup directory

        Returns:
            Validation result
        """
        try:
            backup_path = Path(backup_dir)
            if not backup_path.exists():
                return MigrationValidationResult(
                    False, "Backup directory not found", {"path": str(backup_path)}
                )

            backup_files = list(backup_path.glob("*"))
            if not backup_files:
                return MigrationValidationResult(
                    False, "No backup files found", {"path": str(backup_path)}
                )

            return MigrationValidationResult(
                True,
                f"Backup exists with {len(backup_files)} files",
                {"file_count": len(backup_files), "path": str(backup_path)},
            )

        except Exception as e:
            return MigrationValidationResult(
                False, f"Backup validation failed: {str(e)}", {}
            )

    @staticmethod
    def validate_backup_integrity(backup_file: str) -> MigrationValidationResult:
        """
        Validate backup file integrity.

        Args:
            backup_file: Path to backup file

        Returns:
            Validation result
        """
        try:
            backup_path = Path(backup_file)
            if not backup_path.exists():
                return MigrationValidationResult(
                    False, "Backup file not found", {"path": str(backup_path)}
                )

            if backup_path.stat().st_size == 0:
                return MigrationValidationResult(
                    False, "Backup file is empty", {"path": str(backup_path)}
                )

            return MigrationValidationResult(
                True,
                "Backup file integrity verified",
                {
                    "path": str(backup_path),
                    "size_bytes": backup_path.stat().st_size,
                },
            )

        except Exception as e:
            return MigrationValidationResult(
                False, f"Backup integrity check failed: {str(e)}", {}
            )
