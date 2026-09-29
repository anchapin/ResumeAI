# GSD Discuss Milestone Skill

Interactive discussion to gather milestone goals and scope. Alternative to flat goal description — conversation-driven milestone definition. Creates MILESTONE-CONTEXT.md for new-milestone workflow.

## Triggers

- "gsd discuss-milestone"
- "gsd:discuss-milestone"
- "gsd-discuss-milestone"
- "discuss milestone"
- "talk about milestone"
- "plan milestone"

## Description

Interactive milestone planning through discussion:
- Review what shipped previously
- Gather goals for next milestone
- Scope features and requirements
- Create MILESTONE-CONTEXT.md

## Process

### Step 1: Load Previous Context

- Read PROJECT.md (existing project)
- Read MILESTONES.md (history)
- Read STATE.md (current state)

### Step 2: Review What Shipped

Display last milestone:
```
## Last Milestone: v{X.Y}

**Delivered:**
- {feature 1}
- {feature 2}
```

### Step 3: Gather Goals

Ask user:
1. "What do you want to build in the next milestone?"
2. "What problem are we solving?"
3. "Who is this for?"
4. "What does success look like?"

### Step 4: Scope Features

For each goal:
- Identify key features
- Estimate complexity (simple/medium/complex)
- Identify dependencies

### Step 5: Create MILESTONE-CONTEXT.md

```markdown
# Milestone v{X.Y} Context

## Goals
- {goal 1}
- {goal 2}

## Target Users
- {user 1}
- {user 2}

## Features
| Feature | Complexity | Depends On |
|---------|------------|------------|
| {feat}  | {complex}  | {deps}     |

## Success Criteria
- {criterion 1}
- {criterion 2}

## Notes
- {notes}
```

## Output

```
## ✓ Milestone Context Gathered

**Goals:**
- Goal 1
- Goal 2

**Key Features:**
- Feature 1 (complex)
- Feature 2 (simple)

## ▶ Next Up

/gsd:new-milestone — create milestone with this context
```

## Dependencies

This skill uses:
- gsd-tools - For file operations
- gsd-new-milestone - For next step
