# Phase 3 Plan 02: Resume Tailoring API Endpoint

**Phase:** 3 - AI Resume Tailoring
**Status:** Planning
**Created:** 2026-03-12

## Goal

Create backend API endpoint to trigger AI resume tailoring using the existing `ResumeTailorer` class.

## Implementation Details

### API Endpoint: `/v1/tailor`

**Location:** `resume-api/api/tailor_routes.py` (new)

**Method:** `POST /v1/tailor`

### Request Model

```python
class TailorResumeRequest(BaseModel):
    resume_data: Dict[str, Any]  # JSON Resume format
    job_description: str
    company_name: Optional[str] = None
    job_title: Optional[str] = None
```

### Response Model

```python
class TailorResumeResponse(BaseModel):
    tailored_resume: Dict[str, Any]
    changes: List[TailoredChange]
    keywords_extracted: List[str]
    suggestions: List[str]

class TailoredChange(BaseModel):
    section: str  # e.g., "work", "skills", "summary"
    field: str    # e.g., "highlights[0]", "name"
    original: str
    proposed: str
    reason: str  # Why this change was made
```

### Implementation Steps

1. **Create new route file** `resume-api/api/tailor_routes.py`
2. **Import ResumeTailorer** from `lib.cli.tailorer`
3. **Implement endpoint** with:
   - Request validation
   - Call `ResumeTailorer.tailor_resume()`
   - Call `ResumeTailorer.extract_keywords()`
   - Call `ResumeTailorer.suggest_improvements()`
   - Build changes list by comparing original vs tailored
4. **Register route** in `main.py` or `api/__init__.py`

### Error Handling

- Missing API key → 401 Unauthorized
- Invalid resume format → 422 Validation Error
- AI call fails → 500 with error message
- Timeout handling → Return partial results with error flag

## Dependencies

- Existing `ResumeTailorer` class (already implemented)
- AI API keys configured (handled by existing auth)

## Files to Create

1. `resume-api/api/tailor_routes.py` - New API route file

## Files to Modify

1. `resume-api/main.py` or `resume-api/api/__init__.py` - Register route

## Acceptance Criteria

1. POST endpoint accepts resume + job description
2. Returns tailored resume, keywords, suggestions
3. Includes detailed change list with before/after
4. Proper error handling with meaningful messages
5. Rate limiting applied (similar to other expensive endpoints)