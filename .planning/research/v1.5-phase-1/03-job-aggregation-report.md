# Job Aggregation Report: v1.5 Job Board Integration

**Document Version:** 1.0  
**Date:** March 13, 2026  
**Author:** ResumeAI Research Team  
**Status:** Draft for Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Job Sources Overview](#2-job-sources-overview)
3. [RSS Feed Parsing](#3-rss-feed-parsing)
4. [Web Scraping Best Practices](#4-web-scraping-best-practices)
5. [Job Schema Standardization](#5-job-schema-standardization)
6. [Deduplication Strategies](#6-deduplication-strategies)
7. [Caching Architecture](#7-caching-architecture)
8. [Update Frequency](#8-update-frequency)
9. [Implementation Recommendations](#9-implementation-recommendations)
10. [Legal Considerations](#10-legal-considerations)
11. [Appendix A: Code Examples](#appendix-a-code-examples)
12. [Appendix B: RSS Feed URLs Reference](#appendix-b-rss-feed-urls-reference)

---

## 1. Executive Summary

### Recommended Approach

For ResumeAI v1.5 Job Board Integration, we recommend a **hybrid aggregation strategy** combining:

1. **RSS/Atom Feed Parsing** (Primary) - For job boards offering official feeds
2. **Partner APIs** (Secondary) - For platforms with developer programs
3. **Ethical Web Scraping** (Tertiary) - Only for sites permitting it via robots.txt

### Key Recommendations

| Aspect | Recommendation | Rationale |
|--------|---------------|-----------|
| **Primary Method** | RSS/Atom feeds | Low server load, explicitly permitted, stable |
| **Fallback Method** | Partner APIs (Adzuna, JSearch) | Reliable, structured data, legal |
| **Schema Standard** | schema.org JobPosting | Industry standard, SEO-friendly |
| **Deduplication** | RapidFuzz with token_set_ratio | Handles variations, fast, accurate |
| **Caching** | Redis with TTL-based invalidation | Fast lookups, automatic expiration |
| **Update Frequency** | 15-60 minutes per source | Balance freshness vs. server load |

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Job Aggregation Pipeline                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ RSS Feeds    │  │ Partner APIs │  │ Scrapers     │          │
│  │ (Primary)    │  │ (Secondary)  │  │ (Fallback)   │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └────────────────┬┴────────────────┘                   │
│                          │                                      │
│                   ┌──────▼──────┐                              │
│                   │  Normalizer │                              │
│                   │ (JobPosting)│                              │
│                   └──────┬──────┘                              │
│                          │                                      │
│                   ┌──────▼──────┐                              │
│                   │ Deduplicator│                              │
│                   │ (RapidFuzz) │                              │
│                   └──────┬──────┘                              │
│                          │                                      │
│                   ┌──────▼──────┐                              │
│                   │ Redis Cache │                              │
│                   │  (TTL: 1h)  │                              │
│                   └──────┬──────┘                              │
│                          │                                      │
│                   ┌──────▼──────┐                              │
│                   │   Database  │                              │
│                   │  (PostgreSQL)                              │
│                   └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### Estimated Implementation Effort

| Phase | Components | Estimated Time |
|-------|-----------|----------------|
| Phase 1 | RSS parsing, schema normalization | 2-3 weeks |
| Phase 2 | Deduplication, caching | 1-2 weeks |
| Phase 3 | API integrations | 1-2 weeks |
| Phase 4 | Monitoring, optimization | 1 week |
| **Total** | | **5-8 weeks** |

---

## 2. Job Sources Overview

### 2.1 RSS/Atom Feed Sources (Priority 1)

These sources offer official RSS/Atom feeds and are the preferred integration method.

| Source | RSS Feed URL | Format | Update Frequency | Notes |
|--------|-------------|--------|------------------|-------|
| **Hacker News Jobs** | `https://hacker-news.firebaseio.com/v0/jobs.json` | JSON API | Real-time | Use Firebase API |
| **Remote OK** | `https://remoteok.io/remote-jobs/rss` | RSS 2.0 | Hourly | Requires parsing |
| **We Work Remotely** | Contact for API | - | Daily | No public RSS |
| **Working Nomads** | `https://workingnomads.com/api` | API | Daily | API access available |
| **Jobspresso** | Check site | RSS | Daily | Verify availability |
| **Remotive** | `https://remotive.com/api/jobs` | JSON API | Daily | Public API |
| **Stack Overflow Jobs** | Discontinued | - | - | No longer available |
| **GitHub Jobs** | Discontinued (2021) | - | - | No longer available |

### 2.2 Partner API Sources (Priority 2)

These sources offer official APIs with developer programs.

| Source | API URL | Auth | Rate Limit | Free Tier |
|--------|---------|------|------------|-----------|
| **Adzuna** | `https://developer.adzuna.com/` | API Key | Varies | Yes |
| **JSearch (RapidAPI)** | `https://rapidapi.com/letscrape-6bRBa3QguO/api/jsearch` | API Key | 50 req/month | Yes |
| **The Muse** | Partner program | OAuth | Varies | Limited |
| **Indeed Publisher** | `https://www.indeed.com/publisher` | API Key | Varies | Yes |
| **LinkedIn** | `https://www.linkedin.com/developers` | OAuth 2.0 | Strict | Partnership required |
| **Upwork** | `https://www.upwork.com/developers` | OAuth 2.0 | Varies | Yes |
| **USAJOBS** | `https://developer.usajobs.gov/` | API Key | 5000/day | Yes |
| **Arbeitnow** | `https://www.arbeitnow.com/en/api` | None | Reasonable | Yes |

### 2.3 Scraping Targets (Priority 3 - Use with Caution)

Only scrape sites that explicitly permit it in robots.txt.

| Source | robots.txt Status | Notes |
|--------|------------------|-------|
| **AngelList/Wellfound** | Check robots.txt | Requires partnership for API |
| **Authentic Jobs** | Check robots.txt | No public API |
| **Company Career Pages** | Varies | Use only if permitted |
| **FlexJobs** | Restricted | Paid service, no scraping |

### 2.4 Recommended Initial Sources

For Phase 1 implementation, start with these sources:

1. **Hacker News Firebase API** - Free, real-time, well-documented
2. **Remote OK RSS** - Popular remote job board
3. **Adzuna API** - Large aggregator, free tier available
4. **Arbeitnow API** - Europe/Remote focused, no auth required
5. **Remotive API** - Remote-specific, public API

---

## 3. RSS Feed Parsing

### 3.1 Recommended Libraries

#### feedparser (Primary Recommendation)

**Installation:**
```bash
pip install feedparser
```

**Why feedparser:**
- Universal parser (RSS 0.9x, 1.0, 2.0, Atom 0.3, 1.0, CDF, RDF)
- Automatic format detection
- Well-maintained (v6.0.12 as of 2025)
- BSD-2-Clause license
- ~82KB package size

**Basic Usage:**
```python
import feedparser

# Parse RSS feed
feed = feedparser.parse('https://remoteok.io/remote-jobs/rss')

# Access feed metadata
print(f"Feed Title: {feed.feed.title}")
print(f"Last Updated: {feed.feed.updated}")

# Iterate through entries
for entry in feed.entries:
    print(f"Job: {entry.title}")
    print(f"URL: {entry.link}")
    print(f"Posted: {entry.published}")
    print(f"Description: {entry.description[:200]}...")
```

#### lxml (Alternative for XML-heavy feeds)

**Installation:**
```bash
pip install lxml
```

**Why lxml:**
- Fast C-based parser
- XPath support for complex queries
- XML Schema validation
- Memory-efficient iterparse for large feeds

**Basic Usage:**
```python
from lxml import etree

# Parse RSS feed
tree = etree.parse('feed.xml')
root = tree.getroot()

# Use XPath to find items
items = root.xpath('//item')
for item in items:
    title = item.findtext('title')
    link = item.findtext('link')
    description = item.findtext('description')
```

#### BeautifulSoup (For HTML-based job listings)

**Installation:**
```bash
pip install beautifulsoup4 lxml
```

**Why BeautifulSoup:**
- Excellent for malformed HTML
- Idiomatic Python API
- CSS selector support
- Works with lxml parser for speed

**Basic Usage:**
```python
from bs4 import BeautifulSoup
import requests

response = requests.get('https://example.com/jobs')
soup = BeautifulSoup(response.content, 'lxml')

# Find all job listings
jobs = soup.select('div.job-listing')
for job in jobs:
    title = job.select_one('h2.job-title').text
    url = job.select_one('a')['href']
    company = job.select_one('span.company').text
```

### 3.2 Feed Parsing Best Practices

1. **Always specify a timeout:**
```python
import feedparser
import requests

response = requests.get('https://example.com/feed.rss', timeout=10)
feed = feedparser.parse(response.content)
```

2. **Handle parsing errors gracefully:**
```python
def parse_feed_safely(url):
    try:
        feed = feedparser.parse(url)
        if feed.bozo:
            print(f"Warning: Feed parsing error: {feed.bozo_exception}")
        return feed
    except Exception as e:
        print(f"Failed to parse feed: {e}")
        return None
```

3. **Check for feed updates:**
```python
import http.client
from datetime import datetime

def check_feed_updated(url, last_modified):
    """Check if feed has been updated since last fetch."""
    headers = {'If-Modified-Since': last_modified}
    response = requests.head(url, headers=headers, timeout=5)
    
    if response.status_code == 304:
        return False  # Not modified
    return True  # Has updates
```

4. **Handle different date formats:**
```python
from email.utils import parsedate_to_datetime

def parse_date(date_string):
    """Parse various date formats from RSS/Atom feeds."""
    try:
        return parsedate_to_datetime(date_string)
    except (TypeError, ValueError):
        # Try ISO format
        try:
            return datetime.fromisoformat(date_string.replace('Z', '+00:00'))
        except ValueError:
            return datetime.now()
```

### 3.3 Handling Namespaces

RSS feeds often use namespaces for extended data:

```python
import feedparser

feed = feedparser.parse('https://example.com/feed.rss')

for entry in feed.entries:
    # Dublin Core namespace
    dc_creator = entry.get('dc_creator', 'Unknown')
    
    # Media namespace
    media_thumbnail = entry.get('media_thumbnail', [])
    
    # Content namespace
    content_encoded = entry.get('content_encoded', '')
    
    # Job-specific extensions (if available)
    job_location = entry.get('job_location', '')
    job_salary = entry.get('job_salary', '')
```

---

## 4. Web Scraping Best Practices

### 4.1 Ethics and Legal Considerations

#### Core Principles

1. **Respect robots.txt** - Always check and comply with exclusion rules
2. **Rate limiting** - Don't overwhelm servers with requests
3. **User-Agent identification** - Identify your bot honestly
4. **Terms of Service** - Review and comply with site ToS
5. **Data usage** - Only use data for intended purposes
6. **Attribution** - Credit sources when displaying aggregated data

#### robots.txt Compliance

**Understanding robots.txt:**

```
# Example robots.txt
User-agent: *
Disallow: /private/
Disallow: /admin/
Allow: /public/
Crawl-delay: 10

Sitemap: https://example.com/sitemap.xml
```

**Parsing robots.txt in Python:**
```python
from urllib.robotparser import RobotFileParser

def can_scrape(url, user_agent='ResumeAI-Bot'):
    """Check if URL can be scraped based on robots.txt."""
    from urllib.parse import urlparse
    
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    
    rp = RobotFileParser()
    try:
        rp.set_url(robots_url)
        rp.read()
        return rp.can_fetch(user_agent, url)
    except Exception:
        return True  # If robots.txt unavailable, proceed with caution
```

**Best practices:**
- Cache robots.txt results (TTL: 24 hours)
- Respect Crawl-delay directives
- Handle missing robots.txt gracefully (assume allowed)
- Log all robots.txt checks for compliance auditing

### 4.2 Rate Limiting Strategies

#### Exponential Backoff

```python
import time
import random
from functools import wraps

def rate_limited(max_calls=1, period=1.0):
    """Rate limiting decorator with exponential backoff."""
    calls = []
    
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            now = time.time()
            
            # Remove old calls outside the period
            calls[:] = [t for t in calls if now - t < period]
            
            if len(calls) >= max_calls:
                # Calculate wait time with jitter
                wait_time = period - (now - calls[0])
                wait_time += random.uniform(0, 0.1)  # Add jitter
                time.sleep(wait_time)
                return wrapper(*args, **kwargs)
            
            calls.append(now)
            return func(*args, **kwargs)
        return wrapper
    return decorator

# Usage
@rate_limited(max_calls=1, period=2.0)  # 1 request per 2 seconds
def fetch_job_page(url):
    response = requests.get(url, timeout=10)
    return response
```

#### Token Bucket Algorithm

```python
import time
import threading

class TokenBucket:
    """Token bucket rate limiter."""
    
    def __init__(self, rate=1.0, capacity=10):
        self.rate = rate  # Tokens per second
        self.capacity = capacity
        self.tokens = capacity
        self.last_update = time.time()
        self.lock = threading.Lock()
    
    def consume(self, tokens=1):
        """Try to consume tokens. Returns True if successful."""
        with self.lock:
            now = time.time()
            elapsed = now - self.last_update
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
            self.last_update = now
            
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False
    
    def wait_for_token(self, tokens=1, timeout=30):
        """Wait until tokens are available."""
        start = time.time()
        while time.time() - start < timeout:
            if self.consume(tokens):
                return True
            time.sleep(0.1)
        return False

# Usage
limiter = TokenBucket(rate=0.5, capacity=5)  # 1 request per 2 seconds, burst of 5

def scrape_with_limiting(url):
    if limiter.wait_for_token(timeout=10):
        return requests.get(url, timeout=10)
    raise Exception("Rate limit timeout")
```

#### Recommended Rate Limits by Source Type

| Source Type | Requests/Second | Delay Between Requests | Notes |
|-------------|----------------|----------------------|-------|
| RSS Feeds | 1 per 5 seconds | 5 seconds | Low server load |
| Partner APIs | As per API limits | Follow API docs | Check rate limit headers |
| Job Boards | 1 per 10 seconds | 10 seconds | Be conservative |
| Company Pages | 1 per 30 seconds | 30 seconds | Very conservative |
| Search Results | 1 per 60 seconds | 60 seconds | Highest caution |

### 4.3 HTTP Client Best Practices

#### Using requests with Sessions

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def create_session():
    """Create a requests session with retry logic."""
    session = requests.Session()
    
    # Configure retry strategy
    retry = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=['GET']
    )
    
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    
    # Set default headers
    session.headers.update({
        'User-Agent': 'ResumeAI-Bot/1.0 (+https://resumeai.example.com/bot)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
    })
    
    return session

# Usage
session = create_session()
response = session.get('https://example.com/jobs', timeout=10)
```

#### Using httpx for Async Operations

```python
import httpx
import asyncio

async def fetch_jobs_async(urls):
    """Fetch multiple job pages concurrently."""
    async with httpx.AsyncClient(
        timeout=10.0,
        headers={'User-Agent': 'ResumeAI-Bot/1.0'}
    ) as client:
        tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        results = []
        for response in responses:
            if isinstance(response, Exception):
                print(f"Error: {response}")
                continue
            results.append(response.text)
        
        return results

# Usage
urls = ['https://example.com/job1', 'https://example.com/job2']
results = asyncio.run(fetch_jobs_async(urls))
```

### 4.4 Error Handling

```python
import requests
from requests.exceptions import (
    ConnectionError, Timeout, HTTPError, RequestException
)

class ScrapingError(Exception):
    """Custom exception for scraping errors."""
    pass

def safe_fetch(url, max_retries=3):
    """Safely fetch URL with error handling."""
    for attempt in range(max_retries):
        try:
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response.text
            
        except HTTPError as e:
            if e.response.status_code == 429:
                # Rate limited - wait and retry
                retry_after = int(e.response.headers.get('Retry-After', 60))
                time.sleep(retry_after)
                continue
            elif e.response.status_code >= 500:
                # Server error - retry with backoff
                time.sleep(2 ** attempt)
                continue
            else:
                raise ScrapingError(f"HTTP error {e.response.status_code}")
                
        except (ConnectionError, Timeout) as e:
            if attempt == max_retries - 1:
                raise ScrapingError(f"Connection failed after {max_retries} attempts")
            time.sleep(2 ** attempt)
            
        except RequestException as e:
            raise ScrapingError(f"Request failed: {e}")
    
    raise ScrapingError("Max retries exceeded")
```

---

## 5. Job Schema Standardization

### 5.1 schema.org JobPosting Standard

We recommend using the **schema.org JobPosting** vocabulary as the canonical schema for normalized job data. This is the industry standard used by Google Jobs, LinkedIn, and major job aggregators.

### 5.2 Core Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | Text | Yes | Job title |
| `description` | Text | Yes | Full job description |
| `hiringOrganization` | Organization | Yes | Company name and details |
| `jobLocation` | Place | Yes | Job location (can be TELECOMMUTE) |
| `datePosted` | Date | Yes | When job was posted |
| `employmentType` | Text | Recommended | FULL_TIME, PART_TIME, CONTRACT, etc. |
| `validThrough` | Date | Recommended | Expiration date |
| `url` | URL | Yes | Original job posting URL |

### 5.3 Extended Properties

| Property | Type | Description |
|----------|------|-------------|
| `baseSalary` | MonetaryAmount | Salary range or fixed amount |
| `estimatedSalary` | MonetaryAmount | Estimated salary if not provided |
| `jobBenefits` | Text | Benefits description |
| `educationRequirements` | Text | Required education |
| `experienceRequirements` | Text | Required experience |
| `skills` | Text[] | Required skills |
| `industry` | Text | Industry category |
| `occupationalCategory` | Text | Job category code |
| `remoteLocation` | Text | Remote work eligibility |
| `applicationContact` | ContactPoint | Application contact info |
| `directApply` | Boolean | Whether direct apply is available |

### 5.4 JSON-LD Example

```json
{
  "@context": "https://schema.org",
  "@type": "JobPosting",
  "identifier": "unique-job-id-12345",
  "title": "Senior Software Engineer",
  "description": "We are looking for a Senior Software Engineer with experience in Python, React, and AWS...",
  "hiringOrganization": {
    "@type": "Organization",
    "name": "Tech Company Inc.",
    "sameAs": "https://techcompany.example.com"
  },
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "San Francisco",
      "addressRegion": "CA",
      "addressCountry": "US"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 37.7749,
      "longitude": -122.4194
    }
  },
  "jobLocationType": "TELECOMMUTE",
  "datePosted": "2026-03-10",
  "validThrough": "2026-04-10",
  "employmentType": "FULL_TIME",
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": {
      "@type": "QuantitativeValue",
      "minValue": 150000,
      "maxValue": 200000,
      "unitText": "YEAR"
    }
  },
  "jobBenefits": "Health insurance, 401(k), Unlimited PTO, Remote work",
  "skills": ["Python", "React", "AWS", "PostgreSQL", "Docker"],
  "educationRequirements": "Bachelor's degree in Computer Science or equivalent experience",
  "experienceRequirements": "5+ years of software development experience",
  "industry": "Technology",
  "occupationalCategory": "15-1252.00",
  "url": "https://techcompany.example.com/careers/senior-engineer",
  "directApply": true,
  "applicationContact": {
    "@type": "ContactPoint",
    "contactType": "recruiting",
    "email": "careers@techcompany.example.com"
  }
}
```

### 5.5 Python Data Model

```python
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, List
from enum import Enum

class EmploymentType(Enum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    CONTRACT = "CONTRACT"
    TEMPORARY = "TEMPORARY"
    INTERNSHIP = "INTERNSHIP"
    APPRENTICESHIP = "APPRENTICESHIP"

@dataclass
class Organization:
    name: str
    url: Optional[str] = None
    logo: Optional[str] = None
    same_as: Optional[str] = None

@dataclass
class Location:
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    is_remote: bool = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None

@dataclass
class Salary:
    currency: str = "USD"
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    period: str = "YEAR"  # YEAR, MONTH, HOUR

@dataclass
class JobPosting:
    # Required fields
    title: str
    description: str
    hiring_organization: Organization
    job_location: Location
    date_posted: date
    url: str
    
    # Recommended fields
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    valid_through: Optional[date] = None
    salary: Optional[Salary] = None
    
    # Extended fields
    job_benefits: List[str] = field(default_factory=list)
    skills: List[str] = field(default_factory=list)
    education_requirements: Optional[str] = None
    experience_requirements: Optional[str] = None
    industry: Optional[str] = None
    occupational_category: Optional[str] = None
    direct_apply: bool = False
    application_email: Optional[str] = None
    
    # Metadata
    source: str = ""  # Original source name
    source_id: Optional[str] = None  # Original job ID
    fetched_at: datetime = field(default_factory=datetime.now)
    
    def to_json_ld(self) -> dict:
        """Convert to schema.org JSON-LD format."""
        result = {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": self.title,
            "description": self.description,
            "hiringOrganization": {
                "@type": "Organization",
                "name": self.hiring_organization.name
            },
            "jobLocation": {
                "@type": "Place",
                "address": {
                    "@type": "PostalAddress",
                    "addressLocality": self.job_location.city,
                    "addressRegion": self.job_location.state,
                    "addressCountry": self.job_location.country
                }
            },
            "datePosted": self.date_posted.isoformat(),
            "employmentType": self.employment_type.value,
            "url": self.url
        }
        
        if self.valid_through:
            result["validThrough"] = self.valid_through.isoformat()
        
        if self.salary:
            result["baseSalary"] = {
                "@type": "MonetaryAmount",
                "currency": self.salary.currency,
                "value": {
                    "@type": "QuantitativeValue",
                    "unitText": self.salary.period
                }
            }
            if self.salary.min_value and self.salary.max_value:
                result["baseSalary"]["value"]["minValue"] = self.salary.min_value
                result["baseSalary"]["value"]["maxValue"] = self.salary.max_value
            elif self.salary.min_value:
                result["baseSalary"]["value"]["value"] = self.salary.min_value
        
        if self.skills:
            result["skills"] = self.skills
        
        if self.job_benefits:
            result["jobBenefits"] = ", ".join(self.job_benefits)
        
        return result
```

### 5.6 Normalization Functions

```python
from datetime import datetime, date
import re

def normalize_employment_type(raw_type: str) -> EmploymentType:
    """Normalize employment type from various formats."""
    raw_type = raw_type.upper().strip()
    
    mapping = {
        'FULLTIME': EmploymentType.FULL_TIME,
        'FULL-TIME': EmploymentType.FULL_TIME,
        'FULL TIME': EmploymentType.FULL_TIME,
        'FT': EmploymentType.FULL_TIME,
        'PARTTIME': EmploymentType.PART_TIME,
        'PART-TIME': EmploymentType.PART_TIME,
        'PART TIME': EmploymentType.PART_TIME,
        'PT': EmploymentType.PART_TIME,
        'CONTRACT': EmploymentType.CONTRACT,
        'CONTRACTOR': EmploymentType.CONTRACT,
        'TEMP': EmploymentType.TEMPORARY,
        'TEMPORARY': EmploymentType.TEMPORARY,
        'INTERN': EmploymentType.INTERNSHIP,
        'INTERNSHIP': EmploymentType.INTERNSHIP,
    }
    
    return mapping.get(raw_type, EmploymentType.FULL_TIME)

def normalize_salary(raw_salary: str, currency: str = "USD") -> Optional[Salary]:
    """Parse and normalize salary information."""
    if not raw_salary:
        return None
    
    # Extract numbers from salary string
    numbers = re.findall(r'[\d,]+(?:\.\d+)?', raw_salary.replace(',', ''))
    if not numbers:
        return None
    
    values = [float(n) for n in numbers]
    
    # Determine period
    period = "YEAR"
    raw_lower = raw_salary.lower()
    if 'hour' in raw_lower or 'hr' in raw_lower:
        period = "HOUR"
    elif 'month' in raw_lower:
        period = "MONTH"
    
    # Handle range vs single value
    if len(values) >= 2:
        return Salary(
            currency=currency,
            min_value=min(values[0], values[1]),
            max_value=max(values[0], values[1]),
            period=period
        )
    else:
        return Salary(
            currency=currency,
            min_value=values[0],
            max_value=values[0],
            period=period
        )

def normalize_date(raw_date) -> date:
    """Normalize date from various formats."""
    if isinstance(raw_date, date):
        return raw_date
    if isinstance(raw_date, datetime):
        return raw_date.date()
    
    # Try common formats
    formats = [
        '%Y-%m-%d',
        '%Y/%m/%d',
        '%d-%m-%Y',
        '%d/%m/%Y',
        '%B %d, %Y',
        '%b %d, %Y',
        '%Y-%m-%dT%H:%M:%S%z',
        '%Y-%m-%dT%H:%M:%SZ',
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(str(raw_date), fmt).date()
        except ValueError:
            continue
    
    # Default to today if parsing fails
    return date.today()

def normalize_location(raw_location: dict) -> Location:
    """Normalize location data."""
    return Location(
        city=raw_location.get('city') or raw_location.get('locality'),
        state=raw_location.get('state') or raw_location.get('region'),
        country=raw_location.get('country'),
        is_remote=raw_location.get('is_remote', False) or 
                   raw_location.get('remote', False) or
                   'remote' in str(raw_location).lower()
    )
```

---

## 6. Deduplication Strategies

### 6.1 The Deduplication Challenge

Job postings often appear on multiple sources with variations:
- Different titles ("Senior Software Engineer" vs "Sr. Software Engineer")
- Different descriptions (truncated, reformatted)
- Different posting dates
- Different URLs (same job, different source)

### 6.2 Recommended Algorithm: RapidFuzz

**Installation:**
```bash
pip install rapidfuzz
```

**Why RapidFuzz:**
- MIT License (vs GPL for FuzzyWuzzy)
- 10-100x faster than FuzzyWuzzy
- Multiple string similarity algorithms
- Active maintenance
- C++ backend for performance

### 6.3 Similarity Algorithms

| Algorithm | Use Case | Speed | Accuracy |
|-----------|----------|-------|----------|
| `ratio()` | Exact string comparison | Fast | Medium |
| `partial_ratio()` | Substring matching | Fast | Medium |
| `token_sort_ratio()` | Word order variations | Medium | High |
| `token_set_ratio()` | Extra content handling | Medium | **Highest** |
| `WRatio()` | Weighted combination | Slow | Highest |
| `QRatio()` | Quick comparison | Fastest | Medium |

### 6.4 Deduplication Algorithm

```python
from rapidfuzz import process, fuzz, utils
from typing import List, Tuple, Optional
from dataclasses import dataclass
import hashlib

@dataclass
class DeduplicationResult:
    job_id: str
    is_duplicate: bool
    matched_job_id: Optional[str] = None
    similarity_score: float = 0.0
    match_type: str = ""  # 'exact', 'high', 'medium', 'low'

class JobDeduplicator:
    """Deduplicate job postings using fuzzy matching."""
    
    def __init__(self, threshold_high: float = 90, threshold_medium: float = 75):
        self.threshold_high = threshold_high
        self.threshold_medium = threshold_medium
        self.jobs = {}  # job_id -> JobPosting
    
    def add_job(self, job_id: str, job):
        """Add job to deduplication index."""
        self.jobs[job_id] = job
    
    def generate_signature(self, job) -> str:
        """Generate a unique signature for the job."""
        # Combine key fields for comparison
        signature_text = "|".join([
            job.title.lower().strip(),
            job.hiring_organization.name.lower().strip(),
            str(job.date_posted),
        ])
        return hashlib.md5(signature_text.encode()).hexdigest()
    
    def generate_comparison_text(self, job) -> str:
        """Generate text for fuzzy comparison."""
        # Combine title, company, and first 500 chars of description
        parts = [
            job.title.lower(),
            job.hiring_organization.name.lower(),
            job.description[:500].lower() if job.description else "",
        ]
        return " ".join(parts)
    
    def find_duplicates(
        self, 
        new_job, 
        new_job_id: str
    ) -> DeduplicationResult:
        """Find if a job is a duplicate of existing jobs."""
        if not self.jobs:
            return DeduplicationResult(
                job_id=new_job_id,
                is_duplicate=False
            )
        
        # First check exact signature match
        new_signature = self.generate_signature(new_job)
        for job_id, existing_job in self.jobs.items():
            if self.generate_signature(existing_job) == new_signature:
                return DeduplicationResult(
                    job_id=new_job_id,
                    is_duplicate=True,
                    matched_job_id=job_id,
                    similarity_score=100.0,
                    match_type='exact'
                )
        
        # Fuzzy matching
        new_comparison = self.generate_comparison_text(new_job)
        
        # Prepare choices for process.extractOne
        choices = []
        for job_id, job in self.jobs.items():
            comparison = self.generate_comparison_text(job)
            choices.append((job_id, comparison))
        
        # Find best match
        if not choices:
            return DeduplicationResult(
                job_id=new_job_id,
                is_duplicate=False
            )
        
        # Use token_set_ratio for best accuracy with varied content
        match = process.extractOne(
            new_comparison,
            choices,
            scorer=fuzz.token_set_ratio,
            processor=utils.default_process
        )
        
        if match:
            matched_job_id, score, _ = match
            
            if score >= self.threshold_high:
                return DeduplicationResult(
                    job_id=new_job_id,
                    is_duplicate=True,
                    matched_job_id=matched_job_id,
                    similarity_score=score,
                    match_type='high'
                )
            elif score >= self.threshold_medium:
                return DeduplicationResult(
                    job_id=new_job_id,
                    is_duplicate=False,  # Review needed
                    matched_job_id=matched_job_id,
                    similarity_score=score,
                    match_type='medium'
                )
        
        return DeduplicationResult(
            job_id=new_job_id,
            is_duplicate=False
        )
    
    def deduplicate_batch(
        self, 
        jobs: List[Tuple[str, any]]
    ) -> List[Tuple[str, any]]:
        """Deduplicate a batch of jobs, returning unique ones."""
        unique_jobs = []
        
        for job_id, job in jobs:
            result = self.find_duplicates(job, job_id)
            
            if not result.is_duplicate:
                unique_jobs.append((job_id, job))
                self.add_job(job_id, job)
        
        return unique_jobs
```

### 6.5 Advanced Deduplication with Multiple Signals

```python
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class MatchSignals:
    title_similarity: float = 0.0
    company_similarity: float = 0.0
    description_similarity: float = 0.0
    location_match: bool = False
    date_proximity: int = 999  # Days difference
    salary_overlap: bool = False

class MultiSignalDeduplicator:
    """Advanced deduplication using multiple signals."""
    
    def __init__(self):
        self.weights = {
            'title': 0.25,
            'company': 0.25,
            'description': 0.30,
            'location': 0.10,
            'date': 0.05,
            'salary': 0.05,
        }
    
    def calculate_signals(self, job1, job2) -> MatchSignals:
        """Calculate similarity signals between two jobs."""
        signals = MatchSignals()
        
        # Title similarity
        signals.title_similarity = fuzz.token_set_ratio(
            job1.title.lower(),
            job2.title.lower(),
            processor=utils.default_process
        )
        
        # Company similarity
        signals.company_similarity = fuzz.ratio(
            job1.hiring_organization.name.lower(),
            job2.hiring_organization.name.lower(),
            processor=utils.default_process
        )
        
        # Description similarity (first 1000 chars for speed)
        signals.description_similarity = fuzz.token_set_ratio(
            job1.description[:1000].lower() if job1.description else "",
            job2.description[:1000].lower() if job2.description else "",
            processor=utils.default_process
        )
        
        # Location match
        signals.location_match = (
            job1.job_location.city == job2.job_location.city and
            job1.job_location.state == job2.job_location.state and
            job1.job_location.is_remote == job2.job_location.is_remote
        )
        
        # Date proximity
        if job1.date_posted and job2.date_posted:
            signals.date_proximity = abs((job1.date_posted - job2.date_posted).days)
        
        # Salary overlap
        if job1.salary and job2.salary:
            signals.salary_overlap = self._salary_overlaps(job1.salary, job2.salary)
        
        return signals
    
    def _salary_overlaps(self, s1, s2) -> bool:
        """Check if two salary ranges overlap."""
        if not s1.min_value or not s2.min_value:
            return False
        
        # Normalize to yearly if needed
        min1 = self._normalize_salary(s1.min_value, s1.period)
        max1 = self._normalize_salary(s1.max_value or s1.min_value, s1.period)
        min2 = self._normalize_salary(s2.min_value, s2.period)
        max2 = self._normalize_salary(s2.max_value or s2.min_value, s2.period)
        
        return not (max1 < min2 or max2 < min1)
    
    def _normalize_salary(self, value: float, period: str) -> float:
        """Normalize salary to yearly."""
        multipliers = {'YEAR': 1, 'MONTH': 12, 'HOUR': 2080}
        return value * multipliers.get(period, 1)
    
    def calculate_weighted_score(self, signals: MatchSignals) -> float:
        """Calculate weighted similarity score."""
        score = (
            signals.title_similarity * self.weights['title'] +
            signals.company_similarity * self.weights['company'] +
            signals.description_similarity * self.weights['description']
        )
        
        # Bonus for location match
        if signals.location_match:
            score += 10 * self.weights['location']
        
        # Bonus for close dates
        if signals.date_proximity <= 7:
            score += 10 * self.weights['date']
        elif signals.date_proximity <= 30:
            score += 5 * self.weights['date']
        
        # Bonus for salary overlap
        if signals.salary_overlap:
            score += 10 * self.weights['salary']
        
        return min(100, score)  # Cap at 100
    
    def is_duplicate(self, job1, job2, threshold: float = 85) -> Tuple[bool, float]:
        """Determine if two jobs are duplicates."""
        signals = self.calculate_signals(job1, job2)
        score = self.calculate_weighted_score(signals)
        return score >= threshold, score
```

### 6.6 Deduplication Pseudocode

```
FUNCTION DeduplicateJobs(new_jobs, existing_jobs):
    unique_jobs = []
    
    FOR EACH new_job IN new_jobs:
        is_duplicate = FALSE
        best_match = NULL
        best_score = 0
        
        // Step 1: Generate signature for exact matching
        signature = GenerateSignature(new_job)
        
        FOR EACH existing_job IN existing_jobs:
            // Step 2: Check exact signature match
            IF GenerateSignature(existing_job) == signature:
                is_duplicate = TRUE
                best_match = existing_job
                best_score = 100
                BREAK
            
            // Step 3: Calculate fuzzy similarity
            title_score = TokenSetRatio(new_job.title, existing_job.title)
            company_score = Ratio(new_job.company, existing_job.company)
            desc_score = TokenSetRatio(new_job.description[0:500], existing_job.description[0:500])
            
            // Step 4: Calculate weighted score
            weighted_score = (title_score * 0.25) + 
                            (company_score * 0.25) + 
                            (desc_score * 0.30)
            
            // Step 5: Apply bonuses
            IF new_job.location == existing_job.location:
                weighted_score += 10
            
            IF DaysBetween(new_job.date, existing_job.date) <= 7:
                weighted_score += 5
            
            // Step 6: Track best match
            IF weighted_score > best_score:
                best_score = weighted_score
                best_match = existing_job
        
        // Step 7: Determine if duplicate
        IF best_score >= 90:
            // High confidence duplicate - skip
            LogDuplicate(new_job, best_match, best_score)
        ELSE IF best_score >= 75:
            // Medium confidence - flag for review
            FlagForReview(new_job, best_match, best_score)
            unique_jobs.append(new_job)
        ELSE:
            // Not a duplicate - add to unique list
            unique_jobs.append(new_job)
    
    RETURN unique_jobs
```

### 6.7 Performance Optimization

```python
from rapidfuzz.process import cdist
import numpy as np

class OptimizedDeduplicator:
    """Optimized deduplication for large datasets."""
    
    def __init__(self, batch_size: int = 1000):
        self.batch_size = batch_size
        self.job_signatures = {}  # job_id -> signature
    
    def batch_deduplicate(
        self, 
        new_jobs: List[Tuple[str, any]],
        existing_jobs: List[Tuple[str, any]]
    ) -> List[Tuple[str, any]]:
        """Deduplicate using matrix operations for speed."""
        if not existing_jobs:
            return new_jobs
        
        # Generate comparison texts
        new_texts = [self._generate_text(job) for _, job in new_jobs]
        existing_texts = [self._generate_text(job) for _, job in existing_jobs]
        
        # Calculate similarity matrix (batch operation)
        similarity_matrix = cdist(
            new_texts,
            existing_texts,
            scorer=fuzz.token_set_ratio,
            processor=utils.default_process,
            workers=-1  # Use all CPU cores
        )
        
        # Find duplicates
        unique_indices = []
        for i, row in enumerate(similarity_matrix):
            max_score = np.max(row)
            if max_score < 85:  # Threshold
                unique_indices.append(i)
        
        return [new_jobs[i] for i in unique_indices]
    
    def _generate_text(self, job) -> str:
        """Generate comparison text for a job."""
        return " ".join([
            job.title.lower(),
            job.hiring_organization.name.lower(),
            (job.description or "")[:500].lower()
        ])
```

---

## 7. Caching Architecture

### 7.1 Recommended Stack: Redis

**Why Redis:**
- In-memory performance (sub-millisecond lookups)
- Native TTL support for automatic expiration
- Rich data structures (strings, hashes, sorted sets)
- Pub/sub for cache invalidation
- Persistence options (RDB snapshots, AOF logs)
- Cluster support for horizontal scaling

### 7.2 Cache Key Design

```python
import hashlib
from typing import Any

class CacheKeyGenerator:
    """Generate consistent cache keys."""
    
    PREFIX = "resumeai:jobs"
    
    @classmethod
    def source_feed(cls, source: str) -> str:
        """Key for cached feed content."""
        return f"{cls.PREFIX}:feed:{source}"
    
    @classmethod
    def job_by_id(cls, source: str, job_id: str) -> str:
        """Key for individual job by source ID."""
        safe_id = hashlib.md5(job_id.encode()).hexdigest()[:16]
        return f"{cls.PREFIX}:job:{source}:{safe_id}"
    
    @classmethod
    def job_by_url(cls, url: str) -> str:
        """Key for job by URL."""
        safe_url = hashlib.md5(url.encode()).hexdigest()[:16]
        return f"{cls.PREFIX}:url:{safe_url}"
    
    @classmethod
    def dedup_index(cls) -> str:
        """Key for deduplication index."""
        return f"{cls.PREFIX}:dedup:index"
    
    @classmethod
    def source_timestamp(cls, source: str) -> str:
        """Key for last fetch timestamp."""
        return f"{cls.PREFIX}:timestamp:{source}"
    
    @classmethod
    def robots_txt(cls, domain: str) -> str:
        """Key for cached robots.txt."""
        return f"{cls.PREFIX}:robots:{domain}"
```

### 7.3 TTL Strategy

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| RSS Feed Content | 15-30 minutes | Balance freshness vs. load |
| Individual Job | 1 hour | Jobs change infrequently |
| Job URL Mapping | 24 hours | URLs are stable |
| Dedup Index | 1 hour | Rebuild periodically |
| Last Fetch Timestamp | 24 hours | Metadata |
| robots.txt | 24 hours | Changes rarely |
| API Response | Per API limits | Follow provider guidance |

### 7.4 Redis Implementation

```python
import redis
import json
from datetime import datetime, timedelta
from typing import Optional, Any, List

class JobCache:
    """Redis-based caching for job aggregation."""
    
    def __init__(
        self, 
        host: str = 'localhost', 
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None
    ):
        self.redis = redis.Redis(
            host=host,
            port=port,
            db=db,
            password=password,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5
        )
        
        # TTL constants (in seconds)
        self.TTL_FEED = 1800  # 30 minutes
        self.TTL_JOB = 3600   # 1 hour
        self.TTL_URL = 86400  # 24 hours
        self.TTL_TIMESTAMP = 86400
        self.TTL_ROBOTS = 86400
    
    def cache_feed(self, source: str, content: str) -> None:
        """Cache RSS feed content."""
        key = CacheKeyGenerator.source_feed(source)
        self.redis.setex(key, self.TTL_FEED, content)
    
    def get_cached_feed(self, source: str) -> Optional[str]:
        """Retrieve cached RSS feed."""
        key = CacheKeyGenerator.source_feed(source)
        return self.redis.get(key)
    
    def cache_job(self, source: str, job_id: str, job_data: dict) -> None:
        """Cache individual job."""
        key = CacheKeyGenerator.job_by_id(source, job_id)
        self.redis.setex(key, self.TTL_JOB, json.dumps(job_data))
    
    def get_cached_job(self, source: str, job_id: str) -> Optional[dict]:
        """Retrieve cached job."""
        key = CacheKeyGenerator.job_by_id(source, job_id)
        data = self.redis.get(key)
        return json.loads(data) if data else None
    
    def cache_job_url(self, url: str, job_id: str) -> None:
        """Cache URL to job ID mapping."""
        key = CacheKeyGenerator.job_by_url(url)
        self.redis.setex(key, self.TTL_URL, job_id)
    
    def get_job_by_url(self, url: str) -> Optional[str]:
        """Get job ID by URL."""
        key = CacheKeyGenerator.job_by_url(url)
        return self.redis.get(key)
    
    def update_fetch_timestamp(self, source: str) -> None:
        """Update last fetch timestamp for source."""
        key = CacheKeyGenerator.source_timestamp(source)
        self.redis.setex(key, self.TTL_TIMESTAMP, datetime.now().isoformat())
    
    def get_last_fetch(self, source: str) -> Optional[datetime]:
        """Get last fetch timestamp."""
        key = CacheKeyGenerator.source_timestamp(source)
        timestamp = self.redis.get(key)
        return datetime.fromisoformat(timestamp) if timestamp else None
    
    def cache_robots_txt(self, domain: str, content: str) -> None:
        """Cache robots.txt content."""
        key = CacheKeyGenerator.robots_txt(domain)
        self.redis.setex(key, self.TTL_ROBOTS, content)
    
    def get_cached_robots_txt(self, domain: str) -> Optional[str]:
        """Retrieve cached robots.txt."""
        key = CacheKeyGenerator.robots_txt(domain)
        return self.redis.get(key)
    
    def add_to_dedup_index(self, job_id: str, signature: str) -> None:
        """Add job to deduplication index (sorted set by timestamp)."""
        key = CacheKeyGenerator.dedup_index()
        self.redis.zadd(key, {f"{job_id}:{signature}": datetime.now().timestamp()})
    
    def search_dedup_index(self, signature: str) -> List[str]:
        """Search for similar signatures in dedup index."""
        key = CacheKeyGenerator.dedup_index()
        # Get all entries from last 24 hours
        cutoff = datetime.now().timestamp() - 86400
        entries = self.redis.zrangebyscore(key, cutoff, '+inf')
        
        # Filter by signature match
        matches = []
        for entry in entries:
            job_id, sig = entry.split(':', 1)
            if sig == signature:
                matches.append(job_id)
        
        return matches
    
    def cleanup_old_entries(self) -> int:
        """Remove entries older than 24 hours from dedup index."""
        key = CacheKeyGenerator.dedup_index()
        cutoff = datetime.now().timestamp() - 86400
        return self.redis.zremrangebyscore(key, '-inf', cutoff)
    
    def invalidate_source(self, source: str) -> None:
        """Invalidate all cache entries for a source."""
        pattern = f"{CacheKeyGenerator.PREFIX}:*:{source}:*"
        keys = self.redis.keys(pattern)
        if keys:
            self.redis.delete(*keys)
    
    def get_stats(self) -> dict:
        """Get cache statistics."""
        info = self.redis.info('stats')
        keyspace = self.redis.info('keyspace')
        
        return {
            'hits': info.get('keyspace_hits', 0),
            'misses': info.get('keyspace_misses', 0),
            'hit_rate': info.get('keyspace_hits', 0) / 
                       max(1, info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0)),
            'connected_clients': info.get('connected_clients', 0),
            'used_memory': info.get('used_memory_human', 'N/A'),
            'keys': sum(int(v.split('=')[1].split(',')[0]) 
                       for v in keyspace.values() if '=' in v)
        }
```

### 7.5 Cache-Aside Pattern

```python
from functools import wraps
import logging

logger = logging.getLogger(__name__)

def cache_result(ttl: int, key_prefix: str):
    """Decorator for cache-aside pattern."""
    def decorator(func):
        @wraps(func)
        def wrapper(cache: JobCache, *args, **kwargs):
            # Generate cache key
            key_args = ":".join(str(a) for a in args)
            cache_key = f"{key_prefix}:{key_args}"
            
            # Try cache first
            cached = cache.redis.get(cache_key)
            if cached:
                logger.debug(f"Cache hit: {cache_key}")
                return json.loads(cached)
            
            # Cache miss - execute function
            logger.debug(f"Cache miss: {cache_key}")
            result = func(cache, *args, **kwargs)
            
            # Store in cache
            cache.redis.setex(cache_key, ttl, json.dumps(result, default=str))
            return result
        
        return wrapper
    return decorator

# Usage example
class JobFetcher:
    def __init__(self, cache: JobCache):
        self.cache = cache
    
    @cache_result(ttl=1800, key_prefix="feed")
    def fetch_feed(self, cache: JobCache, source: str, url: str) -> dict:
        """Fetch and parse RSS feed with caching."""
        # Check cache first (handled by decorator)
        # This code only runs on cache miss
        
        response = requests.get(url, timeout=10)
        feed = feedparser.parse(response.content)
        
        # Convert to dict for caching
        return {
            'title': feed.feed.title,
            'entries': [
                {
                    'title': entry.title,
                    'link': entry.link,
                    'published': entry.published,
                    'description': entry.description
                }
                for entry in feed.entries
            ]
        }
```

### 7.6 Cache Invalidation Strategies

```python
class CacheInvalidation:
    """Strategies for cache invalidation."""
    
    def __init__(self, cache: JobCache):
        self.cache = cache
    
    def time_based_invalidation(self) -> None:
        """Rely on TTL for automatic invalidation."""
        # Redis handles this automatically with setex
        pass
    
    def explicit_invalidation(self, job_ids: List[str]) -> None:
        """Explicitly invalidate specific jobs."""
        keys = []
        for job_id in job_ids:
            # Add all possible keys for this job
            keys.append(CacheKeyGenerator.job_by_id("source", job_id))
            # Add more patterns as needed
        
        if keys:
            self.cache.redis.delete(*keys)
    
    def pattern_invalidation(self, pattern: str) -> int:
        """Invalidate by key pattern."""
        keys = self.cache.redis.keys(pattern)
        if keys:
            return self.cache.redis.delete(*keys)
        return 0
    
    def versioned_keys(self, key: str, version: int) -> str:
        """Use versioned keys for cache busting."""
        return f"{key}:v{version}"
    
    def publish_invalidation(self, channel: str, key: str) -> None:
        """Publish invalidation message via pub/sub."""
        self.cache.redis.publish(channel, json.dumps({
            'type': 'invalidate',
            'key': key,
            'timestamp': datetime.now().isoformat()
        }))
    
    def subscribe_invalidation(self, channel: str, callback) -> None:
        """Subscribe to invalidation messages."""
        pubsub = self.cache.redis.pubsub()
        pubsub.subscribe(channel)
        
        for message in pubsub.listen():
            if message['type'] == 'message':
                data = json.loads(message['data'])
                if data.get('type') == 'invalidate':
                    callback(data['key'])
```

---

## 8. Update Frequency

### 8.1 Recommended Polling Intervals

| Source Type | Interval | Rationale |
|-------------|----------|-----------|
| **Hacker News Jobs** | 5 minutes | Real-time updates, high velocity |
| **Remote OK** | 15 minutes | Frequent updates |
| **RSS Feeds (general)** | 30 minutes | Balance freshness vs. load |
| **Partner APIs** | Per API limits | Follow provider guidance |
| **Company Career Pages** | 4-6 hours | Infrequent updates |
| **Job Aggregators** | 1 hour | Cached data |

### 8.2 Smart Polling Strategy

```python
from datetime import datetime, timedelta
from enum import Enum

class UpdatePriority(Enum):
    HIGH = 300      # 5 minutes
    MEDIUM = 900    # 15 minutes
    LOW = 1800      # 30 minutes
    MINIMAL = 3600  # 1 hour

class SmartPollingScheduler:
    """Intelligent polling scheduler based on source behavior."""
    
    def __init__(self):
        self.source_stats = {}  # source -> stats
    
    def record_fetch(self, source: str, jobs_found: int, jobs_new: int):
        """Record fetch results for adaptive scheduling."""
        if source not in self.source_stats:
            self.source_stats[source] = {
                'total_fetches': 0,
                'total_jobs': 0,
                'total_new': 0,
                'last_fetch': datetime.now(),
                'avg_new_ratio': 0.0
            }
        
        stats = self.source_stats[source]
        stats['total_fetches'] += 1
        stats['total_jobs'] += jobs_found
        stats['total_new'] += jobs_new
        stats['last_fetch'] = datetime.now()
        
        # Update average new job ratio
        stats['avg_new_ratio'] = stats['total_new'] / max(1, stats['total_jobs'])
    
    def get_next_fetch_time(self, source: str) -> datetime:
        """Calculate next fetch time based on source behavior."""
        stats = self.source_stats.get(source)
        
        if not stats:
            # Default to medium priority for unknown sources
            return datetime.now() + timedelta(seconds=UpdatePriority.MEDIUM.value)
        
        # Adaptive scheduling based on new job ratio
        ratio = stats['avg_new_ratio']
        
        if ratio > 0.3:  # High new job ratio - poll more frequently
            interval = UpdatePriority.HIGH.value
        elif ratio > 0.1:  # Medium ratio
            interval = UpdatePriority.MEDIUM.value
        elif ratio > 0.05:  # Low ratio
            interval = UpdatePriority.LOW.value
        else:  # Very few new jobs
            interval = UpdatePriority.MINIMAL.value
        
        return stats['last_fetch'] + timedelta(seconds=interval)
    
    def should_fetch_now(self, source: str) -> bool:
        """Check if source should be fetched now."""
        next_fetch = self.get_next_fetch_time(source)
        return datetime.now() >= next_fetch
    
    def get_fetch_schedule(self) -> dict:
        """Get full fetch schedule for all sources."""
        schedule = {}
        for source in self.source_stats:
            schedule[source] = {
                'next_fetch': self.get_next_fetch_time(source).isoformat(),
                'avg_new_ratio': self.source_stats[source]['avg_new_ratio'],
                'last_fetch': self.source_stats[source]['last_fetch'].isoformat()
            }
        return schedule
```

### 8.3 Respecting Rate Limits

```python
class RateLimitAwareScheduler:
    """Scheduler that respects API rate limits."""
    
    def __init__(self):
        self.rate_limits = {
            'adzuna': {'requests_per_second': 1, 'daily_limit': 1000},
            'jsearch': {'requests_per_second': 0.5, 'daily_limit': 50},
            'remoteok': {'requests_per_second': 0.2, 'daily_limit': 500},
        }
        self.request_counts = {}  # source -> count today
        self.last_request = {}    # source -> timestamp
    
    def can_make_request(self, source: str) -> bool:
        """Check if request is allowed under rate limits."""
        limits = self.rate_limits.get(source)
        if not limits:
            return True  # No limits defined
        
        # Check daily limit
        today = datetime.now().date()
        count_key = f"{source}:{today}"
        current_count = self.request_counts.get(count_key, 0)
        
        if current_count >= limits['daily_limit']:
            return False
        
        # Check per-second rate
        if source in self.last_request:
            elapsed = (datetime.now() - self.last_request[source]).total_seconds()
            min_interval = 1 / limits['requests_per_second']
            if elapsed < min_interval:
                return False
        
        return True
    
    def record_request(self, source: str) -> None:
        """Record a request for rate limiting."""
        today = datetime.now().date()
        count_key = f"{source}:{today}"
        self.request_counts[count_key] = self.request_counts.get(count_key, 0) + 1
        self.last_request[source] = datetime.now()
    
    def wait_for_rate_limit(self, source: str, timeout: int = 60) -> bool:
        """Wait until rate limit allows request."""
        start = datetime.now()
        while (datetime.now() - start).total_seconds() < timeout:
            if self.can_make_request(source):
                return True
            time.sleep(1)
        return False
```

---

## 9. Implementation Recommendations

### 9.1 Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Job Aggregation Service                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    Scheduler (Celery/APScheduler)            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │    │
│  │  │HackerNews│  │Remote OK │  │ Adzuna   │  │ Arbeitnow│    │    │
│  │  │  5 min   │  │  15 min  │  │  30 min  │  │  30 min  │    │    │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │    │
│  └───────┼────────────┼────────────┼────────────┼────────────┘    │
│          │            │            │            │                  │
│  ┌───────▼────────────▼────────────▼────────────▼────────────┐    │
│  │                      Fetcher Layer                         │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │    │
│  │  │ RSS Parser  │  │ API Client  │  │  Scraper    │        │    │
│  │  │ (feedparser)│  │  (httpx)    │  │ (BeautifulSoup)      │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘        │    │
│  └────────────────────────────────────────────────────────────┘    │
│                              │                                      │
│  ┌───────────────────────────▼────────────────────────────────┐    │
│  │                    Normalizer Layer                         │    │
│  │         (Convert to schema.org JobPosting format)           │    │
│  └───────────────────────────┬────────────────────────────────┘    │
│                              │                                      │
│  ┌───────────────────────────▼────────────────────────────────┐    │
│  │                   Deduplicator Layer                        │    │
│  │              (RapidFuzz token_set_ratio)                    │    │
│  └───────────────────────────┬────────────────────────────────┘    │
│                              │                                      │
│  ┌───────────────────────────▼────────────────────────────────┐    │
│  │                      Cache Layer                            │    │
│  │                    (Redis with TTL)                         │    │
│  └───────────────────────────┬────────────────────────────────┘    │
│                              │                                      │
│  ┌───────────────────────────▼────────────────────────────────┐    │
│  │                     Storage Layer                           │    │
│  │                  (PostgreSQL Database)                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.2 Directory Structure

```
resume-api/
├── lib/
│   └── jobs/
│       ├── __init__.py
│       ├── aggregator.py          # Main aggregation orchestrator
│       ├── fetchers/
│       │   ├── __init__.py
│       │   ├── base.py            # Base fetcher class
│       │   ├── rss_fetcher.py     # RSS/Atom feed parser
│       │   ├── api_fetcher.py     # API client
│       │   └── scraper_fetcher.py # Web scraper (ethical)
│       ├── normalizers/
│       │   ├── __init__.py
│       │   ├── job_posting.py     # schema.org normalizer
│       │   └── validators.py      # Data validation
│       ├── deduplicator.py        # Deduplication logic
│       ├── cache.py               # Redis cache layer
│       ├── scheduler.py           # Polling scheduler
│       ├── models.py              # Pydantic models
│       └── sources.py             # Source configuration
├── api/
│   └── routes/
│       └── jobs.py                # Job API endpoints
└── config/
    └── jobs_config.yaml           # Source configuration
```

### 9.3 Source Configuration

```yaml
# jobs_config.yaml
sources:
  hackernews:
    type: api
    url: https://hacker-news.firebaseio.com/v0/jobs.json
    priority: high
    poll_interval: 300  # 5 minutes
    enabled: true
    
  remoteok:
    type: rss
    url: https://remoteok.io/remote-jobs/rss
    priority: medium
    poll_interval: 900  # 15 minutes
    enabled: true
    
  adzuna:
    type: api
    url: https://api.adzuna.com/v1/api/jobs/us/search
    auth: api_key
    api_key_env: ADZUNA_API_KEY
    api_id_env: ADZUNA_API_ID
    priority: medium
    poll_interval: 1800  # 30 minutes
    enabled: true
    
  arbeitnow:
    type: api
    url: https://www.arbeitnow.com/api/jobs-api.php
    auth: none
    priority: medium
    poll_interval: 1800
    enabled: true

deduplication:
  enabled: true
  threshold_high: 90
  threshold_medium: 75
  algorithm: token_set_ratio
  
cache:
  enabled: true
  redis_host: localhost
  redis_port: 6379
  redis_db: 0
  ttl_feed: 1800
  ttl_job: 3600
  ttl_url: 86400

storage:
  database: postgresql
  table: job_postings
  retention_days: 90
```

### 9.4 Implementation Phases

**Phase 1: Core Infrastructure (Weeks 1-3)**
- [ ] Set up Redis cache layer
- [ ] Implement RSS feed fetcher with feedparser
- [ ] Create schema.org normalizer
- [ ] Build basic deduplication with RapidFuzz
- [ ] Set up PostgreSQL schema for jobs

**Phase 2: Source Integration (Weeks 4-5)**
- [ ] Integrate Hacker News Firebase API
- [ ] Integrate Remote OK RSS feed
- [ ] Integrate Adzuna API
- [ ] Integrate Arbeitnow API
- [ ] Implement smart polling scheduler

**Phase 3: Optimization (Weeks 6-7)**
- [ ] Add monitoring and alerting
- [ ] Implement rate limiting
- [ ] Add cache invalidation strategies
- [ ] Performance optimization
- [ ] Error handling and retry logic

**Phase 4: API & Frontend (Week 8)**
- [ ] Create job search API endpoints
- [ ] Add filtering and sorting
- [ ] Frontend job board UI
- [ ] Job alerts functionality

### 9.5 Database Schema

```sql
-- Job postings table
CREATE TABLE job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50) NOT NULL,
    source_id VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_url VARCHAR(500),
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    location_country VARCHAR(100),
    is_remote BOOLEAN DEFAULT FALSE,
    employment_type VARCHAR(50),
    salary_min DECIMAL(12, 2),
    salary_max DECIMAL(12, 2),
    salary_currency VARCHAR(3) DEFAULT 'USD',
    salary_period VARCHAR(20) DEFAULT 'YEAR',
    date_posted DATE NOT NULL,
    valid_through DATE,
    url VARCHAR(500) NOT NULL UNIQUE,
    skills TEXT[],
    benefits TEXT[],
    education_requirements TEXT,
    experience_requirements TEXT,
    industry VARCHAR(100),
    direct_apply BOOLEAN DEFAULT FALSE,
    application_email VARCHAR(255),
    
    -- Deduplication
    signature VARCHAR(64),
    duplicate_of UUID REFERENCES job_postings(id),
    
    -- Metadata
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    CONSTRAINT valid_date CHECK (valid_through IS NULL OR valid_through >= date_posted)
);

-- Indexes for common queries
CREATE INDEX idx_jobs_title ON job_postings USING gin(to_tsvector('english', title));
CREATE INDEX idx_jobs_description ON job_postings USING gin(to_tsvector('english', description));
CREATE INDEX idx_jobs_company ON job_postings(company_name);
CREATE INDEX idx_jobs_location ON job_postings(location_city, location_state);
CREATE INDEX idx_jobs_remote ON job_postings(is_remote) WHERE is_remote = TRUE;
CREATE INDEX idx_jobs_date ON job_postings(date_posted DESC);
CREATE INDEX idx_jobs_employment ON job_postings(employment_type);
CREATE INDEX idx_jobs_salary ON job_postings(salary_min, salary_max);
CREATE INDEX idx_jobs_signature ON job_postings(signature);
CREATE INDEX idx_jobs_fetched ON job_postings(fetched_at);

-- Source statistics table
CREATE TABLE source_stats (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL,
    fetch_date DATE NOT NULL,
    jobs_fetched INTEGER DEFAULT 0,
    jobs_new INTEGER DEFAULT 0,
    jobs_duplicate INTEGER DEFAULT 0,
    fetch_duration_ms INTEGER,
    error_message TEXT,
    UNIQUE(source, fetch_date)
);
```

---

## 10. Legal Considerations

### 10.1 Terms of Service Compliance

**Key Considerations:**

1. **Review ToS for each source** before integration
2. **Document compliance** for each data source
3. **Implement opt-out mechanisms** for sources that request removal
4. **Attribute sources** when displaying aggregated jobs
5. **Link back to original** job posting

### 10.2 robots.txt Compliance

**Legal Precedents:**

| Case | Ruling | Relevance |
|------|--------|-----------|
| eBay v. Bidder's Edge (2000) | Injunction against crawling | Trespassing claims possible |
| Healthcare Advocates v. Harding (2007) | robots.txt = technological measure | DMCA implications |
| Associated Press v. Meltwater (2013) | No license from absence of robots.txt | Content ownership matters |

**Best Practices:**

```python
# Always check robots.txt before scraping
from urllib.robotparser import RobotFileParser

class ComplianceChecker:
    def __init__(self):
        self.robots_cache = {}
    
    def can_fetch(self, url: str, user_agent: str = 'ResumeAI-Bot') -> bool:
        """Check robots.txt compliance."""
        from urllib.parse import urlparse
        
        parsed = urlparse(url)
        domain = parsed.netloc
        
        # Check cache
        if domain in self.robots_cache:
            rp, timestamp = self.robots_cache[domain]
            if (datetime.now() - timestamp).total_seconds() < 86400:
                return rp.can_fetch(user_agent, url)
        
        # Fetch robots.txt
        rp = RobotFileParser()
        rp.set_url(f"{parsed.scheme}://{domain}/robots.txt")
        try:
            rp.read()
            self.robots_cache[domain] = (rp, datetime.now())
            return rp.can_fetch(user_agent, url)
        except Exception:
            # If robots.txt unavailable, log and proceed with caution
            logging.warning(f"Could not fetch robots.txt for {domain}")
            return True  # Conservative: allow if no robots.txt
```

### 10.3 Data Usage Guidelines

1. **Display only necessary data** - Title, company, location, brief description
2. **Link to original source** - Always provide attribution
3. **Don't republish full content** - Show excerpts, link to source
4. **Respect takedown requests** - Implement DMCA-style process
5. **Don't sell aggregated data** - Use for ResumeAI features only

### 10.4 API-Specific Requirements

| Provider | Requirements |
|----------|-------------|
| Adzuna | Attribution required, no redistribution |
| JSearch | Rate limits, no caching beyond TTL |
| LinkedIn | Partnership required, strict ToS |
| Indeed | Publisher program approval needed |
| USAJOBS | Public domain, attribution appreciated |

### 10.5 Recommended Legal Safeguards

```python
# Add to your terms of service
LEGAL_DISCLAIMER = """
Job Aggregation Disclaimer:

1. Source Attribution: All job listings are aggregated from publicly 
   available sources and third-party APIs. We attribute each listing 
   to its original source.

2. Data Accuracy: We do not guarantee the accuracy, completeness, or 
   timeliness of job listings. Users should verify details with the 
   original source.

3. Takedown Requests: Job publishers may request removal of listings 
   by contacting [legal@resumeai.example.com]. We will comply within 
   48 hours.

4. Fair Use: Job data is displayed under fair use principles for 
   search and discovery purposes. Full content remains with original 
   publishers.

5. No Endorsement: Listing jobs does not constitute endorsement of 
   employers or positions.
"""
```

---

## Appendix A: Code Examples

### A.1 Complete RSS Fetcher

```python
# lib/jobs/fetchers/rss_fetcher.py
import feedparser
import requests
from datetime import datetime
from typing import List, Optional, Dict, Any
from .base import BaseFetcher
from ..models import JobPosting, Organization, Location, EmploymentType

class RSSFetcher(BaseFetcher):
    """Fetch jobs from RSS/Atom feeds."""
    
    def __init__(self, cache, timeout: int = 10):
        self.cache = cache
        self.timeout = timeout
        self.session = self._create_session()
    
    def _create_session(self) -> requests.Session:
        """Create requests session with retry logic."""
        session = requests.Session()
        session.headers.update({
            'User-Agent': 'ResumeAI-Bot/1.0 (+https://resumeai.example.com/bot)',
            'Accept': 'application/rss+xml, application/xml, text/xml',
        })
        return session
    
    def fetch(self, source: str, url: str) -> List[JobPosting]:
        """Fetch and parse RSS feed."""
        # Check cache
        cached = self.cache.get_cached_feed(source)
        if cached:
            return self._parse_feed_content(cached, source)
        
        # Fetch feed
        response = self.session.get(url, timeout=self.timeout)
        response.raise_for_status()
        
        # Cache raw content
        self.cache.cache_feed(source, response.text)
        
        # Parse and return
        return self._parse_feed_content(response.text, source)
    
    def _parse_feed_content(self, content: str, source: str) -> List[JobPosting]:
        """Parse RSS feed content into JobPosting objects."""
        feed = feedparser.parse(content)
        jobs = []
        
        for entry in feed.entries:
            try:
                job = self._entry_to_job(entry, source)
                if job:
                    jobs.append(job)
            except Exception as e:
                logging.error(f"Error parsing entry: {e}")
                continue
        
        return jobs
    
    def _entry_to_job(self, entry, source: str) -> Optional[JobPosting]:
        """Convert RSS entry to JobPosting."""
        # Extract title
        title = entry.get('title', 'Unknown Position')
        
        # Extract description
        description = entry.get('description', '') or entry.get('summary', '')
        description = self._clean_html(description)
        
        # Extract company (if available in feed)
        company_name = self._extract_company(entry, title)
        
        # Extract location
        location = self._extract_location(entry)
        
        # Extract date
        date_posted = self._extract_date(entry)
        
        # Extract URL
        url = entry.get('link', '')
        if not url:
            return None
        
        return JobPosting(
            title=title,
            description=description,
            hiring_organization=Organization(name=company_name),
            job_location=location,
            date_posted=date_posted,
            url=url,
            source=source,
            source_id=entry.get('id', url),
            employment_type=self._extract_employment_type(entry)
        )
    
    def _clean_html(self, html: str) -> str:
        """Remove HTML tags from description."""
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, 'html.parser')
        return soup.get_text(separator=' ', strip=True)
    
    def _extract_company(self, entry, title: str) -> str:
        """Extract company name from entry or title."""
        # Try common RSS fields
        company = (
            entry.get('author') or
            entry.get('dc_creator') or
            entry.get('company') or
            'Unknown Company'
        )
        return company
    
    def _extract_location(self, entry) -> Location:
        """Extract location from entry."""
        location_str = (
            entry.get('job_location') or
            entry.get('location') or
            entry.get('dc_coverage') or
            ''
        )
        
        is_remote = 'remote' in location_str.lower() or 'telecommute' in location_str.lower()
        
        # Simple parsing (enhance with geocoding if needed)
        parts = location_str.split(',')
        return Location(
            city=parts[0].strip() if len(parts) > 0 else None,
            state=parts[1].strip() if len(parts) > 1 else None,
            country=parts[2].strip() if len(parts) > 2 else None,
            is_remote=is_remote
        )
    
    def _extract_date(self, entry) -> datetime:
        """Extract and normalize date."""
        from email.utils import parsedate_to_datetime
        
        date_str = entry.get('published') or entry.get('updated') or entry.get('created')
        if date_str:
            try:
                return parsedate_to_datetime(date_str).date()
            except (TypeError, ValueError):
                pass
        
        return datetime.now().date()
    
    def _extract_employment_type(self, entry) -> EmploymentType:
        """Extract employment type."""
        type_str = (
            entry.get('employment_type') or
            entry.get('job_type') or
            entry.get('dc_type') or
            'Full-time'
        )
        
        return normalize_employment_type(type_str)
```

### A.2 Complete API Fetcher

```python
# lib/jobs/fetchers/api_fetcher.py
import httpx
from typing import List, Optional, Dict, Any
from .base import BaseFetcher
from ..models import JobPosting, Organization, Location, Salary, EmploymentType

class APIFetcher(BaseFetcher):
    """Fetch jobs from partner APIs."""
    
    def __init__(self, cache, api_config: Dict[str, Any]):
        self.cache = cache
        self.config = api_config
        self.client = httpx.AsyncClient(timeout=10.0)
    
    async def fetch_adzuna(
        self, 
        api_id: str, 
        api_key: str, 
        location: str = 'US',
        what: str = '',
        page: int = 1
    ) -> List[JobPosting]:
        """Fetch jobs from Adzuna API."""
        url = f"https://api.adzuna.com/v1/api/jobs/{location.lower()}/search/{page}"
        
        params = {
            'app_id': api_id,
            'app_key': api_key,
            'results_per_page': 50,
        }
        
        if what:
            params['what'] = what
        
        response = await self.client.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        return [self._adzuna_to_job(item) for item in data.get('results', [])]
    
    def _adzuna_to_job(self, item: Dict[str, Any]) -> JobPosting:
        """Convert Adzuna API response to JobPosting."""
        return JobPosting(
            title=item.get('title', 'Unknown'),
            description=item.get('description', ''),
            hiring_organization=Organization(
                name=item.get('company', {}).get('display_name', 'Unknown')
            ),
            job_location=Location(
                city=item.get('location', {}).get('area', [''])[0] if item.get('location', {}).get('area') else None,
                country=item.get('location', {}).get('display_name', ''),
                is_remote='remote' in item.get('title', '').lower()
            ),
            date_posted=self._parse_date(item.get('created')),
            url=item.get('redirect_url', ''),
            source='adzuna',
            source_id=str(item.get('id')),
            salary=self._parse_salary(item),
            employment_type=EmploymentType.FULL_TIME  # Adzuna doesn't specify
        )
    
    def _parse_salary(self, item: Dict[str, Any]) -> Optional[Salary]:
        """Parse salary from Adzuna response."""
        salary_min = item.get('salary_min')
        salary_max = item.get('salary_max')
        
        if not salary_min and not salary_max:
            return None
        
        return Salary(
            currency='USD',  # Adzuna US
            min_value=salary_min,
            max_value=salary_max,
            period='YEAR'
        )
    
    def _parse_date(self, date_str: str) -> datetime:
        """Parse ISO date string."""
        from datetime import datetime
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
        except (ValueError, AttributeError):
            return datetime.now().date()
    
    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()
```

### A.3 Main Aggregator

```python
# lib/jobs/aggregator.py
import asyncio
import logging
from datetime import datetime
from typing import List, Dict, Any
from .fetchers.rss_fetcher import RSSFetcher
from .fetchers.api_fetcher import APIFetcher
from .deduplicator import JobDeduplicator
from .cache import JobCache
from .models import JobPosting
from .scheduler import SmartPollingScheduler

logger = logging.getLogger(__name__)

class JobAggregator:
    """Main job aggregation orchestrator."""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.cache = JobCache(
            host=config['cache']['redis_host'],
            port=config['cache']['redis_port']
        )
        self.rss_fetcher = RSSFetcher(self.cache)
        self.api_fetcher = APIFetcher(self.cache, config.get('api', {}))
        self.deduplicator = JobDeduplicator(
            threshold_high=config['deduplication']['threshold_high'],
            threshold_medium=config['deduplication']['threshold_medium']
        )
        self.scheduler = SmartPollingScheduler()
    
    async def aggregate_all(self) -> List[JobPosting]:
        """Aggregate jobs from all configured sources."""
        all_jobs = []
        
        for source_name, source_config in self.config['sources'].items():
            if not source_config.get('enabled', True):
                continue
            
            if not self.scheduler.should_fetch_now(source_name):
                logger.info(f"Skipping {source_name} - not due for fetch")
                continue
            
            try:
                jobs = await self._fetch_source(source_name, source_config)
                logger.info(f"Fetched {len(jobs)} jobs from {source_name}")
                
                # Record stats
                self.scheduler.record_fetch(
                    source_name,
                    jobs_found=len(jobs),
                    jobs_new=len(jobs)  # Will be updated after dedup
                )
                
                all_jobs.extend(jobs)
                
            except Exception as e:
                logger.error(f"Error fetching {source_name}: {e}")
        
        # Deduplicate
        unique_jobs = self._deduplicate(all_jobs)
        logger.info(f"After deduplication: {len(unique_jobs)} unique jobs")
        
        return unique_jobs
    
    async def _fetch_source(
        self, 
        source_name: str, 
        source_config: Dict[str, Any]
    ) -> List[JobPosting]:
        """Fetch jobs from a single source."""
        source_type = source_config['type']
        url = source_config['url']
        
        if source_type == 'rss':
            return self.rss_fetcher.fetch(source_name, url)
        
        elif source_type == 'api':
            if source_name == 'adzuna':
                return await self.api_fetcher.fetch_adzuna(
                    api_id=os.getenv(source_config['api_id_env']),
                    api_key=os.getenv(source_config['api_key_env'])
                )
            # Add other API handlers
        
        elif source_type == 'scraper':
            # Implement ethical scraping
            pass
        
        return []
    
    def _deduplicate(self, jobs: List[JobPosting]) -> List[JobPosting]:
        """Deduplicate jobs and store in cache."""
        unique_jobs = []
        
        for job in jobs:
            result = self.deduplicator.find_duplicates(
                job, 
                f"{job.source}:{job.source_id}"
            )
            
            if not result.is_duplicate:
                unique_jobs.append(job)
                
                # Cache job
                self.cache.cache_job(
                    job.source,
                    job.source_id,
                    job.to_dict()
                )
                
                # Cache URL mapping
                self.cache.cache_job_url(job.url, f"{job.source}:{job.source_id}")
                
                # Add to dedup index
                self.cache.add_to_dedup_index(
                    f"{job.source}:{job.source_id}",
                    self.deduplicator.generate_signature(job)
                )
        
        return unique_jobs
    
    def get_jobs(
        self,
        location: Optional[str] = None,
        remote_only: bool = False,
        employment_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[JobPosting]:
        """Query cached jobs with filters."""
        # Implementation depends on storage backend
        pass
```

---

## Appendix B: RSS Feed URLs Reference

### Confirmed RSS/Atom Feeds

| Source | Feed URL | Format | Notes |
|--------|----------|--------|-------|
| Hacker News Jobs | `https://hacker-news.firebaseio.com/v0/jobs.json` | JSON API | Real-time |
| Remote OK | `https://remoteok.io/remote-jobs/rss` | RSS 2.0 | Requires parsing |
| Working Nomads | `https://workingnomads.com/feed` | RSS | Verify current |
| Remotive | `https://remotive.com/api/jobs` | JSON API | Public API |
| Jobspresso | Check site | RSS | Verify availability |

### API Endpoints

| Source | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| Adzuna | `https://api.adzuna.com/v1/api/jobs/{location}/search` | API Key | Free tier available |
| Arbeitnow | `https://www.arbeitnow.com/api/jobs-api.php` | None | Europe/Remote focused |
| JSearch | `https://jsearch.p.rapidapi.com/search` | RapidAPI Key | Aggregator |
| USAJOBS | `https://data.usajobs.gov/api/search` | API Key | US government jobs |
| Upwork | `https://www.upwork.com/api/jobs` | OAuth | Freelance only |

### To Verify

| Source | Status | Action Needed |
|--------|--------|---------------|
| We Work Remotely | No public RSS | Contact for API access |
| Stack Overflow Jobs | Discontinued | Remove from sources |
| GitHub Jobs | Discontinued (2021) | Remove from sources |
| AngelList/Wellfound | API requires partnership | Apply for access |
| Authentic Jobs | Unknown | Check robots.txt |
| FlexJobs | Paid service | Partnership required |

---

## References

1. **schema.org JobPosting**: https://schema.org/JobPosting
2. **feedparser Documentation**: https://feedparser.readthedocs.io/
3. **RapidFuzz Documentation**: https://rapidfuzz.readthedocs.io/
4. **Redis Documentation**: https://redis.io/docs/
5. **Robots Exclusion Standard (RFC 9309)**: https://www.rfc-editor.org/rfc/rfc9309
6. **BeautifulSoup Documentation**: https://www.crummy.com/software/BeautifulSoup/bs4/doc/
7. **lxml Documentation**: https://lxml.de/
8. **Adzuna Developer Portal**: https://developer.adzuna.com/
9. **Hacker News Firebase API**: https://github.com/HackerNews/API
10. **Public APIs - Jobs Category**: https://github.com/public-apis/public-apis

---

**Document Status:** Draft  
**Last Updated:** March 13, 2026  
**Next Review:** After Phase 1 implementation
