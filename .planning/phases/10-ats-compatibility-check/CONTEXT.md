# Context: Phase 10 - ATS Compatibility Check

**Phase:** 10  
**Goal:** Analyze resumes for ATS compatibility and provide actionable fixes.

---

## Requirements

| ID | Requirement | Status |
|----|-------------|--------|
| ANA-05 | ATS compatibility score | Not Started |
| ANA-06 | Detection of ATS-unfriendly elements | Not Started |
| ANA-07 | Actionable fixes list | Not Started |
| ANA-08 | ATS preview | Not Started |

---

## Success Criteria

1. User can upload resume and receive ATS score within 5 seconds
2. All common ATS issues detected (images, tables, headers)
3. Fix recommendations are actionable and specific
4. Plain text preview accurately represents parsed content

---

## Dependencies

- **Phase 09 (Job Match Scoring):** Complete ✅ - ANA-01 to ANA-04 delivered
- **Blocks:** None - Phase 11 and 12 can proceed after this

---

## Technical Context

### Existing Codebase

- **Backend:** FastAPI in `resume-api/`
- **Frontend:** React + TypeScript in `src/`
- **PDF Processing:** Existing PDF generation in `resume-api/lib/cli/`
- **AI Integration:** OpenAI/Claude/Gemini in `resume-api/lib/utils/ai.py`

### Key Modules

- `resume-api/api/routes/` - API endpoints
- `resume-api/lib/cli/` - Resume generation CLI
- `src/components/` - React components
- `src/utils/` - Frontend utilities

### ATS Considerations

ATS (Applicant Tracking Systems) commonly:
- Can't parse images, graphics, tables
- Can't read certain fonts or text in headers/footers
- Prefer simple, plain text formatting
- Look for keyword matches in specific sections
- Have difficulty with custom columns or layouts

### Estimated Effort

3-4 plans (~12 hours)

---

## Discretion Areas

- ATS parser implementation approach (rule-based vs ML)
- Scoring algorithm details
- UI component structure
- Integration points with existing resume data

---

## Technical Constraints

- Must work with existing resume data model
- Should integrate with Phase 09 match scoring
- Performance: <5 seconds for full analysis
- Compatible with common ATS systems (Workday, Greenhouse, Lever)
