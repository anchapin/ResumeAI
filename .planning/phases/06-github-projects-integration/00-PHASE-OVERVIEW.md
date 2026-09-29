# Phase 06: GitHub Projects Integration

**Requirement:** JOB-06
**Goal:** Enable users to import projects from their GitHub account to enhance their resume

**Status:** Ready to Start
**Created:** 2026-03-12

## Overview

This phase adds GitHub integration that allows users to:
1. Connect their GitHub account via OAuth (already implemented)
2. Browse and select repositories from their GitHub account
3. Customize how repositories appear as projects in their resume
4. Import selected repositories with auto-generated project details

## Plans

| Plan | Title | Focus |
|------|-------|-------|
| [06-01](./06-01-PLAN.md) | GitHub Repositories API (Backend) | Backend API endpoints for fetching repos |
| [06-02](./06-02-PLAN.md) | Repository Selection UI (Frontend) | UI for browsing and selecting repos |
| [06-03](./06-03-PLAN.md) | Import & Resume Integration | Import flow and resume data merge |
| [06-04](./06-04-PLAN.md) | Testing & Polish | Testing, error handling, caching |

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                       │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │
│  │ GitHubSettings │  │ GitHubRepo     │  │ GitHubImport   │     │
│  │                │  │ Selector       │  │ Preview        │     │
│  └────────┬───────┘  └───────┬────────┘  └───────┬────────┘     │
│           │                  │                    │              │
│           └──────────────────┼────────────────────┘              │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │  GitHub API       │                        │
│                    │  Client (utils)   │                        │
│                    └─────────┬─────────┘                        │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               │ HTTP/REST
                               │
┌──────────────────────────────┼───────────────────────────────────┐
│                       Backend (FastAPI)         │                 │
│                              │                                   │
│                    ┌─────────▼─────────┐                        │
│                    │  /github/routes   │                        │
│                    │  - /repositories  │                        │
│                    │  - /import        │                        │
│                    │  - /generate-...  │                        │
│                    └─────────┬─────────┘                        │
│                              │                                   │
│           ┌──────────────────┼────────────────────┐              │
│           │                  │                    │              │
│  ┌────────▼────────┐  ┌──────▼───────┐  ┌───────▼────────┐     │
│  │ GitHub API      │  │ GitHubCache  │  │ AI Service     │     │
│  │ Client (lib)    │  │              │  │ (auto-generate)│     │
│  └────────┬────────┘  └──────────────┘  └────────────────┘     │
│           │                                                    │
│           │ External API                                       │
└───────────┼────────────────────────────────────────────────────┘
            │
            │
   ┌────────▼────────┐
   │   GitHub API    │
   │   (api.github)  │
   └─────────────────┘
```

## User Flow

```
1. User connects GitHub account (Settings page)
         │
         ▼
2. User navigates to Editor → Projects section
         │
         ▼
3. User clicks "Import from GitHub"
         │
         ▼
4. GitHubRepoSelector opens → User browses repos
         │
         ▼
5. User selects repositories → Clicks "Next"
         │
         ▼
6. GitHubImportPreview shows → User customizes details
         │
         ▼
7. User clicks "Import to Resume"
         │
         ▼
8. Backend fetches repo details, generates project data
         │
         ▼
9. Projects merged into resume → User sees updated preview
         │
         ▼
10. User can further edit or save resume
```

## API Endpoints

### Existing (from GitHub OAuth)
- `GET /github/connect` - Initiate OAuth flow
- `GET /github/callback` - Handle OAuth callback
- `GET /github/status` - Check connection status
- `DELETE /github/disconnect` - Disconnect account

### New (Phase 06)
- `GET /github/repositories` - List user's repositories
- `GET /github/repositories/:owner/:repo` - Get single repo
- `GET /github/repositories/:owner/:repo/readme` - Get README
- `POST /github/import` - Import repos to resume
- `POST /github/generate-project-details` - AI generation

## Data Models

### GitHub Repository (from API)
```typescript
interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  topics: string[];
  updated_at: string;
  created_at: string;
  owner: { login: string; avatar_url: string };
}
```

### Resume Project (target format)
```typescript
interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  url?: string;
  roles?: string[];
  startDate: string;
  endDate: string | null;
  highlights?: string[];
  tags?: string[];
}
```

## Dependencies

### Completed
- ✅ GitHub OAuth integration (authentication)
- ✅ GitHubAPIClient (lib/github_api_client.py)
- ✅ GitHubConnection database model
- ✅ Zustand store patterns
- ✅ AI service integration

### In Progress
- ⏳ Phase 06-01: Repository API endpoints
- ⏳ Phase 06-02: Repository selector UI
- ⏳ Phase 06-03: Import integration
- ⏳ Phase 06-04: Testing & polish

## Success Criteria

### Functional
- [ ] User can connect GitHub account (already works)
- [ ] User can browse their GitHub repositories
- [ ] User can search/filter/sort repositories
- [ ] User can select multiple repositories
- [ ] User can customize project details before import
- [ ] User can auto-generate project descriptions from README
- [ ] Imported projects appear in resume
- [ ] User can edit imported projects after import

### Technical
- [ ] All API endpoints documented with OpenAPI
- [ ] Error handling for all failure cases
- [ ] Caching reduces API calls by > 50%
- [ ] Unit tests cover > 80% of new code
- [ ] E2E tests cover complete import flow
- [ ] Accessibility meets WCAG 2.1 AA
- [ ] Responsive design works on mobile/tablet

### Performance
- [ ] Repository list loads in < 2 seconds
- [ ] Search/filter responds in < 100ms
- [ ] Import completes in < 5 seconds for 5 repos
- [ ] No memory leaks on repeated use

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| GitHub API rate limiting | High | Implement caching, show retry options |
| OAuth token expiration | Medium | Handle gracefully with re-auth prompt |
| Large repo lists (100+) | Medium | Pagination, virtual scrolling |
| README parsing failures | Low | Fallback to manual entry |
| AI generation quality | Medium | Allow full manual override |

## Future Enhancements

- Import GitHub contribution graph as activity visualization
- Link to specific commits/PRs as proof of work
- Import GitHub Skills/badges
- Support for GitHub Enterprise instances
- Automatic project highlighting based on stars/activity
- Import from other platforms (GitLab, Bitbucket)

## Related Documentation

- [GitHub OAuth Endpoints](../../docs/GITHUB_OAUTH_ENDPOINTS.md)
- [GitHub OAuth Setup](../../docs/GITHUB_OAUTH_SETUP.md)
- [API Documentation](../../API_DOCUMENTATION.md)

---

**Phase Owner:** TBD
**Target Completion:** TBD
**Last Updated:** 2026-03-12
