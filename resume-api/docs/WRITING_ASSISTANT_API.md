# Writing Assistant API Documentation

**Version:** 1.0  
**Base URL:** `/api/v1/writing`

## Overview

The Writing Assistant API provides AI-powered writing suggestions for resume content. It combines:

- **Grammar checking** via LanguageTool (self-hosted)
- **Style analysis** via spaCy and textstat
- **AI enhancements** via Claude/GPT-4o (multi-provider strategy)

## Features

- Real-time grammar and spelling checking
- Style improvements (passive voice, weak verbs)
- AI-powered bullet point enhancement
- Achievement quantification suggestions
- STAR method transformation
- ATS keyword optimization
- Quality scoring and assessment

## Authentication

All endpoints require API key authentication via the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### POST /suggest

Get comprehensive writing suggestions for text.

**Request:**
```json
{
  "text": "He go to school yesterday",
  "context": {
    "section_type": "experience",
    "role": "Software Engineer",
    "industry": "Technology"
  }
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "id": "grammar_0_3",
      "type": "grammar",
      "severity": "error",
      "message": "Subject-verb agreement error",
      "offset": 3,
      "length": 2,
      "replacements": ["goes"],
      "explanation": "The subject requires third-person singular",
      "rule_id": "MORFOLOGIK_RULE_EN_US",
      "confidence": 0.95,
      "metadata": {}
    }
  ],
  "processing_time_ms": 245.32,
  "cache_hit": false,
  "quality_score": 75.5
}
```

**Suggestion Types:**
- `spelling` - Spelling errors
- `grammar` - Grammar issues
- `style` - Style improvements
- `enhancement` - AI-powered enhancements

**Severity Levels:**
- `error` - Must fix
- `warning` - Should fix
- `info` - Optional improvement

---

### POST /grammar

Check text for grammar and spelling errors only.

**Request:**
```json
{
  "text": "He go to school"
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "id": "grammar_0_3",
      "type": "grammar",
      "severity": "error",
      "message": "Subject-verb agreement",
      "offset": 3,
      "length": 2,
      "replacements": ["goes"],
      "explanation": "Agreement error",
      "rule_id": "MORFOLOGIK_RULE_EN_US",
      "confidence": 0.95,
      "metadata": {}
    }
  ],
  "error_count": 1,
  "warning_count": 0,
  "processing_time_ms": 52.18
}
```

---

### POST /enhance

Enhance text with AI-powered suggestions.

**Request:**
```json
{
  "text": "Helped with the project",
  "enhancement_type": "action_verbs",
  "context": {
    "role": "Engineer",
    "industry": "Technology"
  }
}
```

**Enhancement Types:**
- `action_verbs` - Replace weak verbs
- `quantification` - Add metrics
- `star` - Transform using STAR method
- `ats` - Optimize for ATS

**Response:**
```json
{
  "original": "Helped with the project",
  "enhanced": "Led project initiative",
  "enhancement_type": "action_verbs",
  "changes": [
    {
      "type": "verb_replacement",
      "original": "Helped",
      "suggested": "Led",
      "explanation": "Stronger leadership verb"
    }
  ],
  "confidence": 0.85,
  "explanation": "Enhanced with stronger action verbs"
}
```

---

### POST /quantify

Add quantifiable metrics to an achievement bullet.

**Request:**
```json
{
  "text": "Improved system performance",
  "role": "Software Engineer"
}
```

**Response:**
```json
{
  "original": "Improved system performance",
  "enhanced": "Improved system performance by 40%, reducing latency from 500ms to 300ms",
  "enhancement_type": "quantification",
  "changes": [
    {
      "type": "metric_added",
      "metric_type": "percentage"
    }
  ],
  "confidence": 0.8,
  "explanation": "Added quantifiable metrics to demonstrate impact"
}
```

---

### GET /quality

Assess the overall quality of a resume section.

**Request:**
```
GET /api/v1/writing/quality?text=This%20is%20well-written&section_type=experience
```

**Response:**
```json
{
  "quality_score": 85.5,
  "grade": "B",
  "suggestion_count": 2,
  "error_count": 0,
  "recommendations": [
    "Consider adding more quantifiable metrics",
    "Replace weak verbs with stronger action words"
  ]
}
```

**Grades:**
- A: 90-100 (Excellent)
- B: 80-89 (Good)
- C: 70-79 (Fair)
- D: 60-69 (Poor)
- F: 0-59 (Needs Improvement)

---

### GET /history

Get user's suggestion history.

**Request:**
```
GET /api/v1/writing/history?limit=50&status=accepted
```

**Parameters:**
- `limit` (optional): Number of results (1-200, default: 50)
- `status` (optional): Filter by status (pending, accepted, rejected, ignored)

**Response:**
```json
{
  "suggestions": [
    {
      "id": "suggestion_123",
      "type": "grammar",
      "original_text": "He go",
      "suggested_text": "He goes",
      "status": "accepted",
      "created_at": "2026-03-13T10:30:00Z"
    }
  ],
  "total_count": 15,
  "stats": {
    "total_suggestions": 50,
    "accepted": 35,
    "rejected": 10,
    "acceptance_rate": 0.7
  }
}
```

---

### POST /history/update

Update the status of a suggestion.

**Request:**
```json
{
  "suggestion_id": "suggestion_123",
  "status": "accepted"
}
```

**Status Values:**
- `accepted` - User applied the suggestion
- `rejected` - User explicitly rejected
- `ignored` - User dismissed without action

**Response:**
```json
{
  "success": true,
  "suggestion_id": "suggestion_123",
  "status": "accepted"
}
```

---

### GET /stats

Get user's writing assistant statistics.

**Response:**
```json
{
  "total_suggestions": 100,
  "accepted": 65,
  "rejected": 20,
  "acceptance_rate": 0.65,
  "common_types": ["grammar", "style", "enhancement"]
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "detail": "Invalid enhancement type: unknown_type"
}
```

### 422 Validation Error
```json
{
  "detail": [
    {
      "loc": ["body", "text"],
      "msg": "Field required",
      "type": "missing"
    }
  ]
}
```

### 500 Internal Server Error
```json
{
  "detail": "Failed to get suggestions: LLM service unavailable"
}
```

---

## Rate Limiting

- Default: 100 requests/minute per API key
- Burst: 20 requests/10 seconds

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1647187200
```

---

## Caching

Suggestions are cached for 24 hours to reduce API costs and improve response times.

**Cache Headers:**
```
Cache-Control: private, max-age=86400
ETag: "abc123"
```

**Cache Hit Response:**
```json
{
  "suggestions": [...],
  "processing_time_ms": 12.45,
  "cache_hit": true,
  "quality_score": 75.5
}
```

---

## Best Practices

### 1. Debounce Requests

Client should debounce user input to avoid excessive API calls:

```javascript
// Recommended: 300-500ms debounce
const debouncedText = useDebounce(text, 300);
```

### 2. Handle Errors Gracefully

```javascript
try {
  const suggestions = await getWritingSuggestions(text);
} catch (error) {
  // Fallback to local checking or show user-friendly message
  console.error('Writing assistant unavailable:', error);
}
```

### 3. Batch Operations

Use sidebar for batch accept/reject instead of individual API calls.

### 4. Respect Rate Limits

Implement exponential backoff on 429 responses:

```javascript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After') || 5;
  await sleep(retryAfter * 1000);
}
```

---

## Configuration

### Environment Variables

```bash
# LanguageTool
LANGUAGETOOL_URL=http://languagetool:8010

# Redis (caching)
REDIS_URL=redis://localhost:6379

# LLM Providers
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...

# Feature Flags
ENABLE_WRITING_ASSISTANT=true
```

### Docker Services

```yaml
services:
  languagetool:
    image: erikvl87/languagetool:latest
    ports:
      - "8081:8010"
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

---

## Testing

### Run Tests

```bash
# Backend tests
pytest resume-api/tests/writing_assistant/ -v

# Integration tests
pytest resume-api/tests/writing_assistant/test_integration.py -v

# Frontend tests
npm test -- writing-assistant
```

### Test Data

```python
# Sample test text
GRAMMAR_ERROR = "He go to school"
SPELLING_ERROR = "Their is a cat"
WEAK_VERB = "Helped with the project"
PASSIVE_VOICE = "The project was led by John"
```

---

## Changelog

### v1.0 (2026-03-13)

- Initial release
- Grammar checking via LanguageTool
- Style analysis via spaCy
- AI enhancements via Claude/GPT-4o
- Quality scoring
- Suggestion history tracking

---

## Support

For issues or questions:
- GitHub Issues: [Link to repo issues]
- Documentation: `/docs` endpoint
- API Status: `/api/v1/health`
