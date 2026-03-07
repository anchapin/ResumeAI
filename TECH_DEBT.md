# Tech Debt Tracking

This document outlines the technical debt tracking mechanism for the ResumeAI codebase.

## Overview

Technical debt is a concept representing the implied cost of additional rework caused by choosing an easy (limited) solution now instead of using a better approach that would take longer. This repository uses a structured approach to track and manage technical debt.

## Tracking System

### Data Storage

Technical debt items are tracked in `tech_debt.json` - a structured JSON file that maintains all debt items with the following properties:

- **id**: Unique identifier for the debt item
- **title**: Brief title describing the debt
- **description**: Detailed explanation of the technical debt
- **category**: Classification (code_quality, architecture, dependencies, testing, documentation, performance, security)
- **priority**: Severity level (critical, high, medium, low)
- **status**: Current state (identified, in_progress, resolved, accepted)
- **dateIdentified**: When the debt was first identified
- **dateResolved**: When the debt was resolved (if applicable)
- **issueReference**: GitHub issue number related to this debt
- **affectedFiles**: List of files or components impacted by this debt
- **estimatedEffort**: Estimated time to resolve (e.g., "2 hours", "1 day")
- **reporter**: Who identified the debt

### Categories

| Category | Description |
|----------|-------------|
| Code Quality | Issues related to code structure, readability, and maintainability |
| Architecture | Structural improvements needed in the codebase |
| Dependencies | Outdated packages, security vulnerabilities, or dependency issues |
| Testing | Test coverage gaps, testing infrastructure improvements |
| Documentation | Missing or outdated documentation |
| Performance | Performance optimization opportunities |
| Security | Security improvements and vulnerabilities |

### Priorities

| Priority | Description | Score |
|----------|-------------|-------|
| Critical | Must be addressed immediately | 4 |
| High | Should be addressed in current sprint | 3 |
| Medium | Should be addressed in next few sprints | 2 |
| Low | Can be addressed when time permits | 1 |

### Statuses

| Status | Description |
|--------|-------------|
| Identified | Debt item has been identified |
| In Progress | Currently addressing this debt |
| Resolved | Debt has been resolved |
| Accepted | Debt is accepted and documented |

## Adding New Technical Debt

When you identify technical debt during development:

1. Add a new entry to `tech_debt.json` with all relevant details
2. Create a GitHub issue for tracking the debt resolution
3. Reference the issue number in the `issueReference` field
4. Set the appropriate category and priority

Example entry:

```json
{
  "id": "TD-001",
  "title": "Replace deprecated React lifecycle methods",
  "description": "Several components use componentWillMount and componentWillReceiveProps which are deprecated in React 16.3+",
  "category": "code_quality",
  "priority": "high",
  "status": "identified",
  "dateIdentified": "2026-03-07",
  "issueReference": 800,
  "affectedFiles": ["src/components/Editor.tsx", "src/components/Preview.tsx"],
  "estimatedEffort": "4 hours",
  "reporter": "developer-name"
}
```

## Viewing Tech Debt Report

To view the current tech debt status:

```bash
# View the tech debt JSON
cat tech_debt.json

# Or use jq for formatted output
jq '.debtItems' tech_debt.json
```

## Best Practices

1. **Address proactively**: Don't let tech debt accumulate. Address small debts regularly.
2. **Document thoroughly**: Always provide enough context for future developers to understand the debt.
3. **Prioritize wisely**: Use the priority system to focus on the most impactful debts.
4. **Track resolution**: Update status when debt is addressed to maintain accurate reporting.
5. **Include in planning**: Factor tech debt into sprint planning and project estimates.

## Integration with Development Workflow

- **Code Reviews**: Identify and document tech debt during code reviews
- **Issue Tracking**: Link tech debt items to GitHub issues for tracking
- **Sprint Planning**: Review tech debt items when planning sprints
- **Onboarding**: New team members should review this document and the tracking file

## Related Documentation

- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contributing guidelines
- [CODE_REVIEW_CHECKLIST.md](./CODE_REVIEW_CHECKLIST.md) - Code review process
- [AGENTS.md](./AGENTS.md) - Repository-specific agent knowledge
