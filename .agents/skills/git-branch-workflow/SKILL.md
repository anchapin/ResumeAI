---
name: git-branch-workflow
description: "Manage git branches, commits, and pull requests for ResumeAI development workflow."
---

# Git Branch Workflow Skill

This skill provides a complete workflow for managing git branches, making commits, and creating pull requests in the ResumeAI project.

## Capabilities

- **Branch Creation**: Create feature/bugfix branches from main
- **Commit Management**: Stage and commit changes with proper messages
- **Pull Request Creation**: Create properly formatted PRs
- **Branch Synchronization**: Sync with remote branches
- **Commit History**: View and analyze commit history

## Prerequisites

1. Git is configured with user.name and user.email
2. GitHub CLI (`gh`) is installed and authenticated
3. Remote repository is configured as `origin`

## Usage

### 1. Start New Feature

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/issue-XXX-description

# Or bugfix branch
git checkout -b fix/issue-XXX-description
```

### 2. Make Changes and Commit

```bash
# Check status
git status

# Stage all changes
git add -A

# Or stage specific files
git add path/to/file.ts

# Commit with conventional message
git commit -m "feat: add new feature for issue #XXX

- Implemented feature X
- Added tests for Y
- Fixed linting issues

Co-authored-by: Your Name <your@email.com>"
```

### 3. Conventional Commits

Use these prefixes:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `chore:` - Maintenance
- `refactor:` - Code refactoring
- `test:` - Tests

### 4. Push Branch

```bash
# Push to remote
git push origin feature/issue-XXX-description

# Set upstream for first push
git push -u origin feature/issue-XXX-description
```

### 5. Create Pull Request

```bash
# Using GitHub CLI
gh pr create --title "feat: description (#XXX)" --body "Fixes #XXX"

# Or open in browser
gh pr create --web
```

### 6. Update Existing PR

```bash
# Make additional commits
git add -A
git commit -m "fix: address review comments"
git push
```

## Branch Naming Conventions

- `feature/issue-XXX-description` - New features
- `fix/issue-XXX-description` - Bug fixes
- `docs/issue-XXX-description` - Documentation
- `refactor/issue-XXX-description` - Refactoring

## Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Example:
```
feat(auth): add OAuth2 login support

Implemented Google and GitHub OAuth2 authentication.
Added token refresh handling.

Closes #123
```

## Viewing History

```bash
# View recent commits
git log --oneline -10

# View branch diff
git diff main..feature/issue-XXX

# View file changes
git show --stat HEAD
```

## Syncing Branches

```bash
# Fetch all changes
git fetch --all

# Rebase on main
git rebase main

# Or merge main
git merge main
```

## Useful Git Commands

```bash
# Stash changes
git stash

# Apply stash
git stash pop

# Discard changes
git checkout -- path/to/file

# Reset to previous commit (soft)
git reset --soft HEAD~1
```

## Tips

- Always create branches from main, not other feature branches
- Keep commits atomic and focused
- Write clear commit messages that explain the "why"
- Run linters and tests before committing
- Use `gh pr view` to check PR status
