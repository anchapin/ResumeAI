# GSD Execute Phase Skill

Execute all plans in a phase using wave-based parallel execution. Orchestrates subagents for each plan while handling dependencies and checkpoints.

## Triggers

- "gsd execute-phase"
- "gsd:execute-phase"
- "gsd-execute-phase"
- "execute phase"
- "run phase"
- "execute plan"
- "run plan"

## Description

Executes phase plans with:
- Wave-based execution (parallel within waves, sequential between)
- Dependency management between plans
- Checkpoint handling for human verification
- Progress tracking and state updates

## Process

### Step 1: Initialize

```bash
INIT=$(node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" init execute-phase "${PHASE_ARG}")
echo "$INIT"
```

Parse JSON for: `executor_model`, `verifier_model`, `parallelization`, `branching_strategy`, `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `plans`, `incomplete_plans`, `plan_count`, `incomplete_count`.

**If `phase_found` is false:** Error — phase directory not found.
**If `plan_count` is 0:** Error — no plans found in phase.

### Step 2: Handle Branching

Check `branching_strategy` from init:
- "none": Skip, continue on current branch
- "phase" or "milestone": Use pre-computed `branch_name`

```bash
git checkout -b "$BRANCH_NAME" 2>/dev/null || git checkout "$BRANCH_NAME"
```

### Step 3: Discover and Group Plans

```bash
PLAN_INDEX=$(node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" phase-plan-index "${PHASE_NUMBER}")
echo "$PLAN_INDEX"
```

Parse JSON for: `plans[]` (each with `id`, `wave`, `autonomous`, `objective`), `waves` (map of wave number → plan IDs), `incomplete`, `has_checkpoints`.

Report:
```
## Execution Plan

**Phase {X}: {Name}** — {total_plans} plans across {wave_count} waves

| Wave | Plans | What it builds |
|------|-------|----------------|
| 1 | 01-01, 01-02 | {from plan objectives} |
| 2 | 01-03 | ... |
```

### Step 4: Execute Waves

For each wave:

1. **Describe what's being built:**
```
## Wave {N}

**{Plan ID}: {Plan Name}**
{2-3 sentences: what this builds, technical approach, why it matters}
```

2. **Spawn executor agents:**

For each plan, spawn gsd-executor agent:
```
Task(
  subagent_type="gsd-executor",
  model="{executor_model}",
  prompt="
    <objective>
    Execute plan {plan_number} of phase {phase_number}-{phase_name}.
    Commit each task atomically. Create SUMMARY.md. Update STATE.md and ROADMAP.md.
    </objective>

    <execution_context>
    @/home/alex/.agents/get-shit-done/workflows/execute-plan.md
    @/home/alex/.agents/get-shit-done/templates/summary.md
    @/home/alex/.agents/get-shit-done/references/checkpoints.md
    @/home/alex/.agents/get-shit-done/references/tdd.md
    </execution_context>

    <files_to_read>
    - {phase_dir}/{plan_file} (Plan)
    - .planning/STATE.md (State)
    - .planning/config.json (Config)
    </files_to_read>

    <success_criteria>
    - [ ] All tasks executed
    - [ ] Each task committed individually
    - [ ] SUMMARY.md created in plan directory
    - [ ] STATE.md updated with position and decisions
    - [ ] ROADMAP.md updated with plan progress
    </success_criteria>
  "
)
```

3. **Wait for completion**

4. **Spot-check results:**
- Verify SUMMARY.md exists
- Check git commits present
- Check for `## Self-Check: FAILED` marker

5. **Handle failures:**
- Report failed plan
- Ask: "Continue with remaining waves?" or "Stop?"

### Step 5: Checkpoint Handling

Plans with `autonomous: false` require user interaction.

**Checkpoint types:**
- `human-verify`: User must verify URL/output
- `decision`: User must make a decision
- `human-action`: User must perform action

Present to user:
```
## ⚠ Checkpoint Required

**Plan {ID}: {Name}** requires {checkpoint_type}.

{Details}

[Options presented to user]

After user responds, spawn continuation agent with response.
```

### Step 6: Complete Phase

When all waves complete:
```
## ✓ Phase {X} Complete

- {plan_count} plans executed
- {N} waves completed
- {commit_count} commits

## ▶ Next Up

/gsd:verify-phase {phase} — verify phase deliverables
/gsd:progress — check overall progress
```

## Wave Execution

- **Parallel within waves**: If `parallelization: true`, execute all plans in a wave simultaneously
- **Sequential between waves**: Wait for all plans in wave N before starting wave N+1
- **Dependency handling**: Plans list `depends_on` in frontmatter

## Auto Mode

If `--auto` flag present:
- Auto-approve checkpoints (use sensible defaults)
- Continue on failures (with warning)
- Skip user prompts

## Dependencies

This skill uses:
- gsd-tools - For initialization and plan indexing
- gsd-executor - For executing individual plans
- gsd-verifier - For phase verification
- gsd-progress - For progress tracking

## Error Handling

- Phase not found → Show available phases
- No plans in phase → Suggest /gsd:plan-phase
- Plan fails → Offer retry or continue
- Checkpoint blocked → Present to user for decision
