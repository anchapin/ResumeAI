# GSD Plan Phase Skill

Create executable phase prompts (PLAN.md files) for a roadmap phase. Default flow: Research (if needed) -> Plan -> Verify -> Done. Orchestrates planning agents with revision loops.

## Triggers

- "gsd plan-phase"
- "gsd:plan-phase"
- "gsd-plan-phase"
- "plan phase"
- "make plan"
- "create plan"

## Description

Creates executable plans for a phase with:
- Context gathering and research (optional)
- Plan creation with task breakdown
- Verification against requirements
- Revision loops (max 3 iterations)

## Process

### Step 1: Initialize

```bash
INIT=$(node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" init plan-phase "$PHASE")
echo "$INIT"
```

Parse JSON for: `researcher_model`, `planner_model`, `checker_model`, `research_enabled`, `plan_checker_enabled`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `has_research`, `has_context`, `has_plans`, `plan_count`, `phase_req_ids`.

**If `planning_exists` is false:** Error — run `/gsd:new-project` first.

### Step 2: Validate Phase

```bash
PHASE_INFO=$(node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" roadmap get-phase "${PHASE}")
```

Extract `phase_number`, `phase_name`, `goal` from JSON.

If phase not found: Error with available phases.

If phase valid but directory doesn't exist:
```bash
mkdir -p ".planning/phases/${padded_phase}-${phase_slug}"
```

### Step 3: Check Existing Artifacts

From init: `has_research`, `has_context`, `has_plans`, `plan_count`.

Report current state:
```
## Phase {X}: {Name}

- Research: {exists/pending}
- Context: {exists/pending}  
- Plans: {count} existing

Goal: {from roadmap}
```

### Step 4: Research Phase (if enabled)

If `--research` flag or no research exists:

**If context doesn't exist:**
```
## Research Required

No CONTEXT.md found. Gathering context for {Phase X}...

Options:
- /gsd:discuss-phase {phase} — gather context interactively
- /gsd:plan-phase {phase} --prd @file.md — use PRD file
- Continue with auto-generated context
```

**If continuing:**
Spawn gsd-project-researcher agent:
```
Task(
  subagent_type="gsd-project-researcher",
  prompt="
    Research phase {phase_number}: {phase_name}
    
    Goal: {goal from roadmap}
    Requirements: {phase_req_ids}
    
    Output: Create .planning/phases/{phase_dir}/RESEARCH.md
  "
)
```

### Step 5: Context Gathering

If no CONTEXT.md exists:
- Read PROJECT.md, ROADMAP.md, STATE.md
- Read existing RESEARCH.md if exists
- Generate CONTEXT.md with:
  - Locked decisions (from PROJECT.md, RESEARCH.md)
  - Claude's discretion areas
  - Technical constraints
  - Dependencies

### Step 6: Plan Creation

Spawn gsd-planner agent:
```
Task(
  subagent_type="gsd-planner",
  prompt="
    Create executable plan for phase {phase_number}: {phase_name}
    
    Goal: {goal from roadmap}
    Requirements: {phase_req_ids}
    
    Output: Create .planning/phases/{phase_dir}/{plan_id}-PLAN.md
    
    Use template: /home/alex/.agents/get-shit-done/templates/phase-prompt.md
    
    Success criteria:
    - Each task has clear action, verify, done
    - Dependencies identified
    - Wave grouping for parallel execution
  "
)
```

### Step 7: Plan Verification

If `plan_checker_enabled` or no flag `--skip-verify`:

Spawn gsd-plan-checker agent:
```
Task(
  subagent_type="gsd-plan-checker",
  prompt="
    Verify plan: .planning/phases/{phase_dir}/{plan_id}-PLAN.md
    
    Check:
    - All requirements covered
    - Tasks are actionable
    - Dependencies are correct
    - Wave grouping is optimal
    
    Output: Verification report
  "
)
```

### Step 8: Revision Loop

If verification finds issues:
- Max 3 revision iterations
- Each iteration: Planner fixes issues -> Checker verifies again
- After 3 failures: Exit with issues documented

### Step 9: Complete

```
## ✓ Phase {X} Planned

Created {N} plans:
- {plan_id}: {objective summary}
- ...

## ▶ Next Up

/gsd:execute-phase {phase} — execute plans
/gsd:verify-phase {phase} — verify phase
```

## Arguments

| Argument | Description |
|----------|-------------|
| `--research` | Run research phase first |
| `--skip-research` | Skip research even if not done |
| `--gaps` | Plan only gap closure (from failed UAT) |
| `--skip-verify` | Skip plan verification |
| `--prd @file.md` | Use PRD file for context |

## Output

Creates PLAN.md files in phase directory:
```
.planning/phases/01-name/
├── 01-01-PLAN.md
├── 01-02-PLAN.md
├── CONTEXT.md
└── RESEARCH.md (if research enabled)
```

## Dependencies

This skill uses:
- gsd-tools - For initialization and validation
- gsd-project-researcher - For research phase
- gsd-planner - For plan creation
- gsd-plan-checker - For plan verification
- gsd-execute-phase - For executing created plans
