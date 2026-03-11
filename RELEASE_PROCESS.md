# Release Process

This document describes the step-by-step procedure for release management at ResumeAI.

## Release Cycle

We follow a **bi-weekly** release schedule. Every second **Tuesday**, a release candidate is prepared.

## Pre-Release Preparation

1. **Verify `main` status**: Ensure all tests pass on the `main` branch.
2. **Review PRs**: Ensure all PRs intended for the release have been merged.
3. **Update Version**: Update the version number in `package.json` (frontend) and `resume-api/pyproject.toml` (backend).
4. **Update Changelog**: Manually review and update `CHANGELOG.md` with entries from the current release.

## Creating a Release

### Step 1: Create a Git Tag

From the `main` branch:

```bash
git checkout main
git pull origin main
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

### Step 2: Automation (GitHub Actions)

Pushing a tag starting with `v` triggers the `.github/workflows/release.yml` workflow, which will:
- Generate release notes based on commit messages.
- Create a new GitHub Release.
- (Future) Trigger production deployments.

### Step 3: Verify Release

1. Review the generated GitHub Release for accuracy.
2. Verify the release artifacts (e.g., Docker images, frontend assets).
3. Run smoke tests in the staging environment.

## Rollback Procedure

If a critical issue is discovered post-release:

1. **Revert**: Revert the problematic commit(s) on `main`.
2. **Hotfix**: Create a new patch release (e.g., `vX.Y.(Z+1)`) and push.
3. **Notify**: Inform stakeholders and users about the rollback/hotfix.

## Post-Release Tasks

1. **Announce**: Share the release announcement in internal and external channels.
2. **Update Docs**: Ensure any documentation changes are reflected in the live documentation.
3. **Monitor**: Monitor error logs and performance metrics for the new release.

## Release Checklist Template

When preparing a release, use the following checklist:

- [ ] All tests passing on `main`.
- [ ] Version bumped in `package.json`.
- [ ] Version bumped in `resume-api/pyproject.toml`.
- [ ] `CHANGELOG.md` updated and reviewed.
- [ ] Git tag created and pushed.
- [ ] GitHub release created by automation.
- [ ] Staging/Production smoke tests passed.
- [ ] Stakeholders notified.
