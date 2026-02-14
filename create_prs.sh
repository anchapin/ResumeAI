#!/bin/bash

# Script to create PRs for all feature branches
# This script assumes you have GitHub CLI (gh) installed and authenticated

set -e  # Exit on any error

echo "Creating PRs for all feature branches..."

# Get all local feature branches
FEATURE_BRANCHES=$(git branch --list | grep "feature/issue-" | tr -d ' *+' | sort -u)

echo "Found the following local feature branches:"
echo "$FEATURE_BRANCHES"
echo

# Loop through each feature branch and create a PR
for branch in $FEATURE_BRANCHES; do
    if [ -n "$branch" ]; then
        echo "Processing branch: $branch"
        
        # Get the issue number from the branch name
        ISSUE_NUMBER=$(echo "$branch" | grep -o '[0-9]\+' | head -1)
        
        if [ -n "$ISSUE_NUMBER" ]; then
            echo "  - Detected issue number: #$ISSUE_NUMBER"
            
            # Check if the branch has any commits different from main
            COMMITS_DIFF=$(git rev-list --count HEAD..main 2>/dev/null || echo "0")
            if [ "$COMMITS_DIFF" = "0" ]; then
                COMMITS_DIFF=$(git rev-list --count main..HEAD 2>/dev/null || echo "0")
            fi
            
            if [ "$COMMITS_DIFF" = "0" ]; then
                echo "  - Branch $branch has no commits different from main, skipping..."
                echo
                continue
            fi
            
            # Check if a PR already exists for this branch
            PR_EXISTS=$(gh pr list --head "$branch" --state open --json number --jq '.[0].number' 2>/dev/null)
            
            if [ "$PR_EXISTS" != "null" ] && [ -n "$PR_EXISTS" ]; then
                echo "  - PR #$PR_EXISTS already exists for branch $branch, skipping..."
            else
                # Create a PR title based on the branch name
                PR_TITLE="Fix issue #$ISSUE_NUMBER - $(echo $branch | sed 's/feature\/issue-[0-9]*-//')"
                
                # If the title is the same as the branch name (no match), use a simpler title
                if [ "$PR_TITLE" = "Fix issue #$ISSUE_NUMBER - $branch" ]; then
                    PR_TITLE="Resolve issue #$ISSUE_NUMBER"
                fi
                
                # Create the PR
                echo "  - Creating PR: $PR_TITLE"
                gh pr create \
                    --title "$PR_TITLE" \
                    --body "Automated PR for issue #$ISSUE_NUMBER\n\nThis PR resolves issue #$ISSUE_NUMBER by implementing the necessary changes." \
                    --head "$branch" \
                    --base "main" \
                    --assignee "@me" \
                    --label "enhancement" \
                    --reviewer "anchapin"
                
                echo "  - Successfully created PR for branch $branch"
            fi
        else
            echo "  - Could not detect issue number from branch name: $branch"
        fi
        
        echo
    fi
done

# Also check for remote feature branches that might not be pulled locally
echo "Checking remote feature branches..."
REMOTE_FEATURE_BRANCHES=$(git ls-remote --heads origin | grep "refs/heads/feature/issue-" | cut -d'/' -f3- | sort -u)

echo "Found the following remote feature branches:"
echo "$REMOTE_FEATURE_BRANCHES"
echo

for branch in $REMOTE_FEATURE_BRANCHES; do
    if [ -n "$branch" ]; then
        # Check if this branch exists locally, if not, fetch it
        if ! git branch --list | grep -q "^  $branch$"; then
            echo "Fetching remote branch: $branch"
            git fetch origin
            git checkout -b "$branch" "origin/$branch" || git checkout "$branch"
        fi
        
        # Process the branch as above
        ISSUE_NUMBER=$(echo "$branch" | grep -o '[0-9]\+' | head -1)
        
        if [ -n "$ISSUE_NUMBER" ]; then
            echo "  - Detected issue number: #$ISSUE_NUMBER"
            
            # Check if the branch has any commits different from main
            git checkout "$branch" >/dev/null 2>&1
            COMMITS_DIFF=$(git rev-list --count main.."$branch" 2>/dev/null || echo "0")
            
            if [ "$COMMITS_DIFF" = "0" ]; then
                echo "  - Branch $branch has no commits different from main, skipping..."
                echo
                continue
            fi
            
            # Check if a PR already exists for this branch
            PR_EXISTS=$(gh pr list --head "$branch" --state open --json number --jq '.[0].number' 2>/dev/null)
            
            if [ "$PR_EXISTS" != "null" ] && [ -n "$PR_EXISTS" ]; then
                echo "  - PR #$PR_EXISTS already exists for branch $branch, skipping..."
            else
                # Create a PR title based on the branch name
                PR_TITLE="Fix issue #$ISSUE_NUMBER - $(echo $branch | sed 's/feature\/issue-[0-9]*-//')"
                
                # If the title is the same as the branch name (no match), use a simpler title
                if [ "$PR_TITLE" = "Fix issue #$ISSUE_NUMBER - $branch" ]; then
                    PR_TITLE="Resolve issue #$ISSUE_NUMBER"
                fi
                
                # Create the PR
                echo "  - Creating PR: $PR_TITLE"
                gh pr create \
                    --title "$PR_TITLE" \
                    --body "Automated PR for issue #$ISSUE_NUMBER\n\nThis PR resolves issue #$ISSUE_NUMBER by implementing the necessary changes." \
                    --head "$branch" \
                    --base "main" \
                    --assignee "@me" \
                    --label "enhancement" \
                    --reviewer "anchapin"
                
                echo "  - Successfully created PR for branch $branch"
            fi
        fi
        echo
    fi
done

echo "PR creation process completed!"