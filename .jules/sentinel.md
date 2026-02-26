## 2026-02-14 - [LaTeX Injection in Jinja2]

**Vulnerability:** Jinja2's `autoescape=select_autoescape(['tex'])` defaults to HTML escaping, leaving LaTeX special characters like `\` unescaped, leading to potential command injection.
**Learning:** Jinja2 requires custom autoescape logic for non-HTML formats. Relying on manual filters is fragile.
**Prevention:** Use `autoescape=False` and a custom `finalize` function to enforce escaping on all variable outputs.

## 2026-02-21 - Logging Sensitive Query Parameters

**Vulnerability:** The `MonitoringMiddleware` was logging all query parameters in cleartext via `str(request.query_params)`. This exposed sensitive data (e.g., OAuth tokens, passwords passed in URLs) to logs.
**Learning:** Middleware often logs raw request data for debugging, but this can inadvertently capture sensitive information if developers pass secrets via query parameters (which is discouraged but happens).
**Prevention:** Always sanitize request data before logging. Use a dedicated sanitization function that redacts known sensitive keys (e.g., matching "token", "key", "password", "secret") and suffixes.
