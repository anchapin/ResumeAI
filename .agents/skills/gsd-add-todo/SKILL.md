# GSD Add Todo Skill

Add a todo item to the current phase or project. Quick action to capture pending tasks without full planning.

## Triggers

- "gsd add-todo"
- "gsd:add-todo"
- "gsd-add-todo"
- "add todo"
- "new todo"
- "action item"

## Description

Quick todo addition:
- Add to current phase
- Add to project-level
- Assign priority
- Set optional due date

## Process

### Step 1: Determine Context

- Read STATE.md to find current phase
- Determine where to add todo

### Step 2: Get Todo Details

Ask user:
1. "What needs to be done?"
2. Priority: High / Medium / Low
3. Due date (optional)

### Step 3: Add Todo

```bash
node "$HOME/.agents/get-shit-done/bin/gsd-tools.cjs" todo add "{description}" --priority {high/medium/low} --phase {phase}
```

## Output

```
## ✓ Todo Added

- {description}
- Priority: {priority}
- Phase: {phase}

Total open: {count}
```

## Dependencies

This skill uses:
- gsd-tools - For todo management
