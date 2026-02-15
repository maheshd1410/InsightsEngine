# UX Screen to API Mapping (Day 6)

## Global Filters
- Filters: `organizationId`, `teamId`, `repositoryId`, `dateFrom`, `dateTo`, `severity`, `status`
- Propagation rule: header filters apply to all child widgets unless overridden in widget config.

## Admin Screens

| Screen | UI Components | API Endpoints | Methods | Roles |
|---|---|---|---|---|
| Organizations | table, create/edit drawer, deactivate action | `/organizations`, `/organizations/{organizationId}` | `GET, POST, PATCH, DELETE` | Admin |
| Teams | table, create/edit drawer | `/teams` | `GET, POST` | Admin |
| Users & Roles | table, role assignment editor | `/users` | `GET` (MVP), `PATCH` (Phase 2) | Admin |
| Metric Definitions | table, formula editor | `/metric-definitions` | `GET, POST` | Admin |
| Metric Thresholds | table, threshold modal | `/metric-thresholds` | `GET, POST` | Admin |

## Manager Screens

| Screen | UI Components | API Endpoints | Methods | Roles |
|---|---|---|---|---|
| Planning Cycles | cycle list, create form | `/planning-cycles` | `GET, POST` | Admin, Engineering Manager |
| Capacity Plans | editable grid | `/capacity-plans` | `GET, POST` | Admin, Engineering Manager, Team Lead |
| Allocations | allocation editor, % validation | `/allocations` | `GET, POST` | Admin, Engineering Manager, Team Lead |
| Security Findings | findings table, status update | `/security-findings` | `GET, POST` (MVP), `PATCH` (Phase 2) | Admin, Engineering Manager, Team Lead |
| Action Items | board/list, owner + due date | `/action-items` | `GET, POST` | Admin, Engineering Manager, Team Lead |

## Dashboard Screens

| Screen | UI Components | API Endpoints | Methods | Roles |
|---|---|---|---|---|
| Portfolio Dashboard | summary tiles, trend spark lines, risk table | `/dashboards/portfolio` | `GET` | Admin, Engineering Manager, Executive |
| Team Scorecard | KPI cards, variance panel, action table | `/dashboards/team-scorecard`, `/action-items` | `GET` | Admin, Engineering Manager, Team Lead, Executive |
| Metric Drilldown | trend chart, detailed records | `/quality-metrics`, `/security-findings`, `/capacity-plans` | `GET` | Admin, Engineering Manager, Team Lead |

## UX Data Loading Rules
- Initial page load should request only summary payloads.
- Heavy tables load lazily after route render.
- All list endpoints use `page` and `pageSize` with server-side sorting.
- Empty states must display data-latency indicator and last refresh timestamp.

## Validation Rules for Forms
- Required server-side validations mirror OpenAPI required fields.
- Allocation total per team/cycle must be <= 100.
- Date validations: `startDate <= endDate`, due dates not in closed periods.
- Security finding severity must be one of `critical/high/medium/low`.

## Contract Test Priority (Day 6 output)
1. `GET /dashboards/portfolio` with filters.
2. `POST /planning-cycles` validation and date rules.
3. `POST /capacity-plans` numeric constraints.
4. `GET /security-findings` filter combinations.
5. `POST /action-items` and status transitions.
