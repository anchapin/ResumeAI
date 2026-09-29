# GSD Verify Work Skill

Comprehensive verification that checks all phases, artifacts, and integration. More thorough than phase-specific verification - checks the entire project.

## Triggers

- "gsd verify-work"
- "gsd:verify-work"
- "gsd-verify-work"
- "verify work"
- "verify project"
- "comprehensive check"

## Description

Comprehensive project verification:
- All phases complete
- All artifacts exist
- Cross-phase integration works
- State is consistent
- Git history is clean

## Process

### Step 1: Check All Phases

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" verify all-phases
```

For each phase:
- Plans exist
- Summaries exist
- Commits present

### Step 2: Artifact Verification

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" verify artifacts all
```

For each artifact:
- File exists
- Content valid

### Step 3: Integration Check

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" verify integration
```

Check:
- Phase dependencies
- Cross-phase references
- Build works

### Step 4: Git History

```bash
git log --oneline --all
```

Check:
- Commits per phase
- Commit messages follow convention

### Step 5: Generate Report

```
## Project Verification

### Phases
| Phase | Plans | Summaries | Status |
|-------|-------|-----------|--------|
| 01    | 4     | 4         | ✓      |
| 02    | 3     | 3         | ✓      |

### Artifacts
- Files: {count} ✓
- Integration: ✓

### Git
- Commits: {count}
- Clean: ✓/✗

### Overall Status: {PASS/FAIL}
```

## Dependencies

This skill uses:
- gsd-tools - For verification commands
- gsd-integration-checker - For integration
