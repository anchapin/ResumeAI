---
name: find-unused-deps
description: "Detect unused npm dependencies in the ResumeAI frontend project."
---

# Find Unused Dependencies Skill

This skill detects unused npm dependencies in the ResumeAI project to help keep the project lean and reduce bloat.

## Capabilities

- **Scan Dependencies**: Find unused packages in package.json
- **Production Deps**: Check production dependencies only
- **Development Deps**: Check development dependencies only
- **JSON Output**: Generate machine-readable output
- **Safe Detection**: Automatic handling of special cases (types, configs)

## Usage

### Detect All Unused Dependencies

```bash
npm run deps:unused
```

### Check Production Dependencies

```bash
npm run deps:unused -- --prod
```

### Check Development Dependencies

```bash
npm run deps:unused -- --dev
```

### Output JSON Format

```bash
npm run deps:unused -- --json
```

## How It Works

The detection script scans:
- Source files: `src/`, `components/`, `pages/`, `hooks/`, `utils/`, `contexts/`, `store/`, `i18n/`
- Config files: `eslint.config.js`, `vitest.config.ts`, `vite.config.ts`, etc.
- Package.json scripts and configuration
- Test files

### Special Cases Handled

The script automatically considers these as "used":
- Type packages (`@types/*`)
- ESLint plugins and configs
- Vitest coverage providers
- Scoped packages (`@org/package`)
- Packages used in scripts

## Usage in CI/CD

A GitHub Actions workflow (`.github/workflows/unused-deps.yml`) runs this check on:
- Push to main/develop branches
- Pull requests
- Weekly schedule

## Interpreting Results

### Common False Positives

Some packages may appear unused but are actually needed:
- Packages used in build scripts
- Peer dependencies
- Type definitions loaded at runtime
- Packages used in dynamic imports

### Actions to Take

1. **Verify the detection**: Check if the package is truly unused
2. **Remove unused packages**: Run `npm uninstall <package>`
3. **Keep necessary packages**: If false positive, document why it's needed

## Example Workflow

```bash
# Run detection
npm run deps:unused

# Remove unused package
npm uninstall unused-package

# Or save exact version if needed for compatibility
npm install unused-package --save-exact
```

## Tips

- Run this check before major releases
- Check both prod and dev dependencies separately
- Review false positives and add comments if keeping them
- Consider using `npm audit` for security vulnerabilities too
