# Jira Import Guide for Backlog CSV

## Files
- `docs/jira-import-backlog.csv`: ready-to-import backlog with Epics, Stories, and Tasks.

## Import Steps (Jira Cloud)
1. Go to `Jira Settings -> System -> External System Import -> CSV`.
2. Upload `docs/jira-import-backlog.csv`.
3. Select target project.
4. During field mapping, map these columns:
   - `Issue ID` -> `Issue ID` (for parent linkage during import)
   - `Summary` -> `Summary`
   - `Issue Type` -> `Issue Type`
   - `Description` -> `Description`
   - `Priority` -> `Priority`
   - `Labels` -> `Labels`
   - `Story Points` -> `Story Points` (or your estimation field)
   - `Epic Name` -> `Epic Name`
   - `Epic Link` -> `Epic Link` (company-managed projects)
   - `Parent ID` -> `Parent ID` (team-managed hierarchy support)
   - `Sprint` -> `Sprint` (if sprints already exist)
   - `Components` -> `Components`
5. Run validation preview, fix any unmapped custom field prompts, then import.

## Notes
- If your Jira project does not support one of `Epic Link` or `Parent ID`, keep the other and ignore unsupported field.
- If sprint names do not exist yet, Jira may ignore `Sprint`; you can bulk-assign sprint after import.
- Dependencies are embedded in descriptions using IDs (for traceability). Add formal issue links post-import.
- Priority mapping used:
  - `P0 -> Highest`
  - `P1 -> High`
  - `P2 -> Medium`

## Optional Post-Import Cleanup
1. Create issue links (`blocks`, `is blocked by`) using dependency strings in description.
2. Assign owners and target dates.
3. Save filters for Sprint 1 and Sprint 2 labels.
