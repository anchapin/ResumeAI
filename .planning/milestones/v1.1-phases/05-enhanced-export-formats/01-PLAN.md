# Plan 01: TXT/MD Export API Endpoints

**Phase:** 05-enhanced-export-formats
**Requirements:** JOB-04, JOB-05
**Goal:** Add backend API endpoints for TXT and Markdown export formats

## What's Involved

1. **TXT Export Endpoint**
   - Create `/export/txt` POST endpoint
   - Generate plain text from resume data
   - Preserve basic structure (headings, lists) via spacing/indentation
   - Return as `text/plain` with proper filename

2. **Markdown Export Endpoint**
   - Create `/export/md` POST endpoint
   - Generate Markdown from resume data
   - Use semantic Markdown formatting (# headings, - lists, **bold**, etc.)
   - Return as `text/markdown` or `text/x-markdown` with proper filename

3. **Helper Functions**
   - `create_txt_from_resume(resume_data: dict) -> str`
   - `create_markdown_from_resume(resume_data: dict) -> str`
   - Follow existing patterns from `create_docx_from_resume`

## Files to Create/Modify

- `resume-api/api/routes.py` — Add `/export/txt` and `/export/md` endpoints
- Helper functions in same file or extract to `resume-api/lib/cli/exporter.py`

## Implementation Details

### TXT Export Format
```
John Doe
Software Engineer
john@example.com | (123) 456-7890

SUMMARY
Experienced software engineer...

EXPERIENCE
Senior Engineer at Acme Corp
Jan 2020 - Present
- Led development of...
- Improved performance by...

EDUCATION
BS Computer Science - University Name
```

### Markdown Export Format
```markdown
# John Doe
## Software Engineer
john@example.com | (123) 456-7890

## Summary
Experienced software engineer...

## Experience
### Senior Engineer at Acme Corp
*Jan 2020 - Present*
- Led development of...
- Improved performance by...

## Education
**BS Computer Science** - University Name
```

## Success Criteria

- [ ] `/export/txt` endpoint returns valid plain text file
- [ ] `/export/md` endpoint returns valid Markdown file
- [ ] Both endpoints require API key authentication
- [ ] Both endpoints have rate limiting (same as PDF/DOCX)
- [ ] Proper Content-Disposition headers with filenames
- [ ] Error handling for invalid resume data

## Dependencies

- Existing DOCX export implementation (already complete)
- Resume data validation (already exists)
