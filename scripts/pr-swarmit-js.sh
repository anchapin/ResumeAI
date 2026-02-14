#!/bin/bash

# Adapted PR Swarmit for JavaScript/TypeScript projects
# This script uses git worktrees to parallelize PR reviews and fixes for JS/TS projects

set -e

REPO_ROOT="$(pwd)"
WORKTREE_BASE="/tmp/resumeai-pr-worktrees"

# Create worktree base directory
mkdir -p "$WORKTREE_BASE"

echo "PR Swarmit for JavaScript/TypeScript - Starting..."

# Function to get open PRs
get_open_prs() {
    gh pr list --state open --json number,title,headRepository,headRefName,state --jq '.[].number'
}

# Function to setup worktree for a PR
setup_worktree() {
    local pr_number=$1
    local branch_name=$2
    
    echo "Setting up worktree for PR #$pr_number (branch: $branch_name)"
    
    # Create worktree directory
    local worktree_dir="$WORKTREE_BASE/pr-$pr_number"
    rm -rf "$worktree_dir"  # Clean up any existing worktree
    git worktree add "$worktree_dir" "$branch_name"
    
    # Setup dependencies in worktree
    cd "$worktree_dir"
    npm ci || npm install
    
    cd "$REPO_ROOT"
}

# Function to run checks on a PR
run_checks() {
    local pr_number=$1
    local worktree_dir="$WORKTREE_BASE/pr-$pr_number"
    
    echo "Running checks for PR #$pr_number"
    
    cd "$worktree_dir"
    
    # Run linting
    echo "Running linting..."
    npm run lint 2>/dev/null || echo "Linting not configured or failed"
    
    # Run type checking
    echo "Running type checking..."
    npx tsc --noEmit || echo "Type checking failed"
    
    # Run tests
    echo "Running tests..."
    npm test -- --run || echo "Some tests failed"
    
    cd "$REPO_ROOT"
}

# Function to fix common issues
fix_common_issues() {
    local pr_number=$1
    local worktree_dir="$WORKTREE_BASE/pr-$pr_number"
    
    cd "$worktree_dir"
    
    # Try to fix common issues
    echo "Attempting to fix common issues for PR #$pr_number..."
    
    # Run type checking and try to fix issues
    if ! npx tsc --noEmit; then
        echo "Type checking failed, looking for common issues..."
        # Add specific fixes here as needed
    fi
    
    # Format code
    echo "Formatting code..."
    npx prettier --write . 2>/dev/null || echo "Prettier not available"
    npx eslint --fix . 2>/dev/null || echo "ESLint not available or not configured"
    
    # Check if there are changes to commit
    if [[ -n $(git status --porcelain) ]]; then
        git add .
        git commit -m "fix: Apply automated fixes (formatting, linting, etc.)"
        git push
        echo "Pushed fixes to PR #$pr_number"
    else
        echo "No changes to commit for PR #$pr_number"
    fi
    
    cd "$REPO_ROOT"
}

# Main execution
main() {
    echo "Fetching open PRs..."
    PR_NUMBERS=$(get_open_prs)
    
    if [[ -z "$PR_NUMBERS" ]]; then
        echo "No open PRs found."
        exit 0
    fi
    
    echo "Found PRs: $PR_NUMBERS"
    
    # Process each PR
    for pr_num in $PR_NUMBERS; do
        echo "Processing PR #$pr_num..."
        
        # Get branch name for the PR
        BRANCH_NAME=$(gh pr view $pr_num --json headRefName --jq '.headRefName')
        
        # Setup worktree
        setup_worktree $pr_num "$BRANCH_NAME"
        
        # Run checks
        run_checks $pr_num
        
        # Attempt to fix issues
        fix_common_issues $pr_num
        
        # Check if PR is ready to merge
        CHECKS_STATUS=$(gh pr checks $pr_num --json state --jq '.[] | .state' 2>/dev/null | uniq || echo "unknown")
        if [[ "$CHECKS_STATUS" != *"FAIL"* ]] && [[ "$CHECKS_STATUS" != *"ERROR"* ]]; then
            echo "PR #$pr_num appears ready to merge!"
        else
            echo "PR #$pr_num still has failing checks."
        fi
    done
    
    echo "PR Swarmit completed!"
}

# Run main function
main "$@"