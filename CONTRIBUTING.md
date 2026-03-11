# Contributing to ResumeAI

## Type Hints and MyPy Strict Mode

This project uses **MyPy in strict mode** for Python code. All Python code must pass type checking with no `Any` types unless explicitly necessary.

### Type Hint Requirements

1. **All function parameters and return types must be annotated:**

   ```python
   def process_resume(data: dict[str, Any]) -> str:
       """Process resume data and return formatted output."""
       ...
   ```

2. **Avoid using `Any` type:**
   - If you must use `Any`, add a comment explaining why
   - Prefer specific types like `dict[str, str]`, `list[int]`, `Optional[str]`, etc.

3. **Use `Optional[T]` for nullable types:**

   ```python
   def find_user(id: int) -> Optional[User]:
       ...
   ```

4. **Class attributes must be typed:**
   ```python
   class Resume:
       name: str
       experience: list[str]
   ```

### Running MyPy Locally

Before committing code, ensure it passes MyPy:

```bash
# Check type compliance
mypy --config-file=mypy.ini resume_ai_lib resume-api

# Or from project root if you have mypy installed globally
mypy --config-file=mypy.ini .
```

### CI/CD Integration

MyPy runs automatically on:

- Pull requests to `main` branch
- Pushes to `develop` and `main` branches
- Any changes to files in `resume-api/` or `resume_ai_lib/`

Type errors will **block** PRs from merging.

### Handling Third-Party Libraries

Some third-party libraries don't have type stubs. These are configured in `mypy.ini`:

```ini
[mypy-third_party_lib.*]
ignore_missing_imports = True
```

To add a library to this list, edit `mypy.ini` and add:

```ini
[mypy-lib_name.*]
ignore_missing_imports = True
```

## Code Quality Standards

- **ESLint + Prettier:** Frontend code is automatically formatted on commit
- **Black:** Backend Python code must be formatted with Black
- **Test Coverage:** Minimum 60% for backend code
- **Pre-commit Hooks:** Code quality checks run automatically before each commit

## Pre-Commit Hooks Setup

This project uses **Husky** and **lint-staged** to automatically run code quality checks before each commit.

### Installation

Pre-commit hooks are configured automatically. After cloning, install dependencies:

```bash
npm install
```

Husky will automatically set up git hooks.

### What Runs on Commit?

The `.lintstagedrc` file defines what checks run on modified files:

1. **TypeScript/React files** (`.ts`, `.tsx`):
   - ESLint with `--fix` flag (auto-fixes many issues)
   - Prettier formatting

2. **Other files** (`.js`, `.json`, `.css`, `.md`):
   - Prettier formatting

**Note:** Python file testing runs separately in CI/CD pipelines, not in local pre-commit hooks.

### How to Use

Simply commit as normal:

```bash
git add .
git commit -m "feat: your changes"
```

**If hooks fail:**

- Review the error output
- Fix the issues manually (or ESLint/Prettier may auto-fix)
- Stage the fixes: `git add .`
- Retry the commit

**Bypass hooks (not recommended):**

```bash
git commit --no-verify
```

### Manual Hook Execution

Run hooks manually without committing:

```bash
# Run all lint-staged checks
npx lint-staged

# Run specific checks
npx eslint . --ext .ts,.tsx --fix
npx prettier --write .

# Run Python tests (from resume-api directory)
cd resume-api
pytest --no-cov -q
cd ..
```

### Reinitialize Hooks

If hooks aren't working after cloning:

```bash
npx husky install
```

## Frontend Development

### Code Style

The project uses ESLint and Prettier for TypeScript/React code:

```bash
# Check for style issues
npm run lint

# Auto-fix style issues
npm run lint:fix

# Format code
npm run format
```

### Pre-commit Hooks

When you commit, the following automatically runs:

- ESLint + Prettier on `.ts` and `.tsx` files
- Prettier on `.js`, `.json`, `.css`, `.md` files

Commits with violations will be blocked.

## Backend Development

### Code Style

Backend code uses Black formatter and Flake8 linter:

```bash
# Format code with Black
black .

# Check linting
flake8 . --max-line-length=120
```

### Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov --cov-report=html

# Minimum coverage: 60%
```

## Secrets Management

**IMPORTANT:** Never commit secrets, API keys, or sensitive credentials to git.

### For Development

1. **Copy environment template:**

   ```bash
   cp .env.example .env.local
   cp resume-api/.env.example resume-api/.env
   ```

2. **Fill in development secrets:**
   - Request from tech lead via secure channel
   - Never share via Slack, email, or chat
   - Store only in local `.env` files (in .gitignore)

3. **Never commit:**
   - ❌ API keys or tokens
   - ❌ Database passwords
   - ❌ OAuth client secrets
   - ❌ Private encryption keys

4. **Always use:**
   - ✅ `.env.local` for development (gitignored)
   - ✅ GitHub Secrets for CI/CD
   - ✅ Password manager for team sharing (1Password, Vault)

### Environment Variables

**Frontend (.env.local):**

```bash
VITE_API_URL=http://127.0.0.1:8000
RESUMEAI_API_KEY=rai_your_dev_key
GITHUB_CLIENT_ID=...
OPENAI_API_KEY=sk-...
```

**Backend (resume-api/.env):**

```bash
MASTER_API_KEY=rai_your_dev_key
SECRET_KEY=your_jwt_secret
OPENAI_API_KEY=sk-...
DEBUG=true
```

See `.env.example` for all available variables and their descriptions.

### Startup Validation

The backend validates required secrets on startup:

```bash
cd resume-api
python main.py
# Output: "Configuration loaded: ..."
# If missing: "FATAL: Missing required environment variables: ..."
```

**Required for development:**

- `OPENAI_API_KEY` (or ANTHROPIC_API_KEY or GEMINI_API_KEY)
- `MASTER_API_KEY` (for local testing)

**Required for production:**

- All of above, plus:
- `SECRET_KEY`
- Strong `MASTER_API_KEY`
- `DEBUG=false`

### Secret Rotation

Production secrets must be rotated every 90 days.

For detailed procedures, see [SECRETS_ROTATION.md](SECRETS_ROTATION.md):

- API key rotation
- JWT secret rotation
- OAuth secret rotation
- Database password rotation
- Emergency rotation (compromised secrets)

### Security Policy

Please review our [SECURITY.md](SECURITY.md) for information on how to report security vulnerabilities and our security disclosure policy.

## Reporting Secret Compromises

**If you suspect a secret has been exposed:**

1. **Immediately notify** the security team
2. **Do NOT** post in public channels or issues
3. **Revoke** the secret immediately (GitHub Secrets)
4. **Rotate** to a new secret
5. **Verify** no unauthorized access in logs

See [SECRETS_MANAGEMENT.md](SECRETS_MANAGEMENT.md#compromised-secret-response) for details.

## Pull Request Checklist

- [ ] Code passes ESLint + Prettier (frontend)
- [ ] Code passes MyPy strict mode (backend)
- [ ] Code passes all tests
- [ ] Test coverage >= 60% (backend)
- [ ] Commit messages are clear and descriptive
- [ ] No `console.log()` statements left in production code
- [ ] No unused variables or imports
- [ ] **No secrets, API keys, or sensitive data committed**
- [ ] All environment variables in `.env.example`
