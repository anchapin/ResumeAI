"""Database utilities and session management."""

from .connection_manager import (
    DatabaseConnectionManager,
    RoutingSession,
    initialize_connection_manager,
    get_connection_manager,
    shutdown_connection_manager,
)

from .migration_helpers import (
    MigrationManager,
    BatchMigrationManager,
)

from .schema_manager import (
    SchemaManager,
    SchemaExporter,
)

from .schema_validation import (
    SchemaValidator,
    SchemaValidationResult,
    TableValidationResult,
    ValidationResult,
    ValidationStatus,
)

__all__ = [
    # Connection management
    "DatabaseConnectionManager",
    "RoutingSession",
    "initialize_connection_manager",
    "get_connection_manager",
    "shutdown_connection_manager",
    # Migration helpers
    "MigrationManager",
    "BatchMigrationManager",
    # Schema management
    "SchemaManager",
    "SchemaExporter",
    # Schema validation
    "SchemaValidator",
    "SchemaValidationResult",
    "TableValidationResult",
    "ValidationResult",
    "ValidationStatus",
]
