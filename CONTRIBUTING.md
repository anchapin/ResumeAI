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

## Pull Request Checklist

- [ ] Code passes ESLint + Prettier (frontend)
- [ ] Code passes MyPy strict mode (backend)
- [ ] Code passes all tests
- [ ] Test coverage >= 60% (backend)
- [ ] Commit messages are clear and descriptive
- [ ] No `console.log()` statements left in production code
- [ ] No unused variables or imports
