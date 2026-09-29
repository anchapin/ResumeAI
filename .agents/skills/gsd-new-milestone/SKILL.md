# GSD New Milestone Skill

Start a new milestone cycle for an existing project. Similar to new-project but for continuing projects that have already shipped. Gathers milestone goals, updates PROJECT.md and STATE.md, runs research, creates roadmap.

## Triggers

- "gsd new-milestone"
- "gsd:new-milestone"
- "gsd-new-milestone"
- "new milestone"
- "start milestone"
- "next milestone"

## Description

Creates a new milestone by:
- Loading project context from previous milestone
- Gathering milestone goals and features
- Determining version number
- Running research (optional)
- Creating requirements with REQ-IDs
- Spawning roadmapper for phased plan

## Process

### Step 1: Load Context

- Read PROJECT.md (existing project, validated requirements, decisions)
- Read MILESTONES.md (what shipped previously)
- Read STATE.md (pending todos, blockers)
- Check for MILESTONE-CONTEXT.md (from /gsd:discuss-milestone)

### Step 2: Gather Milestone Goals

**If MILESTONE-CONTEXT.md exists:**
- Use features and scope from discuss-milestone
- Present summary for confirmation

**If no context file:**
- Present what shipped in last milestone
- Ask: "What do you want to build next?"
- Probe specifics with follow-up questions

### Step 3: Determine Milestone Version

- Parse last version from MILESTONES.md
- Suggest next version:
  - v1.0 → v1.1 (minor increment)
  - v2.0 (major version for significant changes)
- Confirm with user

### Step 4: Update PROJECT.md

Add/update:
```markdown
## Current Milestone: v[X.Y] [Name]

**Goal:** [One sentence describing milestone focus]

**Target features:**
- [Feature 1]
- [Feature 2]
- [Feature 3]
```

### Step 5: Research Phase (if enabled)

Spawn gsd-project-researcher agent:
```
Task(
  subagent_type="gsd-project-researcher",
  prompt="
    Research milestone v{X.Y}: {milestone_name}
    
    Focus: {goals from user input}
    Previous: {from MILESTONES.md}
  "
)
```

### Step 6: Requirements Phase

Create milestone-specific requirements:
- Scope features with REQ-IDs
- Assign to phases
- Set priorities

### Step 7: Roadmap Phase

Spawn gsd-roadmapper agent:
```
Task(
  subagent_type="gsd-roadmapper",
  prompt="
    Create roadmap for milestone v{X.Y}: {milestone_name}
    
    Requirements: {from requirements}
    Goal: {milestone goal}
  "
)
```

### Step 8: Update STATE.md

```markdown
## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: {today} — Milestone v[X.Y] started
```

### Step 9: Commit

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" commit "docs: start milestone v[X.Y] [Name]" --files .planning/PROJECT.md .planning/STATE.md
```

## Output

```
# Milestone v{X.Y}: {Name} ✓ Started

## Goal
{one sentence}

## Features
- Feature 1
- Feature 2
- Feature 3

## Roadmap
- Phase 1: {name} ({plans} plans)
- Phase 2: {name} ({plans} plans)

## ▶ Next Up

/gsd:discuss-phase 01 — gather context for first phase
/gsd:plan-phase 01 — skip discussion, plan directly

<sub>`/clear` first → fresh context window</sub>
```

## Dependencies

This skill uses:
- gsd-tools - For state and commit operations
- gsd-project-researcher - For research phase
- gsd-roadmapper - For roadmap creation
- gsd-plan-phase - For planning phases
- gsd-discuss-phase - For gathering context
