# Integration Access Checklist (Day 4)

| Source System | Auth Method | Required Scope/Role | Credential Owner | Sandbox Access | Prod Access | Expiry/Rotation | Status | Blocker |
|---|---|---|---|---|---|---|---|---|
| Jira | API token/OAuth | Read issues, boards, sprints, worklogs | Jira Admin |  |  |  | Pending |  |
| GitHub | App/OAuth | Read repos, commits, PRs, deployments | SCM Admin |  |  |  | Pending |  |
| SonarQube | Token | Browse projects + measures API | Platform |  |  |  | Pending |  |
| Snyk | Service account token | Read org issues/projects | Security Admin |  |  |  | Pending |  |
| CI/CD | PAT/OAuth | Read pipeline runs/deployments | DevOps Admin |  |  |  | Pending |  |
| Incident Tool | API key | Read incidents/services | SRE Admin |  |  |  | Pending |  |

## Gate Criteria
- All Wave 1 systems have sandbox credentials by end of Day 4.
- At least 2 named maintainers per connector.
- Secret storage location agreed (Key Vault/Secrets Manager).
- Rotation policy documented for each credential.
