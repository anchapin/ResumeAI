# Codebase Concerns

**Analysis Date:** 2026-03-15

## Tech Debt

**Stripe Integration (Resolved):**
- Issue: StripeService class had 13 TODO items with placeholder/hardcoded values
- Files: `resume-api/lib/stripe.py`
- Impact: Billing functionality blocked (BILLING_ENABLED = false)
- Fix approach: Implemented as of March 11, 2026

**Resume Comment CRUD Operations (Resolved):**
- Issue: Team collaboration routes had 4 TODO items for database operations
- Files: `resume-api/api/team_routes.py`
- Impact: Comment endpoints returned 404 instead of performing operations
- Fix approach: Implemented as of March 11, 2026

**Frontend Large Files:**
- Issue: Several TypeScript files exceed 200 lines
- Files: `src/lib/metrics.ts` (462 lines), `src/lib/storage.ts` (376 lines), `src/hooks/useFeatureFlags.ts` (305 lines)
- Impact: Maintainability and comprehension difficulty
- Fix approach: Consider splitting into smaller modules

**Backend Large Files:**
- Issue: Several Python files exceed 800 lines
- Files: `resume-api/api/models.py` (2156 lines), `resume-api/api/routes.py` (1920 lines), `resume-api/api/team_routes.py` (1659 lines)
- Impact: Hard to maintain, long function chains
- Fix approach: Modularize into separate service files

## Known Bugs

No actively tracked bugs identified from codebase analysis. Refer to GitHub issues for current bug reports.

## Security Considerations

**API Key Storage:**
- Files: `src/lib/storage.ts`, `resume-api/config/`
- Risk: API keys stored in localStorage
- Current mitigation: Encryption may be in place (storage.ts has crypto functions)
- Recommendations: Consider user accounts for production

**CORS Configuration:**
- Files: `resume-api/main.py`
- Current mitigation: Enabled for all origins during development (`allow_origins=["*"]`)
- Recommendations: Restrict to specific origins in production

## Performance Bottlenecks

**JD Parser Regex Optimization:**
- Files: `resume-api/lib/utils/jd_parser.py` (855 lines)
- Problem: Experience level regexes may cause slow parsing
- Cause: Complex regex patterns
- Improvement path: Already optimized in recent commits

**Large Metrics File:**
- Files: `src/lib/metrics.ts` (462 lines)
- Problem: May bundle entire metrics library
- Improvement path: Tree-shake unused metrics

## Fragile Areas

**State Management:**
- Files: `src/App.tsx`, `src/lib/storage.ts`
- Why fragile: Client-side navigation via React state (not React Router)
- Safe modification: Use existing patterns, test navigation thoroughly
- Test coverage: Limited E2E tests for navigation flows

**Legacy API Endpoints:**
- Files: `resume-api/server.py`
- Why fragile: Mock server endpoints separate from V1 API
- Safe modification: Migrate to V1 API pattern

## Scaling Limits

**API Rate Limiting:**
- Current capacity: Not explicitly configured
- Limit: Unknown
- Scaling path: Implement rate limiting middleware

**Database:**
- Current capacity: SQLite (single file)
- Limit: Single-user/MVP use case
- Scaling path: Migrate to PostgreSQL for multi-user

## Dependencies at Risk

**Resume CLI Integration:**
- Files: `resume-api/lib/cli/`
- Risk: Vendor code may become stale
- Impact: Resume generation may break
- Migration plan: Keep vendor code in sync with upstream

## Missing Critical Features

**Multi-Device Sync:**
- Problem: localStorage-based persistence
- Blocks: Users cannot access resumes across devices

**Production Authentication:**
- Problem: API key in localStorage
- Blocks: Secure user accounts

## Test Coverage Gaps

**Frontend Navigation:**
- What's not tested: SPA routing via React state
- Files: `src/App.tsx`
- Risk: Navigation breaks may not be caught
- Priority: Medium

**Backend Integration:**
- What's not tested: Full API workflows
- Files: `resume-api/api/routes.py`
- Risk: API integration issues
- Priority: Medium

**E2E Testing:**
- What's not tested: Full user flows
- Risk: Critical user paths may break
- Priority: High

---

*Concerns audit: 2026-03-15*
