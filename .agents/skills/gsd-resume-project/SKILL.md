# GSD Resume Project Skill

Resume paused work, restore context, and continue execution. Loads snapshot, reviews blockers, and proposes next action.

## Triggers

- "gsd resume"
- "gsd:resume"
- "gsd-resume"
- "resume work"
- "continue work"
- "pick up"

## Description

Resume paused work by:
- Loading snapshot from pause
- Restoring state
- Reviewing blockers
- Proposing next action

## Process

### Step 1: Load Snapshot

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" state load-snapshot
```

### Step 2: Display Position

Show where work was left:
```
## Resuming Work

**Position:** Phase {X}, Plan {Y}
**Paused:** {date}

**Completed:**
- Task 1
- Task 2

**In Progress:**
- Task 3
```

### Step 3: Review Blockers

Present blockers from pause:
```
## Blockers
- [ ] {blocker 1}
- [ ] {blocker 2}
```

Ask user how to proceed:
1. "Resolve blockers now"
2. "Skip and continue"
3. "Get more context"

### Step 4: Determine Next Action

Based on position:
- If in execute-phase → continue wave
- If at checkpoint → address checkpoint
- If at plan boundary → plan next

### Step 5: Resume

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" state resume
```

## Output

```
## ✓ Resumed

**Continuing:** Phase {X}, Plan {Y}

**Next:** {action}

## ▶ Next Up

/gsd:execute-phase {phase} — continue execution
```

## Dependencies

This skill uses:
- gsd-tools - For state management
- gsd-execute-phase - For continuing execution
