# Security Policy

## Supported Versions

The following versions of ResumeAI are currently being supported with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 0.0.x   | :white_check_mark: |
| < 0.0.x | :x:                |

## Reporting a Vulnerability

We take the security of ResumeAI seriously. If you believe you have found a security vulnerability, please report it to us responsibly.

**Please do not report security vulnerabilities through public GitHub issues.**

### Reporting Process

1. Email your findings to **ops@resumeai.com**.
2. Include a detailed description of the vulnerability.
3. Provide steps to reproduce the issue (proof-of-concept scripts or screenshots are helpful).
4. Mention the potential impact if exploited.

### Our Commitment

- We will acknowledge receipt of your report within 48 hours.
- We will provide an estimated timeframe for a fix.
- We will notify you once the vulnerability has been resolved.
- We will provide credit for your discovery if desired, after the fix is released.

## Disclosure Policy

- **Private Disclosure**: We ask that you keep details of the vulnerability private until we have had a reasonable amount of time to address it.
- **Public Disclosure**: Once a fix is released, we may coordinate a public disclosure with you.

## Security Best Practices for Contributors

- **Never commit secrets**: Use environment variables or secret management tools.
- **Rotate secrets regularly**: Follow our 90-day rotation policy as defined in `SECRETS_ROTATION.md`.
- **Use secure cookies**: Ensure `httpOnly` and `secure` flags are set for sensitive cookies.
- **Encrypt sensitive data**: Use the provided encryption utilities for storing OAuth tokens or other sensitive PII.
- **Run security scans**: Use `npm audit` and `safety` (for Python) before submitting pull requests.

## Secret Rotation Policy

ResumeAI enforces a mandatory 90-day secret rotation policy for all production credentials, including:
- API Keys
- JWT Secrets
- OAuth Secrets
- Database Passwords

For more details, see `SECRETS_ROTATION.md` and `SECRETS_MANAGEMENT.md`.
