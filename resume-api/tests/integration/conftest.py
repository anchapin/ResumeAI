"""
Integration test fixtures for comprehensive API testing.

Provides fixtures for:
- Test client and database setup
- Sample resume data with various content types
- Mock AI providers
- Mock GitHub OAuth
- API key management
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from httpx import AsyncClient, ASGITransport

from main import app
from database import (
    Base,
    User,
    GitHubConnection,
    APIKey,
    get_async_session,
)
from config.security import hash_password, encrypt_token

# ============================================================================
# Database Setup
# ============================================================================


@pytest_asyncio.fixture(scope="function")
async def test_db_engine():
    """Create in-memory test database engine."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_db_session_maker(test_db_engine):
    """Create test database session maker."""
    return async_sessionmaker(
        test_db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


@pytest_asyncio.fixture(scope="function")
async def test_db_session(test_db_session_maker):
    """Get test database session."""
    async with test_db_session_maker() as session:
        yield session


# ============================================================================
# Client Fixtures
# ============================================================================


@pytest_asyncio.fixture(scope="function")
async def api_client(test_db_session):
    """Create AsyncClient with test database override."""

    async def override_get_async_session():
        yield test_db_session

    app.dependency_overrides[get_async_session] = override_get_async_session

    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://testserver")

    yield client

    app.dependency_overrides.clear()
    await client.aclose()


@pytest_asyncio.fixture(scope="function")
async def authenticated_client(api_client, test_user, test_api_key):
    """Create authenticated client with API key header."""
    api_client.headers = {"X-API-KEY": test_api_key.key}
    return api_client


@pytest_asyncio.fixture(scope="function")
async def unauthenticated_client(api_client):
    """Create unauthenticated client."""
    api_client.headers = {}
    return api_client


# ============================================================================
# User and Authentication Fixtures
# ============================================================================


@pytest_asyncio.fixture
async def test_user(test_db_session):
    """Create a test user."""
    user = User(
        email="testuser@example.com",
        username="testuser",
        full_name="Test User",
        hashed_password=hash_password("TestPassword123!"),
        is_active=True,
        is_verified=True,
    )
    test_db_session.add(user)
    await test_db_session.commit()
    await test_db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_api_key(test_db_session, test_user):
    """Create a test API key."""
    api_key = APIKey(
        user_id=test_user.id,
        name="Test API Key",
        key="test_key_1234567890abcdef",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    test_db_session.add(api_key)
    await test_db_session.commit()
    await test_db_session.refresh(api_key)
    return api_key


@pytest_asyncio.fixture
async def github_connection(test_db_session, test_user):
    """Create a GitHub connection for test user."""
    connection = GitHubConnection(
        user_id=test_user.id,
        github_user_id="12345",
        github_username="testgithubuser",
        github_display_name="Test GitHub User",
        access_token=encrypt_token("gho_test_token_123456789"),
        token_type="bearer",
        scope="user:email public_repo",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    test_db_session.add(connection)
    await test_db_session.commit()
    await test_db_session.refresh(connection)
    return connection


# ============================================================================
# Sample Resume Data Fixtures
# ============================================================================


@pytest.fixture
def minimal_resume_data():
    """Minimal valid resume data."""
    return {
        "contact": {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "555-1234",
        },
        "sections": {
            "summary": "Professional software engineer with 5 years of experience.",
            "experience": [
                {
                    "company": "Tech Corp",
                    "position": "Senior Engineer",
                    "start_date": "2020-01-01",
                    "end_date": "2024-01-01",
                    "description": "Led backend development",
                }
            ],
            "education": [
                {
                    "school": "University",
                    "degree": "BS",
                    "field": "Computer Science",
                    "graduation_date": "2019-05-01",
                }
            ],
        },
    }


@pytest.fixture
def comprehensive_resume_data():
    """Comprehensive resume with all sections."""
    return {
        "contact": {
            "name": "Jane Smith",
            "email": "jane@example.com",
            "phone": "+1-555-9876",
            "location": "San Francisco, CA",
            "website": "https://janesmith.dev",
            "linkedin": "https://linkedin.com/in/janesmith",
            "github": "https://github.com/janesmith",
        },
        "sections": {
            "summary": "Experienced full-stack engineer passionate about building scalable systems.",
            "experience": [
                {
                    "company": "Tech Giants Inc",
                    "position": "Senior Software Engineer",
                    "start_date": "2021-06-01",
                    "end_date": "2024-01-01",
                    "description": "Architected microservices platform",
                    "highlights": [
                        "Reduced latency by 40%",
                        "Mentored junior engineers",
                    ],
                },
                {
                    "company": "Startup Ventures",
                    "position": "Software Engineer",
                    "start_date": "2019-01-01",
                    "end_date": "2021-05-31",
                    "description": "Full-stack development",
                    "highlights": ["Built REST API", "Led frontend redesign"],
                },
            ],
            "education": [
                {
                    "school": "State University",
                    "degree": "Bachelor of Science",
                    "field": "Computer Science",
                    "graduation_date": "2019-05-01",
                    "gpa": "3.8",
                }
            ],
            "skills": {
                "languages": ["Python", "JavaScript", "Go", "SQL"],
                "frameworks": ["FastAPI", "React", "Django"],
                "tools": ["Docker", "Kubernetes", "AWS"],
            },
            "projects": [
                {
                    "name": "Distributed Cache System",
                    "description": "Built in-memory cache",
                    "technologies": ["Go", "Redis"],
                    "link": "https://github.com/jane/cache",
                }
            ],
            "certifications": [
                {
                    "name": "AWS Solutions Architect",
                    "issuer": "Amazon",
                    "date": "2023-06-01",
                }
            ],
        },
    }


@pytest.fixture
def resume_with_special_chars():
    """Resume with special characters and Unicode."""
    return {
        "contact": {
            "name": "José García-López",
            "email": "jose@example.com",
            "phone": "+34-91-555-1234",
        },
        "sections": {
            "summary": "Experto en desarrollo web con 10+ años de experiência. Especializado en arquitectura de sistemas escalables.",
            "experience": [
                {
                    "company": "Zürich Tech Solutions",
                    "position": "Lead Engineer",
                    "start_date": "2020-01-01",
                    "end_date": "2024-01-01",
                    "description": "Développement d'applications cloud-native. Gestion d'équipes: 5→20 personnes.",
                    "highlights": [
                        "Implémenté système de cache distribué",
                        "Réduction coûts infrastructure: -35%",
                    ],
                }
            ],
            "education": [
                {
                    "school": "Universität München",
                    "degree": "Diplom",
                    "field": "Informatik",
                    "graduation_date": "2014-05-01",
                }
            ],
            "skills": {
                "languages": ["Python", "Golang", "C++", "TypeScript", "中文"],
                "frameworks": ["FastAPI", "Django", "Spring Boot"],
            },
        },
    }


@pytest.fixture
def resume_with_long_text():
    """Resume with very long text content."""
    long_text = "This is a detailed description of accomplishments. " * 100
    return {
        "contact": {
            "name": "Alex Johnson",
            "email": "alex@example.com",
            "phone": "555-5555",
        },
        "sections": {
            "summary": long_text[:1000],
            "experience": [
                {
                    "company": "Big Corp",
                    "position": "Director of Engineering",
                    "start_date": "2020-01-01",
                    "end_date": "2024-01-01",
                    "description": long_text,
                    "highlights": [
                        long_text[:500],
                        long_text[500:1000],
                    ],
                }
            ],
            "education": [
                {
                    "school": "University",
                    "degree": "PhD",
                    "field": "Computer Science",
                    "graduation_date": "2018-05-01",
                }
            ],
        },
    }


# ============================================================================
# Job Description Fixtures
# ============================================================================


@pytest.fixture
def job_description_tech():
    """Job description for tech role."""
    return {
        "title": "Senior Backend Engineer",
        "company": "TechCorp",
        "description": """
        We are looking for a Senior Backend Engineer to join our growing team.
        
        Responsibilities:
        - Design and implement scalable backend services
        - Lead technical architecture decisions
        - Mentor junior engineers
        - Collaborate with product team
        
        Requirements:
        - 5+ years of backend development experience
        - Strong Python or Go experience
        - Experience with microservices architecture
        - AWS or GCP experience required
        - Proven leadership skills
        
        Nice to have:
        - Open source contributions
        - Speaking at tech conferences
        - Publications on distributed systems
        """,
    }


@pytest.fixture
def job_description_ai():
    """Job description for AI/ML role."""
    return {
        "title": "Machine Learning Engineer",
        "company": "AI Labs",
        "description": """
        Join our ML team to build next-generation AI products.
        
        Responsibilities:
        - Develop and train ML models
        - Implement ML pipelines
        - Optimize model performance
        - Deploy models to production
        
        Requirements:
        - 3+ years ML/AI experience
        - Python proficiency
        - TensorFlow or PyTorch experience
        - Statistics and mathematics background
        - MLOps knowledge
        """,
    }


# ============================================================================
# Mock Fixtures
# ============================================================================


@pytest.fixture
def mock_openai_response():
    """Mock OpenAI API response."""
    return {
        "choices": [
            {
                "message": {
                    "content": "Modified resume content optimized for the job description."
                }
            }
        ]
    }


@pytest.fixture
def mock_anthropic_response():
    """Mock Anthropic Claude API response."""
    return {"content": [{"text": "Tailored resume optimized for the target position."}]}


@pytest.fixture
def mock_github_user():
    """Mock GitHub user profile."""
    return {
        "id": 12345,
        "login": "testuser",
        "name": "Test User",
        "email": "test@github.com",
        "avatar_url": "https://avatars.githubusercontent.com/u/1?v=4",
        "bio": "Test bio",
        "company": "@github",
        "blog": "https://example.com",
        "location": "San Francisco",
        "public_repos": 42,
        "followers": 100,
        "following": 50,
    }


@pytest.fixture
def mock_github_token_response():
    """Mock GitHub token exchange response."""
    return {
        "access_token": "gho_16C7e42F292c6912E7710c838347Ae178B4a",
        "expires_in": 28800,
        "refresh_token": "ghr_1B4a2e77838347a7E420314A7E38C08022E8DC8B4A7B0E67B2C8B5E3F4D5E6F7A8",
        "refresh_token_expires_in": 15811200,
        "scope": "user:email",
        "token_type": "bearer",
    }


# ============================================================================
# Patching Fixtures
# ============================================================================


@pytest.fixture
def mock_pdf_generation(monkeypatch):
    """Mock PDF generation to avoid LaTeX dependency."""

    async def mock_generate(*args, **kwargs):
        # Return a mock PDF binary
        return b"%PDF-1.4\n%mock pdf content"

    async def mock_render_pdf(*args, **kwargs):
        return b"%PDF-1.4\n%mock pdf content"

    # Patch both possible PDF generation methods
    from api.routes import ResumeGenerator

    monkeypatch.setattr(ResumeGenerator, "generate", mock_generate)


@pytest.fixture
def mock_ai_provider(monkeypatch):
    """Mock AI provider calls."""
    mock_tailor = AsyncMock(
        return_value={
            "summary": "Optimized summary",
            "experience": [],
            "education": [],
        }
    )
    mock_extract_keywords = MagicMock(
        return_value=[
            "python",
            "microservices",
            "aws",
        ]
    )
    mock_suggest = MagicMock(
        return_value=[
            "Emphasize leadership experience",
            "Highlight cloud platform expertise",
        ]
    )

    return {
        "tailor": mock_tailor,
        "extract_keywords": mock_extract_keywords,
        "suggest": mock_suggest,
    }
