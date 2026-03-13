## 2026-02-14 - [LaTeX Injection in Jinja2]

**Vulnerability:** Jinja2's `autoescape=select_autoescape(['tex'])` defaults to HTML escaping, leaving LaTeX special characters like `\` unescaped, leading to potential command injection.
**Learning:** Jinja2 requires custom autoescape logic for non-HTML formats. Relying on manual filters is fragile.
**Prevention:** Use `autoescape=False` and a custom `finalize` function to enforce escaping on all variable outputs.

## 2026-02-21 - Logging Sensitive Query Parameters

**Vulnerability:** The `MonitoringMiddleware` was logging all query parameters in cleartext via `str(request.query_params)`. This exposed sensitive data (e.g., OAuth tokens, passwords passed in URLs) to logs.
**Learning:** Middleware often logs raw request data for debugging, but this can inadvertently capture sensitive information if developers pass secrets via query parameters (which is discouraged but happens).
**Prevention:** Always sanitize request data before logging. Use a dedicated sanitization function that redacts known sensitive keys (e.g., matching "token", "key", "password", "secret") and suffixes.

## 2026-03-01 - [Unquoted Attribute XSS Bypass]

**Vulnerability:** `sanitize_html` stripped quoted event handlers (`onload="..."`) but missed unquoted ones (`onerror=alert(1)`), allowing XSS via unquoted attributes.
**Learning:** Regex-based HTML sanitizers must account for all valid HTML syntax variations (quoted, single-quoted, unquoted). Simple patterns often miss edge cases.
**Prevention:** Use multi-pass regex validation or dedicated parsing libraries. Ensure test cases cover all attribute quoting styles.

## 2024-05-18 - [Command Injection via os.popen]
**Vulnerability:** The `is_ecryptfs_path` function in `resume-api/lib/utils/ecryptfs_utils.py` used `os.popen` to execute a shell command with unsanitized user input (`path`), leading to a critical command injection vulnerability.
**Learning:** Shell-based command execution (`os.popen`, `os.system`, `subprocess.run(shell=True)`) combined with string interpolation is inherently dangerous and must be avoided.
**Prevention:** Always use `subprocess.run` (or similar) with an argument list rather than a single string, and ensure `shell=False` (which is the default) to prevent the shell from interpreting meta-characters.
## 2026-03-13 - [CSP unsafe-eval Removed]
**Vulnerability:** The Content Security Policy (CSP) `script-src` directive included `unsafe-eval`, allowing the execution of strings as code (e.g., via `eval()`, `setTimeout(string)`).
**Learning:** Including `unsafe-eval` in the CSP significantly increases the risk of Cross-Site Scripting (XSS) attacks by allowing an attacker to execute malicious strings as scripts.
**Prevention:** Remove `unsafe-eval` from the `script-src` directive to restrict script execution to only explicitly trusted sources.
