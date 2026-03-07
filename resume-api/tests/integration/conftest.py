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
from datetime import datetime, timezone, timedelta

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
async def api_client(test_db_session, test_db_session_maker):
    """Create AsyncClient with test database override."""

    async def override_get_async_session():
        async with test_db_session_maker() as session:
            yield session

    app.dependency_overrides[get_async_session] = override_get_async_session

    # Disable security middleware for tests
    from config import settings

    settings.enable_csrf = False
    settings.enable_request_signing = False

    transport = ASGITransport(app=app)
    client = AsyncClient(transport=transport, base_url="http://testserver")

    yield client

    app.dependency_overrides.clear()
    await client.aclose()


@pytest_asyncio.fixture(scope="function")
async def authenticated_client(api_client, test_user, test_api_key):
    """Create authenticated client with API key header."""
    # We use the plaintext key from the fixture's context
    api_client.headers = {"X-API-KEY": "test_key_1234567890abcdef"}
    return api_client


@pytest_asyncio.fixture(scope="function")
async def jwt_authenticated_client(api_client, test_user):
    """Create authenticated client with JWT token."""
    from config.jwt_utils import create_access_token
    from datetime import timedelta

    access_token = create_access_token(
        data={"sub": str(test_user.id)}, expires_delta=timedelta(minutes=30)
    )
    api_client.headers["Authorization"] = f"Bearer {access_token}"
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
    from lib.security.key_management import hash_api_key, generate_api_key_prefix

    plaintext_key = "test_key_1234567890abcdef"
    api_key = APIKey(
        user_id=test_user.id,
        name="Test API Key",
        key_hash=hash_api_key(plaintext_key),
        key_prefix=generate_api_key_prefix(plaintext_key),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        expires_at=datetime.now(timezone.utc) + timedelta(days=365),
    )
    test_db_session.add(api_key)
    await test_db_session.commit()
    await test_db_session.refresh(api_key)
    # Note: we don't store the plaintext key on the model anymore
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
# Resume Data Fixtures (JSON Resume format)
# ============================================================================


@pytest.fixture
def minimal_resume_data():
    """Minimal valid resume data."""
    return {
        "basics": {
            "name": "John Doe",
            "email": "john@example.com",
            "phone": "555-1234",
            "summary": "Professional software engineer with 5 years of experience.",
        },
        "work": [
            {
                "company": "Tech Corp",
                "position": "Senior Engineer",
                "startDate": "2020-01-01",
                "endDate": "2024-01-01",
                "summary": "Led backend development",
            }
        ],
        "education": [
            {
                "institution": "University",
                "studyType": "BS",
                "area": "Computer Science",
                "startDate": "2019-05-01",
            }
        ],
    }


@pytest.fixture
def comprehensive_resume_data():
    """Comprehensive resume with all sections."""
    return {
        "basics": {
            "name": "Jane Smith",
            "email": "jane@example.com",
            "phone": "+1-555-9876",
            "summary": "Experienced full-stack engineer passionate about building scalable systems.",
            "url": "https://janesmith.dev",
        },
        "location": {
            "city": "San Francisco",
            "region": "CA",
        },
        "profiles": [
            {
                "network": "LinkedIn",
                "username": "janesmith",
                "url": "https://linkedin.com/in/janesmith",
            },
            {
                "network": "GitHub",
                "username": "janesmith",
                "url": "https://github.com/janesmith",
            },
        ],
        "work": [
            {
                "company": "Tech Giants Inc",
                "position": "Senior Software Engineer",
                "startDate": "2021-06-01",
                "endDate": "2024-01-01",
                "summary": "Architected microservices platform",
                "highlights": [
                    "Reduced latency by 40%",
                    "Mentored junior engineers",
                ],
            },
            {
                "company": "Startup Ventures",
                "position": "Software Engineer",
                "startDate": "2019-01-01",
                "endDate": "2021-05-31",
                "summary": "Full-stack development",
                "highlights": ["Built REST API", "Led frontend redesign"],
            },
        ],
        "education": [
            {
                "institution": "State University",
                "studyType": "Bachelor of Science",
                "area": "Computer Science",
                "startDate": "2019-05-01",
            }
        ],
        "skills": [
            {"name": "Languages", "keywords": ["Python", "JavaScript", "Go", "SQL"]},
            {"name": "Frameworks", "keywords": ["FastAPI", "React", "Django"]},
            {"name": "Tools", "keywords": ["Docker", "Kubernetes", "AWS"]},
        ],
        "projects": [
            {
                "name": "Distributed Cache System",
                "description": "Built in-memory cache",
                "url": "https://github.com/jane/cache",
            }
        ],
        "certificates": [
            {
                "name": "AWS Solutions Architect",
                "issuer": "Amazon",
                "date": "2023-06-01",
            }
        ],
    }


@pytest.fixture
def resume_with_special_chars():
    """Resume with special characters and Unicode."""
    return {
        "basics": {
            "name": "José García-López",
            "email": "jose@example.com",
            "phone": "+34-91-555-1234",
            "summary": "Experto en desarrollo web con 10+ años de experiência. Especializado en architecture de sistemas escalables.",
        },
        "work": [
            {
                "company": "Zürich Tech Solutions",
                "position": "Lead Engineer",
                "startDate": "2020-01-01",
                "endDate": "2024-01-01",
                "summary": "Développement d'applications cloud-native. Gestion d'équipes: 5→20 personnes.",
                "highlights": [
                    "Implémenté système de cache distribué",
                    "Réduction coûts infrastructure: -35%",
                ],
            }
        ],
        "education": [
            {
                "institution": "Universität München",
                "studyType": "Diplom",
                "area": "Informatik",
                "startDate": "2014-05-01",
            }
        ],
        "skills": [
            {
                "name": "Languages",
                "keywords": ["Python", "Golang", "C++", "TypeScript", "中文"],
            },
            {"name": "Frameworks", "keywords": ["FastAPI", "Django", "Spring Boot"]},
        ],
    }


@pytest.fixture
def resume_with_long_text():
    """Resume with very long text content."""
    long_text = "This is a detailed description of accomplishments. " * 100
    return {
        "basics": {
            "name": "Alex Johnson",
            "email": "alex@example.com",
            "phone": "555-5555",
            "summary": long_text[:1000],
        },
        "work": [
            {
                "company": "Big Corp",
                "position": "Director of Engineering",
                "startDate": "2020-01-01",
                "endDate": "2024-01-01",
                "summary": long_text,
                "highlights": [
                    long_text[:500],
                    long_text[500:1000],
                ],
            }
        ],
        "education": [
            {
                "institution": "University",
                "studyType": "PhD",
                "area": "Computer Science",
                "startDate": "2018-05-01",
            }
        ],
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


@pytest.fixture(autouse=True)
def mock_variant_manager(monkeypatch):
    """Mock VariantManager to avoid file system access."""
    from lib.cli.variants import MockVariantManager

    # Mock the function that returns the manager
    mock_mgr = MockVariantManager()
    monkeypatch.setattr("api.routes.get_variant_manager", lambda: mock_mgr)
    return mock_mgr


@pytest.fixture(autouse=True)
def mock_tailorer(monkeypatch):
    """Mock ResumeTailorer to avoid AI API key requirements."""
    from lib.cli.tailorer import MockResumeTailorer

    # Mock the class entirely
    monkeypatch.setattr("api.routes.ResumeTailorer", MockResumeTailorer)
    return MockResumeTailorer()


@pytest.fixture(autouse=True)
def mock_pdf_generator(monkeypatch):
    """Mock ResumeGenerator to avoid xelatex dependency."""
    from lib.cli.generator import ResumeGenerator

    def mock_generate(*args, **kwargs):
        return b"%PDF-1.4 mock content"

    monkeypatch.setattr(ResumeGenerator, "generate_pdf", mock_generate)
    return mock_generate


@pytest.fixture
def mock_github_user():
    """Mock GitHub user profile."""
    return {
        "id": 12345,
        "login": "testgithubuser",
        "name": "Test GitHub User",
        "email": "test@github.com",
        "avatar_url": "https://github.com/avatar.png",
    }


@pytest.fixture
def mock_openai_response():
    """Mock OpenAI API response."""
    return {
        "choices": [
            {"message": {"content": "Modified resume content optimized for the job description."}}
        ]
    }


@pytest.fixture
def mock_anthropic_response():
    """Mock Anthropic Claude API response."""
    return {"content": [{"text": "Tailored resume optimized for the target position."}]}


@pytest.fixture
def mock_github_token_response():
    """Mock GitHub token response."""
    return {
        "access_token": "gho_test_token_123456789",
        "token_type": "bearer",
        "scope": "user:email,public_repo",
    }
