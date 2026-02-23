"""
Database configuration and models for ResumeAI.

Uses SQLAlchemy with async support for resume storage,
versioning, collaboration, and sharing.
"""

import os
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    DateTime,
    ForeignKey,
    Table,
    JSON,
    Index,
    Float,
)
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()


# Many-to-many relationship for resume tags
resume_tags = Table(
    "resume_tags",
    Base.metadata,
    Column("resume_id", Integer, ForeignKey("resumes.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)


class Tag(Base):
    """Tag model for categorizing resumes."""

    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    resumes = relationship("Resume", secondary=resume_tags, back_populates="tags")


class Resume(Base):
    """Resume model with versioning support."""

    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    title = Column(String(200), nullable=False, index=True)
    data = Column(JSON, nullable=False)  # Stores resume data as JSON

    # Version tracking
    # Note: use_alter=True breaks the circular FK dependency with resume_versions
    current_version_id = Column(
        Integer,
        ForeignKey(
            "resume_versions.id", use_alter=True, name="fk_resume_current_version"
        ),
    )
    current_version = relationship("ResumeVersion", foreign_keys=[current_version_id])

    # Sharing settings
    is_public = Column(Boolean, default=False, index=True)
    share_token = Column(String(64), unique=True, nullable=True, index=True)
    share_password_hash = Column(String(255), nullable=True)
    share_expires_at = Column(DateTime(timezone=True), nullable=True)
    share_view_count = Column(Integer, default=0)

    # Metadata
    tags = relationship("Tag", secondary=resume_tags, back_populates="resumes")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    owner = relationship("User", back_populates="resumes")
    versions = relationship(
        "ResumeVersion", foreign_keys="ResumeVersion.resume_id", back_populates="resume"
    )
    comments = relationship(
        "Comment", back_populates="resume", cascade="all, delete-orphan"
    )
    shares = relationship(
        "ResumeShare", back_populates="resume", cascade="all, delete-orphan"
    )

    __table_args__ = (Index("idx_resume_updated_at", "updated_at"),)


class ResumeVersion(Base):
    """Resume version model for tracking changes."""

    __tablename__ = "resume_versions"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False, index=True)

    # Version data
    data = Column(JSON, nullable=False)
    version_number = Column(Integer, nullable=False, index=True)
    change_description = Column(Text, nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    resume = relationship("Resume", foreign_keys=[resume_id], back_populates="versions")

    __table_args__ = (Index("idx_version_number", "resume_id", "version_number"),)


class Comment(Base):
    """Comment model for collaboration features."""

    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False, index=True)

    # Comment content
    author_name = Column(String(200), nullable=False)
    author_email = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)

    # Comment metadata
    section = Column(String(100), nullable=True)  # Section of resume being commented on
    is_resolved = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    resume = relationship("Resume", back_populates="comments")

    __table_args__ = (Index("idx_comment_resume_created", "resume_id", "created_at"),)


class ResumeShare(Base):
    """Resume share model for tracking shared links."""

    __tablename__ = "resume_shares"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id"), nullable=False, index=True)

    # Share settings
    share_token = Column(String(64), unique=True, nullable=False, index=True)
    permissions = Column(String(50), default="view")  # view, comment, edit
    expires_at = Column(DateTime(timezone=True), nullable=True)
    max_views = Column(Integer, nullable=True)
    view_count = Column(Integer, default=0)

    # Share metadata
    created_by = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    resume = relationship("Resume", back_populates="shares")


class UserSettings(Base):
    """User settings model for preferences."""

    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_identifier = Column(String(255), unique=True, nullable=False, index=True)

    # Keyboard shortcuts
    keyboard_shortcuts_enabled = Column(Boolean, default=True)

    # Accessibility settings
    high_contrast_mode = Column(Boolean, default=False)
    reduced_motion = Column(Boolean, default=False)
    screen_reader_optimized = Column(Boolean, default=False)

    # Default formatting preferences
    default_font = Column(String(50), default="Arial")
    default_font_size = Column(Integer, default=11)
    default_spacing = Column(String(20), default="normal")

    # Other preferences
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class User(Base):
    """User model for authentication and account management."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    # User profile
    full_name = Column(String(200), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)

    # Account metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    last_login_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    resumes = relationship(
        "Resume", back_populates="owner", cascade="all, delete-orphan"
    )
    refresh_tokens = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )


class RefreshToken(Base):
    """Refresh token model for token rotation and revocation."""

    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)

    # Token metadata
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Device/browser info
    device_info = Column(String(500), nullable=True)
    ip_address = Column(String(45), nullable=True)

    # Relationships
    user = relationship("User", back_populates="refresh_tokens")


# Analytics models for monitoring and usage tracking
class UsageAnalytics(Base):
    """Request analytics model for tracking API usage."""

    __tablename__ = "usage_analytics"

    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(String(500), nullable=False, index=True)
    method = Column(String(10), nullable=False)
    status_code = Column(Integer, nullable=False, index=True)
    user_id = Column(String(255), nullable=True, index=True)
    request_id = Column(String(36), nullable=True)  # UUID
    client_ip = Column(String(45), nullable=True)  # IPv6 compatible
    duration_ms = Column(Float, default=0)
    additional_data = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("idx_analytics_timestamp_status", "timestamp", "status_code"),
        Index("idx_analytics_user_timestamp", "user_id", "timestamp"),
    )


class EndpointUsage(Base):
    """Endpoint usage statistics model."""

    __tablename__ = "endpoint_usage"

    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(String(500), nullable=False, index=True)
    user_id = Column(String(255), nullable=True, index=True)
    date = Column(DateTime(timezone=True), nullable=False, index=True)
    request_count = Column(Integer, default=0)
    success_count = Column(Integer, default=0)
    error_count = Column(Integer, default=0)
    last_accessed = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        Index("idx_endpoint_usage_date", "endpoint", "date"),
        Index("idx_endpoint_usage_user_date", "user_id", "date"),
    )


class UserEngagement(Base):
    """User engagement events model."""

    __tablename__ = "user_engagement"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    action = Column(
        String(100), nullable=False, index=True
    )  # e.g., "generate_pdf", "tailor_resume"
    endpoint = Column(String(500), nullable=True)
    event_metadata = Column(JSON, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("idx_engagement_user_timestamp", "user_id", "timestamp"),
        Index("idx_engagement_action_timestamp", "action", "timestamp"),
    )


class ErrorResponse(Base):
    """Error tracking model for monitoring."""

    __tablename__ = "error_responses"

    id = Column(Integer, primary_key=True, index=True)
    endpoint = Column(String(500), nullable=False, index=True)
    error_type = Column(String(100), nullable=False, index=True)
    error_message = Column(Text, nullable=False)
    user_id = Column(String(255), nullable=True, index=True)
    request_id = Column(String(36), nullable=True)
    stack_trace = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (
        Index("idx_error_type_timestamp", "error_type", "timestamp"),
        Index("idx_error_user_timestamp", "user_id", "timestamp"),
    )


# Billing and Subscription models
class SubscriptionPlan(Base):
    """Subscription plan model for defining available plans."""

    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(
        String(100), nullable=False, unique=True, index=True
    )  # e.g., "basic", "premium"
    display_name = Column(String(200), nullable=False)  # e.g., "Basic Plan"
    description = Column(Text, nullable=True)

    # Pricing
    price_cents = Column(Integer, nullable=False)  # Price in cents
    currency = Column(String(3), default="USD")
    interval = Column(String(20), default="month")  # month, year

    # Stripe integration
    stripe_price_id = Column(String(255), unique=True, nullable=True, index=True)
    stripe_product_id = Column(String(255), nullable=True)

    # Features
    features = Column(JSON, nullable=True)  # List of features included

    # Limits
    max_resumes_per_month = Column(Integer, default=5)
    max_ai_tailorings_per_month = Column(Integer, default=3)
    max_templates = Column(Integer, default=3)
    include_priority_support = Column(Boolean, default=False)
    include_custom_domains = Column(Boolean, default=False)

    # Status
    is_active = Column(Boolean, default=True)
    is_popular = Column(Boolean, default=False)  # Mark as "most popular"

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Subscription(Base):
    """User subscription model."""

    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)  # User identifier

    # Plan reference
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"), nullable=True)
    plan = relationship("SubscriptionPlan", backref="subscriptions")

    # Stripe integration
    stripe_customer_id = Column(String(255), unique=True, nullable=True, index=True)
    stripe_subscription_id = Column(String(255), unique=True, nullable=True)
    stripe_payment_method_id = Column(String(255), nullable=True)

    # Subscription status
    status = Column(
        String(50), default="inactive", index=True
    )  # inactive, active, past_due, canceled, trialing
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)
    canceled_at = Column(DateTime(timezone=True), nullable=True)
    trial_start = Column(DateTime(timezone=True), nullable=True)
    trial_end = Column(DateTime(timezone=True), nullable=True)

    # Usage tracking
    resumes_generated_this_period = Column(Integer, default=0)
    ai_tailorings_this_period = Column(Integer, default=0)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (Index("idx_subscription_user_status", "user_id", "status"),)


class Invoice(Base):
    """Invoice model for tracking billing history."""

    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    subscription = relationship("Subscription", backref="invoices")

    # Stripe integration
    stripe_invoice_id = Column(String(255), unique=True, nullable=True, index=True)
    stripe_payment_intent_id = Column(String(255), nullable=True)

    # Invoice details
    amount_cents = Column(Integer, nullable=False)
    currency = Column(String(3), default="USD")
    status = Column(
        String(50), default="pending", index=True
    )  # pending, paid, open, uncollectible, void
    description = Column(Text, nullable=True)

    # Period
    period_start = Column(DateTime(timezone=True), nullable=True)
    period_end = Column(DateTime(timezone=True), nullable=True)

    # PDF
    invoice_pdf_url = Column(String(500), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (Index("idx_invoice_user_created", "user_id", "created_at"),)


class PaymentMethod(Base):
    """Payment method model for storing user payment methods."""

    __tablename__ = "payment_methods"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)

    # Stripe integration
    stripe_payment_method_id = Column(
        String(255), unique=True, nullable=True, index=True
    )

    # Payment method details
    type = Column(String(50), nullable=False)  # card, bank_account, etc.
    brand = Column(String(50), nullable=True)  # visa, mastercard, amex, etc.
    last4 = Column(String(10), nullable=True)
    exp_month = Column(Integer, nullable=True)
    exp_year = Column(Integer, nullable=True)

    # Billing details
    billing_name = Column(String(200), nullable=True)
    billing_email = Column(String(255), nullable=True)
    billing_address_line1 = Column(String(255), nullable=True)
    billing_address_line2 = Column(String(255), nullable=True)
    billing_city = Column(String(100), nullable=True)
    billing_state = Column(String(100), nullable=True)
    billing_postal_code = Column(String(20), nullable=True)
    billing_country = Column(String(2), nullable=True)

    # Status
    is_default = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class BillingEvent(Base):
    """Billing event log for audit trail."""

    __tablename__ = "billing_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id"), nullable=True)
    subscription = relationship("Subscription", backref="events")

    # Event details
    event_type = Column(
        String(100), nullable=False, index=True
    )  # subscription.created, invoice.paid, etc.
    event_data = Column(JSON, nullable=True)
    stripe_event_id = Column(String(255), unique=True, nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    __table_args__ = (Index("idx_billing_event_user_type", "user_id", "event_type"),)


class APIKey(Base):
    """API Key model for user-specific API key management."""

    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Key data (hashed for storage)
    key_hash = Column(String(255), unique=True, nullable=False, index=True)
    key_prefix = Column(String(12), nullable=False)  # First 12 chars for identification

    # Key metadata
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    # Rate limiting configuration
    rate_limit = Column(String(50), default="100/minute")
    rate_limit_daily = Column(Integer, default=1000)  # Daily request limit

    # Usage tracking
    total_requests = Column(Integer, default=0)
    requests_today = Column(Integer, default=0)
    last_request_at = Column(DateTime(timezone=True), nullable=True)

    # Status
    is_active = Column(Boolean, default=True, index=True)
    is_revoked = Column(Boolean, default=False, index=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_reason = Column(String(255), nullable=True)

    # Expiration (optional)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user = relationship("User", back_populates="api_keys")

    __table_args__ = (
        Index("idx_api_key_user_active", "user_id", "is_active"),
        Index("idx_api_key_created", "created_at"),
    )


class GitHubConnection(Base):
    """GitHub OAuth connection model for storing user GitHub connections."""

    __tablename__ = "github_connections"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True
    )

    # GitHub account details
    github_user_id = Column(String(100), nullable=False, index=True)  # GitHub user ID
    github_username = Column(String(255), nullable=False, index=True)
    github_display_name = Column(String(255), nullable=True)

    # OAuth tokens (encrypted at rest)
    access_token = Column(Text, nullable=False)  # Encrypted
    refresh_token = Column(Text, nullable=True)  # Encrypted (optional)
    token_type = Column(String(50), default="bearer")
    scope = Column(String(500), nullable=True)  # Space-separated scopes

    # Token metadata
    expires_at = Column(
        DateTime(timezone=True), nullable=True
    )  # OAuth token expiration

    # Connection status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    last_used_at = Column(DateTime(timezone=True), nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    user = relationship("User", back_populates="github_connections")

    __table_args__ = (
        Index("idx_github_github_user_id", "github_user_id"),
        Index("idx_github_user_active", "user_id", "is_active"),
    )


class GitHubOAuthState(Base):
    """Temporary storage for OAuth state parameters during flow."""

    __tablename__ = "github_oauth_states"

    id = Column(Integer, primary_key=True, index=True)
    state = Column(String(255), unique=True, nullable=False, index=True)

    # User association (optional - may be null before authentication)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    # Redirect URI (to redirect back after OAuth)
    redirect_uri = Column(String(500), nullable=True)

    # State metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    is_used = Column(Boolean, default=False, nullable=False, index=True)


# Add relationship to User model

# Note: This is done by modifying the User class after it's defined
User.api_keys = relationship(
    "APIKey", back_populates="user", cascade="all, delete-orphan"
)
User.github_connections = relationship(
    "GitHubConnection", back_populates="user", cascade="all, delete-orphan"
)


DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./resumeai.db")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True for SQL query logging
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def create_db_and_tables():
    """Create all database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Get database session for dependency injection."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_async_session():
    """Get async database session for analytics."""
    async with async_session_maker() as session:
        yield session
