# GSD Pause Work Skill

Pause current work, save state, and prepare for resume. Captures current position, blockers, and pending decisions so work can be picked up later.

## Triggers

- "gsd pause"
- "gsd:pause"
- "gsd-pause"
- "pause work"
- "save state"
- "step away"

## Description

Safely pause work by:
- Capturing current position in STATE.md
- Documenting blockers and decisions
- Saving partial work
- Recording what remains

## Process

### Step 1: Check Current State

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" state get-position
```

### Step 2: Document Position

- Current phase and plan
- What was completed
- What was in progress

### Step 3: Capture Blockers

List current blockers:
- Technical blockers
- Decisions pending
- External dependencies

### Step 4: Save Context

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" state snapshot "Paused: {reason}"
```

This creates a snapshot of STATE.md.

### Step 5: Commit

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" commit "chore: pause work - {reason}"
```

## Output

```
## ✓ Work Paused

**Position:** Phase {X}, Plan {Y}
**Completed:**
- Task 1
- Task 2

**In Progress:**
- Task 3

**Blockers:**
- {blocker}

**To Resume:**
/gsd:resume — pick up where left off
```

## Dependencies

This skill uses:
- gsd-tools - For state management
- gsd-resume-project - For resuming
