# GSD New Project Skill

Initialize a new project through unified flow: questioning, research (optional), requirements, roadmap. This is the most leveraged moment in any project — deep questioning here means better plans, better execution, better outcomes.

## Triggers

- "gsd new-project"
- "gsd:new-project"
- "gsd-new-project"
- "new project"
- "start project"
- "init project"
- "create project"

## Description

Creates a new GSD project with:
- Project definition (PROJECT.md)
- Requirements analysis (REQUIREMENTS.md)  
- Roadmap with phases (ROADMAP.md)
- State tracking (STATE.md)

Supports both interactive and auto modes.

## Process

### Step 1: Setup - Check Existing Project

```bash
INIT=$(node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" init new-project)
echo "$INIT"
```

Parse JSON for: `researcher_model`, `synthesizer_model`, `roadmapper_model`, `commit_docs`, `project_exists`, `has_codebase_map`, `planning_exists`, `has_existing_code`, `has_package_file`, `is_brownfield`, `needs_codebase_map`, `has_git`, `project_path`.

**If `project_exists` is true:** Error — project already initialized. Use `/gsd:progress`.

**If `has_git` is false:** Initialize git:
```bash
git init
```

### Step 2: Brownfield Detection

Check if existing code detected (needs codebase mapping):
- `needs_codebase_map: true` - Offer to map codebase first

If needs mapping:
```
I detected existing code in this directory. Would you like to map the codebase first?

Options:
- "Map codebase first" — Run /gsd:map-codebase to understand existing architecture
- "Skip mapping" — Proceed with project initialization
```

### Step 3: Auto Mode Detection

Check if `--auto` flag is present. Auto mode:
- Skips brownfield mapping (assumes greenfield)
- Skips deep questioning (extract from provided document)
- Uses smart defaults

**If auto mode:**
- Requires idea document: `@prd.md` or pasted text
- After config: run Steps 6-9 automatically

### Step 4: Configuration Questions

Ask user for project settings:

**Granularity:**
- "Coarse (Recommended)" - Few, broad phases (3-5 phases, 1-3 plans)
- "Standard" - Balanced (5-8 phases, 3-5 plans)
- "Fine" - Many focused phases (8-12 phases, 5-10 plans)

**Git Integration:**
- "Commit planning docs" - Auto-commit .planning/ changes
- "Skip git" - Don't commit

**Research:**
- "Yes, research it" - Run research phase
- "No, skip research" - Proceed without research

### Step 5: Questioning Phase

Ask user about the project:
- What are you building?
- Who is it for?
- What problem does it solve?
- What does success look like?

Document in PROJECT.md with:
- Project name
- Description
- Target users
- Problem statement
- Success criteria

### Step 6: Research Phase (if enabled)

If research enabled:
```
Spawn gsd-project-researcher agent to research domain
```

Research outputs:
- Competitive analysis
- Technology recommendations
- Architecture patterns
- Risk assessment

### Step 7: Requirements Phase

Collect requirements:
- Table stakes (must-haves)
- Features (should-haves)
- Nice-to-haves

Create REQUIREMENTS.md with:
- Requirement IDs (REQ-01, REQ-02, etc.)
- Priority (must/should/could)
- Acceptance criteria
- Phase assignment

### Step 8: Roadmap Phase

Create ROADMAP.md:
- Phase breakdown based on granularity
- Dependencies between phases
- Goal and requirements per phase
- Success criteria per phase

### Step 9: State Initialization

Create STATE.md:
- Current phase: "01"
- Project status: "in_progress"
- Decisions: []
- Blockers: []
- Notes: []

### Step 10: Directory Structure

Create phase directories:
```
.planning/
├── PROJECT.md
├── REQUIREMENTS.md
├── ROADMAP.md
├── STATE.md
├── MILESTONES.md
└── phases/
    └── 01-XXX/
```

## Auto Mode

For automated project creation:

```
/gsd:new-project --auto @prd.md
/gsd:new-project --auto [paste idea here]
```

Auto mode:
1. Extracts context from provided document
2. Skips questioning
3. Runs research automatically
4. Generates requirements from document
5. Creates roadmap with smart defaults
6. Auto-approves all outputs

## Output

Successful project creation:

```
# Project: [Name] ✓ Created

## Created Files
- .planning/PROJECT.md - Project definition
- .planning/REQUIREMENTS.md - Requirements analysis
- .planning/ROADMAP.md - Phase roadmap
- .planning/STATE.md - Project state
- .planning/phases/01-XXX/ - First phase directory

## Next Steps

## ▶ Ready to Plan

**Phase 1: [Name]** — [Goal from ROADMAP.md]

/gsd:discuss-phase 01 — gather context and clarify approach
/gsd:plan-phase 01 — skip discussion, plan directly

<sub>`/clear` first → fresh context window</sub>
```

## Dependencies

This skill uses:
- gsd-tools - For initialization and state management
- gsd-project-researcher - For research phase (if enabled)
- gsd-roadmapper - For roadmap creation
- gsd-plan-phase - For planning phases
- gsd-codebase-mapper - For brownfield mapping

## Error Handling

- Project already exists → Suggest `/gsd:progress`
- No git detected → Offer to initialize git
- Missing idea document (auto mode) → Show usage
- Research fails → Continue without research
