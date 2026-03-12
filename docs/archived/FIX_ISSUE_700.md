# Issue #700: Dependency Vulnerability Fixes

## Completed Fixes

### Backend (pypdf)

- Updated `pypdf>=4.0.0` to `pypdf>=5.0.0` in `resume-api/requirements.txt`
- This fixes CVE-2026-28804

## Pending Fixes

### Frontend (serialize-javascript)

- **Issue**: `serialize-javascript <=7.0.2` has RCE vulnerability
- **Root cause**: `vite-plugin-pwa@0.19.8` uses `workbox-build` which depends on `@rollup/plugin-terser` which uses `serialize-javascript`
- **Solution**: Upgrade to `vite-plugin-pwa@0.21+` which requires:
  - Upgrade Vite from 7.x to 6.x (or 5.x)
  - OR temporarily add to `.npmrc`: `audit-level=low`

## Verification

```bash
# Backend
cd resume-api && pip-audit

# Frontend (after Vite upgrade)
npm audit
```
