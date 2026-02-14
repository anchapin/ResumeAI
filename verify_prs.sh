#!/bin/bash

# Script to verify PR status for all feature branches

echo "Verifying PR status for all feature branches..."

echo "Open PRs in the repository:"
gh pr list --state open

echo
echo "PRs by branch:"
branches=$(git branch -r | grep "feature/issue-" | sed 's/origin\///' | sort -u)

for branch in $branches; do
    pr_info=$(gh pr view "$branch" --json number,state,title,url 2>/dev/null)
    if [ $? -eq 0 ]; then
        number=$(echo "$pr_info" | jq -r '.number')
        state=$(echo "$pr_info" | jq -r '.state')
        title=$(echo "$pr_info" | jq -r '.title')
        url=$(echo "$pr_info" | jq -r '.url')
        echo "- Branch $branch: PR #$number ($state) - $title"
        echo "  URL: $url"
    else
        echo "- Branch $branch: No PR found"
    fi
done

echo
echo "Summary of PR statuses:"
echo "======================="
gh pr list --state open --json number,title,state,labels --jq '.[] | "#\(.number) - \(.title) [\(.state)] Labels: \(.labels[].name // "none")"]'