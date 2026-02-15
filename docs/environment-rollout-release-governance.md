# Environment Rollout and Release Governance

## Environment Topology
- `dev`: daily integration, low-stability requirement
- `test`: QA validation and contract testing
- `stage`: release candidate validation with production-like data shape
- `prod`: controlled release with change approval

## Deployment Strategy
- CI on every PR: lint + unit + contract tests
- CD to `dev` on merge to main
- Promotion gates: `dev -> test -> stage -> prod`
- Manual approval required for `stage -> prod`

## Release Gates (MVP)
1. P0 contract tests: 100% pass
2. No open critical vulnerabilities
3. Dashboard endpoint P95 response < 2 seconds in stage baseline test
4. Rollback plan validated for current release candidate

## Rollback Policy
- Trigger rollback for P0 regression, data corruption risk, or auth failure.
- Rollback must restore previous stable image and schema-compatible state.
- Post-incident review required within 1 business day.

## Observability Minimum Baseline
- Structured request logs with correlation ID
- Endpoint latency/error metrics
- Auth failure monitoring
- Connector ingestion failure alerts

## Ownership Matrix
- Release Manager: release decision and coordination
- Tech Lead: technical go/no-go
- QA Lead: quality sign-off
- Security Champion: security gate sign-off
- Platform Lead: deployment and rollback execution
