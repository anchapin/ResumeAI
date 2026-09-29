# Plan 04: Export Integration

**Phase:** 04-cover-letter-generation  
**Requirement:** JOB-03  
**Goal:** Add export functionality for cover letter (PDF, DOCX, TXT)

## What's Involved

1. **Export Options**
   - Add cover letter to existing export dropdown
   - Options: "Resume only", "Cover letter only", "Both"
   - Format selection: PDF, DOCX, TXT

2. **PDF Export**
   - Integrate with existing PDF generation pipeline
   - Create cover letter template

3. **DOCX Export**
   - Use python-docx for Word document generation
   - Apply proper formatting and styles

4. **TXT Export**
   - Plain text export with basic formatting
   - Handle special characters

## Files Likely Affected

- `src/components/ExportButton.tsx` (enhance)
- `src/utils/export.ts` (add cover letter export)
- `resume-api/api/export_routes.py` (add DOCX/TXT)
- `resume-api/lib/cli/` (add DOCX generation)

## Implementation Notes

- Reuse existing export UI patterns
- For DOCX, can generate from the same data as PDF
- TXT should strip formatting but preserve structure

## Success Criteria

- [ ] Export dropdown shows cover letter options
- [ ] PDF export includes cover letter
- [ ] DOCX export generates valid Word document
- [ ] TXT export creates readable text file
