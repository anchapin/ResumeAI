# Tech Debt Tracking

This document describes how tech debt tracking works in ResumeAI.

## Overview

Tech debt tracking is implemented to identify and monitor TODO, FIXME, XXX, and HACK comments in the codebase. This helps prioritize refactoring efforts.

## Usage

Run the tech debt tracker:

```bash
python scripts/track_tech_debt.py
```

For JSON output:

```bash
python scripts/track_tech_debt.py --format json
```

## CI Integration

Add to your CI workflow:

```yaml
- name: Track tech debt
  run: python scripts/track_tech_debt.py --output tech-debt-report.txt
```

## Configuration

Edit `scripts/track_tech_debt.py` to customize:
- File extensions to scan
- Comment patterns to search
- Directories to skip

## Types Tracked

- **TODO**: Future improvements needed
- **FIXME**: Known issues that need fixing
- **XXX**: Warnings about problematic code
- **HACK**: Temporary workarounds

## Best Practices

1. Run the tracker regularly to monitor new tech debt
2. Address FIXME items first (known bugs)
3. Review TODO items during sprint planning
4. Convert HACK comments to proper solutions when possible
