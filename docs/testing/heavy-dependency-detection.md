# Heavy Dependency Detection

This document describes how heavy dependency detection works in ResumeAI.

## Overview

The bundle size analyzer identifies heavy npm and Python dependencies that could bloat the application.

## Usage

Run the analyzer:

```bash
python scripts/analyze_bundle_size.py
```

With custom thresholds:

```bash
python scripts/analyze_bundle_size.py --project-dir . --requirements resume-api/requirements.txt
```

## CI Integration

Add to your CI workflow:

```yaml
- name: Analyze bundle sizes
  run: python scripts/analyze_bundle_size.py --output bundle-report.txt
  continue-on-error: true
```

## Thresholds

- **Warning**: 500KB - triggers warning
- **Critical**: 1MB - triggers CI failure

## Detected Categories

### Known Heavy npm Packages

- moment (300KB)
- lodash (500KB)
- react-dom (400KB)
- three.js (1.5MB)
- tensorflow.js (2MB)

### Known Heavy Python Packages

- tensorflow (500MB)
- torch (500MB)
- pandas (100MB)
- scipy (150MB)
- opencv (80MB)

## Best Practices

1. Use tree-shaking with webpack
2. Import only needed functions
3. Consider lighter alternatives
4. Lazy load large modules
