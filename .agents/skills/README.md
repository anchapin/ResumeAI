# ResumeAI Skills

This directory contains automation skills for the ResumeAI project. Each skill is a self-contained automation that can be invoked by AI agents.

## Available Skills

### Testing & Quality

| Skill | Description |
|-------|-------------|
| [run-tests](run-tests/) | Run frontend and backend tests with coverage |
| [code-lint](code-lint/) | Run linters and formatters (ESLint, Prettier) |
| [analyze-coverage](analyze-coverage/) | Analyze test coverage reports |
| [accessibility-test](accessibility-test/) | Run accessibility tests (WCAG) |

### Development Tools

| Skill | Description |
|-------|-------------|
| [find-unused-deps](find-unused-deps/) | Detect unused npm dependencies |
| [database-inspect](database-inspect/) | Inspect and query SQLite database |

### Infrastructure & DevOps

| Skill | Description |
|-------|-------------|
| [docker-build](docker-build/) | Build and run Docker containers |
| [git-branch-workflow](git-branch-workflow/) | Manage branches, commits, and PRs |

## Quick Start

Each skill contains a `SKILL.md` file with detailed usage instructions. To use a skill:

1. Navigate to the skill directory: `.agents/skills/<skill-name>/`
2. Read `SKILL.md` for usage instructions
3. Execute the commands described

## Adding New Skills

To add a new skill:
1. Create a directory under `.agents/skills/<skill-name>/`
2. Add a `SKILL.md` file describing the skill
3. Include the following frontmatter:
```yaml
---
name: skill-name
description: "Brief description of what the skill does"
---
```
4. Add usage examples, commands, and tips

## Skill Format

Skills are distributed as `.skill` zip files containing:
- `SKILL.md` - Documentation and usage guide
- Optional: helper scripts, configurations

The `.skill` files are stored in the project root and can be installed/extracted as needed.

## Integration with AI Agents

AI agents (like Claude Code) can discover and use skills from this directory using the `find-skills` skill.
