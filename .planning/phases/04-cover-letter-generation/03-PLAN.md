# Plan 03: Editor Integration

**Phase:** 04-cover-letter-generation  
**Requirement:** JOB-03  
**Goal:** Integrate rich text editor for cover letter editing

## What's Involved

1. **Rich Text Editor**
   - Use existing editor component or textarea with formatting
   - Support basic text formatting (bold, italic, lists)
   - Character/word count display
   - Auto-save to store

2. **Preview Mode**
   - Toggle between edit and preview modes
   - Preview shows formatted cover letter

3. **Company Personalization**
   - Input field for company name
   - Input field for hiring manager name (optional)
   - These personalize the generated cover letter

## Files Likely Affected

- `src/components/CoverLetterEditor.tsx` (new or enhance generator)
- `src/store/store.ts` (add coverLetter content)
- `src/pages/Editor.tsx` (add cover letter tab/section)

## Implementation Notes

- Can reuse existing textarea with enhanced features
- Consider using a lightweight rich text library if needed
- Preview can use simple HTML rendering

## Success Criteria

- [ ] Editor allows text input
- [ ] Preview mode shows formatted content
- [ ] Word count displays correctly
- [ ] Content saves to store
