#!/bin/bash
# set -e  # Removed temporarily for debugging

# ============================================================================
# GitHub Issue Generator for Codebase Review Findings
# Creates 1 master tracking issue + 50 sub-issues + 3 milestones
# ============================================================================

# Configuration
REPO_OWNER="anchapin"
REPO_NAME="ResumeAI"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ISSUES_LOG="$SCRIPT_DIR/issues_created.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Progress tracking
TOTAL_ISSUES=51
CREATED_COUNT=0
FAILED_COUNT=0
ISSUE_NUMBERS=()

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

setup_logging() {
    echo "Issue Creation Log - $(date)" > "$ISSUES_LOG"
    echo "=================================" >> "$ISSUES_LOG"
}

log_info() {
    echo -e "${BLUE}ℹ${NC} $*" | tee -a "$ISSUES_LOG"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*" | tee -a "$ISSUES_LOG"
}

log_error() {
    echo -e "${RED}✗${NC} $*" | tee -a "$ISSUES_LOG"
}

show_progress() {
    echo -ne "${BLUE}Progress:${NC} $CREATED_COUNT/$TOTAL_ISSUES created..."
}

validate_prereqs() {
    log_info "Validating prerequisites..."

    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) not installed"
        return 1
    fi

    if ! gh auth status &> /dev/null; then
        log_error "Not authenticated with GitHub CLI. Run: gh auth login"
        return 1
    fi

    log_success "Prerequisites validated"
}

# ============================================================================
# LABEL MANAGEMENT
# ============================================================================

declare -A REQUIRED_LABELS=(
    ["critical"]="d876e3"
    ["major"]="d93f0b"
    ["high"]="0e8a16"
    ["medium"]="fbca04"
    ["low"]="0e8a16"
    ["bug"]="d73a4a"
    ["enhancement"]="a2eeef"
    ["feature"]="a2eeef"
    ["frontend"]="d73a4a"
    ["backend"]="5319e7"
    ["api"]="0075ca"
    ["infrastructure"]="1d76db"
    ["security"]="ee0701"
    ["testing"]="fbca04"
    ["good first issue"]="7057ff"
    ["meta"]="a2eeef"
    ["documentation"]="0075ca"
)

ensure_labels() {
    log_info "Ensuring all labels exist..."

    for label_name in "${!REQUIRED_LABELS[@]}"; do
        color="${REQUIRED_LABELS[$label_name]}"
        gh label list --json name,color | /tmp/jq -e ".[] | select(.name==\"$label_name\")" > /dev/null 2>&1 || \
        gh label create "$label_name" --color "$color" --description "$label_name" 2>/dev/null || true
    done

    log_success "Labels validated"
}

# ============================================================================
# MILESTONE MANAGEMENT
# ============================================================================

CRITICAL_MILESTONE_NAME=""
HIGH_MILESTONE_NAME=""
MEDIUM_MILESTONE_NAME=""

create_milestones() {
    log_info "Getting or creating milestones..."

    # Try to get existing milestones first
    local existing_milestones=$(gh api /repos/$REPO_OWNER/$REPO_NAME/milestones -q '.[] | {title: .title}')

    # Find milestone titles or create new ones
    CRITICAL_MILESTONE_NAME=$(echo "$existing_milestones" | /tmp/jq -r 'select(.title=="Critical Issues - Phase 1") | .title // empty')

    if [[ -z "$CRITICAL_MILESTONE_NAME" || "$CRITICAL_MILESTONE_NAME" == "" ]]; then
        CRITICAL_MILESTONE_NAME=$(gh api \
            --method POST \
            -H "Accept: application/vnd.github.v3+json" \
            /repos/$REPO_OWNER/$REPO_NAME/milestones \
            -f title="Critical Issues - Phase 1" \
            -f description="4 critical issues that must be fixed immediately" \
            -f due_on="2026-03-27T00:00:00Z" \
            -q '.title // empty' 2>/dev/null || echo '')
    fi

    HIGH_MILESTONE_NAME=$(echo "$existing_milestones" | /tmp/jq -r 'select(.title=="High Priority - Phase 2") | .title // empty')

    if [[ -z "$HIGH_MILESTONE_NAME" || "$HIGH_MILESTONE_NAME" == "" ]]; then
        HIGH_MILESTONE_NAME=$(gh api \
            --method POST \
            -H "Accept: application/vnd.github.v3+json" \
            /repos/$REPO_OWNER/$REPO_NAME/milestones \
            -f title="High Priority - Phase 2" \
            -f description="18 major and high priority issues" \
            -f due_on="2026-04-27T00:00:00Z" \
            -q '.title // empty' 2>/dev/null || echo '')
    fi

    MEDIUM_MILESTONE_NAME=$(echo "$existing_milestones" | /tmp/jq -r 'select(.title=="Medium Priority - Phase 3") | .title // empty')

    if [[ -z "$MEDIUM_MILESTONE_NAME" || "$MEDIUM_MILESTONE_NAME" == "" ]]; then
        MEDIUM_MILESTONE_NAME=$(gh api \
            --method POST \
            -H "Accept: application/vnd.github.v3+json" \
            /repos/$REPO_OWNER/$REPO_NAME/milestones \
            -f title="Medium Priority - Phase 3" \
            -f description="21 medium and low priority issues" \
            -f due_on="2026-05-27T00:00:00Z" \
            -q '.title // empty' 2>/dev/null || echo '')
    fi

    log_success "Milestones configured: Critical($CRITICAL_MILESTONE_NAME), High($HIGH_MILESTONE_NAME), Medium($MEDIUM_MILESTONE_NAME)"
}

# ============================================================================
# ISSUE CREATION
# ============================================================================

MASTER_ISSUE_NUM=""

create_master_issue() {
    log_info "Creating master tracking issue..."

    local master_body="## Overview

This issue tracks implementation of 50 improvements identified in comprehensive codebase review conducted on $(date +%Y-%m-%d).

## Status Dashboard

- **Total Issues:** 50
- **Completed:** 0 / 50 (0%)
- **In Progress:** 0 / 50 (0%)

## Progress by Phase

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 1: Critical Issues (4) | ⏳ Not Started | 0/4 |
| Phase 2: Security Issues (6) | ⏳ Not Started | 0/6 |
| Phase 3: Architecture (8) | ⏳ Not Started | 0/8 |
| Phase 4: Performance (4) | ⏳ Not Started | 0/4 |
| Phase 5: Testing (6) | ⏳ Not Started | 0/6 |
| Phase 6: UX/UI (4) | ⏳ Not Started | 0/4 |
| Phase 7: DevOps (4) | ⏳ Not Started | 0/4 |
| Phase 8: Maintainability (5) | ⏳ Not Started | 0/5 |
| Phase 9: Dependencies (4) | ⏳ Not Started | 0/4 |
| Phase 10: SaaS Standards (6) | ⏳ Not Started | 0/6 |

## Issue Checklist

See linked issues below for all 50 items.

## Success Criteria

This meta-issue is complete when:
- [ ] All Critical issues are completed
- [ ] All Security issues are completed
- [ ] Test coverage reaches 80%
- [ ] TypeScript strict mode enabled
- [ ] Core SaaS features implemented"

    # Create temporary file for body
    local body_file=$(mktemp)
    echo "$master_body" > "$body_file"

    local result=$(gh issue create \
        --title "[Meta] Codebase Review - 50 Issues Tracking & Implementation" \
        --body-file "$body_file" \
        --label meta,enhancement,documentation \
        2>/dev/null || echo '')

    rm -f "$body_file"

    # Extract issue number from URL
    MASTER_ISSUE_NUM=$(echo "$result" | grep -o "/issues/[0-9]*" | grep -o "[0-9]*" || echo '')

    if [[ -z "$MASTER_ISSUE_NUM" || "$MASTER_ISSUE_NUM" == "" ]]; then
        log_error "Failed to create master issue"
        return 1
    fi

    ISSUE_NUMBERS+=("$MASTER_ISSUE_NUM")
    ((CREATED_COUNT++))
    show_progress

    log_success "Master issue created: #$MASTER_ISSUE_NUM"
    echo "MASTER_ISSUE_NUM=$MASTER_ISSUE_NUM" >> "$ISSUES_LOG"
}

create_sub_issue() {
    local title="$1"
    local description="$2"
    local labels="$3"
    local milestone_name="$4"

    # Create temporary file for body
    local body_file=$(mktemp)
    echo "$description" > "$body_file"

    # Build label array for proper quoting
    local label_array=()
    IFS=',' read -ra LABEL_ARR <<< "$labels"
    for label in "${LABEL_ARR[@]}"; do
        label_array+=("--label" "$label")
    done

    # Create issue using gh issue create with proper array expansion
    local result=""
    if [[ -n "$milestone_name" && "$milestone_name" != "" ]]; then
        result=$(gh issue create \
            --title "$title" \
            --body-file "$body_file" \
            "${label_array[@]}" \
            --milestone "$milestone_name" \
            2>&1)
    else
        result=$(gh issue create \
            --title "$title" \
            --body-file "$body_file" \
            "${label_array[@]}" \
            2>&1)
    fi

    rm -f "$body_file"

    # Extract issue number from URL
    local issue_num=$(echo "$result" | grep -o "/issues/[0-9]*" | grep -o "[0-9]*" || echo '')

    if [[ -z "$issue_num" || "$issue_num" == "" ]]; then
        ((FAILED_COUNT++))
        log_error "Failed to create: $title"
        log_error "Result was: $result"
        return 1
    fi

    # Link to master issue
    gh issue comment "$MASTER_ISSUE_NUM" \
        --body "Related issue: #$issue_num" 2>/dev/null || true

    ISSUE_NUMBERS+=("$issue_num")
    ((CREATED_COUNT++))
    show_progress

    # Small delay to avoid rate limiting
    sleep 1

    log_success "Issue #$issue_num - $title"
    echo "$issue_num|$title|$labels" >> "$ISSUES_LOG"
}

# ============================================================================
# ISSUE DEFINITIONS
# ============================================================================

create_critical_issues() {
    log_info "Creating Critical Issues (4)..."

    # P0-Critical-1
    create_sub_issue \
        "[P0-Critical-1] Fix Syntax Errors in TypeScript Hooks" \
        "## Problem
Missing parentheses in conditional statements in \`hooks/useTheme.ts:14-27\` and \`hooks/useGlobalErrors.ts:21\`.

## Impact
- Code will not compile/execute
- Application completely broken

## Tasks
- [ ] Fix \`useTheme.ts\` lines 14, 18, 23, 46
- [ ] Fix \`useGlobalErrors.ts\` line 21
- [ ] Run \`npm run type-check\` to verify fixes
- [ ] Test theme switching functionality
- [ ] Test error boundary functionality" \
        "critical,bug,frontend,good first issue" \
        "$CRITICAL_MILESTONE_NAME"

    # P0-Critical-2
    create_sub_issue \
        "[P0-Critical-2] Fix JWT Secret Auto-Generation Issue" \
        "## Problem
JWT secret auto-generates on every server restart in \`resume-api/config/__init__.py:52\`.

## Impact
- All users logged out on server restart
- Authentication tokens become invalid

## Tasks
- [ ] Require \`JWT_SECRET\` from environment variable
- [ ] Fail fast if SECRET missing in production
- [ ] Document in \`.env.example\`
- [ ] Test token persistence across restarts" \
        "critical,bug,backend,security" \
        "$CRITICAL_MILESTONE_NAME"

    # P1-Critical-3
    create_sub_issue \
        "[P1-Critical-3] Resolve Circular Database Dependency" \
        "## Problem
Using \`use_alter=True\` with circular FK in \`resume-api/database.py:67-72\`.

## Impact
- Database migrations may fail
- Potential data integrity issues

## Tasks
- [ ] Refactor Resume and ResumeVersion relationship
- [ ] Create proper Alembic migration
- [ ] Test migration on clean database
- [ ] Update documentation" \
        "major,bug,backend" \
        "$CRITICAL_MILESTONE_NAME"

    # P1-Critical-4
    create_sub_issue \
        "[P1-Critical-4] Fix Duplicate Property Names in Types" \
        "## Problem
\`types.ts:443-513\` has both camelCase and snake_case properties in interfaces.

## Impact
- TypeScript confusion
- Potential runtime errors
- API contract mismatches

## Tasks
- [ ] Audit all types in \`types.ts\`
- [ ] Remove snake_case properties
- [ ] Update any usages
- [ ] Run \`npm run type-check\`" \
        "major,bug,frontend,good first issue" \
        "$CRITICAL_MILESTONE_NAME"
}

create_security_issues() {
    log_info "Creating Security Issues (6)..."

    # S1-Security-1
    create_sub_issue \
        "[S1-Security-1] Implement httpOnly Cookies for Auth" \
        "## Problem
Tokens stored in localStorage are vulnerable to XSS attacks.

## Impact
- Session hijacking risk
- Account compromise vulnerability

## Tasks
- [ ] Backend: Set httpOnly cookie in auth endpoints
- [ ] Frontend: Remove localStorage token storage
- [ ] Update API client to read from cookies
- [ ] Add CSRF token validation
- [ ] Test authentication flow end-to-end" \
        "major,security,frontend,backend" \
        "$HIGH_MILESTONE_NAME"

    # S1-Security-2
    create_sub_issue \
        "[S1-Security-2] Add CSRF Protection" \
        "## Problem
No CSRF token validation on state-changing requests.

## Impact
- Cross-site request forgery vulnerability

## Tasks
- [ ] Create CSRF middleware for FastAPI
- [ ] Add CSRF token to login forms
- [ ] Validate token on state-changing endpoints
- [ ] Test CSRF protection" \
        "major,security,backend,api" \
        "$HIGH_MILESTONE_NAME"

    # S1-Security-3
    create_sub_issue \
        "[S1-Security-3] Upgrade XSS Sanitization" \
        "## Problem
Basic regex-based sanitization in \`utils/security.ts:190-207\` is insufficient.

## Impact
- XSS vulnerabilities persist
- Security compliance risk

## Tasks
- [ ] Install dompurify package
- [ ] Replace sanitization logic with DOMPurify
- [ ] Update all user input points
- [ ] Test with XSS payloads
- [ ] Run security audit" \
        "high,security,frontend,good first issue" \
        "$HIGH_MILESTONE_NAME"

    # S1-Security-4
    create_sub_issue \
        "[S1-Security-4] Strengthen Password Validation" \
        "## Problem
Password validation only uses length constraints (8-100 chars) in \`resume-api/routes/auth.py\`.

## Impact
- Weak passwords allowed
- Brute force vulnerability

## Tasks
- [ ] Create password validator function
- [ ] Add to UserCreate model
- [ ] Display requirements in UI
- [ ] Add strength meter
- [ ] Test validation" \
        "high,security,backend" \
        "$HIGH_MILESTONE_NAME"

    # S1-Security-5
    create_sub_issue \
        "[S1-Security-5] Implement Request Signing" \
        "## Problem
Sensitive operations (auth, payments) lack request integrity verification.

## Impact
- Request tampering vulnerability
- Man-in-the-middle attacks

## Tasks
- [ ] Implement HMAC signing middleware
- [ ] Add timestamp validation
- [ ] Implement nonce checking
- [ ] Update client to sign requests
- [ ] Document API signing" \
        "medium,security,api,backend" \
        "$HIGH_MILESTONE_NAME"

    # S1-Security-6
    create_sub_issue \
        "[S1-Security-6] Fix WebSocket Authentication" \
        "## Problem
WebSocket endpoint lacks proper authentication timeout and reconnection handling.

## Impact
- Unauthorized WebSocket connections possible
- No connection health monitoring

## Tasks
- [ ] Add JWT validation to WebSocket
- [ ] Implement heartbeat mechanism
- [ ] Add connection timeout (30s inactivity)
- [ ] Rate limit connection attempts
- [ ] Test WebSocket security" \
        "medium,security,backend,api" \
        "$HIGH_MILESTONE_NAME"
}

create_architecture_issues() {
    log_info "Creating Architecture Issues (8)..."

    # A3-Arch-1
    create_sub_issue \
        "[A3-Arch-1] Split Monolithic Editor Component" \
        "## Problem
Editor component is 1261 lines, violates Single Responsibility Principle.

## Impact
- Hard to maintain
- Difficult to test
- Performance issues

## Tasks
- [ ] Create \`components/editor/\` directory
- [ ] Extract ContactInfo, Experience, Skills, Education, Projects sections
- [ ] Extract Header, Tabs, Actions components
- [ ] Update imports in Editor.tsx
- [ ] Test all editor functionality" \
        "major,enhancement,frontend,good first issue" \
        "$HIGH_MILESTONE_NAME"

    # A3-Arch-2
    create_sub_issue \
        "[A3-Arch-2] Implement React Router" \
        "## Problem
Manual state-based routing in \`App.tsx:121-437\` instead of proper URL-based routing.

## Impact
- Poor user experience (no back button)
- No bookmarkable URLs
- No deep linking

## Tasks
- [ ] Create route configuration
- [ ] Replace useState navigation with useNavigate
- [ ] Update all navigation calls
- [ ] Add 404 page
- [ ] Test all routes and navigation" \
        "major,enhancement,frontend" \
        "$HIGH_MILESTONE_NAME"

    # A3-Arch-3
    create_sub_issue \
        "[A3-Arch-3] Add State Management Solution" \
        "## Problem
Only React local state + localStorage, no centralized state management.

## Impact
- Prop drilling issues
- Inconsistent data across components
- Hard to scale

## Tasks
- [ ] Install zustand package
- [ ] Define global state interface
- [ ] Create store with actions
- [ ] Migrate auth, resume data, theme state
- [ ] Remove prop drilling
- [ ] Test state updates" \
        "high,enhancement,frontend" \
        "$HIGH_MILESTONE_NAME"

    # A3-Arch-4
    create_sub_issue \
        "[A3-Arch-4] Standardize API Versioning" \
        "## Problem
Inconsistent API paths: \`/v1/render/pdf\`, \`/auth/login\`, \`/api/linkedin/profile\`.

## Impact
- Confusing for API consumers
- Hard to version properly

## Tasks
- [ ] Define versioning strategy
- [ ] Update all backend route prefixes to \`/api/v1/\`
- [ ] Update frontend API client
- [ ] Add version deprecation policy
- [ ] Update OpenAPI docs" \
        "high,enhancement,api,backend" \
        "$HIGH_MILESTONE_NAME"

    # A3-Arch-5
    create_sub_issue \
        "[A3-Arch-5] Add Service Worker for Offline Support" \
        "## Problem
No offline capability, app breaks on network issues.

## Impact
- Poor UX on slow connections
- Data loss risk

## Tasks
- [ ] Create service worker
- [ ] Cache static assets
- [ ] Cache API responses
- [ ] Implement background sync
- [ ] Add offline UI indicator
- [ ] Test offline functionality" \
        "medium,enhancement,frontend" \
        "$HIGH_MILESTONE_NAME"

    # A3-Arch-6
    create_sub_issue \
        "[A3-Arch-6] Implement Proper Caching Strategy" \
        "## Problem
No caching strategy for frequently accessed data.

## Impact
- Poor performance
- Unnecessary API calls

## Tasks
- [ ] Add cache headers to responses
- [ ] Implement Redis caching for hot data
- [ ] Cache variants list and user settings
- [ ] Add cache invalidation
- [ ] Monitor cache hit rate" \
        "medium,enhancement,api,backend" \
        "$HIGH_MILESTONE_NAME"

    # A3-Arch-7
    create_sub_issue \
        "[A3-Arch-7] Create Reusable Component Library" \
        "## Problem
Repeated UI patterns not abstracted (buttons, inputs, cards, etc.).

## Impact
- Code duplication
- Inconsistency
- Maintenance burden

## Tasks
- [ ] Create \`components/ui/\` directory
- [ ] Create base Button, Input, Card, Dialog, Select components
- [ ] Create Storybook or documentation
- [ ] Migrate existing usage" \
        "medium,enhancement,frontend,good first issue" \
        "$HIGH_MILESTONE_NAME"

    # A3-Arch-8
    create_sub_issue \
        "[A3-Arch-8] Implement Feature Flags System" \
        "## Problem
No feature flag system for gradual rollouts.

## Impact
- Risky deployments
- No A/B testing capability

## Tasks
- [ ] Create feature flag model
- [ ] Implement flag evaluation
- [ ] Add flag management API
- [ ] Create frontend hook for flags
- [ ] Document flag usage
- [ ] Test flag system" \
        "low,enhancement,backend,frontend" \
        "$MEDIUM_MILESTONE_NAME"
}

create_performance_issues() {
    log_info "Creating Performance Issues (4)..."

    # P4-Perf-1
    create_sub_issue \
        "[P4-Perf-1] Fix API Client Inefficient Fetching" \
        "## Problem
Variants fetched on every Editor mount with no caching in \`utils/api-client.ts:122-133\`.

## Impact
- Unnecessary API calls
- Slower page loads

## Tasks
- [ ] Implement in-memory cache for variants
- [ ] Add cache invalidation
- [ ] Consider React Query for server state
- [ ] Test caching behavior" \
        "high,bug,frontend,api" \
        "$HIGH_MILESTONE_NAME"

    # P4-Perf-2
    create_sub_issue \
        "[P4-Perf-2] Fix Memoization Issues" \
        "## Problem
Callback dependencies cause unnecessary re-renders in \`pages/Editor.tsx:346-455\`.

## Impact
- Performance issues
- Stale closures

## Tasks
- [ ] Audit all useCallback in Editor.tsx
- [ ] Fix dependency arrays
- [ ] Use functional updates where appropriate
- [ ] Test component behavior
- [ ] Profile performance improvement" \
        "high,enhancement,frontend" \
        "$HIGH_MILESTONE_NAME"

    # P4-Perf-3
    create_sub_issue \
        "[P4-Perf-3] Implement Real Compression" \
        "## Problem
Base64 encoding increases data size by 33% in \`src/lib/storage.ts:14-22\`.

## Impact
- Worse \"compression\"
- Faster quota exhaustion

## Tasks
- [ ] Install lz-string package
- [ ] Replace base64 with LZString
- [ ] Test compression ratio
- [ ] Benchmark performance
- [ ] Update documentation" \
        "medium,bug,frontend,good first issue" \
        "$MEDIUM_MILESTONE_NAME"

    # P4-Perf-4
    create_sub_issue \
        "[P4-Perf-4] Add Loading States" \
        "## Problem
Many API operations lack loading indicators.

## Impact
- Poor UX
- Unclear if action in progress

## Tasks
- [ ] Create loading state context/hook
- [ ] Add loading states for all API calls
- [ ] Display loading indicators in UI
- [ ] Add skeleton screens
- [ ] Test loading states" \
        "medium,enhancement,frontend,good first issue" \
        "$MEDIUM_MILESTONE_NAME"
}

create_testing_issues() {
    log_info "Creating Testing Issues (6)..."

    # T5-Test-1
    create_sub_issue \
        "[T5-Test-1] Increase Test Coverage to 80%" \
        "## Problem
Current coverage threshold is only 60%, insufficient for production SaaS.

## Impact
- Undetected bugs
- Refactoring risk

## Tasks
- [ ] Audit coverage gaps
- [ ] Write tests for untested code
- [ ] Update pytest.ini threshold to 80
- [ ] Update vitest config threshold to 80
- [ ] Ensure CI enforces new threshold" \
        "high,testing,frontend,backend" \
        "$HIGH_MILESTONE_NAME"

    # T5-Test-2
    create_sub_issue \
        "[T5-Test-2] Add E2E Tests with Playwright" \
        "## Problem
No end-to-end tests, only unit tests exist.

## Impact
- Integration issues undetected
- User flows untested

## Tasks
- [ ] Install Playwright
- [ ] Create E2E test structure
- [ ] Write critical user flow tests (registration, create resume, generate PDF)
- [ ] Set up CI for E2E tests
- [ ] Configure test reporting" \
        "high,testing,frontend,good first issue" \
        "$HIGH_MILESTONE_NAME"

    # T5-Test-3
    create_sub_issue \
        "[T5-Test-3] Add Visual Regression Tests" \
        "## Problem
No visual regression testing, UI bugs go undetected.

## Impact
- Accidental style changes
- Responsive design breaks

## Tasks
- [ ] Choose visual regression tool (Percy/Chromatic)
- [ ] Configure screenshot capture
- [ ] Set up comparison workflow
- [ ] Add to CI/CD
- [ ] Document review process" \
        "medium,testing,frontend" \
        "$MEDIUM_MILESTONE_NAME"

    # T5-Test-4
    create_sub_issue \
        "[T5-Test-4] Complete Accessibility Testing" \
        "## Problem
Accessibility tests exist but implementation incomplete.

## Impact
- Non-compliant with WCAG
- Excludes disabled users

## Tasks
- [ ] Run axe scan on all pages
- [ ] Fix critical violations
- [ ] Add missing ARIA labels
- [ ] Implement proper focus management
- [ ] Test with screen readers" \
        "medium,testing,frontend,good first issue" \
        "$MEDIUM_MILESTONE_NAME"

    # T5-Test-5
    create_sub_issue \
        "[T5-Test-5] Add Integration Tests for Frontend" \
        "## Problem
Only unit tests, no integration tests.

## Impact
- API integration issues undetected
- Component interaction issues

## Tasks
- [ ] Set up MSW or test API
- [ ] Write integration tests for auth flow
- [ ] Write integration tests for editor
- [ ] Write integration tests for API client
- [ ] Add to CI" \
        "medium,testing,frontend" \
        "$MEDIUM_MILESTONE_NAME"

    # T5-Test-6
    create_sub_issue \
        "[T5-Test-6] Add Error Handling Tests" \
        "## Problem
Error paths not tested (network failures, quota exceeded, token expiration, etc.).

## Impact
- Error handling broken
- Poor UX on errors

## Tasks
- [ ] List all error scenarios
- [ ] Write tests for each scenario
- [ ] Test error display
- [ ] Test recovery flows
- [ ] Add error injection tests" \
        "medium,testing,frontend,backend" \
        "$MEDIUM_MILESTONE_NAME"
}

create_ux_issues() {
    log_info "Creating UX/UI Issues (4)..."

    # U6-UX-1
    create_sub_issue \
        "[U6-UX-1] Add Skeleton Loading Screens" \
        "## Problem
Simple spinner is the only loading state.

## Impact
- Poor UX perception
- Content shift on load

## Tasks
- [ ] Create Skeleton component
- [ ] Design skeleton layouts for each page
- [ ] Replace spinners with skeletons
- [ ] Add shimmer animation
- [ ] Test loading states" \
        "high,enhancement,frontend,good first issue" \
        "$HIGH_MILESTONE_NAME"

    # U6-UX-2
    create_sub_issue \
        "[U6-UX-2] Implement Undo/Redo" \
        "## Problem
No undo/redo functionality despite version history.

## Impact
- Poor user experience
- Can't easily revert changes

## Tasks
- [ ] Design undo/redo data structure
- [ ] Implement history tracking
- [ ] Add undo functionality
- [ ] Add redo functionality
- [ ] Add keyboard shortcuts (Ctrl+Z/Ctrl+Y)
- [ ] Add UI controls
- [ ] Add max history limit" \
        "high,enhancement,frontend,good first issue" \
        "$HIGH_MILESTONE_NAME"

    # U6-UX-3
    create_sub_issue \
        "[U6-UX-3] Improve Modal Accessibility" \
        "## Problem
Modals lack proper focus management and keyboard navigation.

## Impact
- Poor accessibility
- Keyboard users can't close
- Screen reader issues

## Tasks
- [ ] Create accessible Dialog component
- [ ] Implement focus trap
- [ ] Add keyboard navigation
- [ ] Add ARIA attributes
- [ ] Test with keyboard and screen reader" \
        "medium,enhancement,frontend,good first issue" \
        "$MEDIUM_MILESTONE_NAME"

    # U6-UX-4
    create_sub_issue \
        "[U6-UX-4] Enhance Error Display" \
        "## Problem
Error messages are basic, not user-friendly or actionable.

## Impact
- User frustration
- Support burden

## Tasks
- [ ] Create error message mapping
- [ ] Design error display component
- [ ] Add action buttons to errors
- [ ] Add error context display
- [ ] Test error scenarios" \
        "medium,enhancement,frontend" \
        "$MEDIUM_MILESTONE_NAME"
}

create_devops_issues() {
    log_info "Creating DevOps Issues (4)..."

    # D7-DevOps-1
    create_sub_issue \
        "[D7-DevOps-1] Optimize Docker Configuration" \
        "## Problem
Docker build not optimized (single stage, no caching, running as root).

## Impact
- Slow builds
- Large image size
- Security issues

## Tasks
- [ ] Create multi-stage Dockerfile
- [ ] Optimize layer caching
- [ ] Add non-root user
- [ ] Add healthcheck
- [ ] Minimize image size" \
        "high,enhancement,infrastructure,docker" \
        "$HIGH_MILESTONE_NAME"

    # D7-DevOps-2
    create_sub_issue \
        "[D7-DevOps-2] Split Environment Configuration" \
        "## Problem
Single file mixes frontend and backend env vars in \`.env.example\`.

## Impact
- Confusing for developers
- Risk of misconfiguration

## Tasks
- [ ] Create \`.env.frontend.example\`
- [ ] Create \`.env.backend.example\`
- [ ] Create \`.env.docker.example\`
- [ ] Update documentation
- [ ] Update README" \
        "medium,enhancement,infrastructure,documentation" \
        "$MEDIUM_MILESTONE_NAME"

    # D7-DevOps-3
    create_sub_issue \
        "[D7-DevOps-3] Add Dependency Scanning to CI/CD" \
        "## Problem
No automated security scanning of dependencies.

## Impact
- Vulnerabilities undetected
- Security risk

## Tasks
- [ ] Add Snyk or Dependabot
- [ ] Add npm audit step
- [ ] Add pip-audit step
- [ ] Configure failure on vulnerabilities
- [ ] Set up alerts" \
        "high,enhancement,infrastructure,security" \
        "$HIGH_MILESTONE_NAME"

    # D7-DevOps-4
    create_sub_issue \
        "[D7-DevOps-4] Create Kubernetes/Helm Charts" \
        "## Problem
No production deployment manifests.

## Impact
- Manual deployment
- Not scalable

## Tasks
- [ ] Create Helm chart structure
- [ ] Define deployment templates
- [ ] Configure service exposure
- [ ] Add secrets management
- [ ] Create development and production values
- [ ] Test deployment" \
        "low,enhancement,infrastructure" \
        "$MEDIUM_MILESTONE_NAME"
}

create_maintainability_issues() {
    log_info "Creating Maintainability Issues (5)..."

    # M8-Maint-1
    create_sub_issue \
        "[M8-Maint-1] Standardize File Naming" \
        "## Problem
Inconsistent naming: kebab-case (\`use-auth.ts\`), PascalCase (\`Editor.tsx\`), camelCase (\`useGlobalErrors.ts\`).

## Impact
- Confusing for developers
- Poor discoverability

## Tasks
- [ ] Document naming conventions
- [ ] Rename files to match conventions
- [ ] Update all imports
- [ ] Update documentation
- [ ] Enforce with ESLint rules" \
        "medium,enhancement,documentation,good first issue" \
        "$MEDIUM_MILESTONE_NAME"

    # M8-Maint-2
    create_sub_issue \
        "[M8-Maint-2] Add Comprehensive JSDoc" \
        "## Problem
Most functions lack JSDoc/docstrings.

## Impact
- Hard to understand code
- Poor IDE support

## Tasks
- [ ] Audit undocumented functions
- [ ] Add JSDoc to utility functions
- [ ] Add docstrings to Python functions
- [ ] Add parameter descriptions
- [ ] Add examples
- [ ] Enforce with linting" \
        "medium,enhancement,documentation,frontend,backend" \
        "$MEDIUM_MILESTONE_NAME"

    # M8-Maint-3
    create_sub_issue \
        "[M8-Maint-3] Implement Route-Based Code Splitting" \
        "## Problem
Only vendor-based splitting, no route-based splitting in \`vite.config.ts:54-67\`.

## Impact
- Large initial bundle
- Slow first load

## Tasks
- [ ] Audit bundle size
- [ ] Identify large routes
- [ ] Implement lazy loading
- [ ] Add loading fallbacks
- [ ] Measure improvement" \
        "medium,enhancement,frontend" \
        "$MEDIUM_MILESTONE_NAME"

    # M8-Maint-4
    create_sub_issue \
        "[M8-Maint-4] Externalize Mock Data" \
        "## Problem
Huge mock data hardcoded in \`pages/Editor.tsx:44-115\`.

## Impact
- Large file size
- Hard to maintain

## Tasks
- [ ] Create \`__mocks__/\` directory
- [ ] Extract resume, user, API response mocks
- [ ] Update imports
- [ ] Add Jest/Vitest mocking support" \
        "low,enhancement,frontend,good first issue" \
        "$MEDIUM_MILESTONE_NAME"

    # M8-Maint-5
    create_sub_issue \
        "[M8-Maint-5] Add TypeScript Strict Mode" \
        "## Problem
No strict mode enabled in \`tsconfig.json\`.

## Impact
- Runtime errors
- Poor type safety
- Hidden bugs

## Tasks
- [ ] Update tsconfig.json with strict: true
- [ ] Fix all strict mode errors
- [ ] Update tests
- [ ] Run type checking
- [ ] Document migration" \
        "high,enhancement,frontend" \
        "$HIGH_MILESTONE_NAME"
}

create_dependency_issues() {
    log_info "Creating Dependency Issues (4)..."

    # D9-Dep-1
    create_sub_issue \
        "[D9-Dep-1] Update Outdated Packages" \
        "## Problem
Several packages are outdated with known vulnerabilities in \`package.json\` and \`requirements.txt\`.

## Impact
- Security vulnerabilities
- Missing features
- Performance issues

## Tasks
- [ ] Run \`npm outdated\`
- [ ] Run \`pip list --outdated\`
- [ ] Update frontend and backend dependencies
- [ ] Test compatibility
- [ ] Update changelog
- [ ] Set up Dependabot" \
        "high,bug,frontend,backend" \
        "$HIGH_MILESTONE_NAME"

    # D9-Dep-2
    create_sub_issue \
        "[D9-Dep-2] Fix ESLint Configuration Error" \
        "## Problem
Invalid rule name \`'preserve-caught-error': 'off'\` in \`eslint.config.js:59\`.

## Impact
- Linting not working properly

## Tasks
- [ ] Remove invalid rule
- [ ] Run \`npm run lint\`
- [ ] Fix any remaining lint errors
- [ ] Test CI linting" \
        "high,bug,frontend,good first issue" \
        "$HIGH_MILESTONE_NAME"

    # D9-Dep-3
    create_sub_issue \
        "[D9-Dep-3] Fix Missing Cascade Deletes" \
        "## Problem
Some relationships missing cascade deletes in \`resume-api/database.py\`.

## Impact
- Orphaned records
- Data inconsistency

## Tasks
- [ ] Audit all relationships
- [ ] Add missing cascade deletes
- [ ] Test delete behavior
- [ ] Create migration" \
        "medium,bug,backend" \
        "$MEDIUM_MILESTONE_NAME"

    # D9-Dep-4
    create_sub_issue \
        "[D9-Dep-4] Audit Third-Party Libraries" \
        "## Problem
No audit of third-party library usage.

## Impact
- Unused dependencies
- License issues

## Tasks
- [ ] List all dependencies
- [ ] Identify unused packages
- [ ] Check license compliance
- [ ] Find maintenance status
- [ ] Remove/replace problematic packages" \
        "low,enhancement,frontend,backend" \
        "$MEDIUM_MILESTONE_NAME"
}

create_saas_issues() {
    log_info "Creating SaaS Standards Issues (6)..."

    # S10-SaaS-1
    create_sub_issue \
        "[S10-SaaS-1] Build Subscription/Billing UI" \
        "## Problem
Backend has billing models but no frontend UI.

## Impact
- Users can't manage subscriptions
- Can't upgrade plans
- Can't view invoices

## Tasks
- [ ] Design billing UI
- [ ] Create plans selection page
- [ ] Create payment methods page
- [ ] Create invoices page
- [ ] Integrate with backend API
- [ ] Test billing flow" \
        "major,feature,frontend" \
        "$MEDIUM_MILESTONE_NAME"

    # S10-SaaS-2
    create_sub_issue \
        "[S10-SaaS-2] Implement Team Collaboration UI" \
        "## Problem
Database supports teams but frontend has stub implementations.

## Impact
- Team features unusable
- Can't collaborate

## Tasks
- [ ] Design team UI
- [ ] Create teams list and detail pages
- [ ] Create invite members flow
- [ ] Implement member management
- [ ] Implement activity feed
- [ ] Test collaboration" \
        "major,feature,frontend" \
        "$MEDIUM_MILESTONE_NAME"

    # S10-SaaS-3
    create_sub_issue \
        "[S10-SaaS-3] Add Email Verification Flow" \
        "## Problem
Auth system has \`is_verified\` field but no verification flow.

## Impact
- Unverified emails allowed
- Fake accounts

## Tasks
- [ ] Create email templates
- [ ] Add verification endpoint to backend
- [ ] Add resend verification endpoint
- [ ] Update registration flow
- [ ] Add verification status UI
- [ ] Block unverified features" \
        "high,feature,frontend,backend" \
        "$MEDIUM_MILESTONE_NAME"

    # S10-SaaS-4
    create_sub_issue \
        "[S10-SaaS-4] Implement Internationalization" \
        "## Problem
No i18n support, all strings hardcoded.

## Impact
- Limited market
- Not localized

## Tasks
- [ ] Install i18next
- [ ] Create English translation file
- [ ] Extract all hardcoded strings
- [ ] Create locale files (es, fr, de, etc.)
- [ ] Add language switcher
- [ ] Add RTL support
- [ ] Format dates/numbers" \
        "medium,feature,frontend,documentation" \
        "$MEDIUM_MILESTONE_NAME"

    # S10-SaaS-5
    create_sub_issue \
        "[S10-SaaS-5] Add A11y Focus Management" \
        "## Problem
Modals and dialogs lack proper focus management.

## Impact
- Keyboard navigation broken
- Screen reader issues

## Tasks
- [ ] Create useFocus hook
- [ ] Implement focus trap
- [ ] Add skip navigation links
- [ ] Manage return focus
- [ ] Test with keyboard and screen reader
- [ ] Update a11y docs" \
        "high,enhancement,frontend" \
        "$MEDIUM_MILESTONE_NAME"

    # S10-SaaS-6
    create_sub_issue \
        "[S10-SaaS-6] Add Webhook Management UI" \
        "## Problem
Backend supports webhooks but no UI to manage them.

## Impact
- Users can't set up integrations
- Manual configuration required

## Tasks
- [ ] Design webhook UI
- [ ] Create webhook list and form pages
- [ ] Implement webhook editing and testing
- [ ] Create delivery logs view
- [ ] Add retry delivery
- [ ] Test webhook flow" \
        "medium,feature,frontend" \
        "$MEDIUM_MILESTONE_NAME"
}

# ============================================================================
# EXECUTION
# ============================================================================

main() {
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  GitHub Issue Generator - ResumeAI Codebase Review${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
    echo ""

    setup_logging
    validate_prereqs
    ensure_labels
    create_milestones
    create_master_issue
    echo ""

    create_critical_issues
    create_security_issues
    create_architecture_issues
    create_performance_issues
    create_testing_issues
    create_ux_issues
    create_devops_issues
    create_maintainability_issues
    create_dependency_issues
    create_saas_issues

    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Issue Creation Summary${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
    echo ""
    echo "Total issues to create: $TOTAL_ISSUES"
    echo -e "Successfully created: ${GREEN}$CREATED_COUNT${NC}"
    echo -e "Failed: ${RED}$FAILED_COUNT${NC}"
    echo ""
    echo -e "${BLUE}Master Issue:${NC} #$MASTER_ISSUE_NUM"
    echo ""
    echo -e "${BLUE}Milestones:${NC}"
    echo "  - Critical: #$CRITICAL_MILESTONE_NAME"
    echo "  - High: #$HIGH_MILESTONE_NAME"
    echo "  - Medium: #$MEDIUM_MILESTONE_NAME"
    echo ""
    echo -e "${BLUE}All Issue Numbers:${NC}"
    for num in "${ISSUE_NUMBERS[@]}"; do
        echo "  - #$num"
    done
    echo ""
    echo -e "${GREEN}✓ Complete! Check logs at: $ISSUES_LOG${NC}"
}

main "$@"
