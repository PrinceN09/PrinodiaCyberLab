# Prinodia CyberLab

> **A professional cybersecurity learning workspace for notes, code, diagrams, labs, and reports.**

Prinodia CyberLab is an enterprise-grade cybersecurity learning platform for
students, SOC analysts, penetration testers, and security professionals. It
combines a knowledge base, code workspace, diagram editor, project tracker, and
reporting system into a single application — designed in the spirit of the
**IBM Carbon Design System**: a restrained, high-contrast dark theme with IBM
Blue accents, sharp cards, and precise typography.

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
- **Course Library** — track structured courses (e.g. 10Alytics) by module and lesson, with notes linkable to lessons.
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
- **Job Tracker** — Kanban board (Saved → Applied → Interview → Offer → Rejected) built for hiring.cafe.
- **Interview Preparation** — personal question bank with confidence ratings.
- **Portfolio** — showcase labs, detections, and write-ups.

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
| Editors | Monaco Editor, Markdown (react-markdown), Mermaid.js |
| Icons | Lucide |
| Fonts | IBM Plex Sans / IBM Plex Mono |

---

## Prerequisites

- **Node.js 18.18+** (Node 20 or 22 recommended)
- **PostgreSQL 14+** running locally, with a database named `prinodia_cyberlab` already created

---

## Getting started

Run these from the project root
(`PrinodiaCyberLab`).

### 0. Clean any partial dependencies (first setup only)

A partial `node_modules` may exist from scaffolding. Remove it for a clean,
correct-architecture install:

```bash
rm -rf node_modules package-lock.json
```

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the database connection & auth secret

Open **`.env`** and set `DATABASE_URL` to your local PostgreSQL user/password,
and set a long random `AUTH_SECRET` used to sign session cookies:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/prinodia_cyberlab?schema=public"
AUTH_SECRET="a-long-random-string"
```

> The `prinodia_cyberlab` database must already exist. Create it if needed:
> `createdb prinodia_cyberlab`

### 3. Generate the Prisma client & run the migration

```bash
npx prisma generate
npx prisma migrate dev --name init
```

> The schema was significantly expanded (Career Center, Courses, Study Sessions,
> Flashcards, SIEM Rules, Threat Hunts, IOCs, and more). If you already ran an
> earlier version, this simply creates a new migration — run the same command and
> give it a name like `expanded_modules` when prompted. `prisma generate` is also
> required after pulling schema changes so the client picks up the new models.

### 4. Seed realistic cybersecurity data

```bash
npm run db:seed
```

Loads sample notes (MITRE ATT&CK, Windows event IDs, NIST IR lifecycle), code
snippets (Splunk detections, Sigma rules, triage scripts), diagrams (SOC triage
flow, kill chain), eight projects, three reports, a SOC Analyst learning track,
resources, and a week of study logs — plus the demo user account.

The seed prints your sign-in credentials at the end:

```
Email:    prenodiacyber@gmail.com
Password: example!212
```

## Authentication

The app is gated behind a sign-in screen (`/login`). Sessions are signed JWTs
stored in an httpOnly cookie; passwords are hashed with bcrypt. Middleware
redirects unauthenticated requests to `/login` and signed-in users away from the
auth pages. Sign out from the button in the sidebar footer. Change the demo
password after your first sign-in.

### 5. Run the app

```bash
npm run dev
```

Open **http://localhost:3000**.

---

## Handy scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run db:migrate` | Create/apply a migration |
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Open Prisma Studio to browse data |

---

## Files you may need to edit manually

1. **`.env`** — set your real `DATABASE_URL` and a random `AUTH_SECRET`. This is
   the **only** file that must be edited before the app will run.

Everything else works out of the box.

---

## Project structure

```text
PrinodiaCyberLab/
├── prisma/
│   ├── schema.prisma        # User, Note, Folder, CodeSnippet, Diagram,
│   │                        # Project, Report, LearningProgress, Resource, Tag
│   └── seed.ts              # Realistic cybersecurity seed data
├── src/
│   ├── app/
│   │   ├── layout.tsx       # App shell (sidebar + topbar)
│   │   ├── page.tsx         # Dashboard
│   │   ├── notes/           # Notes / Wiki
│   │   ├── code/            # Code Workspace (Monaco)
│   │   ├── diagrams/        # Diagrams (Mermaid)
│   │   ├── projects/        # Cyber Projects board
│   │   ├── reports/         # Reports (IR / Vuln / GRC / Threat Intel)
│   │   ├── progress/        # Learning Progress
│   │   ├── resources/       # Resources library
│   │   ├── settings/        # Settings
│   │   └── api/             # REST routes for CRUD
│   ├── components/
│   │   ├── shell/           # Sidebar, Topbar
│   │   ├── ui/              # Card, Badge, Button, Progress, PageHeader
│   │   ├── markdown.tsx     # Markdown renderer
│   │   └── mermaid.tsx      # Mermaid renderer
│   └── lib/                 # prisma client, utils, constants
├── tailwind.config.ts       # Carbon-inspired design tokens
└── .env                     # DATABASE_URL (edit this)
```

---

## Design notes

The visual language draws on the IBM Carbon **Gray 100** dark theme: a `#161616`
canvas, `#1f1f1f` layers, IBM Blue (`#0f62fe`) as the single interactive accent,
2px focus rings, sharp (zero-radius) corners, and IBM Plex typography. Support
colors (red/orange/yellow/green) are reserved for severity and status — never
decoration.

---

## Roadmap

**v2** — authentication, full-text search, file uploads, light theme.
**v3** — AI learning assistant, interactive labs, flashcards, quiz engine.
**v4** — team collaboration, shared workspaces, comments, real-time editing.

---

## Author

**Prince Ntunka** — Founder, Prinodia

## License

Copyright © Prinodia. All rights reserved.
