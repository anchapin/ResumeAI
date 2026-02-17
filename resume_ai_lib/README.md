# Resume AI Library

Shared library for AI-powered resume tailoring, used by both ResumeAI and resume-cli.

## Features

- **Job Description Parsing**: Extract key requirements from job postings
- **Resume Tailoring**: Automatically customize resume content for specific jobs
- **Keyword Extraction**: Identify relevant skills and technologies
- **Multi-Provider Support**: Works with OpenAI (GPT) and Anthropic (Claude)

## Installation

```bash
# Basic installation (without AI dependencies)
pip install resume-ai-lib

# With AI dependencies
pip install resume-ai-lib[ai]

# Development installation
pip install resume-ai-lib[dev]
```

## Usage

### Resume Tailoring

```python
from resume_ai_lib import ResumeTailorer

# Initialize with your preferred AI provider
tailorer = ResumeTailorer(
    ai_provider="openai",  # or "anthropic"
    api_key="your-api-key",
)

# Sample resume data
resume_data = {
    "name": "John Doe",
    "summary": "Software engineer with 5 years of experience",
    "experience": [
        {
            "company": "Tech Corp",
            "title": "Senior Software Engineer",
            "description": "Built microservices using Python and Docker"
        }
    ],
    "skills": ["Python", "JavaScript", "Docker"]
}

# Job description
job_description = """
We're looking for a Backend Engineer with experience in:
- Python, Go, or Rust
- Kubernetes and Docker
- PostgreSQL and Redis
- AWS or GCP
"""

# Tailor the resume
tailored_resume = tailorer.tailor_resume(resume_data, job_description)
```

### Keyword Extraction

```python
from resume_ai_lib import KeywordExtractor

extractor = KeywordExtractor()

# Extract keywords from job description
keywords = extractor.extract_from_text(job_description)
# ['python', 'docker', 'kubernetes', 'postgresql', 'redis', 'aws', 'gcp']

# Categorize keywords
categorized = extractor.categorize_keywords(keywords)
# {
#   'languages': ['python'],
#   'devops': ['docker', 'kubernetes'],
#   'databases': ['postgresql', 'redis'],
#   'cloud_platforms': ['aws', 'gcp']
# }

# Match resume to job keywords
match_result = extractor.match_resume_to_job(resume_data, keywords)
# {
#   'matched_keywords': ['python', 'docker'],
#   'missing_keywords': ['kubernetes', 'postgresql', 'redis', 'aws', 'gcp'],
#   'score': 29
# }
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key

### Custom API Endpoints

```python
tailorer = ResumeTailorer(
    ai_provider="openai",
    api_key="your-key",
    base_url="https://api.z.ai/v1",  # Custom endpoint
)
```

## Development

```bash
# Clone the repository
git clone https://github.com/anchapin/ResumeAI.git
cd ResumeAI/resume_ai_lib

# Install in development mode
pip install -e ".[dev,ai]"

# Run tests
pytest

# Format code
black src/
ruff check src/
```

## License

MIT
