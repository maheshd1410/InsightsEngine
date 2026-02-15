# Day 5-6 Plan: API Contracts and UX Data Model

## Objective
Translate approved KPI definitions and source mappings into a concrete API contract and screen-level UX data model for MVP build kickoff.

## Outcomes by End of Day 6
- OpenAPI v1 skeleton approved for MVP entities and dashboards
- Screen-to-endpoint mapping approved for Admin, Manager, and Executive views
- Validation, pagination, filter, and error standards agreed
- Role-based permissions matrix validated against screen actions
- API backlog split into implementation sprints

## Participants
- Engineering Manager (facilitator)
- Tech Lead / Backend Lead
- Frontend Lead
- QA Lead
- Security Champion
- Product Owner

## Day 5 Agenda (API Contract)

### 09:00-09:30: Scope lock
- Confirm MVP entities and endpoints in scope.
- Confirm `/api/v1` versioning and naming conventions.

### 09:30-11:00: Core CRUD contract review
- Review schemas for orgs, teams, users, planning cycles, capacity plans, allocations.
- Confirm required vs optional fields and validation rules.

### 11:15-12:30: Metrics and findings contracts
- Review quality metric snapshot and security finding schemas.
- Confirm calculation endpoint patterns for dashboard tiles.

### 13:30-15:00: Query standards
- Finalize pagination, sorting, filtering, date-range semantics.
- Define standard error envelope and correlation IDs.

### 15:15-16:30: RBAC and auditability
- Confirm endpoint-level permissions for Admin/Manager/Lead/Executive.
- Confirm audit fields and soft-delete behavior.

### 16:30-17:00: Day 5 checkpoint
- Capture open contract gaps and assign owners.

## Day 6 Agenda (UX Data Model + Flow Validation)

### 09:00-10:30: Screen-to-data contract mapping
- Map each screen widget/table/form to API endpoint and schema fields.
- Confirm minimal payloads needed for fast loading.

### 10:45-12:00: Form workflows
- Validate create/edit/delete flows and server-side validation behavior.
- Confirm optimistic vs pessimistic update strategy per screen.

### 13:00-14:30: Dashboard drill-down flows
- Validate filter propagation (org, team, repo, period).
- Confirm summary tile to detail-table drill-down contract.

### 14:45-15:45: QA and non-functional checks
- Define contract test coverage and example payload fixtures.
- Confirm response SLAs for dashboard endpoints.

### 15:45-16:30: Readout preparation
- Produce API and UX readiness summary with open items.

### 16:30-17:00: Sign-off
- Approve API v1 baseline and transition to implementation sprint.

## Exit Criteria
- All MVP screens mapped to at least one approved endpoint.
- Zero ambiguous field definitions for MVP entities.
- Contract-test list drafted for all critical endpoints.
- Leadership-ready API/UX readiness summary approved.
