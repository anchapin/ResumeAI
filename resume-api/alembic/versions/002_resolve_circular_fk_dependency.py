"""resolve_circular_fk_dependency

Revision ID: 002
Revises: 001
Create Date: 2026-02-27 00:00:00.000000

This migration resolves the circular foreign key dependency between
Resume and ResumeVersion models by removing the current_version_id
column and its foreign key constraint from the resumes table.

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the foreign key constraint first
    op.drop_constraint(
        "fk_resume_current_version",
        "resumes",
        type_="foreignkey",
    )

    # Drop the current_version_id column
    op.drop_column("resumes", "current_version_id")


def downgrade() -> None:
    # Add back the current_version_id column (nullable)
    op.add_column(
        "resumes",
        sa.Column("current_version_id", sa.Integer(), nullable=True),
    )

    # Add back the foreign key constraint
    op.create_foreign_key(
        "fk_resume_current_version",
        "resumes",
        "resume_versions",
        ["current_version_id"],
        ["id"],
    )
