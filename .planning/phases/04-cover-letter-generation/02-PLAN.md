# Plan 02: Cover Letter Backend API

**Phase:** 04-cover-letter-generation  
**Requirement:** JOB-03  
**Goal:** Create backend API endpoint for AI-powered cover letter generation

## What's Involved

1. **API Endpoint**
   - Route: `POST /v1/cover-letter/generate`
   - Request body: `{ resume: ResumeData, jobDescription: string, tone: string }`
   - Response: `{ coverLetter: string }`

2. **AI Integration**
   - Use existing AI utilities in `resume-api/lib/utils/ai.py`
   - Generate cover letter with proper structure:
     - Introduction (personalized to company/job)
     - Body (qualifications and fit)
     - Conclusion (call to action)
   - Apply tone formatting based on selected tone

3. **Error Handling**
   - Validate input (resume, JD, tone required)
   - Handle AI API errors gracefully
   - Return meaningful error messages

## Files Likely Affected

- `resume-api/api/cover_letter_routes.py` (new)
- `resume-api/main.py` (register router)
- `resume-api/lib/utils/ai.py` (use existing)

## Implementation Notes

- Reuse similar patterns from tailor_routes.py
- Tone prompt modification:
  - Formal: "Use professional, formal language..."
  - Conversational: "Use friendly, approachable tone..."
  - Enthusiastic: "Show excitement and passion..."

## Success Criteria

- [ ] Endpoint responds at /v1/cover-letter/generate
- [ ] Returns generated cover letter text
- [ ] Tone parameter affects output style
- [ ] Error handling works correctly
