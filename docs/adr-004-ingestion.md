# ADR-004: Ingestion Strategy for Engineering Metrics

- Status: Approved (MVP)
- Date: 2026-02-15

## Context
Metric data comes from multiple systems with varying update patterns and API constraints.

## Decision
- Hybrid ingestion model:
  - Scheduled pull for Jira, SonarQube, Snyk
  - Webhook/event-driven ingestion for CI/CD and SCM where available
- Standardized normalization layer before persistence
- Idempotent ingestion writes with source event keys

## Rationale
- Balances freshness and operational simplicity.
- Handles source-system variability without overfitting.

## Consequences
- Positive: Reliable ingest with controlled complexity.
- Negative: Requires robust dedupe and retry handling.

## Follow-up
- Implement connector error DLQ and retry policy by Sprint 2.
