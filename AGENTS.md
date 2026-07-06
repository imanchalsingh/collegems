# AGENTS.md

## Repo overview

Three independent packages (no root npm scripts):

| Package | Stack | Entry point | Dev server |
|---------|-------|-------------|------------|
| `collegems-client/` | React 19, Vite 7, TypeScript 5.9, Tailwind CSS v4, MUI 7, Redux Toolkit, TanStack Query | `src/main.tsx` | `npm run dev` → `localhost:5173` |
| `collegems-server/` | Express 5, Mongoose 9, MongoDB, Socket.io | `server.js` | `npm run dev` → `localhost:5000` |
| `collegems-ml-service/` | FastAPI (Python), scikit-learn | `main.py` | `uvicorn main:app --port 8000` |

Each package has its own `node_modules`. Run `npm install` inside each directory separately.

## Commands

```bash
# Client
cd collegems-client
npm run lint          # ESLint (flat config, TS/TSX only)
npm run build         # tsc -b && vite build — must pass before PR

# Server
cd collegems-server
npm run dev           # nodemon server.js
npm run start         # node server.js (production)
npm run seed          # seed demo data (safe, re-runnable)
npm run seed:fresh    # destroy + re-seed
npm run test          # node --test src/tests/*.test.js

# ML service
cd collegems-ml-service
pip install -r requirements.txt
python main.py        # uvicorn on :8000
```

There is no root-level lint, typecheck, or test command.

## Verification order

Client changes: `npm run lint` → `npm run build` (tsc + vite).

Server changes: `npm run test` (uses `mongodb-memory-server`, no external MongoDB needed).

## Architecture notes

- **No root package.json scripts.** Each package is fully independent. There is no monorepo tool (no turborepo, nx, or pnpm workspaces).
- **Client ↔ Server:** Client calls `VITE_BACKEND_URL` (defaults to `http://localhost:5000/api`). Server mounts all routes under `/api`.
- **Auth:** JWT stored in Redux state. Server validates via `authenticate` middleware. Many routes in `app.js` apply `authenticate` at the router level — check before adding unauthenticated endpoints.
- **Socket.io:** Server creates an HTTP server wrapping Express. Socket auth uses the same JWT. Study groups have their own socket module (`src/socket/studyGroupSocket.js`).
- **Role-based UI:** Frontend components are split by role:
  - `src/user-components/` → Student
  - `src/teacher-components/` → Teacher
  - `src/hod-components/` → Admin/HOD
  - `src/common-components-management/` → Shared
  - `src/pages/` → Layouts and dashboards
- **Server routes** follow the pattern `src/routes/<domain>.routes.js` → `src/controllers/<domain>.controller.js` → `src/models/<Domain>.model.js`.
- **Express 5:** The server uses Express 5 (not 4). Route error handling and async behavior differ from v4.
- **Tailwind CSS v4:** Uses `@tailwindcss/vite` plugin (not PostCSS). Config is in `vite.config.ts`, not a separate `tailwind.config.js`.
- **TypeScript strict mode** is enabled for the client. `noUnusedParameters: true`, `noUnusedLocals: false`.
- **ESM throughout:** Both client and server use `"type": "module"`. Use `import`/`export`, not `require`.

## Environment variables

**Client** (`collegems-client/.env`):
```
VITE_BACKEND_URL=http://localhost:5000/api
```

**Server** (`collegems-server/.env` — create from `.env.example`):
```
MONGO_URI=<your mongodb connection string>
JWT_SECRET=<secret>
JWT_REFRESH_SECRET=<secret>
PORT=5000
```

Server exits immediately if `MONGO_URI`, `JWT_SECRET`, or `JWT_REFRESH_SECRET` are missing.

## Testing

- Server tests use Node's built-in `node:test` runner (not Jest) with `mongodb-memory-server` for an in-memory MongoDB.
- Tests are in `collegems-server/src/tests/`. Currently covers: pagination, analytics, audit, booking.
- Client has no test suite.

## Conventions

- **Conventional Commits** enforced via commitlint + husky: `feat(scope): description`, `fix(scope): description`, etc.
- **Branch naming:** `<type>/<short-description>` (e.g., `feat/grade-predictor`, `fix/jwt-expiry`).
- PRs target `master` branch.
- UI changes should be tested across all three roles (Student, Teacher, HOD) and on mobile — Tailwind is mobile-first.
- The `patch_teacher_assignments.js` at the root is a one-off code-mod script, not part of the build.

## Available skills (`.agents/skills/`)

| Skill | What it does in this repo |
|-------|--------------------------|
| `conventional-commit` | Generates commit messages following the `feat(scope):` / `fix(scope):` format enforced by commitlint + husky |
| `mongodb-query-optimizer` | Reviews slow Mongoose queries in `collegems-server`, suggests indexes for MongoDB collections |
| `python-anti-patterns` | Checks `collegems-ml-service` FastAPI/scikit-learn code for common Python mistakes before merge |
| `seo-audit` | Audits the React client pages for meta tags, Core Web Vitals, and indexing issues |
| `wcag-audit-patterns` | Audits React components against WCAG 2.2 — covers all three role UIs (Student, Teacher, HOD) |
