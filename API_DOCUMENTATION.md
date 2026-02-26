# ResumeAI API Documentation

## Overview

The ResumeAI API provides endpoints for generating and tailoring professional resumes using LaTeX templates and AI technology.

## Base URL

```
https://api.resumeai.app
```

## Authentication

All API requests require an API key sent in the `X-API-KEY` header.

## Rate Limits

- PDF Generation: 10 requests per minute per API key
- Resume Tailoring: 30 requests per minute per API key
- List Variants: 60 requests per minute per API key
- Cover Letter Generation: 10 requests per minute per API key

## Endpoints

### 1. Generate PDF Resume

Generate a professional PDF resume from JSON data.

**Endpoint:** `POST /v1/render/pdf`

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

**Endpoint:** `POST /v1/tailor`

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

**Endpoint:** `GET /v1/variants`

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

**Endpoint:** `POST /v1/cover-letter`

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

fetch('https://api.resumeai.app/v1/render/pdf', {
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
    'https://api.resumeai.app/v1/tailor',
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
    'https://api.resumeai.app/v1/cover-letter',
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
