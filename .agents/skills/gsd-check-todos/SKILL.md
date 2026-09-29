# GSD Check Todos Skill

Review and manage pending blockers, decisions, and action items from STATE.md. Keep the project moving by addressing open items.

## Triggers

- "gsd check-todos"
- "gsd:check-todos"
- "gsd-check-todos"
- "check todos"
- "check blockers"
- "pending items"

## Description

Check and manage:
- Open blockers
- Pending decisions
- Action items
- Notes from previous work

## Process

### Step 1: Load STATE.md

```bash
cat .planning/STATE.md
```

### Step 2: Display Status

Parse and display:
```
## Project Status

**Phase:** {current phase}
**Status:** {in_progress/blocked/complete}

### Blockers
- [ ] {blocker 1}
- [x] {blocker 2} (resolved)

### Pending Decisions
- [ ] {decision 1}
- [ ] {decision 2}

### Recent Notes
- {note 1}
- {note 2}
```

### Step 3: Address Each Item

For each blocker:
- Ask user how to resolve
- Document resolution
- Mark as resolved

For each decision:
- Present options
- Get user input
- Document decision

### Step 4: Update STATE.md

After addressing items:
```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" state update-blockers
```

### Step 5: Commit

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" commit "docs: resolve blockers for phase {X}"
```

## Auto Mode

If `--auto` flag present:
- Auto-resolve minor blockers
- Skip pending decisions
- Report what was resolved

## Output

```
## ✓ Blockers Reviewed

Resolved:
- {blocker 1}
- {blocker 2}

Remaining:
- {blocker 3}

## ▶ Next Up

/gsd:execute-phase {phase} — continue execution
```

## Dependencies

This skill uses:
- gsd-tools - For state management
