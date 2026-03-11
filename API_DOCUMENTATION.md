# ResumeAI API Documentation

## Overview

The ResumeAI API provides endpoints for generating and tailoring professional resumes using LaTeX templates and AI technology.

## Base URL

```
https://api.resumeai.app/api/v1
```

## API Versioning

All endpoints are versioned using the `/api/v1/` prefix. This allows for future API changes without breaking existing integrations.

### Version Deprecation Policy

- **Current Version**: v1 (stable)
- **Deprecation Notice**: At least 6 months before deprecation
- **Sunset Period**: 3 months minimum after deprecation
- **Notification**: Updates will be posted in:
  - API changelog
  - Email notifications (for registered users)
  - GitHub releases

When a new version is released:

1. The previous version will be marked as "deprecated"
2. Existing integrations continue to work for 6 months
3. After deprecation, the endpoint returns a `410 Gone` status with migration guide
4. 3 months after deprecation, the version is sunset and no longer available

### Version Migration Guide

When migrating between API versions:

1. Update your base URL to include the new version prefix
2. Review the changelog for breaking changes
3. Update your request/response handlers
4. Test thoroughly in development environment
5. Deploy to production after successful testing

For v1 → v2 migration (when available):

- Base URL changes from `/api/v1/` to `/api/v2/`
- Review specific endpoint changes in the migration guide
- Update authentication headers if required

## Authentication

All API requests require an API key sent in the `X-API-KEY` header.

## Rate Limits

- PDF Generation: 10 requests per minute per API key
- Resume Tailoring: 30 requests per minute per API key
- List Variants: 60 requests per minute per API key
- Cover Letter Generation: 10 requests per minute per API key
- Team Management: 10 requests per minute per API key
- Team Collaboration (Sharing/Comments): 20-30 requests per minute per API key
- Billing Operations: 30 requests per minute per API key

## Endpoints

### 1. Generate PDF Resume

Generate a professional PDF resume from JSON data.

**Endpoint:** `POST /api/v1/render/pdf`

**Headers:**

- `X-API-KEY`: Your API key
- `Content-Type`: `application/json`

**Request Body:**

```json
{
  "resume_data": {
    "basics": {
      "name": "John Doe",
      "label": "Programmer",
      "image": "",
      "email": "john@gmail.com",
      "phone": "(912) 555-4321",
      "url": "https://johndoe.com",
      "summary": "A summary of John Doe...",
      "location": {
        "address": "2712 Broadway St",
        "postalCode": "CA 94115",
        "city": "San Francisco",
        "countryCode": "US",
        "region": "California"
      },
      "profiles": [
        {
          "network": "Twitter",
          "username": "john doe",
          "url": "https://twitter.com/john"
        }
      ]
    },
    "work": [
      {
        "name": "Company",
        "position": "President",
        "url": "https://company.com",
        "startDate": "2013-01-01",
        "endDate": "2014-01-01",
        "summary": "Description...",
        "highlights": ["Started the company"]
      }
    ],
    "volunteer": [],
    "education": [],
    "awards": [],
    "certificates": [],
    "publications": [],
    "skills": [],
    "languages": [],
    "interests": [],
    "references": [],
    "projects": []
  },
  "variant": "professional"
}
```

**Response:**

- Status: `200 OK`
- Content-Type: `application/pdf`
- Body: PDF binary data

### 2. Tailor Resume

Tailor a resume to match a specific job description using AI.

**Endpoint:** `POST /api/v1/tailor`

**Headers:**

- `X-API-KEY`: Your API key
- `Content-Type`: `application/json`

**Request Body:**

```json
{
  "resume_data": {
    // Same structure as above
  },
  "job_description": "We are looking for a Senior Software Engineer with experience in Python, React, and AWS...",
  "company_name": "Tech Company",
  "job_title": "Senior Software Engineer"
}
```

**Response:**

- Status: `200 OK`
- Content-Type: `application/json`

```json
{
  "resume_data": {
    // Tailored resume data
  },
  "keywords": ["Python", "React", "AWS", "Docker"],
  "suggestions": {
    // AI-generated improvement suggestions
  }
}
```

### 3. List Template Variants

Get a list of available resume template variants.

**Endpoint:** `GET /api/v1/variants`

**Headers:**

- `X-API-KEY`: Your API key (optional for this endpoint)

**Response:**

- Status: `200 OK`
- Content-Type: `application/json`

```json
{
  "variants": [
    {
      "name": "base",
      "display_name": "Base Template",
      "description": "Simple, clean resume template",
      "format": "json",
      "output_formats": ["pdf", "html"]
    },
    {
      "name": "professional",
      "display_name": "Professional",
      "description": "Traditional professional format",
      "format": "json",
      "output_formats": ["pdf", "html"]
    }
  ]
}
```

### 4. Generate Cover Letter

Generate a personalized cover letter based on resume and job description using AI.

**Endpoint:** `POST /api/v1/cover-letter`

**Headers:**

- `X-API-KEY`: Your API key
- `Content-Type`: `application/json`

**Request Body:**

```json
{
  "resume_data": {
    "basics": {
      "name": "John Doe",
      "email": "john@gmail.com",
      "phone": "(912) 555-4321",
      "url": "https://johndoe.com",
      "summary": "A summary of John Doe..."
    },
    "work": [
      {
        "company": "Company",
        "position": "President",
        "startDate": "2013-01-01",
        "endDate": "2014-01-01",
        "summary": "Description...",
        "highlights": ["Started the company"]
      }
    ],
    "education": [],
    "skills": []
  },
  "job_description": "We are looking for a Senior Software Engineer with experience in Python, React, and AWS...",
  "company_name": "Tech Company",
  "job_title": "Senior Software Engineer",
  "tone": "professional"
}
```

**Request Parameters:**

- `resume_data`: Resume data in JSON Resume format
- `job_description`: The job description text (10-50000 characters)
- `company_name`: Name of the company (max 200 characters)
- `job_title`: Job title for the position (max 200 characters)
- `tone`: Optional tone of the cover letter. One of: `professional` (default), `casual`, `formal`

**Response:**

- Status: `200 OK`
- Content-Type: `application/json`

```json
{
  "header": "John Doe\njohn@gmail.com\n(912) 555-4321",
  "introduction": "I am excited to apply for the Senior Software Engineer position at Tech Company...",
  "body": "With my extensive experience in Python, React, and AWS, I am confident...",
  "closing": "Thank you for considering my application. I look forward to discussing...",
  "full_text": "Complete cover letter as a single string...",
  "metadata": {
    "word_count": 250,
    "notes": ""
  }
}
```

**Response Fields:**

- `header`: Contact information formatted for the cover letter header
- `introduction`: Opening paragraph introducing the candidate and position
- `body`: Main body paragraphs connecting experience to job requirements
- `closing`: Closing paragraph with call to action
- `full_text`: Complete cover letter as a single string
- `metadata`: Additional information including word count

### 5. Billing & Subscriptions

Manage subscription plans, payments, and usage tracking.

#### List Subscription Plans

Get all available subscription plans with pricing and features.

**Endpoint:** `GET /api/v1/billing/plans`

**Response:** `200 OK`

```json
[
  {
    "id": 1,
    "name": "basic",
    "display_name": "Basic Plan",
    "description": "Perfect for individuals getting started",
    "price_cents": 999,
    "currency": "USD",
    "interval": "month",
    "features": ["5 resumes per month", "3 AI tailorings", "3 templates"],
    "max_resumes_per_month": 5,
    "max_ai_tailorings_per_month": 3,
    "max_templates": 3,
    "include_priority_support": false,
    "include_custom_domains": false,
    "is_popular": false
  }
]
```

#### Get Subscription Details

Get current user subscription status and usage.

**Endpoint:** `GET /api/v1/billing/subscription`

**Headers:**
- `X-API-KEY`: Your API key
- `X-User-ID`: User ID (internal)

**Response:** `200 OK`

```json
{
  "id": 123,
  "user_id": "user_456",
  "status": "active",
  "plan": {
    "name": "premium",
    "display_name": "Premium Plan"
    // ... plan details
  },
  "current_period_end": "2024-12-31T23:59:59Z",
  "cancel_at_period_end": false,
  "resumes_generated_this_period": 2,
  "ai_tailorings_this_period": 5,
  "created_at": "2024-01-01T10:00:00Z"
}
```

#### Create Checkout Session

Create a Stripe checkout session for subscription purchase.

**Endpoint:** `POST /api/v1/billing/checkout`

**Request Body:**
```json
{
  "plan_name": "premium",
  "success_url": "https://resumeai.app/billing/success",
  "cancel_url": "https://resumeai.app/billing/cancel",
  "trial_period_days": 7
}
```

**Response:** `200 OK`
```json
{
  "session_id": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

#### Get Usage Statistics

Check current usage against plan limits.

**Endpoint:** `GET /api/v1/billing/usage`

**Response:** `200 OK`
```json
{
  "resume_generated": {
    "allowed": true,
    "limit": 10,
    "used": 2,
    "remaining": 8
  },
  "ai_tailored": {
    "allowed": false,
    "limit": 5,
    "used": 5,
    "remaining": 0
  }
}
```

### 6. Team Collaboration

Collaborate with team members by sharing resumes and adding comments.

#### Create Team

Create a new collaboration team.

**Endpoint:** `POST /api/v1/teams/v1/teams`

**Request Body:**
```json
{
  "name": "Product Design Team",
  "description": "Collaborative space for the design department"
}
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "name": "Product Design Team",
  "description": "Collaborative space for the design department",
  "owner_id": 123,
  "member_count": 1,
  "resume_count": 0,
  "created_at": "2024-03-11T10:00:00Z",
  "updated_at": "2024-03-11T10:00:00Z"
}
```

#### Invite Team Member

Invite a user to join your team via email.

**Endpoint:** `POST /api/v1/teams/v1/teams/{team_id}/members`

**Request Body:**
```json
{
  "email": "colleague@example.com",
  "role": "editor"
}
```

**Response:** `200 OK`
```json
{
  "user_id": 456,
  "email": "colleague@example.com",
  "username": "jdoe",
  "role": "editor",
  "joined_at": "2024-03-11T11:30:00Z"
}
```

#### Share Resume with Team

Share a specific resume with all team members.

**Endpoint:** `POST /api/v1/teams/v1/teams/{team_id}/resumes`

**Request Body:**
```json
{
  "resume_id": 789,
  "permission": "edit"
}
```

**Response:** `200 OK`
```json
{
  "message": "Resume has been shared with team 'Product Design Team'"
}
```

#### Add Resume Comment

Add a comment to a specific section of a resume.

**Endpoint:** `POST /api/v1/teams/v1/resumes/{resume_id}/comments`

**Request Body:**
```json
{
  "content": "Should we emphasize the React experience more in this section?",
  "section": "work",
  "position": { "line": 15 }
}
```

**Response:** `200 OK`
```json
{
  "id": 10,
  "resume_id": 789,
  "user_id": 123,
  "username": "alex",
  "content": "Should we emphasize the React experience more in this section?",
  "section": "work",
  "position": { "line": 15 },
  "is_resolved": false,
  "created_at": "2024-03-11T12:00:00Z",
  "updated_at": "2024-03-11T12:00:00Z"
}
```

#### Get Team Activity

Get a log of recent actions within the team.

**Endpoint:** `GET /api/v1/teams/v1/teams/{team_id}/activity`

**Response:** `200 OK`
```json
[
  {
    "id": 50,
    "team_id": 1,
    "user_id": 123,
    "username": "alex",
    "action": "resume_shared",
    "resource_type": "resume",
    "resource_id": 789,
    "description": "Resume was shared with the team",
    "created_at": "2024-03-11T12:05:00Z"
  }
]
```

## Error Handling

All error responses follow this format:

```json
{
  "error": "Error message",
  "detail": "Additional details about the error"
}
```

Common HTTP status codes:

- `200`: Success
- `400`: Bad Request - Invalid input data
- `401`: Unauthorized - Missing or invalid API key
- `403`: Forbidden - Insufficient permissions
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error

## Examples

### JavaScript Example

```javascript
const apiKey = 'YOUR_API_KEY';
const resumeData = {
  /* your resume data */
};

fetch('https://api.resumeai.app/api/v1/render/pdf', {
  method: 'POST',
  headers: {
    'X-API-KEY': apiKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    resume_data: resumeData,
    variant: 'professional',
  }),
})
  .then((response) => response.blob())
  .then((pdfBlob) => {
    // Handle the PDF blob
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume.pdf';
    a.click();
  });
```

### Python Example

```python
import requests

api_key = 'YOUR_API_KEY'
resume_data = { # your resume data }

response = requests.post(
    'https://api.resumeai.app/api/v1/tailor',
    headers={'X-API-KEY': api_key},
    json={
        'resume_data': resume_data,
        'job_description': 'Job description here...',
        'company_name': 'Company Name',
        'job_title': 'Job Title'
    }
)

if response.status_code == 200:
    tailored_resume = response.json()
    print(tailored_resume)
else:
    print(f"Error: {response.status_code} - {response.text}")
```

### Python Example - Cover Letter

```python
import requests

api_key = 'YOUR_API_KEY'
resume_data = {
    'basics': {
        'name': 'John Doe',
        'email': 'john@example.com',
        'phone': '(555) 123-4567',
        'summary': 'Software engineer with 5 years of experience'
    },
    'work': [
        {
            'company': 'Tech Corp',
            'position': 'Senior Developer',
            'startDate': '2020-01-01',
            'highlights': ['Built scalable APIs', 'Led team of 5 developers']
        }
    ],
    'skills': [
        {'name': 'Programming', 'keywords': ['Python', 'JavaScript', 'React']}
    ]
}

response = requests.post(
    'https://api.resumeai.app/api/v1/cover-letter',
    headers={'X-API-KEY': api_key},
    json={
        'resume_data': resume_data,
        'job_description': 'We are looking for a Senior Software Engineer...',
        'company_name': 'Innovative Tech Inc.',
        'job_title': 'Senior Software Engineer',
        'tone': 'professional'  # Optional: 'professional', 'casual', or 'formal'
    }
)

if response.status_code == 200:
    cover_letter = response.json()
    print(cover_letter['full_text'])
    print(f"\nWord count: {cover_letter['metadata']['word_count']}")
else:
    print(f"Error: {response.status_code} - {response.text}")
```

## Support

For support, please contact us at support@resumeai.app or visit our [support portal](https://support.resumeai.app).
