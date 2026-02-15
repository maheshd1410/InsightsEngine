# Insights Engine

Initial scaffold for Sprint 1 Story `API-001`.

## Workspaces
- `backend`: NestJS API foundation (`/api/v1` + health endpoint)
- `frontend`: Next.js placeholder app
- `db`: initial SQL schema baseline

## Quick Start
1. `npm install`
2. `npm run dev:backend`
3. `npm run dev:frontend`

## Validate API-001
- `GET http://localhost:3000/api/v1/health` should return `200`.
- Lint pipeline: `npm run lint`
- Backend tests: `npm run test -w backend`
