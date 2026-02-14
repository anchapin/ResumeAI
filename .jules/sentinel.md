## 2026-02-14 - [LaTeX Injection in Jinja2]
**Vulnerability:** Jinja2's `autoescape=select_autoescape(['tex'])` defaults to HTML escaping, leaving LaTeX special characters like `\` unescaped, leading to potential command injection.
**Learning:** Jinja2 requires custom autoescape logic for non-HTML formats. Relying on manual filters is fragile.
**Prevention:** Use `autoescape=False` and a custom `finalize` function to enforce escaping on all variable outputs.
