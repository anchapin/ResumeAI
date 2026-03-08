# ResumeAI Skills

This directory contains automation skills for the ResumeAI project. Each skill is a self-contained automation that can be invoked by AI agents.

## Available Skills

Currently no custom skills defined. 

## Adding New Skills

To add a new skill:
1. Create a directory under `.agents/skills/<skill-name>/`
2. Add a `SKILL.md` file describing the skill
3. The skill will be automatically discovered by AI agents

## Integration with AI Agents

AI agents (like Claude Code) can discover and use skills from this directory using the `find-skills` skill.
