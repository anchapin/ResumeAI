# Versioning Strategy

ResumeAI follows [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) (SemVer).

## Version Format

The version format is `MAJOR.MINOR.PATCH`.

- **MAJOR** version increment for incompatible API changes or significant architectural shifts.
- **MINOR** version increment for adding functionality in a backwards-compatible manner.
- **PATCH** version increment for backwards-compatible bug fixes.

## Release Cadence

We currently aim for a **bi-weekly** release cycle, or more frequent as needed for critical fixes.

## PR Labels for Versioning

To assist with automated changelog generation and versioning, please label your Pull Requests:

| Label | SemVer Increment | Description |
|-------|------------------|-------------|
| `breaking` | MAJOR | Changes that break existing functionality or APIs. |
| `feat` or `enhancement` | MINOR | New features or significant improvements. |
| `fix` or `bug` | PATCH | Bug fixes. |
| `docs` | PATCH/None | Documentation-only changes. |
| `refactor` | PATCH/None | Code changes that neither fix a bug nor add a feature. |
| `perf` | PATCH | Performance improvements. |

## Pre-releases

For features that require extensive testing before being merged into the stable release, we use pre-release tags:

- `vX.Y.Z-alpha.N`: Internal testing and initial development.
- `vX.Y.Z-beta.N`: Feature-complete, ready for external testing.
- `vX.Y.Z-rc.N`: Release candidate, almost stable.

## Maintenance

Only the most recent MAJOR.MINOR version is actively supported with security patches.
