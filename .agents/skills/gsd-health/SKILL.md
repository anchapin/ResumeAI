# GSD Health Check Skill

Run comprehensive health check on project: git status, planning artifacts, state consistency, and common issues.

## Triggers

- "gsd health"
- "gsd:health"
- "gsd-health"
- "health check"
- "project health"
- "status"

## Description

Comprehensive project health check:
- Git status and branch
- Planning artifacts existence
- State consistency
- Common issues detection

## Process

### Step 1: Git Status

```bash
git status
git branch
git log --oneline -5
```

### Step 2: Planning Artifacts

Check:
- .planning/PROJECT.md
- .planning/REQUIREMENTS.md
- .planning/ROADMAP.md
- .planning/STATE.md

### Phase Directories

```bash
ls -la .planning/phases/
```

### Step 3: State Check

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" state validate
```

### Step 4: Report

```
## Project Health

### Git
- Branch: {branch}
- Status: {clean/dirty}
- Last commit: {hash}

### Planning
- PROJECT.md: ✓/✗
- ROADMAP.md: ✓/✗
- STATE.md: ✓/✗
- Phases: {count}

### State
- Valid: ✓/✗
- Current phase: {phase}

### Issues
- {issue 1}
- {issue 2}
```

## Dependencies

This skill uses:
- gsd-tools - For state validation
