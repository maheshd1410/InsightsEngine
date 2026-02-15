# Dependency Link Import Guide

## Files
- `docs/jira-dependency-links-template.csv`
- `docs/jira-dependency-links-import-ready.csv`
- `docs/jira-token-map.csv`

## Purpose
- `jira-dependency-links-template.csv`: master dependency matrix with tokens + blank issue key columns.
- `jira-dependency-links-import-ready.csv`: minimal CSV for link import after issue keys are filled.
- `jira-token-map.csv`: helper to map token IDs to backlog items.

## How to Use
1. Export created Jira issues to CSV with columns at least: `Issue key`, `Labels`.
2. In Excel/Sheets, map each token label (e.g., `API-001`) to an issue key.
3. Populate both key columns in `jira-dependency-links-template.csv`:
   - `Source Issue Key (Fill After Import)`
   - `Destination Issue Key (Fill After Import)`
4. Copy those values into `jira-dependency-links-import-ready.csv`.
5. Import `jira-dependency-links-import-ready.csv` using Jira CSV import.

## Link Direction
- Row means: `Source` issue `blocks` `Destination` issue.
- This matches dependency semantics from your backlog (`Destination` is blocked by `Source`).
