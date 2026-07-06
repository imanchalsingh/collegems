# Contributing to SCMS 🏫

Thank you for your interest in contributing to the **Smart College Management System (SCMS)** — a full-stack, role-based college management platform built for modern academic institutions, serving Students, Teachers, and HODs/Administrators.

This project is part of **SSOC '26 (Social Summer of Code 2026)**. Whether you're here through SSOC or contributing independently, this guide will walk you through everything you need to make your first PR smooth and successful. Welcome! 🚀

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
  - [Fork & Clone the Repository](#fork--clone-the-repository)
  - [Setting Up the Development Environment](#setting-up-the-development-environment)
- [Project Structure](#project-structure)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Making Changes](#making-changes)
  - [Commit Message Style](#commit-message-style)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Getting Assigned an Issue](#getting-assigned-an-issue)
- [Reporting Issues](#reporting-issues)
- [Need Help?](#need-help)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful, inclusive, and beginner-friendly environment. Be constructive, patient, and kind — especially with first-time contributors.

---

## Getting Started

### Fork & Clone the Repository

1. **Fork** this repository by clicking the **Fork** button at the top-right of the [SCMS GitHub page](https://github.com/imanchalsingh/collegems).

2. **Clone** your fork locally:

   ```bash
   git clone https://github.com/YOUR_USERNAME/collegems.git
   cd collegems
   ```

3. **Add the upstream remote** to stay in sync with the original:

   ```bash
   git remote add upstream https://github.com/imanchalsingh/collegems.git
   ```

4. **Verify your remotes:**
   ```bash
   git remote -v
   # origin    https://github.com/YOUR_USERNAME/collegems.git (fetch)
   # upstream  https://github.com/imanchalsingh/collegems.git (fetch)
   ```

---

### Setting Up the Development Environment

#### Prerequisites

| Tool                                                      | Version                     | Purpose            |
| --------------------------------------------------------- | --------------------------- | ------------------ |
| [Node.js](https://nodejs.org/)                            | v18.x or above              | JavaScript runtime |
| [npm](https://npmjs.com/) or [Yarn](https://yarnpkg.com/) | Latest stable               | Package manager    |
| [MongoDB](https://www.mongodb.com/)                       | Local instance or Atlas URI | Database           |

---

#### Backend Setup (`collegems-server`)

1. Navigate to the backend directory:

   ```bash
   cd collegems-server
   ```

2. Install server dependencies:

   ```bash
   npm install
   ```

3. Create your local environment file from the example:

   ```bash
   cp .env.example .env
   ```

4. Open `.env` and fill in your values:

   ```env
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_super_secure_jwt_secret
   PORT=5000
   ```

5. Start the backend server:
   ```bash
   npm run start
   ```
   The API will be running at `http://localhost:5000`.

---

#### Frontend Setup (`collegems-client`)

Open a new terminal tab, then:

1. Navigate to the frontend directory:

   ```bash
   cd collegems-client
   ```

2. Install client-side dependencies:

   ```bash
   npm install
   ```

3. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

4. Verify the backend URL inside `.env`:

   ```env
   VITE_BACKEND_URL=http://localhost:5000/api
   ```

5. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:5173`.

---

#### Keep your fork up to date before starting any new work:

```bash
git fetch upstream
git checkout main
git merge upstream/master
```

---

## Project Structure

```text
collegems/
├── assets/                         # Shared README resources & graphics
├── collegems-client/               # React 19 + Vite SPA (Frontend)
│   └── src/
│       ├── api/                    # Axios core and API query modules
│       ├── hod-components/         # HOD/Admin specific UI elements
│       ├── teacher-components/     # Teacher specific UI elements
│       ├── user-components/        # Student specific UI elements
│       ├── pages/                  # Layouts & role-based dashboards
│       ├── routes/                 # Route guarding and configuration
│       ├── App.tsx                 # Main App component
│       └── main.tsx                # Client entry point
├── collegems-server/               # Express.js v5 Backend
│   └── src/
│       ├── config/                 # DB and application config
│       ├── controllers/            # API business logic handlers
│       ├── middlewares/            # Auth guards & validation middlewares
│       ├── models/                 # Mongoose schemas
│       ├── routes/                 # Express route endpoints
│       └── utils/                  # Mailers and helper scripts
│       server.js                   # Server entry point
└── README.md
```

**Where to make changes:**

- **Student UI** → `collegems-client/src/user-components/`
- **Teacher UI** → `collegems-client/src/teacher-components/`
- **HOD/Admin UI** → `collegems-client/src/hod-components/`
- **New pages/routes** → `collegems-client/src/pages/` + `routes/`
- **API business logic** → `collegems-server/src/controllers/`
- **Database schemas** → `collegems-server/src/models/`
- **Auth/middleware** → `collegems-server/src/middlewares/`

---

## Branch Naming Conventions

Always create a new branch for your changes. **Never commit directly to `master`.**

Use this format:

```text
<type>/<short-description>
```

| Type       | When to use                            | Example                         |
| ---------- | -------------------------------------- | ------------------------------- |
| `feat`     | New feature                            | `feat/student-grade-predictor`  |
| `fix`      | Bug fix                                | `fix/jwt-token-expiry-handling` |
| `docs`     | Documentation only                     | `docs/add-contributing-guide`   |
| `chore`    | Maintenance (deps, config)             | `chore/upgrade-express-v5`      |
| `refactor` | Code restructuring, no behavior change | `refactor/rbac-middleware`      |
| `test`     | Adding or updating tests               | `test/attendance-controller`    |
| `style`    | UI or formatting tweaks                | `style/hod-dashboard-mobile`    |

**Create your branch:**

```bash
git checkout -b feat/your-feature-name
```

---

## Making Changes

- Keep each PR **focused** — one feature or fix per PR.
- For **frontend (React/TypeScript)** changes, ensure no TypeScript errors before pushing:
  ```bash
  cd collegems-client && npm run build
  ```
- For **UI changes**, test across all three roles (Student, Teacher, HOD) where applicable, and verify responsiveness on desktop and mobile — the project uses Tailwind CSS v4 with a mobile-first approach.
- For **backend/API changes**, test your endpoints (Postman or curl) and document any new routes in your PR description. Ensure JWT middleware and RBAC guards are respected.
- For **Mongoose schema changes**, confirm backward compatibility with existing data or note migration steps in your PR.
- For **Socket.io changes**, test real-time notification behavior for all affected roles.
- For **major features or architecture changes**, open an issue first to discuss before writing code.

### Commit Message Style

This project enforces [Conventional Commits](https://www.conventionalcommits.org/) via **Husky** + **commitlint**. Your commit will be rejected at save time if the message is malformed — no CI round-trip needed.

#### Format

```text
<type>(<optional scope>): <short description>

[optional body]

[optional footer — e.g. Closes #8]
```

#### Allowed types

| Type       | When to use                              |
| ---------- | ---------------------------------------- |
| `feat`     | New feature visible to users             |
| `fix`      | Bug fix                                  |
| `docs`     | Documentation only                       |
| `style`    | Formatting, whitespace — no logic change |
| `refactor` | Code restructuring, no behavior change   |
| `test`     | Adding or updating tests                 |
| `chore`    | Maintenance (deps, config, build)        |
| `perf`     | Performance improvement                  |
| `revert`   | Reverts a prior commit                   |

#### Good commits

```text
feat(student): add grade predictor using performance history
fix(auth): resolve jwt refresh token expiry edge case
docs: add local setup steps to contributing.md
chore(deps): upgrade mongoose to v9.1
refactor(middleware): consolidate rbac role guards
style(teacher): fix attendance marker overflow on mobile
perf(query): index enrollmentId on attendance collection
revert: revert "feat(hod): bulk promote feature"
```

#### Bad commits — these will be **blocked**

```text
# Missing type
added login page

# Type not in allowed list
update: fix the login bug

# Subject starts with uppercase
fix(auth): Resolve token expiry

# Subject too long (over 72 chars)
feat(student): add a very detailed and comprehensive grade prediction system that uses historical performance data

# Empty subject
feat(auth):

# Vague or non-descriptive
fix: stuff
chore: changes
feat: wip
```

#### Rules enforced automatically

- Type must be one of the allowed list above
- Subject must be **lower-case**
- Subject must be **non-empty**
- Subject line must be **≤ 72 characters**
- Use **imperative mood** — "add", not "added" or "adds"
- Reference related issues at the bottom: `Closes #8` or `Fixes #14`

#### Local setup (one-time, after cloning)

Husky hooks live at the repo root. Run from the **project root** (not inside `collegems-client` or `collegems-server`):

```bash
npm install
```

That's it — `npm install` triggers the `prepare` script which activates the `commit-msg` hook. Every `git commit` after this will be validated automatically.

---

## Submitting a Pull Request

1. **Ensure the build passes** before pushing:

   ```bash
   cd collegems-client && npm run build
   ```

2. **Push your branch** to your fork:

   ```bash
   git push origin feat/your-feature-name
   ```

3. Go to [imanchalsingh/collegems](https://github.com/imanchalsingh/collegems) on GitHub and click **"Compare & pull request"**.

4. Open your PR **against the `master` branch**.

5. Fill in the PR description with:
   - A clear **title** (e.g. `feat: add student grade predictor`)
   - **What changed** and **why**
   - Which role(s) are affected (Student / Teacher / HOD)
   - Screenshots or recordings for any UI changes
   - API changes documented if the backend was modified
   - Link the PR to the issue by adding a reference like `Closes #IssueNumber`, `Fixes #IssueNumber`, `Resolves #IssueNumber`, `Related to #IssueNumber`, or `Ref #IssueNumber` in the description. **Note: Every PR must include a linked issue reference in its description or the CI workflow will fail and block the PR from being merged.**

6. A maintainer will review your PR. Requested changes are normal — address the feedback, push updates, and you'll get merged once approved. 🎉

> **Note:** PRs introducing new dependencies, Mongoose schema changes, new API routes, or Socket.io events should be discussed in a GitHub Issue before implementation.

---

## Getting Assigned an Issue

This project participates in **SSOC '26** — comment on an issue before starting work.

1. Browse [open issues](https://github.com/imanchalsingh/collegems/issues)
2. Comment with your planned approach
3. Wait for a maintainer to assign it to you
4. Start coding **only after assignment**

**Example comment:**

```markdown
Hi @imanchalsingh 👋

I'd like to work on this issue for SSOC '26.

Planned approach:

- Add a grade predictor component under user-components/
- Hook into the existing TanStack Query setup for fetching grades
- Display predictions on the student dashboard

Could you please assign this to me?
```

> Starting work without assignment may result in your PR not being considered.

---

## Reporting Issues

Found a bug or have a feature idea? [Open an issue](https://github.com/imanchalsingh/collegems/issues)!

**Before opening an issue:**

- Search [existing issues](https://github.com/imanchalsingh/collegems/issues) to avoid duplicates.
- Check if it's already fixed in the latest commit on `master`.

**For bug reports, include:**

- Clear, descriptive title
- Which role is affected (Student / Teacher / HOD)
- Steps to reproduce the problem
- Expected vs. actual behavior
- Your OS, Node.js version (`node -v`), and browser
- Terminal or DevTools error logs if available

**For feature requests, include:**

- The problem you're solving
- Your proposed solution
- Which module or role it affects
- Any alternatives you considered

---

## Need Help?

- Browse [open issues](https://github.com/imanchalsingh/collegems/issues) for context on ongoing work.
- Leave a comment on the relevant issue or PR.
- Reach the maintainer via GitHub: [imanchalsingh](https://github.com/imanchalsingh)

New to open source or the MERN stack? Look for issues tagged **`good first issue`** — they're scoped to be approachable for beginners. We'd love to have you! 💙

---

_This guide is open to improvement too. If something is unclear or missing — feel free to open a PR or issue for it._

---

<p align="center">Made with ❤️ for modern academics</p>
