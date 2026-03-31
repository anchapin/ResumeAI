1. Add `--legacy-peer-deps` to all `npm ci` commands in `.github/workflows/*.yml` to fix `ERESOLVE` errors.
2. Add `-m` flag to `useradd` in `Dockerfile` to fix `PermissionError: [Errno 13] Permission denied: '/home/appuser'`.
3. Submit the changes.
