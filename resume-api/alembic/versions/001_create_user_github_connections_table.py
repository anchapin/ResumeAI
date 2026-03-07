"""create_user_github_connections_table

Revision ID: 001
Revises:
Create Date: 2026-02-19 21:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create user_github_connections table
    op.create_table(
        "user_github_connections",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("github_user_id", sa.String(length=255), nullable=False),
        sa.Column("github_username", sa.String(length=255), nullable=False),
        sa.Column("access_token", sa.String(length=500), nullable=False),
        sa.Column("refresh_token", sa.String(length=500), nullable=True),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scopes", sa.String(length=500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=True,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
        sa.UniqueConstraint("github_user_id"),
    )

    # Create indexes for performance
    # Create indexes for columns that have index=True in the model
    op.create_index(
        "ix_user_github_connections_id", "user_github_connections", ["id"], unique=False
    )
    # Create custom indexes from __table_args__
    op.create_index(
        "idx_github_connections_user",
        "user_github_connections",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "idx_github_connections_github_user",
        "user_github_connections",
        ["github_user_id"],
        unique=False,
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index("idx_github_connections_github_user", table_name="user_github_connections")
    op.drop_index("idx_github_connections_user", table_name="user_github_connections")
    op.drop_index("ix_user_github_connections_id", table_name="user_github_connections")

    # Drop table
    op.drop_table("user_github_connections")
