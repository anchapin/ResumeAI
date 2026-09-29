# GSD Orchestrator Skill

Central orchestration skill that routes commands to appropriate GSD sub-skills. The "main menu" for GSD workflows - detects intent and delegates to specialized skills.

## Triggers

- "gsd" (alone)
- "gsd:orchestrator"
- "gsd-orchestrator"
- "gsd help"
- "gsd:help"

## Description

Routes GSD commands to appropriate skills:
- new-project, new-milestone - Project initialization
- plan-phase, execute-phase, verify-phase - Phase management
- progress, check-todos - Status tracking
- discuss-phase - Context gathering
- verify-work - Comprehensive verification

## Command Routing

| Command | Routes to |
|---------|-----------|
| `/gsd:new-project` | gsd-new-project |
| `/gsd:new-milestone` | gsd-new-milestone |
| `/gsd:plan-phase` | gsd-plan-phase |
| `/gsd:execute-phase` | gsd-execute-phase |
| `/gsd:verify-phase` | gsd-verify-phase |
| `/gsd:complete-milestone` | gsd-complete-milestone |
| `/gsd:progress` | gsd-progress |
| `/gsd:discuss-phase` | gsd-discuss-phase |
| `/gsd:check-todos` | gsd-check-todos |
| `/gsd:map-codebase` | gsd-codebase-mapper |
| `/gsd:verify-work` | gsd-verifier |
| `/gsd:debug` | gsd-debugger |

## Process

### Step 1: Parse Command

Extract command and arguments from user input.

### Step 2: Route to Skill

Match command to appropriate GSD skill.

### Step 3: Pass Context

Forward arguments and context to sub-skill.

### Step 4: Handle Results

Process skill output and present unified results.

## GSD Workflow Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GSD Project Lifecycle                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌────────────┐    ┌──────────────────┐   │
│  │ new-     │───▶│ plan-phase │───▶│ execute-phase   │   │
│  │ project  │    │            │    │                  │   │
│  └──────────┘    └────────────┘    └──────────────────┘   │
│       │                                      │              │
│       │              ┌────────────┐          │              │
│       └─────────────▶│ new-       │◀─────────┘              │
│                      │ milestone  │                         │
│                      └────────────┘                         │
│                            │                                │
│                            ▼                                │
│                      ┌────────────┐                         │
│                      │ complete-  │                         │
│                      │ milestone  │                         │
│                      └────────────┘                         │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│  Supporting Workflows                                        │
│  ─────────────────                                          │
│  • progress      → View project progress                    │
│  • check-todos   → Review blockers/decisions                │
│  • discuss-phase → Gather phase context                     │
│  • verify-phase  → Verify phase deliverables                │
│  • verify-work   → Comprehensive verification              │
│  • debug         → Investigate issues                       │
└─────────────────────────────────────────────────────────────┘
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `/gsd:progress` | View overall project progress |
| `/gsd:new-project` | Start a new project |
| `/gsd:plan-phase 1` | Plan phase 1 |
| `/gsd:execute-phase 1` | Execute phase 1 plans |
| `/gsd:verify-phase 1` | Verify phase 1 deliverables |
| `/gsd:new-milestone` | Start next milestone |
| `/gsd:check-todos` | Review blockers |

## Dependencies

This skill coordinates:
- gsd-new-project - Project initialization
- gsd-new-milestone - Milestone creation
- gsd-plan-phase - Phase planning
- gsd-execute-phase - Phase execution
- gsd-verify-phase - Phase verification
- gsd-complete-milestone - Milestone completion
- gsd-progress - Progress tracking
- gsd-discuss-phase - Context gathering
- gsd-check-todos - Blocker management
- gsd-verifier - Work verification
- gsd-debugger - Issue investigation
