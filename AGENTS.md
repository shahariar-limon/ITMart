# ITMart Engineering Instructions

## Source of truth

- Follow `Plan.md` for scope, architecture, security, and acceptance criteria.
- Complete MVP phases in order. Do not introduce Phase 2 or future features early.

## Stack and layout

- Use strict TypeScript throughout.
- Backend: Node.js, Express, Prisma (PostgreSQL/Neon), Zod, JWT, bcrypt.
- Frontend: React, Vite, React Router, Axios, Tailwind CSS.
- Keep backend code grouped by domain under `backend/src/modules/`.
- Keep business rules in services; controllers translate HTTP input/output only.

## Required conventions

- API base path is `/api/v1`.
- Success response: `{ success: true, data, meta? }`.
- Error response: `{ success: false, error: { code, message, details? }, requestId }`.
- Validate every external input with schemas.
- Never trust client-provided roles, prices, totals, inventory, or ownership.
- Never return password hashes or include credentials, tokens, or personal data in logs.
- All mutating routes require authentication unless explicitly public in `Plan.md`.
- Use `AppError` and the centralized error handler; do not leak production stack traces.
- Write or update tests for each endpoint and security rule.
- Do not add production dependencies without recording why they are needed.

## Quality gates

- Before handoff, run lint, typecheck, tests, and builds for affected workspaces.
- Keep changes small, cohesive, and documented.
- Never commit `.env`, generated build output, coverage, or dependency directories.

