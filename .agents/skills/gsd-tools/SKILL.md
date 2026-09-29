# GSD Tools Skill

Access GSD (Get-Shit-Done) CLI tools for project management. This skill wraps the gsd-tools.cjs command-line utility to provide project state, progress tracking, phase management, and verification capabilities.

## Triggers

- "gsd tools"
- "gsd-tool"
- "gsd:tools"
- "get shit done tools"
- "project progress"
- "show progress"
- "roadmap status"

## Description

Access GSD CLI tools for project management including:
- Progress tracking and visualization
- State management and snapshots
- Phase and roadmap analysis
- Plan verification and validation
- Template scaffolding

## Commands

### Progress Commands

```
gsd progress bar        # Show progress bar (e.g., [██████░░░░] 14/41 plans)
gsd progress json       # Show progress as JSON
gsd progress table      # Show progress as table
```

### State Commands

```
gsd state load         # Load project config + state
gsd state json         # Output STATE.md frontmatter as JSON
gsd state snapshot     # Get structured STATE.md parse
gsd state update <field> <value>  # Update STATE.md field
```

### Phase Commands

```
gsd phase find <phase>         # Find phase directory by number
gsd phase add <description>     # Add new phase to roadmap
gsd phase remove <phase>       # Remove phase
gsd phase complete <phase>     # Mark phase complete
```

### Roadmap Commands

```
gsd roadmap analyze     # Full roadmap parse with disk status
gsd roadmap get-phase <phase>  # Extract phase from ROADMAP.md
```

### Verification Commands

```
gsd verify plan-structure <file>    # Check PLAN.md structure
gsd verify phase-completeness <phase>  # Check all plans have summaries
gsd verify references <file>        # Check @-refs resolve
```

### Template Commands

```
gsd template fill summary --phase N    # Create pre-filled SUMMARY.md
gsd template fill plan --phase N      # Create pre-filled PLAN.md
gsd template fill verification        # Create VERIFICATION.md
```

### Scaffolding Commands

```
gsd scaffold context --phase N    # Create CONTEXT.md template
gsd scaffold uat --phase N        # Create UAT.md template
gsd scaffold phase-dir --phase N  # Create phase directory
```

## Usage Examples

### Check Project Progress

User: "Show me the project progress"

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" progress bar
```

Returns:
```
[██████░░░░░░░░░░░░░] 14/41 plans (34%)
```

### Get Full State Snapshot

User: "What's the current project state?"

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" state snapshot
```

Returns JSON with:
- current_phase
- next_phase
- phases[]
- blockers[]
- decisions[]
- milestone_version

### Analyze Roadmap

User: "Show me the roadmap status"

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" roadmap analyze
```

Returns JSON with:
- All phases with disk status (complete/partial/planned)
- Goal and dependencies per phase
- Plan and summary counts
- Progress percentage

### Find Phase Directory

User: "Where is phase 3?"

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" find-phase 03
```

Returns phase directory path.

## Integration with Other Skills

This skill works with other GSD workflow skills:
- gsd-planner - Uses gsd-tools for phase analysis
- gsd-executor - Uses gsd-tools for progress tracking
- gsd-verifier - Uses gsd-tools for verification
- gsd-roadmapper - Uses gsd-tools for roadmap management
- gsd-codebase-mapper - Uses gsd-tools for project context

## Error Handling

If GSD tools are not available:
- Check if .planning/ directory exists
- Suggest /gsd:new-project if no project exists
- Provide manual alternatives for common operations

## Notes

- GSD tools require Node.js to run
- Tools look for .planning/ directory in current working directory
- Some commands require being inside a GSD project directory
- JSON output can be parsed for programmatic use
