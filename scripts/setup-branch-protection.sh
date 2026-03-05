#!/bin/bash
# Branch Protection Setup Script for ResumeAI
# 
# This script configures branch protection rules for the main branch.
# 
# IMPORTANT: GitHub Pro (or higher) is required for branch protection on private repositories.
# If you see "Upgrade to GitHub Pro" errors, you need to upgrade your GitHub account.
#
# Usage: ./scripts/setup-branch-protection.sh

set -e

REPO="anchapin/ResumeAI"
BRANCH="main"

echo "Setting up branch protection for $REPO/$BRANCH..."

# Check if gh CLI is authenticated
if ! gh auth status > /dev/null 2>&1; then
    echo "Error: Not authenticated with GitHub. Run 'gh auth login' first."
    exit 1
fi

# Configure branch protection
# This will:
# - Require 1 pull request review before merging
# - Include administrators in protection rules  
# - Require status checks to pass
# - Prevent direct pushes
# - Block force pushes
# - Prevent branch deletion

gh api repos/$REPO/branches/$BRANCH/protection --method PUT \
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
  -F allow_deletions='false' \
  -F required_linear_history='true' \
  -F allow_force_pushes_='false' \
  -F restrictions='null'

echo "Branch protection configured successfully!"

# Verify the configuration
echo ""
echo "Current branch protection settings:"
gh api repos/$REPO/branches/$BRANCH/protection --method GET | jq '{
  "required_reviews": .required_pull_request_reviews,
  "enforce_admins": .enforce_admins,
  "required_status_checks": .required_status_checks,
  "allow_force_pushes": .allow_force_pushes,
  "allow_deletions": .allow_deletions
}'
