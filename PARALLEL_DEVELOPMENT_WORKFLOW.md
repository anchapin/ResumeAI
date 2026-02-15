# Parallel Development Workflow Documentation

## Overview
This document describes the parallel development workflow used in the ResumeAI project. This approach allows multiple developers to work on different issues simultaneously without blocking each other.

## Prerequisites
- Git with worktree support
- GitHub CLI (`gh`) installed and authenticated
- Proper permissions to create branches and PRs in the repository

## Setup

### 1. Initial Repository Setup
```bash
git clone https://github.com/anchapin/ResumeAI.git
cd ResumeAI
gh auth login  # Authenticate with GitHub CLI
```

### 2. Understanding the Branch Strategy
- `main`: Production-ready code
- `feature/issue-{N}-{description}`: Feature branches for specific issues
- Worktrees: Separate directories for each PR to allow parallel work

## Parallel Development Process

### 1. Creating Worktrees for Issues
Each issue gets its own worktree to allow parallel development:

```bash
# Create a worktree for a new issue
git worktree add ../feature-issue-{N}-description feature/issue-{N}

# Example:
git worktree add ../feature-issue-30-cors-settings feature/issue-30
```

### 2. Working on Multiple Issues Simultaneously
```bash
# Terminal 1 - Work on issue 30
cd ../feature-issue-30-cors-settings
# Make changes, commit, etc.

# Terminal 2 - Work on issue 31
cd ../feature-issue-31-logging-system  
# Make changes, commit, etc.
```

### 3. Automated PR Creation
Use the `create_prs.sh` script to automatically create PRs for all feature branches:

```bash
# Run from the main repository directory
./create_prs.sh
```

## Worktree Management

### Listing Current Worktrees
```bash
git worktree list
```

### Cleaning Up Obsolete Worktrees
After PRs are merged, clean up the associated worktrees:

```bash
# Remove worktree directory
rm -rf /path/to/worktree-directory

# Prune git's knowledge of the worktree
git worktree prune
```

## Best Practices

### 1. Keeping Branches Updated
Regularly sync with main to avoid merge conflicts:

```bash
git fetch origin
git rebase origin/main  # or git merge origin/main
```

### 2. Issue Tracking
- Each feature branch should correspond to a specific GitHub issue
- Branch names should follow the pattern: `feature/issue-{N}-{short-description}`
- Commit messages should reference the issue: `Fix: Resolve issue #{N} - description`

### 3. Code Quality
- Run tests before pushing changes
- Follow the project's coding standards
- Write clear, descriptive commit messages

## Automation Scripts

### create_prs.sh
Automatically creates PRs for all feature branches with the following features:
- Checks for existing PRs to avoid duplicates
- Generates appropriate titles and descriptions
- Assigns reviewers and labels
- Handles both local and remote feature branches

### worktree-manager.sh (Conceptual)
A script to automate worktree creation and management:
- Create worktrees for assigned issues
- Clean up obsolete worktrees
- Sync worktrees with remote branches

## Troubleshooting

### Common Issues

#### Merge Conflicts
When rebasing or merging with main:
1. Resolve conflicts manually
2. Add resolved files: `git add .`
3. Continue rebase: `git rebase --continue`

#### Worktree Corruption
If a worktree becomes corrupted:
1. Remove the worktree directory
2. Run `git worktree prune` to clean up references
3. Recreate the worktree if needed

#### GitHub CLI Authentication
If getting authentication errors:
1. Run `gh auth status` to check status
2. Run `gh auth login` to re-authenticate if needed

## Monitoring and Status Tracking

### Checking PR Status
```bash
# View all PRs
gh pr list

# Check status of PRs assigned to you
gh pr status

# View specific PR
gh pr view {PR_NUMBER}
```

### Checking Issue Status
```bash
# View all issues
gh issue list

# View specific issue
gh issue view {ISSUE_NUMBER}
```

## Continuous Integration

### CI Checks
- All PRs must pass CI checks before merging
- Monitor CI status on GitHub
- Address any failing tests or linting issues promptly

### Auto-Merge
- Enable auto-merge for PRs that pass all checks
- Monitor for any conflicts that may arise

## Closing Notes

This parallel development workflow enables efficient collaboration on the ResumeAI project by allowing multiple developers to work on different issues simultaneously. Following these guidelines ensures smooth integration of changes and minimizes conflicts.

Remember to regularly clean up obsolete worktrees and keep branches updated with the main branch to maintain a healthy development environment.