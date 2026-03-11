# On-Call Rotation & Incident Response

**Last Updated:** March 11, 2026
**Version:** 1.0
**Review Frequency:** Quarterly
**Owner:** DevOps / Platform Team

---

## Table of Contents

1. [On-Call Rotation](#on-call-rotation)
2. [Incident Severity Levels](#incident-severity-levels)
3. [Escalation Matrix](#escalation-matrix)
4. [Contact Information](#contact-information)
5. [Incident Response Playbook](#incident-response-playbook)
6. [Post-Incident Review](#post-incident-review)
7. [On-Call Handoff](#on-call-handoff)

---

## On-Call Rotation

### Schedule

The on-call rotation operates on a **weekly basis** with handoffs occurring every **Monday at 9:00 AM UTC**.

| Week | Primary On-Call | Secondary (Backup) |
| ---- | --------------- | ------------------ |
| 1    | Engineer A      | Engineer B         |
| 2    | Engineer B      | Engineer C         |
| 3    | Engineer C      | Engineer A         |
| 4    | Engineer A      | Engineer B         |

**Schedule Publication:** The rotation schedule is published in Slack `#on-call-schedule` one week in advance and synced to the team calendar.

### Expectations and Responsibilities

**Primary On-Call Engineer:**

- **Response Time:** Acknowledge all P1/P2 alerts within **15 minutes**
- **Availability:** Must be reachable via phone/PagerDuty 24/7 during rotation week
- **Monitoring:** Proactively monitor dashboards and alerting channels
- **Communication:** Provide regular updates in `#incidents` Slack channel
- **Documentation:** Log all incidents with timestamps and actions taken
- **Escalation:** Escalate to secondary or leadership when appropriate

**Secondary (Backup) Engineer:**

- **Availability:** Must be reachable within 30 minutes
- **Support:** Assist primary with complex incidents
- **Coverage:** Step in if primary is unavailable or overwhelmed
- **Review:** Participate in post-incident reviews for major incidents

### Time Commitment

**During Rotation Week:**

- **Expected Availability:** 24/7 for P1/P2 incidents
- **Typical Interruptions:** 2-5 alerts per week (varies by system stability)
- **Average Time Investment:**
  - Normal week: 2-4 hours total
  - Incident week: 8-20+ hours depending on severity
- **Compensation:** On-call stipend + overtime for incident response outside business hours

**After-Hours Expectations:**

- Keep phone/laptop nearby for alerts
- Respond to PagerDuty notifications immediately
- Join incident war room within 15 minutes of P1 alert
- Avoid activities that would prevent quick response (e.g., long flights without WiFi)

### On-Call Best Practices

- **Start of Shift:** Review open incidents, known issues, and recent deployments
- **During Shift:** Monitor dashboards daily, even without alerts
- **End of Shift:** Complete handoff documentation with incoming engineer
- **Self-Care:** Swap shifts if feeling burned out; maintain work-life balance

---

## Incident Severity Levels

Incidents are classified into four severity levels based on user impact and business criticality.

### SEV-1: Critical

**Response Time:** 15 minutes | **Resolution Target:** 4 hours

**Definition:** Complete service outage or severe data loss affecting all users.

**Examples:**

- Complete API outage (all endpoints returning 5xx errors)
- Database corruption or data loss
- Security breach with active data exfiltration
- Authentication system completely down
- Ransomware or active attack in progress
- Production infrastructure completely unavailable

**Response Requirements:**

- Page on-call engineer immediately
- War room established within 15 minutes
- Leadership notified within 30 minutes
- Status page updated within 30 minutes
- User communication within 1 hour
- Continuous updates every 15-30 minutes

---

### SEV-2: High

**Response Time:** 30 minutes | **Resolution Target:** 8 hours

**Definition:** Major feature broken with significant user impact; workaround may exist.

**Examples:**

- PDF generation failing for all users
- OAuth authentication broken (users cannot log in)
- Resume editor unavailable or unusable
- Payment processing failures
- Major performance degradation (p99 latency > 10s)
- Data inconsistency affecting multiple users
- Third-party integration completely broken (GitHub, LinkedIn)

**Response Requirements:**

- Page on-call engineer immediately
- War room for complex incidents
- Team lead notified within 1 hour
- Status page updated within 1 hour
- User communication within 2 hours
- Updates every 30-60 minutes

---

### SEV-3: Medium

**Response Time:** 2 hours | **Resolution Target:** 24 hours

**Definition:** Minor feature broken; no workaround available but core functionality unaffected.

**Examples:**

- Single endpoint returning errors (non-critical)
- Dashboard metrics not loading
- Email notifications delayed or failing
- File upload failures for specific file types
- UI rendering issues on specific browsers
- Rate limiting triggering falsely
- Non-critical third-party integration issues

**Response Requirements:**

- Page on-call engineer (no middle-of-night page unless escalating)
- Ticket created and prioritized
- Team notified in Slack
- Updates every 2-4 hours
- Resolution by next business day

---

### SEV-4: Low

**Response Time:** 24 hours | **Resolution Target:** 5 business days

**Definition:** Cosmetic issues, minor bugs, or feature requests with minimal user impact.

**Examples:**

- Typographical errors in UI
- Minor styling inconsistencies
- Non-critical logging issues
- Documentation errors
- Performance optimization opportunities
- Feature enhancement requests
- Intermittent errors with low frequency (< 0.1% of requests)

**Response Requirements:**

- Ticket created in issue tracker
- Assigned to appropriate team member
- No immediate page required
- Addressed in regular sprint planning
- Weekly status updates until resolved

---

## Escalation Matrix

| Severity | Initial Response | Escalation (30 min) | Escalation (1 hour) | Executive Escalation |
| -------- | ---------------- | ------------------- | ------------------- | -------------------- |
| **SEV-1** | On-call + Secondary | Lead Engineer | VP Engineering | CTO/CEO |
| **SEV-2** | On-call | Secondary Engineer | Lead Engineer | VP Engineering |
| **SEV-3** | On-call (business hours) | On-call (any time) | Lead Engineer | None |
| **SEV-4** | Ticket assignment | None | None | None |

### Escalation Triggers

**Escalate Immediately When:**

- Incident severity is unclear but impact appears high
- Primary on-call cannot resolve within 30 minutes
- Multiple systems are affected
- Customer complaints are increasing rapidly
- Data loss or security breach is suspected
- External communication may be required

**Escalation Communication Template:**

```
🚨 ESCALATION - [SEV-1/2/3/4]

Incident: [Brief description]
Current Status: [Investigating/Mitigating/Resolved]
Duration: [Time since start]
Impact: [Users/features affected]

Actions Taken:
- [Action 1]
- [Action 2]

Reason for Escalation: [Why escalating]

Need: [Specific help or decision needed]

War Room: [Zoom/Slack link]
Dashboard: [Grafana link]
```

---

## Contact Information

### Primary On-Call Contacts

| Method | Contact | Notes |
| ------ | ------- | ----- |
| **PagerDuty** | [On-Call Schedule](https://resumeai.pagerduty.com) | Primary alerting system |
| **Phone (Primary)** | +1-XXX-XXX-XXXX | On-call phone (forwarded) |
| **Phone (Secondary)** | +1-XXX-XXX-XXXX | Backup on-call phone |
| **Slack** | @on-call | Slack user group (rotates) |
| **Email** | oncall@resumeai.com | Email alias (forwards to on-call) |

### Slack Channels

| Channel | Purpose | Who Should Join |
| ------- | ------- | --------------- |
| `#incidents` | Active incident coordination | All engineers |
| `#on-call-schedule` | Schedule announcements | All engineers |
| `#alerting` | Automated alert notifications | All engineers |
| `#security-incident` | Security-specific incidents | Security team + eng leads |
| `#status-updates` | Status page updates | Customer success + eng |

### Email Aliases

| Alias | Purpose | Recipients |
| ----- | ------- | ---------- |
| `oncall@resumeai.com` | On-call contact | Current on-call engineer |
| `security@resumeai.com` | Security reports | Security team |
| `incidents@resumeai.com` | Incident notifications | Engineering team |
| `devops@resumeai.com` | Infrastructure issues | DevOps team |
| `engineering@resumeai.com` | General engineering | All engineers |

### Leadership Contacts

| Role | Name | Phone | Email | Slack |
| ---- | ---- | ----- | ----- | ----- |
| **VP Engineering** | [Name] | +1-XXX-XXX-XXXX | [email] | @vp-eng |
| **CTO** | [Name] | +1-XXX-XXX-XXXX | [email] | @cto |
| **Head of Product** | [Name] | +1-XXX-XXX-XXXX | [email] | @product |
| **Customer Success Lead** | [Name] | +1-XXX-XXX-XXXX | [email] | @cs-lead |
| **Security Lead** | [Name] | +1-XXX-XXX-XXXX | [email] | @security |

### External Contacts

| Service | Contact | Purpose |
| ------- | ------- | ------- |
| **AWS Support** | [AWS Support Center](https://console.aws.amazon.com/support) | Infrastructure issues |
| **PagerDuty Support** | support@pagerduty.com | Alerting system issues |
| **Status Page Provider** | [Provider Support] | Status page updates |
| **Legal Counsel** | legal@resumeai.com | Data breach / legal issues |
| **PR/Communications** | comms@resumeai.com | Public incident communication |

---

## Incident Response Playbook

Follow these steps systematically when responding to any incident.

### Step 1: Acknowledge Alert

**Time Target:** Within 15 minutes for P1/P2

**Actions:**

- [ ] Acknowledge alert in PagerDuty
- [ ] Post acknowledgment in `#incidents` Slack channel
- [ ] Note timestamp of acknowledgment
- [ ] Open incident ticket in tracking system

**Slack Template:**

```
:eyes: Acknowledged - Investigating now

Alert: [Alert name]
Severity: [SEV-1/2/3/4]
On-call: @[your-name]

Will provide update in 10 minutes.
```

---

### Step 2: Assess Severity

**Time Target:** Within 5 minutes of acknowledgment

**Actions:**

- [ ] Check affected systems in Grafana dashboards
- [ ] Review error logs for scope and pattern
- [ ] Determine user impact (how many users affected?)
- [ ] Classify severity using [Severity Levels](#incident-severity-levels)
- [ ] Update incident ticket with severity

**Assessment Questions:**

1. Is the service completely down or degraded?
2. How many users are affected (all, some, single user)?
3. Is there a workaround available?
4. Is data at risk (loss, corruption, exposure)?
5. Is this a security incident?

**Severity Decision Tree:**

```
Service completely down? → SEV-1
    ↓
Major feature broken? → SEV-2
    ↓
Minor feature broken? → SEV-3
    ↓
Cosmetic/minor issue? → SEV-4
```

---

### Step 3: Communicate

**Time Target:** Within 15 minutes of severity assessment

**Internal Communication:**

- [ ] Post update in `#incidents` with severity and impact
- [ ] Tag relevant team members based on escalation matrix
- [ ] Create war room (Zoom/Slack huddle) for SEV-1/2
- [ ] Notify leadership for SEV-1 within 30 minutes

**External Communication:**

- [ ] Update status page for SEV-1/2
- [ ] Prepare user communication template
- [ ] Coordinate with customer success team
- [ ] Schedule follow-up communications

**Status Page Update Template:**

```
[INVESTIGATING] - [Service Name] Issues

We are currently investigating issues affecting [service/feature].
Some users may experience [specific impact].

Next update in 15 minutes.

Posted: [timestamp]
```

**Slack Update Template:**

```
:warning: [SEV-1/2] Incident Update

Status: [INVESTIGATING/IDENTIFIED/MITIGATING/RESOLVED]
Impact: [Description of user impact]
Affected Services: [List services]

Current Focus: [What we're working on now]

Next Update: [Time]
War Room: [Link]
```

---

### Step 4: Triage and Diagnose

**Time Target:** Within 30 minutes of acknowledgment

**Actions:**

- [ ] Gather relevant logs and metrics
- [ ] Identify when the incident started
- [ ] Check for recent deployments or changes
- [ ] Reproduce the issue if possible
- [ ] Identify root cause or contributing factors
- [ ] Document findings in incident ticket

**Diagnostic Commands:**

```bash
# Check service health
curl -s http://api.resumeai.com/health | jq .

# View recent errors
kubectl logs -n production deployment/resume-api --tail=200 | grep -i error

# Check recent deployments
git log --oneline -10

# View metrics
curl -s http://api.resumeai.com/metrics | grep http_requests_total

# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Check Redis status
redis-cli ping
```

**Key Dashboards:**

- [Service Health Dashboard](https://grafana.resumeai.com/d/health)
- [Error Tracking Dashboard](https://grafana.resumeai.com/d/errors)
- [Request Latency Dashboard](https://grafana.resumeai.com/d/latency)
- [Resource Usage Dashboard](https://grafana.resumeai.com/d/resources)
- [Database Metrics Dashboard](https://grafana.resumeai.com/d/postgres)

**Common Root Causes:**

| Symptom | Likely Cause | Investigation |
| ------- | ------------ | ------------- |
| High error rate after deploy | Bad deployment | Check git log, consider rollback |
| Gradual performance degradation | Memory leak / resource exhaustion | Check memory/CPU metrics |
| Sudden outage | Infrastructure failure | Check AWS status, pod status |
| Authentication failures | OAuth provider issue / token expiry | Check OAuth logs, token validity |
| Database errors | Connection pool exhaustion / slow queries | Check pg_stat_activity |

---

### Step 5: Fix or Mitigate

**Time Target:** Based on severity (see [Severity Levels](#incident-severity-levels))

**Immediate Mitigation Strategies:**

| Issue | Mitigation | Time |
| ----- | ---------- | ---- |
| Bad deployment | Rollback to previous version | 5 min |
| Resource exhaustion | Restart service / scale up | 5 min |
| Database overload | Kill idle connections / scale reads | 10 min |
| Memory leak | Restart pods | 5 min |
| External API failure | Enable fallback / circuit breaker | 5 min |
| Configuration error | Revert config change | 5 min |

**Fix vs. Mitigate Decision:**

- **Mitigate First:** When users are actively impacted, prioritize restoring service
- **Fix Properly:** Once service is stable, implement proper fix with testing
- **Document Both:** Record both mitigation and permanent fix in incident ticket

**Rollback Command (Kubernetes):**

```bash
# Quick rollback to previous version
kubectl rollout undo deployment/resume-api -n production

# Verify rollback
kubectl rollout status deployment/resume-api -n production
```

**Feature Flag Disable:**

```python
# In feature flag configuration
FeatureFlags.disable(Feature.PROBLEMATIC_FEATURE)
```

---

### Step 6: Verify Resolution

**Time Target:** Within 15 minutes of fix deployment

**Actions:**

- [ ] Confirm error rates returned to baseline
- [ ] Verify all health checks passing
- [ ] Test affected user flows manually
- [ ] Monitor for 15-30 minutes to ensure stability
- [ ] Confirm no regression in related systems
- [ ] Update status page to RESOLVED

**Verification Checklist:**

```
[ ] Health endpoint returns healthy
[ ] Error rate < 0.1% (baseline)
[ ] Latency p99 < 1s (baseline)
[ ] All critical user flows working
[ ] No new errors in logs
[ ] Metrics dashboards show normal patterns
[ ] Customer support confirms no new reports
```

**Resolution Communication:**

```
:white_check_mark: [RESOLVED] - [Service Name]

Status: RESOLVED
Duration: [Start time] - [End time] ([total duration])
Impact: [Summary of user impact]

Root Cause: [Brief description]
Resolution: [What was done to fix]

Monitoring: Continuing to monitor for any recurrence.
Post-incident review scheduled for: [date/time]

Thank you for your patience.
```

---

### Step 7: Document and Follow Up

**Time Target:** Within 24 hours of resolution

**Actions:**

- [ ] Complete incident timeline in tracking system
- [ ] Schedule post-incident review (for SEV-1/2)
- [ ] Create action items for prevention
- [ ] Update runbooks if gaps identified
- [ ] Share learnings with team
- [ ] Send user communication if required

**Incident Timeline Template:**

```markdown
## Incident Timeline: [Incident Name]

**Date:** YYYY-MM-DD
**Severity:** SEV-[1/2/3/4]
**Duration:** X hours Y minutes
**Services Affected:** [List]

### Timeline

- HH:MM UTC - Incident started (based on first error spike)
- HH:MM UTC - Alert triggered
- HH:MM UTC - On-call acknowledged
- HH:MM UTC - Severity assessed as SEV-X
- HH:MM UTC - War room opened
- HH:MM UTC - Root cause identified
- HH:MM UTC - Mitigation deployed
- HH:MM UTC - Service restored
- HH:MM UTC - Incident declared resolved

### Impact

- Users affected: [Number/percentage]
- Failed requests: [Number]
- Data impact: [None / description]
- Revenue impact: [If applicable]

### Root Cause

[Detailed technical description of what caused the incident]

### Resolution

[Description of fix/mitigation applied]

### Action Items

| Item | Owner | Priority | Due Date |
| ---- | ----- | -------- | -------- |
| [Action 1] | [Name] | High | Date |
| [Action 2] | [Name] | Medium | Date |
```

---

## Post-Incident Review

### Timeline

**SEV-1/2 Incidents:** Review within **48 hours** of resolution

**SEV-3 Incidents:** Review within **1 week** of resolution

**SEV-4 Incidents:** Review during regular sprint retrospective

### Blameless Post-Mortem Template

```markdown
# Post-Incident Review: [Incident Name]

**Date of Review:** YYYY-MM-DD
**Incident Date:** YYYY-MM-DD
**Severity:** SEV-[1/2/3/4]
**Facilitator:** [Name]
**Participants:** [List all attendees]

---

## Summary

[Brief 2-3 sentence summary of what happened]

---

## Timeline

| Time (UTC) | Event |
| ---------- | ----- |
| HH:MM | Incident started |
| HH:MM | Alert triggered |
| HH:MM | [Continue timeline...] |

---

## Impact

- **Duration:** X hours Y minutes
- **Users Affected:** [Number/percentage]
- **Failed Requests:** [Number]
- **Data Impact:** [Description]
- **Revenue Impact:** [If applicable]

---

## Root Cause Analysis (5 Whys)

1. **Why did [incident] happen?**
   - [Answer]

2. **Why did [answer to 1] happen?**
   - [Answer]

3. **Why did [answer to 2] happen?**
   - [Answer]

4. **Why did [answer to 3] happen?**
   - [Answer]

5. **Why did [answer to 4] happen?**
   - [Root Cause]

---

## What Went Well

- [Positive aspect 1]
- [Positive aspect 2]
- [Positive aspect 3]

---

## What Could Be Improved

- [Improvement area 1]
- [Improvement area 2]
- [Improvement area 3]

---

## Action Items

| Action | Owner | Priority | Due Date | Status |
| ------ | ----- | -------- | -------- | ------ |
| [Specific action 1] | [Name] | High | Date | Open |
| [Specific action 2] | [Name] | Medium | Date | Open |
| [Specific action 3] | [Name] | Low | Date | Open |

---

## Lessons Learned

### Detection
- How quickly did we detect this incident?
- Could we have detected it faster?
- What monitoring improvements would help?

### Response
- How effectively did we respond?
- Did we follow the playbook?
- Were decision makers available?
- What information did we lack?

### Communication
- How well did we communicate internally?
- How well did we communicate externally?
- What could we improve?

### Prevention
- What root causes need addressing?
- What controls should we implement?
- What policies should we update?

---

## Appendix

- [Link to incident ticket]
- [Link to Grafana dashboards]
- [Link to relevant logs]
- [Link to related PRs]
```

### Action Items Tracking

**Tracking Method:** GitHub Issues with `post-incident` label

**Priority Definitions:**

| Priority | Definition | Target Completion |
| -------- | ---------- | ----------------- |
| **Critical** | Must be done immediately to prevent recurrence | 48 hours |
| **High** | Important fix to prevent similar incidents | 1 week |
| **Medium** | Improvement to reduce risk | 2 weeks |
| **Low** | Nice-to-have enhancement | Next sprint |

**Follow-Up Schedule:**

- **Critical/High:** Daily standup updates until complete
- **Medium:** Weekly progress check in team meeting
- **Low:** Tracked in sprint backlog

**Escalation for Overdue Items:**

- 1 week overdue: Notify action item owner's manager
- 2 weeks overdue: Escalate to VP Engineering
- 1 month overdue: Re-prioritize or close with justification

---

## On-Call Handoff

### Handoff Checklist

**Timing:** Complete within 2 hours before shift end (Monday 9 AM UTC)

**Outgoing Engineer:**

- [ ] Review all open incidents and their status
- [ ] Document any ongoing investigations
- [ ] Note any known issues to watch
- [ ] Verify alerting systems are functioning
- [ ] Confirm contact information is up to date
- [ ] Share handoff notes in `#on-call-schedule`

**Incoming Engineer:**

- [ ] Review handoff notes from outgoing engineer
- [ ] Verify access to all systems (PagerDuty, Grafana, etc.)
- [ ] Test alerting notification path
- [ ] Review open incidents and action items
- [ ] Confirm availability for the week
- [ ] Acknowledge handoff in `#on-call-schedule`

### Handoff Notes Template

```markdown
## On-Call Handoff - Week of YYYY-MM-DD

**Outgoing:** @[name]
**Incoming:** @[name]
**Handoff Time:** YYYY-MM-DD HH:MM UTC

---

### Open Incidents

| Incident | Severity | Status | Notes |
| -------- | -------- | ------ | ----- |
| [Link] | SEV-X | [Status] | [Brief description] |

---

### Known Issues to Watch

1. **[Issue Name]**
   - Impact: [Description]
   - Workaround: [If any]
   - Monitoring: [Dashboard/link]
   - Expected Resolution: [Date/time]

2. **[Issue Name]**
   - [Continue format...]

---

### Recent Changes

- [Deployment 1] - [Date] - [Brief description]
- [Config Change 1] - [Date] - [Brief description]
- [Infrastructure Change 1] - [Date] - [Brief description]

---

### Action Items from Previous Week

| Item | Owner | Status | Notes |
| ---- | ----- | ------ | ----- |
| [Action] | [Name] | [Status] | [Update] |

---

### Additional Notes

[Any other relevant information for incoming on-call]

---

**Handoff Complete:** ✅
**Acknowledged by Incoming:** @[name]
```

### Known Issues to Watch

**Template for Documenting Known Issues:**

```markdown
### [Issue Name]

**Status:** [Investigating / Monitoring / Workaround Applied]

**Impact:**
- [Description of user impact]
- [Number of users affected]

**Symptoms:**
- [What to look for in monitoring]
- [Specific alerts to watch]

**Current Mitigation:**
- [What's been done to reduce impact]

**Monitoring:**
- Dashboard: [Grafana link]
- Key Metric: [Metric name and threshold]

**Escalation Trigger:**
- [When to escalate this issue]
- [Who to contact]

**Expected Resolution:**
- [Timeline if known]
- [PR/Ticket link]
```

---

## Related Documentation

- [docs/RUNBOOKS.md](./docs/RUNBOOKS.md) - Detailed operational runbooks
- [docs/SECURITY_INCIDENT.md](./docs/SECURITY_INCIDENT.md) - Security-specific incident response
- [DEPLOYMENT_SAFEGUARDS.md](./DEPLOYMENT_SAFEGUARDS.md) - Deployment safety mechanisms
- [docs/OPERATIONS.md](./docs/OPERATIONS.md) - General operations procedures
- [docs/RUNBOOKS_MONITORING.md](./docs/RUNBOOKS_MONITORING.md) - Monitoring and alerting setup

---

## Document History

| Date | Author | Changes |
| ---- | ------ | ------- |
| 2026-03-11 | DevOps Team | Initial version - Issue #1003 |

---

**Last Reviewed:** March 11, 2026
**Next Review:** June 11, 2026 (Quarterly)
**Owner:** DevOps Team
