# Jira Automation Rule Template: Auto-Link Dependencies from API-xxx IDs

## Goal
Automatically create issue links based on dependency IDs found in issue descriptions (e.g., `Dependencies: API-001 API-002`).

## Preconditions
- Imported issues have token labels such as `API-001`, `DATA-003`, `QA-001`, `SEC-001`.
- Description contains either `Dependency:` or `Dependencies:` followed by token IDs.
- Rule actor has permission to browse and link issues.

## Rule Configuration (Template)

### 1. Trigger
- `Issue created`
- Add `Issue updated` if dependencies may change later.

### 2. Condition
- `Issue fields condition`
- Field: `Description`
- Condition: `contains`
- Value: `Dependency`

### 3. Create variable: `dep_csv`
Use this smart value expression:

`{{issue.description.replace("Dependency:","Dependencies:").substringAfter("Dependencies:").substringBefore(".").trim.replace(" ",",")}}`

Expected output example: `API-001,API-002,DATA-001`

### 4. Advanced compare condition
- First value: `{{varDepCsv}}`
- Condition: `does not equal`
- Second value: *(empty)*

### 5. Lookup issues
JQL:

`project = {{issue.project.key}} AND labels in ({{varDepCsv}})`

### 6. Branch: `For each issue in: Lookup issues`
Inside branch action:
- Action: `Link issues`
- Link type: `blocks`
- Source issue: `{{lookupIssue.key}}`
- Destination issue: `{{triggerIssue.key}}`

This enforces: dependency issue `blocks` current issue.

### 7. Optional guard
Add condition inside branch to avoid self-link:
- `{{lookupIssue.key}}` does not equal `{{triggerIssue.key}}`

## Validation Checklist
1. Create a test issue with description: `Dependencies: API-001 API-002.`
2. Confirm two links created where those issues block the new issue.
3. Re-run with no dependencies and confirm no links are created.
4. Review audit log for JQL parsing and permission errors.

## Fallback
If your Jira instance does not support the smart value expression as-is:
- Keep `docs/jira-dependency-links-template.csv` as source.
- Fill issue keys and import `docs/jira-dependency-links-import-ready.csv`.
