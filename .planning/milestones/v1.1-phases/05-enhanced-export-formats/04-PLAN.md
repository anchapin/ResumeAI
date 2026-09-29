# Plan 04: Testing & Verification

**Phase:** 05-enhanced-export-formats
**Requirements:** JOB-04, JOB-05
**Goal:** Test and verify all export formats work correctly

## What's Involved

1. **Backend Unit Tests**
   - Test `create_txt_from_resume` function
   - Test `create_markdown_from_resume` function
   - Test `/export/txt` endpoint
   - Test `/export/md` endpoint
   - Verify authentication and rate limiting

2. **Frontend Unit Tests**
   - Test `exportToTXT` function
   - Test `exportToMarkdown` function
   - Test export format dropdown UI
   - Test export button handlers

3. **Integration Tests**
   - End-to-end export flow for all 4 formats
   - Verify file downloads with correct content
   - Test error scenarios (network failures, invalid data)

4. **Manual Verification**
   - Download all 4 formats and verify formatting
   - Check filenames are correct
   - Verify content consistency across formats

## Files to Create/Modify

- `resume-api/tests/test_export_endpoints.py` — Backend tests
- `utils/export.test.ts` — Frontend export tests
- `tests/e2e/export-formats.spec.ts` — E2E tests (optional)

## Test Coverage

### Backend Tests
```python
def test_export_txt_success()
def test_export_txt_authentication_required()
def test_export_txt_rate_limiting()
def test_export_md_success()
def test_export_md_formatting()
def test_export_txt_invalid_resume_data()
```

### Frontend Tests
```typescript
test('exports resume as TXT format')
test('exports resume as Markdown format')
test('shows format selection dropdown')
test('handles export errors gracefully')
```

## Success Criteria

- [ ] All backend tests pass (pytest)
- [ ] All frontend tests pass (vitest)
- [ ] E2E tests pass for all 4 export formats
- [ ] Manual verification confirms correct output
- [ ] No regressions in existing PDF/DOCX exports
- [ ] Coverage thresholds maintained (60%+)

## Verification Steps

1. Run backend tests: `pytest resume-api/tests/test_export_endpoints.py -v`
2. Run frontend tests: `vitest utils/export.test.ts --run`
3. Manual test: Export resume in all 4 formats, verify content
4. Check analytics events fire correctly

## Dependencies

- Plan 01: Backend endpoints
- Plan 02: Frontend integration
- Plan 03: Cover letter integration
