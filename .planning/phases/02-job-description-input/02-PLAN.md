# Plan 02: Backend URL Fetch API

**Phase:** 02-job-description-input
**Goal:** Create API endpoint to fetch job descriptions from URLs

## Tasks

### 2.1 Create/Fetch Endpoint

- [ ] Add `/api/v1/jd/fetch` endpoint in `jd_routes.py`
- [ ] Accept URL parameter
- [ ] Use httpx for async HTTP requests
- [ ] Handle timeout (30 seconds max)

### 2.2 HTML Parsing

- [ ] Extract text from HTML using BeautifulSoup or similar
- [ ] Remove scripts, styles, navigation elements
- [ ] Extract main content (job description body)
- [ ] Handle common job board formats (LinkedIn, Indeed, etc.)

### 2.3 Error Handling

- [ ] 404 Not Found - Site or page doesn't exist
- [ ] 403 Forbidden - Access denied
- [ ] 429 Too Many Requests - Rate limiting
- [ ] 500 Server Error - Backend issues
- [ ] Timeout handling
- [ ] Invalid URL validation

### 2.4 Caching

- [ ] Cache fetched JDs by URL hash
- [ ] TTL: 24 hours
- [ ] Cache invalidation on demand

## Technical Details

```python
# Endpoint design
@router.post("/fetch", response_model=JDFetchResponse)
async def fetch_jd_from_url(request: JDFetchRequest):
    """Fetch and extract job description from a URL."""
```

## Files to Modify

- `resume-api/api/jd_routes.py`
- `resume-api/api/models.py` - Add request/response models

## Dependencies

- None (can start immediately)

## Acceptance Criteria

1. Can fetch JD from common job boards
2. Returns clean text (no HTML)
3. Proper error messages for failures
4. Response time < 30 seconds
