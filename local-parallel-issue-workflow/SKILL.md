---
name: local-parallel-issue-workflow
description: 'Locally-adapted workflow to work on multiple GitHub issues by using codebase_investigator for parallel planning and sequential execution across branches.'
---

# Local Parallel Issue Workflow

This skill adapts the original parallel-issue-workflow for use without the `handoff` tool. It uses `codebase_investigator` to plan multiple fixes in parallel and then executes them sequentially in separate branches to avoid conflicts.

## Capabilities

- **Issue Discovery**: Fetches and ranks open GitHub issues by priority.
- **Parallel Analysis**: Uses `codebase_investigator` to analyze and plan multiple issues in a single turn.
- **Coordinated Execution**: Implements fixes in dedicated branches, ensuring no conflicts.
- **Automated PR Creation**: Creates properly formatted PRs with issue references.

## Workflow

### 1. Identify Top Issues

Use the `gh` CLI or existing scripts to find the top issues:

```bash
gh issue list --state open --limit 50 --json number,title,labels,milestone
```

### 2. Parallel Planning

Instead of spawning independent threads with `handoff`, use `codebase_investigator` for each issue in parallel:

```javascript
// Call in parallel in a single turn
codebase_investigator({ objective: 'Analyze issue #123 and propose a fix plan...' });
codebase_investigator({ objective: 'Analyze issue #456 and propose a fix plan...' });
```

### 3. Sequential Implementation

For each issue, execute the following in a dedicated branch:

1. **Create Branch**: `git checkout -b fix/issue-XXX`
2. **Implement**: Apply the plan from step 2.
3. **Test**: Verify the changes with new or existing tests.
4. **Push & PR**:
   ```bash
   git push origin fix/issue-XXX
   gh pr create --title "fix: [description] (#XXX)" --body "Fixes #XXX"
   ```
5. **Switch Back**: `git checkout main` (or the previous branch)

### 4. Tracking & Status

Maintain a checklist of issues and their current state (Analyzed, Implementing, PR Created).

## Tips

- **Conflict Management**: If issues touch the same files, prioritize them serially or merge changes into a common development branch before final PRs.
- **Branch Naming**: Use `fix/issue-XXX` or `feat/issue-XXX` consistently.
- **Commit Messages**: Follow project conventions (e.g., Conventional Commits).
