# Prinodia CyberLab

> **A professional cybersecurity learning workspace for notes, code, diagrams, labs, reports, and a personalized job-search engine.**

Prinodia CyberLab is an enterprise-grade cybersecurity learning platform for
students, SOC analysts, penetration testers, and security professionals. It
combines a knowledge base, code workspace, diagram editor, project tracker,
reporting system, and a Canada-focused job-discovery engine into a single
application — designed in the spirit of the **IBM Carbon Design System**: a
restrained, high-contrast dark theme with IBM Blue accents, sharp cards, and
precise typography.

---

## Theme

Light and dark modes, both built on IBM Carbon design tokens (Gray 100 dark /
White light) driven entirely by CSS custom properties. Dark is the default; your
choice is persisted per-device and applied before first paint (no flash). Toggle
from the top bar or **Settings → Theme**.

## Navigation

A collapsible, nested sidebar groups the workspace into **Dashboard**,
**Learning**, **Cyber Operations**, **Career Center**, **Progress**, and
**Settings**. Sections expand/collapse, the active page is highlighted, and the
active section stays open as you navigate.

## Features

**Learning**
- **Notes / Wiki** — three-pane layout (list · Markdown editor · live preview), editable titles, autosave, search, tags, folders, pinned & recent notes, version-history entry point.
- **Code Workspace** — Monaco editor (theme-aware) for Python, Bash, PowerShell, SQL, JS/TS, YAML, JSON, Markdown, and more.
- **Diagram Studio** — Mermaid.js with live, theme-aware rendering for flowcharts, sequence diagrams, and attack paths.
- **Course Library** — track structured courses by module and lesson, with notes linkable to lessons.
- **Study Sessions** — log focused sessions with duration, focus area, and course link.
- **Flashcards** — active-recall study mode with decks and confidence rating.
- **Resources** — courses, certs, books, labs, and tools.

**Cyber Operations**
- **Cyber Projects** — board across nine disciplines (SOC, SIEM, Threat Detection, IR, Vuln Mgmt, GRC, Pentest, Linux & Networking, Cloud).
- **Incident / Vulnerability / GRC Reports** — templated editors with severity and status.
- **SIEM Rules** — detection-engineering library mapped to MITRE ATT&CK.
- **Threat Hunting** — hypothesis-driven hunts with status and findings.
- **IOC Library** — searchable catalog of indicators of compromise.

**Career Center**
- **Resume Builder** — role-targeted, export-ready resumes (print/PDF), multiple resumes.
- **LinkedIn Optimization** — headline/about/skills/featured editor with an optimization checklist.
- **Cover Letters** — per-application drafts with live preview.
- **Application Tracker** — track roles from Saved through Offer with status, notes, and follow-ups.
- **Interview Preparation** — personal question bank with confidence ratings.
- **Portfolio** — showcase labs, detections, and write-ups.

**Job Discovery**

A Canada-focused discovery engine that ingests roles, normalizes them, and scores
them against your profile:

- **Provider architecture** — official **Greenhouse** and **Lever** job-board
  providers. Unofficial/experimental providers (e.g. Hiring.cafe, Workday) are
  **disabled by default** behind environment flags because they use undocumented
  endpoints; they are not integrated in production.
- **7-day freshness** — only roles posted within the last 7 days are surfaced.
- **Canada eligibility & relocation** — a canonical, server-side eligibility model
  covering Remote Canada, Vancouver / BC, Canada-wide on-site/hybrid with
  relocation, and Remote US/Canada roles that explicitly accept Canadian
  applicants. US-only and ambiguous-eligibility roles are excluded.
- **Normalization & deduplication** — postings are normalized into a common shape
  and de-duplicated across providers.
- **Personalized preferences** — per-user, environment-independent job-search
  preferences (home location, relocation, workplace types, employment type, max
  job age, workplace priority order) drive eligibility and ranking.
- **Transparent match scoring** — a 0–100 score with a full, explainable component
  breakdown (skills, title, experience, location, projects, tools, certifications)
  and honest geographic/legal hard gates.
- **Skill-gap analysis** — highlights missing required skills and low-confidence
  matches to guide your next lab or project.
- **Discovery dashboard** — filter and sort roles with saved-view shortcuts.

**Progress**
- **Learning Progress**, **Study Hours** (schedule adherence + streaks), **Goals**, **Weekly Review**.

**Dashboard** — stat cards, current learning track, weekly study + streak, active projects, recent applications, upcoming interviews, and recent notes.

---

## Technology stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS (Carbon-inspired design tokens) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | Signed JWT session cookies (`jose`), bcrypt password hashing |
| Editors | Monaco Editor, Markdown (react-markdown), Mermaid.js |
| Icons | Lucide |
| Fonts | IBM Plex Sans / IBM Plex Mono |
| Testing | Vitest |

---

## Prerequisites

- **Node.js 18.18+** (Node 20 or 22 recommended)
- **PostgreSQL 14+** running locally, with a database named `prinodia_cyberlab` already created

---

## Getting started

Run all commands from the project root.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in **your own local values** — never commit `.env`:

```bash
cp .env.example .env
```

At minimum, set:

- `DATABASE_URL` — your local PostgreSQL connection string.
- `AUTH_SECRET` — a long random value used to sign session cookies
  (`openssl rand -hex 32`).
- `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` — the local admin account the seed
  creates (see below). Use a strong, unique development password.

See `.env.example` for the full list and comments. The `prinodia_cyberlab`
database must already exist — create it with `createdb prinodia_cyberlab` if
needed.

### 3. Generate the Prisma client & run the migration

```bash
npx prisma generate
npx prisma migrate dev
```

`prisma generate` is required after pulling schema changes so the client picks up
new models.

### 4. Seed sample data

```bash
npm run db:seed
```

Loads sample notes, code snippets, diagrams, projects, reports, a learning track,
resources, and study logs — owned by a local development admin account.

**Authentication credentials for local development are configured through
environment variables.** The seed process reads `SEED_ADMIN_EMAIL` and
`SEED_ADMIN_PASSWORD` from the local environment, validates them, hashes the
password before persistence, and never stores plaintext credentials in the
repository. It prints only a confirmation line (the account email) — never the
password.

### 5. Run the app

```bash
npm run dev
```

Open **http://localhost:3000** and sign in with the `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` you configured in `.env`.

---

## Authentication

The app is gated behind a sign-in screen (`/login`). Sessions are signed JWTs
(`jose`, HS256) stored in an **httpOnly** cookie, marked **secure** in production
with **SameSite=Lax**. The signing secret is read from `AUTH_SECRET` in the
environment — there is no hard-coded fallback secret. Passwords are hashed with
**bcrypt**; login responses return a user profile only and never include the
password hash. Middleware redirects unauthenticated requests to `/login` and
signed-in users away from the auth pages.

---

## Handy scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm test` | Run the Vitest suite |
| `npm run db:migrate` | Create/apply a migration |
| `npm run db:seed` | Seed sample data (requires `SEED_ADMIN_*`) |
| `npm run db:studio` | Open Prisma Studio to browse data |
| `npm run jobs:ingest` | Run the job-discovery ingestion pipeline |

---

## Project structure

```text
PrinodiaCyberLab/
├── prisma/
│   ├── schema.prisma        # Data model (users, learning, ops, career, jobs)
│   ├── migrations/          # Versioned SQL migrations
│   └── seed.ts              # Sample data (env-configured admin owner)
├── src/
│   ├── app/
│   │   ├── (app)/           # Authenticated workspace (dashboard, career, etc.)
│   │   ├── (auth)/          # Login / auth pages
│   │   └── api/             # REST routes for CRUD, jobs, applications, auth
│   ├── components/          # Shell, UI primitives, markdown & mermaid renderers
│   └── lib/                 # prisma client, auth/session, jobs & applications logic
├── tests/                   # Vitest unit/integration tests
├── tailwind.config.ts       # Carbon-inspired design tokens
└── .env.example             # Placeholder environment configuration
```

---

## Security

- **Secrets live only in `.env`**, which is gitignored. `.env.example` contains
  placeholders only.
- **Never commit `.env` files, tokens, passwords, private keys, or production
  database credentials.**
- Generate every secret (`AUTH_SECRET`, `JOBS_REFRESH_SECRET`, database password)
  locally, and do not reuse development credentials in production.
- The seed never prints or stores plaintext passwords; authentication secrets are
  read from the environment.
- Provider/API tokens (e.g. `GITHUB_TOKEN`) are used server-side only and are
  never exposed to the browser or returned from API responses.

---

## Design notes

The visual language draws on the IBM Carbon **Gray 100** dark theme: a `#161616`
canvas, `#1f1f1f` layers, IBM Blue (`#0f62fe`) as the single interactive accent,
2px focus rings, sharp (zero-radius) corners, and IBM Plex typography. Support
colors (red/orange/yellow/green) are reserved for severity and status — never
decoration.

---

## Author

**Prince Ntunka** — Founder, Prinodia

## License

Copyright © Prinodia. All rights reserved.
