# PR Creation Instructions

This document explains how to create Pull Requests (PRs) for all open issues in the ResumeAI project.

## Prerequisites

Before creating PRs, ensure you have:

1. **GitHub CLI installed**: Install the GitHub CLI (`gh`) by following the instructions at https://cli.github.com/
2. **Authentication**: Authenticate with GitHub using `gh auth login`
3. **Repository access**: Ensure you have write access to the repository

## Using the Automated Script

The repository includes a script to automatically create PRs for all feature branches:

1. **Run the script**:
   ```bash
   ./create_prs.sh
   ```

2. **The script will**:
   - Identify all local and remote feature branches
   - Extract issue numbers from branch names
   - Check if PRs already exist for these branches
   - Create new PRs for branches without existing PRs
   - Set appropriate titles and descriptions based on issue numbers

## Manual PR Creation

If you prefer to create PRs manually:

1. **For each feature branch**, navigate to the GitHub repository page
2. **Switch to the feature branch** in the repository UI
3. **Click "New pull request"** 
4. **Set the base branch to `main`** and the compare branch to your feature branch
5. **Add a descriptive title** in the format: "Fix issue #XX - Brief description"
6. **Include a reference to the issue** in the description

## List of Feature Branches

Based on the current repository state, the following feature branches exist:

- feature/issue-13
- feature/issue-14
- feature/issue-15
- feature/issue-24
- feature/issue-24-type-fix-clean
- feature/issue-26
- feature/issue-27
- feature/issue-28
- feature/issue-29
- feature/issue-30
- feature/issue-30-new
- feature/issue-31
- feature/issue-31-new
- feature/issue-32
- feature/issue-33-new
- feature/issue-34
- feature/issue-35
- feature/issue-36
- feature/issue-36-new
- feature/issue-37
- feature/issue-38
- feature/issue-40
- feature/issue-40-new

## Best Practices

- Always reference the issue number in the PR title or description
- Include a brief summary of changes made
- Assign reviewers as appropriate
- Add relevant labels (bug, enhancement, documentation, etc.)

## Verification

After creating PRs, verify that:

1. All PRs are linked to their respective issues
2. PR titles and descriptions are informative
3. All automated checks pass
4. The changes are reviewed by team members