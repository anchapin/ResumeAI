# Job Board Integration Guide

**Version:** 1.5  
**Last Updated:** 2026-03-13

---

## Overview

The Job Board Integration feature aggregates jobs from multiple sources and provides unified search, recommendations, and saved jobs functionality.

---

## Features

### 1. Job Aggregation

- RSS feed parsing (Remote OK, We Work Remotely)
- API integrations (Adzuna, Arbeitnow, Remotive)
- Automatic deduplication
- Scheduled fetching

### 2. Job Search

- Full-text search (title, company, skills)
- Filters (remote, location, salary, type, level)
- Pagination
- Sort by date/salary/relevance

### 3. Saved Jobs

- Save jobs for later
- Add notes
- Track application status
- Quick apply links

### 4. Recommendations

- Personalized based on profile
- Based on saved jobs
- Based on search history

---

## User Guide

### Searching for Jobs

1. Go to **Jobs** page
2. Enter search terms (optional)
3. Apply filters:
   - Remote only
   - Location
   - Minimum salary
   - Employment type
   - Experience level
4. Browse results
5. Click job to view details

### Saving Jobs

1. Find a job you're interested in
2. Click the star icon (☆)
3. Job is saved to your list
4. Add notes (optional)

### Viewing Saved Jobs

1. Go to **Saved Jobs** page
2. View all saved jobs
3. Add/edit notes
4. Remove jobs you're no longer interested in
5. Click job to apply

---

## Developer Guide

### API Endpoints

#### GET /api/v1/jobs/search

Search for jobs with filters.

**Query Parameters:**
- `q` - Search query
- `remote` - Remote only (true/false)
- `location` - Location filter
- `min_salary` - Minimum salary
- `employment_type` - full-time, part-time, contract
- `experience_level` - entry, mid, senior, executive
- `limit` - Results per page (max 100)
- `offset` - Pagination offset

**Response:**
```json
{
  "jobs": [
    {
      "id": "job123",
      "title": "Software Engineer",
      "company": "Tech Corp",
      "location": "San Francisco",
      "remote": true,
      "salary_min": 100000,
      "salary_max": 150000,
      "posted_date": "2026-03-13T10:00:00Z",
      "skills": ["Python", "React"],
      "url": "https://example.com/job123"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0,
  "has_more": true
}
```

---

#### GET /api/v1/jobs/recommendations

Get personalized job recommendations.

**Query Parameters:**
- `limit` - Number of recommendations (max 50)

**Response:**
```json
{
  "jobs": [...],
  "total": 20
}
```

---

#### POST /api/v1/jobs/save

Save a job for later.

**Request:**
```json
{
  "job_id": "job123",
  "notes": "Interesting opportunity"
}
```

**Response:**
```json
{
  "success": true,
  "saved_job_id": 1
}
```

---

#### GET /api/v1/jobs/saved

Get user's saved jobs.

**Response:**
```json
{
  "saved_jobs": [
    {
      "id": 1,
      "job_id": "job123",
      "saved_at": "2026-03-13T10:00:00Z",
      "notes": "Interesting opportunity",
      "status": "saved",
      "job": {...}
    }
  ],
  "total": 5
}
```

---

#### DELETE /api/v1/jobs/saved/{id}

Remove a saved job.

**Response:**
```json
{
  "success": true
}
```

---

#### GET /api/v1/jobs/sources

Get list of job sources.

**Response:**
```json
{
  "sources": [
    {
      "id": "remote_ok",
      "name": "Remote OK",
      "type": "rss",
      "url": "https://remoteok.io/remote-jobs/rss",
      "is_active": true,
      "last_fetched": "2026-03-13T10:00:00Z",
      "jobs_fetched": 150
    }
  ],
  "total": 5
}
```

---

### Frontend Components

#### JobSearch

```tsx
import { JobSearch } from '@/components/jobs';

<JobSearch
  onJobSelect={(job) => console.log(job)}
  onJobSave={(jobId) => saveJob(jobId)}
/>
```

#### JobCard

```tsx
import { JobCard } from '@/components/jobs';

<JobCard
  job={job}
  isSaved={isSaved}
  onClick={() => viewJob(job)}
  onSave={() => toggleSave(job.id)}
/>
```

#### JobFilters

```tsx
import { JobFilters } from '@/components/jobs';

<JobFilters
  filters={filters}
  onChange={setFilters}
  onReset={() => setFilters({})}
/>
```

---

### Hooks

#### useJobSearch

```typescript
import { useJobSearch } from '@/hooks/useJobSearch';

const {
  jobs,
  isLoading,
  error,
  total,
  hasMore,
  search,
  loadMore,
} = useJobSearch();

// Search with filters
await search({ query: 'engineer', remote: true });

// Load more results
await loadMore();
```

#### useSavedJobs

```typescript
import { useSavedJobs } from '@/hooks/useSavedJobs';

const {
  savedJobs,
  isLoading,
  error,
  fetchSaved,
  saveJob,
  removeJob,
  updateNotes,
} = useSavedJobs();

// Save a job
await saveJob('job123', 'Interesting role');

// Remove saved job
await removeJob(savedId);
```

---

## Configuration

### Environment Variables

```bash
# Job Sources (Optional - for API sources)
ADZUNA_APP_ID=your_app_id
ADZUNA_APP_KEY=your_app_key

# Aggregation Settings
JOB_FETCH_FREQUENCY=60  # minutes
JOB_RETENTION_DAYS=90   # days to keep jobs
```

### Adding New Sources

#### RSS Source

1. Find RSS feed URL
2. Add to job_sources table:
```sql
INSERT INTO job_sources (id, name, type, url, is_active)
VALUES ('new_source', 'New Source', 'rss', 'https://example.com/rss', true);
```

#### API Source

1. Get API credentials
2. Create source class in `lib/jobs/sources/api.py`
3. Add to job_sources table

---

## Architecture

### Backend

```
lib/jobs/
├── aggregator.py      # Main orchestrator
├── dedup.py          # Deduplication
├── schema.py         # JobPosting schema
├── models.py         # Database models
└── sources/
    ├── base.py       # Base interface
    ├── rss.py        # RSS parser
    └── api.py        # API fetcher
```

### Frontend

```
components/jobs/
├── JobSearch.tsx     # Main search UI
├── JobCard.tsx       # Job display
├── JobFilters.tsx    # Filters panel
└── SavedJobs.tsx     # Saved jobs list

hooks/
├── useJobSearch.ts   # Search logic
└── useSavedJobs.ts   # Saved jobs logic
```

---

## Security

### Authentication

- Search: Public (no auth required)
- Save/Unsave: Authentication required
- Saved jobs: User can only access own jobs

### Rate Limiting

- Search: 100 requests/minute
- Save: 20 requests/minute
- Recommendations: 30 requests/minute

### Data Privacy

- Saved jobs are user-specific
- Search history not stored
- Job data cached for 24 hours

---

## Troubleshooting

### No jobs appearing in search

**Cause:** Sources not fetched or all inactive

**Solution:**
1. Check job_sources table
2. Verify sources are active
3. Trigger manual fetch

---

### Duplicate jobs appearing

**Cause:** Deduplication threshold too low

**Solution:**
1. Adjust similarity thresholds in `dedup.py`
2. Re-run deduplication

---

### Save job fails

**Cause:** Authentication issue or job doesn't exist

**Solution:**
1. Verify user is authenticated
2. Check job exists in database
3. Check for duplicate save

---

## Performance

### Caching

- Search results: 5 minutes
- Job details: 1 hour
- Recommendations: 30 minutes

### Indexing

Database indexes on:
- `job_postings.title`
- `job_postings.company`
- `job_postings.posted_date`
- `job_postings.remote`
- `saved_jobs.user_id`

---

## Monitoring

### Metrics to Track

- Jobs fetched per source
- Deduplication rate
- Search usage
- Save rate
- Time to fetch

### Alerts

- Source fetch failure rate > 20%
- Deduplication rate > 50%
- Search latency p95 > 2s

---

_Last updated: 2026-03-13_
