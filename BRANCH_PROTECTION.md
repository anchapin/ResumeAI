# Branch Protection Configuration for ResumeAI

## Overview

This document describes the branch protection configuration for the ResumeAI repository and the requirements for enabling it.

## Current Status

**Status**: ✅ Enabled

Branch protection rules are now configured on the ResumeAI repository. The main branch has the following protections in place:

| Feature                     | Status |
| --------------------------- | ------ |
| Branch Protection           | ✅     |
| Required Reviews           | ✅     |
| Status Checks               | ✅     |
| Code Owner Reviews         | ❌     |
| Require Linear History     | ✅     |
| Require Signed Commits     | ❌     |
| Include Administrators     | ✅     |

### Active Protection Rules

The following protection rules are currently enforced on the main branch:

- **Required Reviews**: 1 approving review required
- **Status Checks**: PR Check, Frontend CI, Backend CI (must pass)
- **Require Linear History**: Enabled (no merge commits)
- **Force Pushes**: Blocked
- **Branch Deletion**: Blocked
- **Conversation Resolution**: Required before merge
- **Administrator Enforcement**: Enabled

### Current Limitations

- **Code Owner Reviews**: Not enabled (optional feature)
- **Signed Commits**: Not required (optional feature)

## Acceptance Criteria (from Issue #778)

- [x] Branch protection enabled for main branch
- [x] Require pull request reviews before merging
- [x] Require status checks to pass
- [ ] Require code owner reviews (optional - not enabled)
- [x] Include administrator in protection rules

## Configuration Commands

When GitHub Pro is available, run the following to configure branch protection:

### Option 1: Using the Setup Script

```bash
./scripts/setup-branch-protection.sh
```

### Option 2: Direct GitHub API Commands

```bash
# Set up branch protection with required reviews and status checks
gh api repos/anchapin/ResumeAI/branches/main/protection --method PUT \
  -F required_pull_request_reviews='{
    "required_approving_review_count": 1,
    "include_admins": true,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  }' \
  -F enforce_admins='true' \
  -F required_status_checks='{
    "strict": true,
    "contexts": [
      "PR Check/frontend-check",
      "PR Check/backend-check"
    ]
  }' \
  -F allow_force_pushes='false' \
  -F allow_deletions='false'
```

### Option 3: Using GitHub CLI (when Pro is available)

```bash
# Enable branch protection rules
gh repo protected-branch set main \
  --require-up-to-date \
  --require-review-from-approvers=1 \
  --include-admins \
  --enforce-admins \
  --block-force-pushes \
  --block-branch-deletion
```

## Alternative: Make Repository Public

If you want branch protection without a paid subscription, you can make the repository public:

1. Go to Repository Settings
2. Change Visibility from Private to Public
3. Branch protection will become available

**Note**: This exposes your source code publicly, which may not be desired for proprietary projects.

## Current Protections in Place

Even without full branch protection, the following are configured:

### CODEOWNERS File

A `.github/CODEOWNERS` file is in place to automatically request reviews from designated code owners:

- Default reviewers for all changes: `@anchapin/core-team`
- Frontend code: `@anchapin/frontend-team`
- Backend code: `@anchapin/backend-team`
- DevOps/Infrastructure: `@anchapin/devops-team`
- Security-sensitive files: `@anchapin/security-team`

### GitHub Actions Workflows

The repository has several CI/CD workflows that run on PRs:

1. **pr-check.yml** - Runs on every PR to main:
   - Frontend tests and builds
   - Backend tests with coverage
   - Security audits

2. **e2e-tests.yml** - End-to-end testing

3. **frontend-ci.yml** - Frontend CI pipeline

4. **backend-ci.yml** - Backend CI pipeline

These workflows provide visual feedback on PRs even without enforced status checks.

## Workarounds Without GitHub Pro

While you cannot enforce branch protection rules via GitHub settings, you can:

1. **Establish team conventions** - Require all merges to go through PRs
2. **Use CODEOWNERS** - Already configured for automatic review requests
3. **Review CI results** - Check PR Check workflow status before merging
4. **Disable direct pushes** (when authenticated as repo admin):
   ```bash
   # This sets a non-enforcible setting that warns about direct pushes
   git config branch.main.protect true
   ```

## Verification

Once GitHub Pro is obtained, verify branch protection is enabled:

```bash
gh api repos/anchapin/ResumeAI/branches/main/protection --method GET | jq .
```

Expected output should show:

- `required_pull_request_reviews.required_approving_review_count: 1`
- `enforce_admins: true`
- `required_status_checks` with contexts
- `allow_force_pushes: false`
- `allow_deletions: false`

## Related Files

- `.github/CODEOWNERS` - Code ownership configuration
- `.github/workflows/pr-check.yml` - PR validation workflow
- `scripts/setup-branch-protection.sh` - Automation script for protection setup
