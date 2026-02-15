# ADR-002: Data Store and Caching Strategy

- Status: Approved (MVP)
- Date: 2026-02-15

## Context
The system needs transactional CRUD support plus performant dashboard reads.

## Decision
- Primary OLTP database: PostgreSQL
- Cache and ephemeral data: Redis
- Time-window aggregation: computed in backend services for MVP; revisit specialized store post-MVP

## Rationale
- PostgreSQL supports relational integrity and flexible querying.
- Redis reduces dashboard latency and repeated aggregation load.
- Avoid premature complexity in MVP.

## Consequences
- Positive: Simpler operations and cost efficiency.
- Negative: Very high-scale trend queries may need later optimization.

## Follow-up
- Add index strategy for team/date/repo filters in Sprint 1.
