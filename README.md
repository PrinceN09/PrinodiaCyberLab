# Prinodia CyberLab

> **A professional cybersecurity learning workspace for notes, code, diagrams, labs, and reports.**

Prinodia CyberLab is an enterprise-grade cybersecurity learning platform for
students, SOC analysts, penetration testers, and security professionals. It
combines a knowledge base, code workspace, diagram editor, project tracker, and
reporting system into a single application — designed in the spirit of the
**IBM Carbon Design System**: a restrained, high-contrast dark theme with IBM
Blue accents, sharp cards, and precise typography.

---

## Features (v1 — working)

- **Dashboard** — learning-track progress, weekly study activity, and live counts of notes, snippets, projects, and reports.
- **Notes / Wiki** — Markdown notes with a split-pane live-preview editor, folders, and tags.
- **Code Workspace** — Monaco-powered snippet editor with syntax highlighting for Python, Bash, SQL, YAML, PowerShell, and more.
- **Diagrams** — Mermaid.js editor with live rendering for flowcharts, sequence diagrams, and kill-chains.
- **Cyber Projects** — a board across nine disciplines: SOC Analyst, SIEM, Threat Detection, Incident Response, Vulnerability Management, GRC, Penetration Testing, Linux & Networking, Cloud Security.
- **Reports** — templated editors for Incident Response, Vulnerability, GRC, and Threat Intel reports, with severity and status tracking.
- **Learning Progress** — module-by-module tracking with study-time charts.
- **Resources** — a library of courses, certs, books, labs, and tools.
- **Settings** — profile, notifications, appearance, and workspace data.

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
(`/Users/princentunka/Documents/Projects/PrinodiaCyberLab`).

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

### 2. Configure the database connection

Open **`.env`** and set `DATABASE_URL` to your local PostgreSQL user/password:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/prinodia_cyberlab?schema=public"
```

> The `prinodia_cyberlab` database must already exist. Create it if needed:
> `createdb prinodia_cyberlab`

### 3. Generate the Prisma client & run the migration

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. Seed realistic cybersecurity data

```bash
npm run db:seed
```

Loads sample notes (MITRE ATT&CK, Windows event IDs, NIST IR lifecycle), code
snippets (Splunk detections, Sigma rules, triage scripts), diagrams (SOC triage
flow, kill chain), eight projects, three reports, a SOC Analyst learning track,
resources, and a week of study logs.

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

1. **`.env`** — set your real `DATABASE_URL`. This is the **only** file that
   must be edited before the app will run.

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
