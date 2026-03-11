"""Tests for database migration validation.

Validates that DeploymentValidator.validate_migrations() correctly identifies
pending migrations.
"""

import os
import pytest
from unittest.mock import patch, MagicMock
from config.health import DeploymentValidator


class TestMigrationValidation:
    """Tests for MigrationValidation logic."""

    @patch("alembic.script.ScriptDirectory.from_config")
    @patch("alembic.runtime.migration.MigrationContext.configure")
    @patch("sqlalchemy.create_engine")
    @patch("os.path.exists")
    def test_validate_migrations_success(
        self, mock_exists, mock_create_engine, mock_configure, mock_from_config
    ):
        """Test validation passes when current revision matches head."""
        # Mock alembic.ini existence
        mock_exists.return_value = True

        # Mock ScriptDirectory (Alembic's migration list)
        mock_script = MagicMock()
        mock_script.get_current_head.return_value = "rev123"
        mock_from_config.return_value = mock_script

        # Mock MigrationContext (Alembic's database state)
        mock_context = MagicMock()
        mock_context.get_current_revision.return_value = "rev123"
        mock_configure.return_value = mock_context

        # Mock SQLAlchemy engine/connection
        mock_conn = MagicMock()
        mock_engine = MagicMock()
        mock_engine.connect.return_value.__enter__.return_value = mock_conn
        mock_create_engine.return_value = mock_engine

        # Should return True
        assert DeploymentValidator.validate_migrations() is True

    @patch("alembic.script.ScriptDirectory.from_config")
    @patch("alembic.runtime.migration.MigrationContext.configure")
    @patch("sqlalchemy.create_engine")
    @patch("os.path.exists")
    def test_validate_migrations_mismatch(
        self, mock_exists, mock_create_engine, mock_configure, mock_from_config
    ):
        """Test validation fails when current revision does not match head."""
        mock_exists.return_value = True

        # Head is rev456
        mock_script = MagicMock()
        mock_script.get_current_head.return_value = "rev456"
        mock_from_config.return_value = mock_script

        # Database is rev123
        mock_context = MagicMock()
        mock_context.get_current_revision.return_value = "rev123"
        mock_configure.return_value = mock_context

        mock_engine = MagicMock()
        mock_create_engine.return_value = mock_engine

        # Should return False
        assert DeploymentValidator.validate_migrations() is False

    @patch("os.path.exists")
    def test_validate_migrations_ini_not_found(self, mock_exists):
        """Test validation fails if alembic.ini is missing."""
        mock_exists.return_value = False

        # Should return False
        assert DeploymentValidator.validate_migrations() is False

    @patch("alembic.script.ScriptDirectory.from_config")
    @patch("sqlalchemy.create_engine")
    @patch("os.path.exists")
    def test_validate_migrations_no_migrations(
        self, mock_exists, mock_create_engine, mock_from_config
    ):
        """Test validation passes if no migrations exist."""
        mock_exists.return_value = True

        # No head revision
        mock_script = MagicMock()
        mock_script.get_current_head.return_value = None
        mock_from_config.return_value = mock_script

        # Should return True
        assert DeploymentValidator.validate_migrations() is True

    @patch("os.path.exists")
    @patch("sqlalchemy.create_engine")
    def test_validate_migrations_exception_development(self, mock_create_engine, mock_exists):
        """Test validation continues on exception in non-production environment."""
        mock_exists.return_value = True
        mock_create_engine.side_effect = Exception("DB Connection error")

        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            # Should return True despite exception
            assert DeploymentValidator.validate_migrations() is True

    @patch("os.path.exists")
    @patch("sqlalchemy.create_engine")
    def test_validate_migrations_exception_production(self, mock_create_engine, mock_exists):
        """Test validation fails on exception in production environment."""
        mock_exists.return_value = True
        mock_create_engine.side_effect = Exception("DB Connection error")

        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            # Should return False due to exception
            assert DeploymentValidator.validate_migrations() is False
