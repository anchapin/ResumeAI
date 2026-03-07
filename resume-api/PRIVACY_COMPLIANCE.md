# Privacy Compliance Documentation

This document outlines ResumeAI's compliance with privacy regulations including GDPR, CCPA, and other applicable privacy laws.

## Table of Contents

1. [Overview](#overview)
2. [GDPR Compliance](#gdpr-compliance)
3. [CCPA Compliance](#ccpa-compliance)
4. [Data Handling Practices](#data-handling-practices)
5. [User Rights](#user-rights)
6. [Data Retention](#data-retention)
7. [Security Measures](#security-measures)

---

## Overview

ResumeAI is committed to protecting user privacy and complying with applicable privacy regulations. This document outlines our compliance approach for:

- **GDPR**: General Data Protection Regulation (EU)
- **CCPA**: California Consumer Privacy Act (USA)
- **Other applicable laws**: Based on user jurisdiction

### What Data We Collect

| Data Type | Purpose | Legal Basis |
|-----------|---------|-------------|
| User Profile (name, email) | Service delivery | Contract performance |
| Resume Content | Resume generation | Consent/Contract |
| API Usage Logs | Analytics, debugging | Legitimate interest |
| Authentication Tokens | Session management | Contract performance |

---

## GDPR Compliance

### Key Principles

We comply with GDPR's seven key principles:

1. **Lawfulness, Fairness, Transparency** - Clear privacy notices
2. **Purpose Limitation** - Data used only for stated purposes
3. **Data Minimization** - Only collect necessary data
4. **Accuracy** - Allow users to correct their data
5. **Storage Limitation** - Retain data only as long as needed
6. **Integrity & Confidentiality** - Appropriate security measures
7. **Accountability** - Maintain compliance records

### Data Controller Information

- **Controller**: ResumeAI
- **Contact**: privacy@resumeai.com
- **DPO**: Data Protection Officer available at dpo@resumeai.com

### Legal Basis for Processing

| Processing Activity | Legal Basis |
|---------------------|-------------|
| Account creation | Contract (Terms of Service) |
| Resume generation | Consent + Contract |
| Analytics | Legitimate interest |
| Marketing communications | Consent |

### Data Subject Rights

Under GDPR, users have the following rights:

- **Right to Access** - View collected data
- **Right to Rectification** - Correct inaccurate data
- **Right to Erasure** - Request data deletion ("right to be forgotten")
- **Right to Restrict Processing** - Limit how we use data
- **Right to Data Portability** - Export data in machine-readable format
- **Right to Object** - Opt out of certain processing
- **Rights related to automated decision-making** - Human review of automated decisions

### International Data Transfers

- Data transfers outside the EEA use:
  - Standard Contractual Clauses (SCCs)
  - Adequacy decisions where available
- Cross-border transfers are logged and documented

---

## CCPA Compliance

### Consumer Rights

California residents have the following rights under CCPA:

| Right | Description |
|-------|-------------|
| Right to Know | Request what personal information is collected |
| Right to Delete | Request deletion of personal information |
| Right to Opt-Out | Opt out of personal information sales |
| Right to Non-Discrimination | Equal service regardless of privacy choices |

### Personal Information Categories

We collect the following categories of personal information:

1. **Identifiers**: Name, email, IP address
2. **Professional Information**: Resume content, job history
3. **Internet Activity**: API usage, interaction data
4. **Geolocation**: General location (city/region level)

### "Do Not Sell My Personal Information"

Users can opt out of personal information sales via:
- Privacy settings in the application
- Email request to privacy@resumeai.com
- Global privacy toggle in analytics settings

### Privacy Notice Timeline

- Privacy notice updated: Within 30 days of material changes
- Response to requests: Within 45 days

---

## Data Handling Practices

### Data Collection

```typescript
// Frontend: Analytics privacy toggle
// Users can disable tracking in settings
const isTrackingEnabled = localStorage.getItem('analytics_enabled') !== 'false';
```

### Data Minimization

- Collect only data necessary for service delivery
- No unnecessary personal data fields in forms
- API requests validated for required fields only

### Pseudonymization

- User-identifiable data pseudonymized in logs
- Session tokens use random identifiers
- IP addresses anonymized in analytics

---

## User Rights Implementation

### Access Request

```python
# API endpoint for data access requests
@app.get("/v1/user/data")
async def get_user_data(user: AuthorizedUser):
    """Export all user data in portable format"""
    return {
        "profile": user.profile,
        "resumes": user.resumes,
        "api_usage": user.usage_logs,
        "created_at": user.created_at
    }
```

### Deletion Request

```python
# API endpoint for data deletion
@app.delete("/v1/user/data")
async def delete_user_data(user: AuthorizedUser):
    """Delete all user data"""
    await user.delete_resumes()
    await user.delete_profile()
    await user.anonymize_logs()
    return {"status": "deleted"}
```

### Data Portability

- Export formats: JSON, PDF
- Export includes: Profile, Resumes, Templates, Usage history

---

## Data Retention

| Data Type | Retention Period | Reason |
|-----------|------------------|--------|
| User Account | Until deletion request | Service delivery |
| Resume Content | Until deletion request | Service delivery |
| API Logs | 90 days | Debugging, analytics |
| Authentication Tokens | Session duration | Security |
| Analytics Data | 30 days (if opted-in) | Product improvement |

### Deletion Procedures

1. **Immediate deletion**: User-initiated via UI
2. **Automated cleanup**: Inactive accounts after 2 years
3. **Legal hold**: Retained if required by law

---

## Security Measures

### Technical Controls

- **Encryption**: TLS 1.3 for data in transit
- **Storage**: Encrypted at rest (AES-256)
- **Access Control**: Role-based access control (RBAC)
- **Authentication**: JWT tokens with short expiry
- **API Security**: Rate limiting, API key validation

### Organizational Controls

- Regular privacy training for staff
- Data Protection Officer oversight
- Privacy Impact Assessments for new features
- Incident response plan for data breaches

### Breach Notification

- **GDPR**: 72 hours to supervisory authority
- **CCPA**: "Without unreasonable delay" to affected users

---

## Compliance Verification

### Audits

- Annual third-party security audit
- Quarterly privacy review
- Continuous automated compliance testing

### Certifications

- SOC 2 Type II (planned)
- GDPR-ready architecture
- CCPA-compliant practices

---

## Contact & Complaints

### Questions

For privacy-related questions:
- Email: privacy@resumeai.com
- In-app: Settings → Privacy

### Regulatory Complaints

Users have the right to lodge complaints with:
- **EU**: Local Data Protection Authority
- **California**: California Attorney General

---

*Last Updated: March 2026*
*Next Review: March 2027*
