# Privacy Compliance Documentation

This document outlines the privacy compliance measures implemented in ResumeAI, including GDPR and CCPA compliance.

## Data Collection

ResumeAI collects and processes the following user data:

- **User Profile Information**: Name, email, phone, address
- **Resume/CV Data**: Work experience, education, skills, certifications
- **Authentication Data**: OAuth tokens (GitHub, LinkedIn)
- **Usage Data**: Feature usage analytics, error logs

## Data Processing Basis

### GDPR (EU Users)

ResumeAI processes personal data under the following legal bases:

1. **Consent**: Users explicitly consent to data processing when creating an account
2. **Contract**: Data processing is necessary to provide the resume building service
3. **Legitimate Interest**: Analytics and error tracking for service improvement

### CCPA (California Users)

California residents have the following rights:

- **Right to Know**: Request what personal data is collected
- **Right to Delete**: Request deletion of personal data
- **Right to Opt-Out**: Opt-out of data sales (ResumeAI does not sell user data)
- **Non-Discrimination**: Equal service regardless of privacy choices

## Data Storage

- User data is stored in encrypted databases
- OAuth tokens are encrypted at rest
- Session data uses secure, HttpOnly cookies
- Data retention periods are defined per data type

## Security Measures

- TLS/SSL encryption for data in transit
- AES-256 encryption for data at rest
- API keys and secrets managed via environment variables
- Regular security audits and vulnerability scans

## User Rights

### Access & Portability

Users can export their data in standard formats (JSON, PDF)

### Deletion

Users can request data deletion through:
- Account settings
- API endpoint: `DELETE /api/v1/account`
- Support contact

### Data Processing Agreements

ResumeAI maintains DPAs with all third-party service providers.

## Contact

For privacy concerns or data requests:
- Email: privacy@resumeai.com
- API: `/api/v1/privacy/requests`

---

*Last Updated: March 2026*
