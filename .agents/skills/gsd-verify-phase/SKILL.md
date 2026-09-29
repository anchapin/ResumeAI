# GSD Verify Phase Skill

Verify phase deliverables against requirements and success criteria. Checks plan execution completeness, artifact existence, and cross-phase integration.

## Triggers

- "gsd verify-phase"
- "gsd:verify-phase"
- "gsd-verify-phase"
- "verify phase"
- "check phase"
- "validate phase"

## Description

Verifies phase completion by:
- Checking all plans have summaries
- Verifying artifacts exist on disk
- Running verification checks
- Generating UAT (User Acceptance Testing) report

## Process

### Step 1: Initialize

```bash
INIT=$(node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" init verify-phase "$PHASE")
echo "$INIT"
```

Parse: `phase_found`, `phase_dir`, `phase_number`, `phase_name`, `plan_count`, `summary_count`, `has_verification`.

**If `phase_found` is false:** Error.
**If `summary_count` is 0:** Error — execute plans first.

### Step 2: Check Completeness

```bash
# Verify all plans have summaries
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" verify phase-completeness "${PHASE_NUMBER}"
```

Report:
```
## Phase {X} Verification

Plans: {plan_count}
Summaries: {summary_count}
Status: {complete/incomplete}
```

### Step 3: Verify Artifacts

For each plan SUMMARY.md:
- Read `artifacts.created[]`
- Verify files exist on disk
- Check file contents match expected patterns

```bash
# Check specific artifacts
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" verify artifacts <plan-file>
```

### Step 4: Run Verification Suite

```bash
# Verify plan structure
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" verify plan-structure <plan-file>

# Verify references
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" verify references <plan-file>

# Verify commits
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" verify commits <commit-hash>
```

### Step 5: Generate UAT Report

Create UAT.md with:
- Test scenarios
- Expected vs actual results
- Pass/fail status
- Gap documentation

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" scaffold uat --phase "${PHASE_NUMBER}"
```

### Step 6: Integration Check

If multiple phases exist:
- Check cross-phase dependencies
- Verify previous phase outputs are used
- Test integration points

```bash
# Run integration checker
# Uses gsd-integration-checker skill
```

## Output Format

```
## Phase {X} Verification Results

### Completeness
- Plans: {plan_count}/{plan_count} ✓
- Summaries: {summary_count}/{plan_count} ✓

### Artifact Verification
| Artifact | Status |
|----------|--------|
| file1.ts | ✓ Exists |
| file2.py | ✓ Exists |

### Verification Suite
| Check | Result |
|-------|--------|
| Plan Structure | ✓ Pass |
| References | ✓ Pass |
| Commits | ✓ Pass |

### UAT Results
- Test 1: ✓ Pass
- Test 2: ⚠ Needs Review

## Status: {PASS/NEEDS_WORK/FAILED}
```

## Success Criteria

- [x] All plans have summaries
- [x] All artifacts exist on disk
- [x] All verification checks pass
- [x] UAT tests pass
- [x] Integration points verified

## Dependencies

This skill uses:
- gsd-tools - For verification commands
- gsd-integration-checker - For cross-phase checks
- gsd-nyquist-auditor - For coverage validation
