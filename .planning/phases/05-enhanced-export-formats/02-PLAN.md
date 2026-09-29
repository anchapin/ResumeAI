# Plan 02: Frontend Export UI Integration

**Phase:** 05-enhanced-export-formats
**Requirements:** JOB-04, JOB-05
**Goal:** Add TXT and MD export options to frontend export UI

## What's Involved

1. **Export Button Enhancement**
   - Add format selection dropdown with options: PDF, DOCX, TXT, MD
   - Update existing export button in Editor page
   - Show selected format clearly

2. **Export Utility Functions**
   - Add `exportToTXT` function in `utils/export.ts`
   - Add `exportToMarkdown` function in `utils/export.ts`
   - Follow existing patterns from `exportToPDF`, `exportToWord`

3. **Editor Page Integration**
   - Update format state to include 'txt' | 'md'
   - Wire up export handler for new formats
   - Update UI to show all 4 format options

## Files to Modify

- `utils/export.ts` — Add TXT/MD export functions
- `pages/Editor.tsx` — Update export format dropdown and handlers
- `src/lib/analytics.ts` — Track TXT/MD export events (optional)

## Implementation Details

### Export Format Dropdown
```tsx
// Format options
'pdf' | 'docx' | 'txt' | 'md'

// UI pattern (existing in Editor.tsx around line 987)
<button onClick={() => setExportFormat('txt')}>TXT</button>
<button onClick={() => setExportFormat('md')}>Markdown</button>
```

### Export Functions
```typescript
export async function exportToTXT(resumeData: ResumeData): Promise<void>
export async function exportToMarkdown(resumeData: ResumeData): Promise<void>
```

## Success Criteria

- [ ] Export dropdown shows 4 format options (PDF, DOCX, TXT, MD)
- [ ] Selecting format and clicking download triggers correct export
- [ ] TXT export downloads `.txt` file with proper formatting
- [ ] MD export downloads `.md` file with proper Markdown
- [ ] Export analytics track all 4 formats
- [ ] Error handling shows user-friendly messages

## Dependencies

- Plan 01: Backend TXT/MD endpoints must be implemented first
