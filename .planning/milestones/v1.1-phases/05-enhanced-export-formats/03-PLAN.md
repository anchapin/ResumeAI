# Plan 03: Cover Letter Export Integration

**Phase:** 05-enhanced-export-formats
**Requirements:** JOB-04, JOB-05
**Goal:** Add TXT and MD export options for cover letters

## What's Involved

1. **Cover Letter Export Functions**
   - Add `exportCoverLetterToTXT` (already exists in utils/export.ts)
   - Add `exportCoverLetterToMarkdown` function
   - Verify existing export functions work correctly

2. **CoverLetterGenerator Component**
   - Update export format options to include TXT and MD
   - Currently has PDF, DOCX, TXT buttons — add Markdown
   - Ensure all 4 formats work for cover letters

3. **Backend Cover Letter Export** (if needed)
   - Check if cover letter export uses same endpoints as resume
   - Add `/export/cover-letter/txt` and `/export/cover-letter/md` if separate endpoints needed

## Files to Modify

- `utils/export.ts` — Add `exportCoverLetterToMarkdown`, verify TXT export
- `components/CoverLetterGenerator.tsx` — Update export format UI
- `resume-api/api/cover_letter_routes.py` — Add export endpoints if needed

## Implementation Details

### Current State (from code review)
- `exportCoverLetterToPDF` — exists, calls `/api/v1/render/pdf`
- `exportCoverLetterToWord` — exists, client-side HTML generation
- `exportCoverLetterToTXT` — exists, client-side blob creation
- Need: `exportCoverLetterToMarkdown` — similar to TXT but with MD formatting

### Cover Letter Markdown Format
```markdown
# Cover Letter

[Your Name]
[Your Contact Info]

[Date]

[Hiring Manager Name]
[Company Name]

Dear [Hiring Manager],

[Cover letter content with **bold** emphasis, bullet points, etc.]

Sincerely,
[Your Name]
```

## Success Criteria

- [ ] CoverLetterGenerator shows 4 export format options
- [ ] PDF export works for cover letters
- [ ] DOCX export works for cover letters
- [ ] TXT export works for cover letters
- [ ] MD export works for cover letters
- [ ] All exports use proper filenames (e.g., `cover-letter-company-name.md`)

## Dependencies

- Plan 01: Backend endpoints (if cover letter needs separate endpoints)
- Plan 02: Frontend export patterns
