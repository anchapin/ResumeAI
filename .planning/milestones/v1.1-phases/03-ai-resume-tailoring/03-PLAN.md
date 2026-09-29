# Phase 3 Plan 03: Job Description Integration

**Phase:** 3 - AI Resume Tailoring
**Status:** Planning
**Created:** 2026-03-12

## Goal

Connect the resume tailoring feature to the job description data from Phase 2, enabling seamless flow from JD input to resume tailoring.

## Implementation Details

### Flow Integration

1. **After JD Input Complete** → Show "Tailor Resume" button
2. **Button Click** → Navigate to tailoring view with JD context
3. **Tailoring Complete** → Return to editor with updated resume

### UI Integration Points

**Location:** `components/JobDescriptionInput.tsx` (existing from Phase 2)

Add "Tailor Resume" button after JD is valid:
```tsx
{isValid && (
  <Button onClick={onTailorResume}>
    Tailor Resume to This Job
  </Button>
)}
```

**State Access:**
- `currentJobDescription` - Raw JD text
- `parsedJobDescription` - Extracted keywords/requirements

### API Call Integration

**Location:** `components/ResumeTailoring.tsx` (from Plan 01)

```typescript
const handleTailor = async () => {
  setIsTailoring(true);
  try {
    const response = await fetch('/v1/tailor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        resume_data: resumeData,
        job_description: currentJobDescription,
        company_name: parsedJobDescription?.summary?.split('\n')[0],
        job_title: extractedJobTitle,
      }),
    });
    // Handle response...
  } catch (error) {
    setTailoringError(error.message);
  }
};
```

### Store Integration

**Location:** `store/store.ts` (existing)

Ensure these state variables are available:
- `resumeData` - Current resume to tailor
- `currentJobDescription` - Job description text
- `parsedJobDescription` - Parsed JD data

## Dependencies

- Phase 2 (Job Description Input) - JD state and component
- Plan 01 - ResumeTailoring UI component
- Plan 02 - Tailoring API endpoint

## Files to Modify

1. `components/JobDescriptionInput.tsx` - Add Tailor button
2. `store/store.ts` - Ensure state is available
3. `components/ResumeTailoring.tsx` - Use JD state

## Acceptance Criteria

1. User can trigger tailoring from JD input screen
2. JD data is passed correctly to API
3. Tailored resume reflects JD keywords and requirements
4. Flow feels natural: JD Input → Tailoring → Editor