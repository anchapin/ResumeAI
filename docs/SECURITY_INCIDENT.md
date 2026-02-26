# Security Incident Response Plan

ResumeAI Security Incident Response Plan - Comprehensive procedures for detecting, responding to, and recovering from security incidents.

## Document Information

- **Last Updated**: February 26, 2026
- **Version**: 1.0
- **Classification**: Internal
- **Review Frequency**: Quarterly

## Table of Contents

1. [Overview](#overview)
2. [Severity Levels](#severity-levels)
3. [Security Contacts](#security-contacts)
4. [Breach Detection Process](#breach-detection-process)
5. [Communication Plan](#communication-plan)
6. [Remediation Steps](#remediation-steps)
7. [Post-Incident Review](#post-incident-review)
8. [Prevention & Hardening](#prevention--hardening)

---

## Overview

This document defines the security incident response procedures for ResumeAI. An incident is any security event that could compromise the confidentiality, integrity, or availability of user data, system infrastructure, or services.

### Scope

This plan covers:
- Data breaches (user profiles, resumes, employment data)
- Unauthorized access to systems or data
- API key or token compromise
- Service disruptions due to security issues
- Suspicious account activity
- Third-party service compromises affecting ResumeAI

### Goals

1. Detect incidents quickly and accurately
2. Minimize impact and data exposure
3. Communicate transparently with affected users
4. Recover services to normal operations
5. Prevent similar incidents in the future

---

## Severity Levels

### Critical (SEV-1)
**Response Time: 30 minutes | Resolution Time: 4 hours**

- Active data breach with confirmed user data exposure
- Complete service outage
- Ransomware or active attack in progress
- Unauthorized access to production systems
- Mass account takeovers detected

**Examples:**
- Attacker exfiltrates user resume database
- API keys publicly exposed in Git repositories
- OAuth tokens compromised and being actively used

### High (SEV-2)
**Response Time: 2 hours | Resolution Time: 8 hours**

- Potential data exposure not yet confirmed
- Partial service degradation affecting core features
- Unauthorized access to non-production systems
- Security vulnerability in active use discovered

**Examples:**
- Unencrypted database backup found in cloud storage
- Suspicious login activity from multiple IP addresses
- Authentication bypass vulnerability confirmed

### Medium (SEV-3)
**Response Time: 8 hours | Resolution Time: 24 hours**

- Security vulnerability discovered (not yet exploited)
- Suspicious activity detected but contained
- Data access without proper authorization (accidental)
- Third-party vulnerability affecting our dependencies

**Examples:**
- localStorage quota error allowing unauthorized data access
- Rate limiting bypass in API endpoints
- Certificate expiration issue discovered early

### Low (SEV-4)
**Response Time: 24 hours | Resolution Time: 5 business days**

- Security best practice not followed
- Minor vulnerability with low exploitability
- Information disclosure of non-sensitive data

**Examples:**
- Missing security headers in some responses
- Weak password policy for internal accounts
- Outdated dependency with minor security patch available

---

## Security Contacts

### Incident Response Team

| Role | Name | Email | Phone | Availability |
|------|------|-------|-------|--------------|
| CISO / Security Lead | [Security Lead Name] | security@resumeai.com | [Phone] | 24/7 |
| Engineering Lead | [Engineering Lead Name] | engineering@resumeai.com | [Phone] | 24/7 (SEV-1/2) |
| DevOps Lead | [DevOps Lead Name] | devops@resumeai.com | [Phone] | 24/7 (SEV-1/2) |
| Legal / Compliance | [Legal Contact] | legal@resumeai.com | [Phone] | 24/7 (SEV-1) |
| Communications | [Communications Lead] | comms@resumeai.com | [Phone] | Business hours |

### Escalation Contacts

- **Executive Sponsor**: [CEO Name] - [Email]
- **Legal Counsel**: [Counsel Name] - [Email]
- **Insurance Broker**: [Broker Name] - [Phone]
- **Law Enforcement**: Local FBI Cyber Division (for major breaches)

### External Contacts

- **Cloud Provider Support**: AWS Security Incident Response (for AWS-related incidents)
- **DNS Provider**: [Provider Name] - emergency contact
- **Monitoring/Logging**: Log aggregation service support contact

---

## Breach Detection Process

### 1. Detection Methods

#### Automated Monitoring
- **Intrusion Detection**: AWS GuardDuty alerts for suspicious API calls
- **Log Monitoring**: CloudWatch alarms for unauthorized access patterns
- **Performance Anomalies**: Spikes in unusual database queries or API calls
- **Certificate Monitoring**: Automated alerts for SSL/TLS certificate issues
- **Dependency Scanning**: Automated alerts for vulnerable dependencies
- **API Rate Limiting**: Sudden increase in rate limit violations
- **OAuth Logs**: Failed login attempts, token refresh anomalies

#### Manual Detection
- User reports of account compromise
- Unusual activity in user resumes or profile changes
- Unexpected billing charges or service requests
- Third-party notifications of vulnerability
- Security research publication mentioning ResumeAI

### 2. Incident Triage Checklist

When an incident is reported:

- [ ] **Confirm the report** - Reproduce or verify the suspicious activity
- [ ] **Assess scope** - How many users/systems affected?
- [ ] **Determine severity** - Use the severity levels above
- [ ] **Create incident ticket** - Document in incident tracking system
- [ ] **Notify on-call team** - Based on severity level
- [ ] **Start incident response timeline** - Record all actions with timestamps
- [ ] **Preserve evidence** - Do not destroy logs, don't modify evidence
- [ ] **Activate war room** - For SEV-1/2 incidents

### 3. ResumeAI-Specific Data at Risk

#### User Personal Data
- Full names, emails, phone numbers
- LinkedIn profiles and references
- Employment history and tenure details
- Salary information (if provided)
- Education background

#### Sensitive Documents
- Resume files (PDF, DOCX, etc.)
- Cover letters
- Job applications
- Custom variants and tailored versions

#### System Data
- API keys for integrations
- OAuth tokens (GitHub, LinkedIn, Google)
- Authentication tokens and sessions
- Session storage containing user preferences

#### Financial Data
- Subscription information
- Payment methods (partially masked)
- Usage metrics and billing history

### 4. Investigation Process

**Within 30 minutes (SEV-1/2):**
1. Isolate affected systems if possible (without disrupting service)
2. Collect and preserve evidence:
   - Server logs (AWS CloudTrail, application logs)
   - Database query logs
   - API access logs
   - Network traffic captures (if applicable)
3. Determine entry point and attack vector
4. Identify scope of access and data exposure

**Within 2 hours:**
5. Search for evidence of lateral movement
6. Check for data exfiltration patterns (large downloads, unusual API calls)
7. Review authentication logs for unauthorized access
8. Audit all API keys and tokens for revocation/rotation
9. Document findings in incident tracker

**Ongoing:**
10. Monitor for persistence mechanisms or backdoors
11. Track all remediation actions and timestamps
12. Maintain detailed incident log

### 5. Detection Tools and Dashboards

- **AWS CloudWatch**: Real-time monitoring of API calls, errors, performance
- **Application Logs**: Centralized logging of authentication, API calls, errors
- **Database Audit Logs**: Track all data modifications
- **API Rate Limiting Dashboard**: Monitor for unusual patterns
- **User Activity Audit**: Track resume modifications, downloads, exports
- **Third-party Scanning**: OWASP ZAP, Snyk for vulnerability scanning

---

## Communication Plan

### Internal Communication

#### Immediate (Within 15 minutes of confirmation)

**Slack Channels:**
- Post in `#security-incident` channel with initial report
- Include: Incident type, affected systems, initial severity

**Notification Template:**
```
🚨 SECURITY INCIDENT - [SEVERITY]

Incident: [Brief description]
Affected: [Systems/Users affected]
Status: [Investigating/Mitigating/Resolved]
Severity: [SEV-1/2/3/4]
Lead: [Incident commander name]
War room: [Zoom link or location]

Updates every [30 mins for SEV-1/2, hourly for SEV-3, daily for SEV-4]
```

#### Every 30 minutes (SEV-1/2) / Hourly (SEV-3) / Daily (SEV-4)
- Update war room with progress
- Provide status update to leadership
- Share in #security-incident Slack channel
- Update incident ticket with findings

### External Communication

#### User Notification (For Data Breaches Involving User Data)

**Timeline:**
- **Within 72 hours**: Send notification if any personal data exposed (regulatory requirement)
- **Format**: Email + in-app notification

**Notification Template:**

```
Subject: Important Security Notice - Immediate Action Required [if needed]

Dear ResumeAI User,

We are writing to inform you of a security incident that has affected our systems 
on [DATE].

WHAT HAPPENED:
On [DATE], we discovered [brief description of incident].

WHAT DATA WAS AFFECTED:
- [List specific data types: emails, resumes, etc.]
- [Number of users affected]
- [Date range of exposure]

WHAT WE'RE DOING:
1. [Immediate action taken]
2. [Ongoing investigation details]
3. [Security improvements being implemented]

WHAT YOU SHOULD DO:
1. Change your ResumeAI password immediately
2. Monitor your accounts for suspicious activity
3. Consider changing passwords on services where you used similar credentials
4. Review your resume for unauthorized modifications
5. Contact us if you have questions

SUPPORT:
Email: security@resumeai.com
Phone: [Support phone]
Support Portal: [Link]

Additional information and FAQs: [Link to detailed blog post]

Thank you for being a valued ResumeAI user. We take your security very seriously.

Best regards,
ResumeAI Security Team
```

#### Press/Public Statement (For Major Breaches)

**Timing:** Within 24 hours of user notification

**Statement Template:**

```
ResumeAI Security Statement

On [DATE], ResumeAI discovered a security incident affecting [X users/systems].

FACTS:
- Incident discovered: [Date]
- Impact assessment initiated: [Date]
- User notification began: [Date]
- Incident contained: [Date/Status]

ACTIONS TAKEN:
- Comprehensive investigation initiated with [external security firm if applicable]
- Affected systems isolated and secured
- User passwords reset [if applicable]
- Additional security measures implemented: [List]

ASSURANCE:
- User data protection is our top priority
- We are cooperating with [law enforcement/regulators as applicable]
- [Security measures and improvements being implemented]

RESOURCES:
- Dedicated incident page: [URL]
- FAQs: [URL]
- Customer support: [Contact info]
```

#### Regulatory/Legal Notification (If Required)

**For breaches involving:**
- Personal data (GDPR, CCPA, state privacy laws)
- Payment card data (PCI-DSS)
- Healthcare data (HIPAA)

**Actions:**
- Notify relevant data protection authorities within required timeframe
- Engage legal counsel for regulatory requirements
- Coordinate with insurance provider
- Maintain documentation of notification efforts

### Stakeholder Communication Matrix

| Stakeholder | Timeline | Channel | Message Owner |
|-------------|----------|---------|----------------|
| Incident Response Team | 15 min | Phone/Slack | CISO |
| Engineering/DevOps Team | 15 min | War room | Engineering Lead |
| Executive Leadership | 30 min | Email/Call | CISO |
| Customer Support Team | 1 hour | Slack channel | Communications |
| Affected Users | 24-72 hours | Email/In-app | Communications + Legal |
| Data Protection Authority | 72 hours | Official notice | Legal Counsel |
| Customers/Partners | 24-48 hours | Email/Blog | Communications |
| Insurance Provider | 24 hours | Email | CISO/Legal |
| Law Enforcement | As needed | Phone/Email | Legal Counsel |

---

## Remediation Steps

### Phase 1: Containment (Immediate)

**Objective**: Stop the attack and prevent further damage

**Immediate Actions (First 30 minutes - SEV-1/2):**

1. **Assess Ongoing Threat**
   ```bash
   # Check for suspicious processes, open connections, and recent logins
   ps aux | grep -E 'curl|wget|python|node'
   netstat -tuln | grep ESTABLISHED
   lastlog -t -10
   ```

2. **Revoke Compromised Credentials**
   - Rotate all API keys immediately
   - Revoke affected OAuth tokens
   - Reset compromised user passwords (force reset on next login)
   - Update database access credentials
   - Regenerate JWT secrets if tokens exposed

3. **Isolate Affected Systems** (if not needed for immediate investigation)
   - Take affected database replicas offline
   - Isolate affected application servers
   - Block suspicious IP addresses at firewall
   - Revoke SSH keys and temporary access tokens

4. **Check for Unauthorized Access Methods**
   ```python
   # Check for new users, elevated privileges, suspicious auth logs
   SELECT * FROM users WHERE created_at > NOW() - INTERVAL 24 HOUR;
   SELECT * FROM audit_log WHERE action = 'ROLE_CHANGE' ORDER BY timestamp DESC LIMIT 50;
   SELECT * FROM oauth_tokens WHERE issued_at > NOW() - INTERVAL 24 HOUR;
   ```

5. **Enable Enhanced Monitoring**
   - Increase logging verbosity
   - Enable CloudTrail for all API calls
   - Start packet capture on key systems
   - Monitor for data exfiltration patterns

**Actions by Hour 1 (SEV-1/2):**

6. **Preliminary Evidence Collection**
   - Snapshot affected systems (AWS AMI, database snapshots)
   - Export logs before log rotation
   - Document all suspicious activity with timestamps
   - Create backup of compromised system state

7. **Notify Key Stakeholders**
   - CISO alerts incident response team
   - Engineering lead notifies DevOps and developers
   - Legal notified if user data potentially exposed

8. **Enable Two-Factor Authentication** (if not already)
   - Force 2FA for all admin accounts
   - Recommend 2FA for all users

### Phase 2: Eradication (Hours 2-8 for SEV-1/2)

**Objective**: Remove the attacker's access and close all vulnerabilities

1. **Identify and Close Entry Point**
   ```
   - Analyze access logs for entry vector
   - Check for:
     * SQL injection attempts
     * Malicious API calls
     * Brute force attempts
     * OAuth token misuse
     * Compromised account activity
   - Patch the vulnerability
   - Test the patch in isolated environment first
   ```

2. **Search for Backdoors/Persistence**
   ```bash
   # Look for suspicious cron jobs, SSH keys, etc.
   crontab -l
   find /root/.ssh -ls
   find /home -name '.ssh' -ls
   find / -name '*backdoor*' 2>/dev/null
   ```

3. **Restore from Backups** (if system is compromised)
   - Identify clean backup point (before compromise)
   - Restore application code from version control
   - Restore database from clean snapshot
   - Verify all systems operational
   - Update all security controls

4. **Revoke All Active Sessions**
   ```sql
   -- Invalidate all active sessions except incident response team
   DELETE FROM sessions WHERE expires_at > NOW();
   DELETE FROM oauth_tokens WHERE revoked = false;
   ```

5. **Rotate All Secrets**
   - Database passwords
   - API keys (update in environment variables)
   - JWT signing keys (requires all users to re-authenticate)
   - OAuth integration secrets
   - SSL/TLS certificates (if compromised)
   - Database encryption keys (if feasible)

6. **Apply Security Patches**
   - Patch the vulnerability that allowed the breach
   - Update all vulnerable dependencies
   - Apply pending security updates
   - Deploy to staging first, then production

7. **Verify System Integrity**
   - Run security scanner (OWASP ZAP, Snyk)
   - Check file integrity on key systems
   - Verify no unauthorized code in repositories
   - Audit all deployed versions match source control

### Phase 3: Recovery (Hours 8-24 for SEV-1/2)

**Objective**: Restore normal operations with enhanced security

1. **Bring Systems Back Online**
   - Start with database servers
   - Verify replication and data consistency
   - Start application servers
   - Run health checks on all endpoints
   - Monitor system performance and error rates

2. **Communication with Users**
   - Send incident notification email (see Communication Plan)
   - Post update on status page
   - Monitor support channels for user issues
   - Provide password reset/account recovery tools

3. **Verify Data Integrity**
   ```sql
   -- Check for data corruption or unauthorized modifications
   SELECT COUNT(*) FROM resumes WHERE modified_at > '2024-02-26 00:00:00';
   SELECT COUNT(*) FROM users WHERE last_login > '2024-02-26 00:00:00';
   -- Compare with expected baseline
   ```

4. **Monitor for Reinfection**
   - Watch logs for renewed attack attempts
   - Monitor user account activity
   - Check for suspicious API patterns
   - Alert on any unusual database queries

5. **Gradual Traffic Restoration** (if service was down)
   - 10% of users → monitor for 30 minutes
   - 50% of users → monitor for 30 minutes
   - 100% of users → full monitoring

### Phase 4: Post-Incident (24+ hours)

**Objective**: Learn from incident and implement long-term improvements

- Schedule post-incident review (see Post-Incident Review section)
- Update runbooks and playbooks based on lessons learned
- Implement automated detection improvements
- Update access controls and security policies
- Conduct security training for affected teams

### ResumeAI-Specific Remediations

#### If OAuth Tokens Compromised
```python
# In resume-api/config/
# 1. Invalidate all existing refresh tokens
DELETE FROM oauth_tokens WHERE token_type='refresh';

# 2. Force all users to re-authenticate
UPDATE users SET force_reauthenticate = true;

# 3. Regenerate OAuth client secrets
UPDATE oauth_clients SET secret = generate_random_string();

# 4. Update frontend to handle forced re-auth
# - Clear localStorage auth tokens
# - Redirect to login on next API call
```

#### If API Keys Exposed
```bash
# 1. Rotate all API keys immediately
# Update MASTER_API_KEY and API_KEYS in .env

# 2. Create new keys for valid integrations
# Notify all third-party developers of new keys

# 3. Audit all API calls in previous 24-48 hours
# Look for unusual patterns or large data exports
```

#### If Resume Database Compromised
```python
# 1. Check what data was accessed
# Review database audit logs for SELECT queries

# 2. Notify affected users in database
# Email users whose data was accessed

# 3. Implement database encryption if not present
# Resume files + user metadata should be encrypted at rest

# 4. Add audit logging for all resume access
# Track who accessed what resume and when
```

---

## Post-Incident Review

### 1. Review Schedule

- **SEV-1/2 incidents**: Review within 48 hours
- **SEV-3 incidents**: Review within 1 week
- **SEV-4 incidents**: Review within 2 weeks
- **Recurring issues**: Review immediately to prevent escalation

### 2. Review Process

**Participants:**
- Incident commander
- All engineers involved in response
- Security lead
- Manager for affected team
- Customer support representative

**Meeting Structure** (60-90 minutes):
- 10 min: Incident recap and timeline
- 20 min: What happened (root cause analysis)
- 20 min: What we did well (positive aspects)
- 20 min: What we could improve
- 10 min: Action items and assignments
- 10 min: Communication with stakeholders

### 3. Root Cause Analysis

**Process (Use "5 Whys" technique):**

Example for API key exposure:

1. **Initial Event**: API key found in GitHub repository
   - Why? → Key committed to source control
2. **Why committed?** → Developer used key locally in config file
   - Why? → No clear documentation on key management
3. **Why no documentation?** → Process not formalized
   - Why? → Insufficient onboarding for security practices
4. **Root Cause**: Lack of developer security training and key management process

**RCA Documentation Template:**

```markdown
## Root Cause Analysis: [Incident Name]

### Timeline
- HH:MM - [Event]
- HH:MM - [Detection]
- HH:MM - [Response]

### What Happened
[Technical details of incident]

### Root Cause
[The underlying reason incident occurred - not the symptom]

### Contributing Factors
- [Factor 1]
- [Factor 2]

### Why Root Cause Wasn't Caught
[Gaps in detection/prevention systems]

### Similar Issues
[Other past incidents with similar root cause]
```

### 4. Action Items

**For Each Action Item:**
- Clear description of what needs to be done
- Owner (specific person, not team)
- Priority (Critical, High, Medium, Low)
- Target completion date (within 2 weeks)
- Success criteria

**Example Action Items:**

| Action | Owner | Priority | Deadline | Success Criteria |
|--------|-------|----------|----------|------------------|
| Implement secrets scanning in CI/CD | DevOps Lead | Critical | 7 days | All commits scanned, 0 secrets in repo |
| Create API key management runbook | Security Lead | High | 7 days | Documented and shared with team |
| Improve auth log alerting | DevOps Lead | High | 14 days | Alert on >5 failed logins/min |
| Security training for developers | CISO | Medium | 14 days | 100% team completion |

### 5. Lessons Learned

**Questions to Answer:**

1. **Detection**: How quickly did we detect this incident?
   - Could we have detected it faster?
   - What monitoring improvements would help?

2. **Response**: How effectively did we respond?
   - Did we follow the playbook?
   - Were decision makers available?
   - What information did we lack?

3. **Communication**: How well did we communicate?
   - Were stakeholders informed promptly?
   - Did users receive clear information?
   - What could we improve?

4. **Remediation**: Were our remediation steps effective?
   - Did we close the entry point?
   - Did we prevent reinfection?
   - What didn't work?

5. **Prevention**: How do we prevent similar incidents?
   - What root cause needs addressing?
   - What controls should we implement?
   - What policies should we update?

### 6. Improvements to Implement

**Preventive Controls:**
- Automated secrets scanning
- Improved access logging
- Network segmentation
- API key rotation policies

**Detective Controls:**
- Enhanced monitoring dashboards
- Automated alerting rules
- Regular security audits
- Dependency scanning

**Responsive Controls:**
- Updated playbooks
- Faster incident response procedures
- Improved documentation
- Regular incident drills

### 7. Communication After Review

**Internal Communication:**
- Share findings with engineering team
- Present at team meeting or all-hands
- Update incident tracking system with lessons learned
- Update security documentation

**External Communication** (if applicable):
- Share public blog post about incident response
- Highlight security improvements being made
- Demonstrate commitment to customer security

---

## Prevention & Hardening

### Preventive Measures

1. **Access Control**
   - Implement principle of least privilege
   - Regular access audits (quarterly)
   - Require MFA for all admin accounts
   - SSH key rotation every 90 days
   - Service account keys separate per environment

2. **Code Security**
   - Static code analysis (SAST) in CI/CD
   - Dependency scanning (Snyk, Dependabot)
   - Secrets scanning (git-secrets, TruffleHog)
   - Code review process with security focus
   - Pin dependency versions (avoid auto-updates)

3. **Data Security**
   - Encrypt sensitive data at rest (AES-256)
   - Encrypt data in transit (TLS 1.2+)
   - Hash passwords with bcrypt/argon2
   - Tokenize payment card data
   - Backup encryption and secure storage

4. **Authentication & Authorization**
   - Implement OAuth 2.0 with PKCE (already done ✓)
   - Enforce strong password policies
   - Session management with timeouts
   - Rate limiting on auth endpoints
   - Account lockout after failed attempts

5. **Infrastructure Security**
   - Database firewall rules (restrict access)
   - VPC security groups (least privilege)
   - AWS GuardDuty enabled
   - WAF rules for common attacks
   - Regular security patches and updates

6. **Monitoring & Logging**
   - Centralized logging with CloudWatch
   - 90-day log retention minimum
   - Real-time alerting on security events
   - Database audit logging enabled
   - API request logging with response codes

### Security Checklist

- [ ] All secrets in environment variables (not in code)
- [ ] Passwords hashed with bcrypt (min 12 rounds)
- [ ] API keys rotated every 90 days
- [ ] SSH keys rotated every 90 days
- [ ] OAuth secrets rotated every 180 days
- [ ] Database backups encrypted and tested
- [ ] SSL/TLS certificate valid and auto-renewing
- [ ] MFA enforced for admin accounts
- [ ] Database access restricted to application servers
- [ ] Sensitive data encrypted at rest and in transit
- [ ] Rate limiting enabled on public endpoints
- [ ] WAF enabled with AWS-managed rules
- [ ] GuardDuty enabled for threat detection
- [ ] CloudTrail enabled for all API calls
- [ ] Security patches applied within 30 days
- [ ] Dependency vulnerabilities remediated

### Regular Security Activities

**Monthly:**
- Review access logs for anomalies
- Check for failed authentication attempts
- Verify backup integrity
- Review dependency updates

**Quarterly:**
- Conduct access control audit
- Security training for team
- Review security monitoring effectiveness
- Update threat assessment

**Annually:**
- Full security audit
- Penetration testing (if budget allows)
- Update incident response plan
- Review and update security policies

---

## Appendices

### A. Incident Log Template

```
Incident ID: INC-20260226-001
Title: [Brief description]
Severity: [SEV-1/2/3/4]
Reported By: [Name]
Incident Commander: [Name]
Start Time: [Timestamp]
Detection Time: [Timestamp]
Resolution Time: [Timestamp]
Duration: [Time]

Impact:
- Users Affected: [Number]
- Data Exposed: [List]
- Services Down: [List]

Timeline:
HH:MM - Event description
HH:MM - Event description

Root Cause: [Description]

Resolution: [What was done]

Lessons Learned:
1. [Learning 1]
2. [Learning 2]

Action Items:
- [Item 1] - Owner: [Name] - Due: [Date]
- [Item 2] - Owner: [Name] - Due: [Date]
```

### B. Escalation Flowchart

```
Incident Reported
  ↓
Triage (Is this a security issue?)
  ├─ No → Route to appropriate team
  └─ Yes ↓
      Assess Severity
      ├─ SEV-1/2 → CISO + Exec on-call within 30 min
      ├─ SEV-3 → CISO within 2 hours
      └─ SEV-4 → CISO within 24 hours
      ↓
      Activate Response Team
      ├─ Engineering lead
      ├─ DevOps lead
      ├─ Security lead
      └─ Product/Communications (if user-facing)
      ↓
      Incident Response
      ├─ Contain (Stop active attack)
      ├─ Eradicate (Remove attacker access)
      ├─ Recover (Restore services)
      └─ Learn (Post-incident review)
```

### C. Contact Quick Reference

**Emergency Contacts:**
- CISO: [Emergency number] (24/7)
- On-call Engineer: [PagerDuty link]
- Legal Counsel: [Emergency number]
- Executive Escalation: [CEO phone]

**External Escalation:**
- AWS Security: https://aws.amazon.com/security/security-incident-response/
- Law Enforcement: FBI Cyber Division (for major breaches)
- Data Protection Authority: [State/EU DPA contact]

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 26, 2026 | Security Team | Initial version |

---

**This document should be reviewed and updated quarterly. Last review: [Date]**

**Next review scheduled: [Date + 3 months]**
