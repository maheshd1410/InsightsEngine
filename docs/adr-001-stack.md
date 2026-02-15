# ADR-001: Backend and Frontend Technology Stack

- Status: Approved (Proposed baseline for MVP)
- Date: 2026-02-15

## Context
We need a fast MVP with maintainable code, strong enterprise support, and minimal language fragmentation.

## Decision
- Frontend: Next.js + React + TypeScript
- Backend: NestJS + Node.js + TypeScript
- API style: REST under `/api/v1` with OpenAPI-first design

## Rationale
- Single language across frontend/backend improves velocity and onboarding.
- Strong ecosystem for enterprise auth, validation, and testing.
- Contract-first approach improves QA and stakeholder alignment.

## Consequences
- Positive: Faster delivery, easier hiring and support.
- Negative: CPU-heavy workloads may require separate worker services.

## Follow-up
- Establish coding standards and shared lint/test presets in Sprint 1.
