# Day 1-2 Plan: KPI Definition Workshop

## Objective
Define and approve a KPI dictionary for the Software Engineering Metrics Dashboard that leadership can trust for planning, quality, and risk decisions.

## Outcomes by End of Day 2
- Approved KPI list for MVP (15-20 KPIs)
- KPI definitions with formulas, ownership, targets, and refresh cadence
- Source system mapping and confidence rating
- Governance model for metric ownership and change control
- Prioritized implementation order (Wave 1 vs Wave 2)

## Participants
- Senior Engineering Manager (facilitator)
- Engineering Directors / Managers
- QA Lead
- Security Champion
- DevOps / Platform Lead
- Product Owner / PMO representative
- Data / BI representative

## Pre-work (send 24 hours before Day 1)
- Current scorecards and leadership reports
- Last 2 quarters of delivery, quality, and vulnerability data
- Existing definitions used by teams (if inconsistent, bring all versions)
- Candidate tools and data sources: Jira/Azure DevOps, GitHub, SonarQube, Snyk/CodeQL, CI/CD

## KPI Decision Principles
1. Business relevance: KPI must influence staffing, risk, or delivery decisions.
2. Actionability: Owner must be able to move the metric.
3. Measurability: Data can be collected consistently and auditable.
4. Comparability: Same definition across teams.
5. Timeliness: Refresh cadence supports decision cadence.

## Day 1 Agenda (Discovery + Definition)

### 09:00-09:30: Kickoff and alignment
- Confirm goals, scope, and constraints for MVP.
- Align on definitions of team, service, and period (sprint/month/quarter).

### 09:30-11:00: Capacity planning metrics workshop
- Finalize capacity KPIs: planned capacity, actual capacity, utilization, allocation accuracy, hiring gap.
- Define calculation rules and exclusions (holidays, training, support rotation, etc.).

### 11:15-12:30: Code quality metrics workshop
- Finalize quality KPIs: coverage, defect escape rate, change failure rate, code smell density.
- Agree thresholds (green/amber/red) and target trajectories.

### 13:30-15:00: Security metrics workshop
- Finalize security KPIs: open critical/high vulns, SLA breach %, vulnerability MTTR.
- Align severity model and remediation SLA by severity.

### 15:15-16:30: Delivery metrics workshop
- Finalize delivery KPIs: deployment frequency, lead time for changes, cycle time, incident rate.
- Agree baseline period and benchmark approach.

### 16:30-17:00: Day 1 review
- Capture unresolved issues and owners.
- Confirm data owners for each KPI.

## Day 2 Agenda (Validation + Approval)

### 09:00-10:30: Formula and data source validation
- Validate numerator/denominator from real sample data.
- Resolve conflicts between tool definitions.

### 10:45-12:00: Threshold and target setting
- Set green/amber/red thresholds per KPI.
- Label KPIs as lagging vs leading indicators.

### 13:00-14:30: Ownership and governance
- Assign metric owner and backup owner.
- Define monthly review cadence and change request flow.

### 14:45-15:45: MVP prioritization
- Wave 1 (MVP): must-have KPIs for dashboard launch.
- Wave 2: deferred KPIs requiring complex integration.

### 15:45-16:30: Leadership readout prep
- Build one-page KPI summary with definitions and targets.
- Confirm executive narrative: capacity, quality, security, delivery.

### 16:30-17:00: Formal sign-off
- Approve KPI dictionary v1.
- Approve implementation backlog input.

## Required Artifacts Produced During Day 1-2
- KPI Dictionary v1 (`docs/kpi-dictionary-v1.csv`)
- KPI Decision Log (`docs/kpi-decision-log.md`)
- Source Mapping Matrix (`docs/source-mapping-matrix.csv`)
- Risks and Assumptions Log (`docs/workshop-risks-assumptions.md`)

## Facilitation Rules
- No KPI without owner.
- No KPI without data source.
- No KPI without explicit formula.
- No target without baseline evidence or decision rationale.

## Exit Criteria
- 100% of MVP KPIs have owner, formula, source, cadence, thresholds.
- <= 10% open decisions after Day 2.
- Leadership-ready summary approved.
