# GSD Progress Skill

Check project progress, summarize recent work, and intelligently route to the next action. Provides situational awareness before continuing work.

## Triggers

- "gsd progress"
- "gsd:progress"
- "gsd-progress"
- "project progress"
- "show progress"
- "roadmap status"
- "what's next"
- "what are we working on"

## Description

Shows comprehensive project progress including:
- Visual progress bar
- Recent work summary
- Current position in roadmap
- Key decisions and blockers
- Next action recommendations

## Process

### Step 1: Load Progress Context

```bash
INIT=$(node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" init progress)
echo "$INIT"
```

Extract: `project_exists`, `roadmap_exists`, `state_exists`, `phases`, `current_phase`, `next_phase`, `completed_count`, `phase_count`.

If `project_exists` is false:
```
No planning structure found.

Run /gsd:new-project to start a new project.
```
Exit.

### Step 2: Get Roadmap Analysis

```bash
ROADMAP=$(node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" roadmap analyze)
echo "$ROADMAP"
```

Returns structured JSON with:
- All phases with disk status (complete/partial/planned)
- Goal and dependencies per phase
- Plan and summary counts
- Current and next phase

### Step 3: Get Recent Work

Find recent SUMMARY.md files and extract one-liners:

```bash
# Find 2-3 most recent summaries
find .planning/phases -name "*-SUMMARY.md" -type f -mtime -7 2>/dev/null | head -3
```

For each summary, extract key info:
```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" summary-extract <path> --fields one_liner
```

### Step 4: Generate Progress Report

Present a rich status report:

```
# [Project Name]

**Progress:** {PROGRESS_BAR}
**Profile:** [quality/balanced/budget]

## Recent Work
- [Phase X, Plan Y]: [what was accomplished]
- [Phase X, Plan Z]: [what was accomplished]

## Current Position
Phase [N] of [total]: [phase-name]
Plan [M] of [phase-total]: [status]

## Key Decisions Made
- [extract from STATE.decisions[]]

## Blockers/Concerns
- [extract from STATE.blockers[]]

## Pending Todos
- [count] pending — /gsd:check-todos to review

## Active Debug Sessions
- [count] active — /gsd:debug to continue

## What's Next
[Next phase/plan objective from roadmap]
```

### Step 5: Smart Routing

Determine next action based on plan/summary counts:

| Condition | Meaning | Action |
|-----------|---------|--------|
| summaries < plans | Unexecuted plans exist | Offer `/gsd:execute-phase` |
| summaries = plans AND plans > 0 | Phase complete | Check milestone status |
| plans = 0 | Phase not yet planned | Offer `/gsd:plan-phase` |

**Route A: Unexecuted plan exists**
```
## ▶ Next Up

**{phase}-{plan}: [Plan Name]** — [objective summary]

/gsd:execute-phase {phase}
```

**Route B: Phase needs planning**
```
## ▶ Next Up

**Phase {N}: {Name}** — {Goal from ROADMAP.md}

/gsd:discuss-phase {phase} — gather context
/gsd:plan-phase {phase} — skip discussion, plan directly
```

**Route C: Phase complete, more remain**
```
## ✓ Phase {Z} Complete

## ▶ Next Up

**Phase {Z+1}: {Name}** — {Goal}

/gsd:discuss-phase {Z+1}
```

**Route D: Milestone complete**
```
## 🎉 Milestone Complete

All {N} phases finished!

## ▶ Next Up

**Complete Milestone** — archive and prepare for next

/gsd:complete-milestone
```

## Output Format

The progress report should include:
- [x] Rich context provided (recent work, decisions, issues)
- [x] Current position clear with visual progress
- [x] What's next clearly explained
- [x] Smart routing: /gsd:execute-phase if plans exist, /gsd:plan-phase if not
- [x] User confirms before any action
- [x] Seamless handoff to appropriate gsd command

## Dependencies

This skill uses:
- gsd-tools - For state, roadmap, and progress data
- gsd-plan-phase - For planning new phases
- gsd-execute-phase - For executing plans
- gsd-complete-milestone - For milestone completion

## Edge Cases

- Phase complete but next phase not planned → offer `/gsd:plan-phase [next]`
- All work complete → offer milestone completion
- Blockers present → highlight before offering to continue
- Handoff file exists → mention it, offer `/gsd:resume-work`
