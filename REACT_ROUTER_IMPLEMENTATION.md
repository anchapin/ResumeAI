# React Router Implementation Plan

This document outlines the implementation plan for Issue #481: Add URL-based routing (React Router).

## Overview

The current application uses React state (`useState<Route>`) for navigation. This PR will migrate to React Router (react-router-dom) to enable:

- Deep linking and bookmarkable URLs
- Browser back/forward button support
- URL reflection of current page
- Route-based code splitting awareness

## Completed

- ✅ Installed `react-router-dom` as a dependency
- ✅ Created feature branch `feature/issue-481-react-router`

## Implementation Steps

### Phase 1: Core Routing Setup

1. **Update App.tsx**
   - Wrap application with `BrowserRouter` (either in App.tsx or index.tsx)
   - Replace `useState<Route>` with `<Routes>` and `<Route>` components
   - Map Route enum values to URL paths:
     - `Route.LOGIN` → `/login`
     - `Route.REGISTER` → `/register`
     - `Route.DASHBOARD` → `/` or `/dashboard`
     - `Route.EDITOR` → `/editor/:resumeId?`
     - `Route.WORKSPACE` → `/workspace/:resumeId?`
     - `Route.APPLICATIONS` → `/applications`
     - `Route.SETTINGS` → `/settings`
     - `Route.BULK` → `/resumes`
     - `Route.SALARY_RESEARCH` → `/salary`
     - `Route.INTERVIEW_PRACTICE` → `/interview`

2. **Update Navigation Logic**
   - Replace `setCurrentRoute(Route.DASHBOARD)` with `navigate('/dashboard')`
   - Replace `onNavigate` prop with `useNavigate()` hook in components that need navigation

### Phase 2: Component Updates

#### Sidebar.tsx

- Replace `onNavigate` callback with `<NavLink>` components
- Use `to` prop for navigation paths
- Add active state styling using `isActive` prop or CSS classes

#### Editor.tsx

- Replace `onBack` callback with `useNavigate()` hook
- Add `useParams()` hook to get `resumeId` from URL
- Update to work without `onBack` prop

#### Workspace.tsx

- Replace `onNavigate` callback with `useNavigate()` hook
- Add `useParams()` hook to get `resumeId` from URL
- Update to work without `onNavigate` prop

#### Login.tsx & Register.tsx

- Replace `onNavigate` callback with `useNavigate()` hook
- Use `navigate('/dashboard')` after successful auth

#### Protected Routes

- Create `ProtectedRoute` wrapper component that:
  - Checks authentication status
  - Redirects to `/login` if not authenticated
  - Renders child component if authenticated

### Phase 3: Type Updates

#### types.ts

- Keep `Route` enum for now (can be repurposed for route constants)
- Add path constants:
  ```typescript
  export const ROUTE_PATHS = {
    LOGIN: '/login',
    REGISTER: '/register',
    DASHBOARD: '/dashboard',
    EDITOR: '/editor/:resumeId?',
    WORKSPACE: '/workspace/:resumeId?',
    APPLICATIONS: '/applications',
    SETTINGS: '/settings',
    BULK: '/resumes',
    SALARY_RESEARCH: '/salary',
    INTERVIEW_PRACTICE: '/interview',
  } as const;
  ```

### Phase 4: Test Updates

#### tests/App.test.tsx

- Update Sidebar mock to use `NavLink` or mock `react-router-dom`
- Mock `useNavigate` and `useParams` hooks
- Update navigation tests to work with URL routing
- Add tests for deep linking (navigating directly to a URL)

#### Other test files

- Update any tests that use `onNavigate` callbacks
- Mock `react-router-dom` where needed

### Phase 5: Additional Features (Optional)

1. **Route Transitions**
   - Add page transition animations using React Router's `<Outlet>` with animations

2. **Route Guards**
   - Create more sophisticated route guards for different permission levels

3. **404 Page**
   - Add catch-all route for 404 page

4. **Loading States**
   - Use React Router's `useNavigationType` to show loading states

## Files to Modify

### High Priority

- `index.tsx` or `main.tsx` - Add BrowserRouter wrapper
- `App.tsx` - Replace state routing with Routes/Route
- `components/Sidebar.tsx` - Use NavLink instead of onNavigate
- `pages/Editor.tsx` - Add useParams, remove onBack
- `pages/Workspace.tsx` - Add useParams, remove onNavigate

### Medium Priority

- `pages/Login.tsx` - Use useNavigate
- `pages/Register.tsx` - Use useNavigate
- `types.ts` - Add route path constants

### Low Priority

- All other test files - Update for new routing

## Migration Strategy

To ensure a smooth transition, we can:

1. **Incremental Migration**: Keep both navigation systems temporarily, gradually migrating components

2. **Feature Flag**: Use a feature flag to switch between old and new routing

3. **A/B Testing**: Deploy new routing behind a feature flag for testing

## Benefits

1. **Deep Linking**: Users can share links like `https://app.resumeai.com/editor/123`
2. **Browser History**: Back/forward buttons work as expected
3. **SEO Ready**: Server-side rendering becomes possible with Next.js or similar
4. **Better UX**: Users can bookmark and return to specific pages
5. **Analytics**: Track which pages users visit via URL

## Potential Issues & Solutions

### Issue: Resume ID in URL

**Solution**: Use optional route params (`:resumeId?`) for pages that can work without a resume ID

### Issue: Lazy Loading with Routes

**Solution**: Use React Router's `<Route>` with `<Suspense>` for lazy-loaded components

### Issue: Sidebar Active State

**Solution**: Use `NavLink` component's `isActive` prop for active state styling

### Issue: Authentication with URLs

**Solution**: Create `ProtectedRoute` wrapper that checks auth and redirects

## Timeline Estimate

- Phase 1: Core Routing Setup - 2-3 hours
- Phase 2: Component Updates - 4-6 hours
- Phase 3: Type Updates - 1 hour
- Phase 4: Test Updates - 2-3 hours
- Phase 5: Additional Features - Optional, 2-4 hours each

**Total**: 9-14 hours for core implementation

## Next Steps

1. Review and approve this implementation plan
2. Begin Phase 1: Core Routing Setup
3. Test basic navigation with BrowserRouter
4. Proceed to Phase 2: Component Updates
5. Update tests as we go
6. Add documentation for new routing system
