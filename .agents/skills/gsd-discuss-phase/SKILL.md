# GSD Discuss Phase Skill

Gather context and clarify approach for a phase through interactive discussion. Alternative to PRD express path — conversation-driven context gathering. Builds CONTEXT.md with locked decisions and discretion areas.

## Triggers

- "gsd discuss-phase"
- "gsd:discuss-phase"
- "gsd-discuss-phase"
- "discuss phase"
- "talk about phase"
- "clarify phase"

## Description

Interactive context gathering for a phase:
- Reviews roadmap goal
- Clarifies technical approach
- Captures decisions
- Documents locked decisions vs discretion areas

## Process

### Step 1: Initialize

```bash
INIT=$(node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" init discuss-phase "$PHASE")
echo "$INIT"
```

Parse: `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `goal`, `phase_req_ids`.

**If `phase_found` is false:** Error.

### Step 2: Review Roadmap Goal

Display phase info:
```
## Phase {X}: {Name}

**Goal:** {goal from roadmap}

**Requirements:** {req IDs}
```

### Step 3: Interactive Discussion

Ask user:
1. "What's your technical approach?"
2. "What decisions are you locked into?"
3. "What should be left to Claude's discretion?"
4. "Any constraints or concerns?"

Document each response.

### Step 4: Generate CONTEXT.md

Create CONTEXT.md with:

**Locked Decisions** (user-specified):
- {decision 1}
- {decision 2}

**Claude's Discretion** (open to AI interpretation):
- {area 1}
- {area 2}

**Technical Notes:**
- {notes}

### Step 5: Save & Commit

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" commit "docs: discuss phase {X} {name}" --files "{phase_dir}/CONTEXT.md"
```

## Output

```
## ✓ Context Gathered

**Phase {X}: {Name}**

### Locked Decisions
- {decision 1}
- {decision 2}

### Claude's Discretion
- {area 1}
- {area 2}

## ▶ Next Up

/gsd:plan-phase {phase} — create executable plan
```

## Auto Mode

If `--auto` flag present:
- Skip interactive discussion
- Use default decisions
- Proceed to plan-phase

## Dependencies

This skill uses:
- gsd-tools - For initialization and commit
- gsd-plan-phase - For next step
