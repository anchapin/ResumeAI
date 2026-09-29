# GSD Complete Milestone Skill

Archive a completed milestone, update MILESTONES.md, and prepare for the next milestone. Handles phase archiving, version incrementing, and milestone documentation.

## Triggers

- "gsd complete-milestone"
- "gsd:complete-milestone"
- "gsd-complete-milestone"
- "complete milestone"
- "finish milestone"
- "archive milestone"

## Description

Completes a milestone by:
- Verifying all phases are complete
- Updating MILESTONES.md with archive
- Creating milestone summary
- Preparing for next milestone

## Process

### Step 1: Initialize

```bash
INIT=$(node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" init complete-milestone)
echo "$INIT"
```

Parse: `milestone_version`, `milestone_name`, `phases`, `completed_phases`, `pending_phases`.

### Step 2: Verify Completeness

Check all phases in milestone are complete:
```
Milestone v{X.Y}: {name}
Phases: {completed}/{total} complete
```

If incomplete:
```
## ⚠ Milestone Not Complete

Missing phases:
- Phase {N}: {name}

Complete all phases first, then retry.
```

### Step 3: Archive Phases

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" milestone complete "${VERSION}" --archive-phases
```

This:
- Moves phase directories to `.planning/milestones/vX.Y-phases/`
- Creates milestone summary

### Step 4: Update MILESTONES.md

Add completed milestone entry:
```markdown
## v{X.Y} - {date}

**Status:** Complete

### Phases
| Phase | Plans | Summary |
|-------|-------|---------|
| 01-XXX | 4 | ✓ |

### Key Accomplishments
- {accomplishment 1}
- {accomplishment 2}

### Notes
- {notes}
```

### Step 5: Reset State

Update STATE.md:
- Current phase: "01" (next milestone)
- Milestone version: increment
- Blockers: clear
- Add completion note

### Step 6: Prepare Next Milestone

```
## ✓ Milestone v{X.Y} Complete

Archived:
- {N} phases
- {M} plans
- {K} commits

## ▶ Next Up

Start next milestone:
- /gsd:new-milestone — create new milestone
- /gsd:progress — check overall progress
```

## Arguments

| Argument | Description |
|----------|-------------|
| `--name <name>` | Custom milestone name |
| `--archive-phases` | Archive phase directories (default: true) |
| `--version <vX.Y>` | Specify milestone version |

## Output

```
# Milestone v{X.Y} Complete ✓

## Summary
- Phases completed: {N}
- Plans executed: {M}
- Commits: {K}
- Duration: {time}

## Key Achievements
- {achievement 1}
- {achievement 2}

## Files Updated
- .planning/MILESTONES.md
- .planning/STATE.md

## Next Milestone
Version: v{X+1}.0
Status: Ready to plan

## Available Commands
/gsd:new-milestone — Start next milestone
/gsd:progress — View all milestones
```

## Dependencies

This skill uses:
- gsd-tools - For milestone operations
- gsd-new-milestone - For starting next milestone
- gsd-progress - For viewing milestone history
