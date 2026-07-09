#!/usr/bin/env bash
#
# Prinodia CyberLab — one-shot local setup & run
# Usage:  ./setup.sh
#
set -euo pipefail

# Always run from the directory this script lives in.
cd "$(dirname "$0")"

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
step() { printf "\n${BLUE}==>${NC} %s\n" "$1"; }
ok()   { printf "${GREEN}✔${NC} %s\n" "$1"; }
warn() { printf "${YELLOW}!${NC} %s\n" "$1"; }

# ── 0. Prerequisite checks ────────────────────────────────
step "Checking prerequisites"
command -v node >/dev/null 2>&1 || { echo "Node.js is required but not found. Install Node 18.18+ and retry."; exit 1; }
command -v npm  >/dev/null 2>&1 || { echo "npm is required but not found."; exit 1; }
ok "Node $(node -v), npm $(npm -v)"

# ── 1. Environment file ───────────────────────────────────
step "Checking .env"
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    warn "Created .env from .env.example — edit DATABASE_URL and AUTH_SECRET before continuing."
  else
    echo "No .env or .env.example found. Create a .env with DATABASE_URL and AUTH_SECRET."; exit 1
  fi
fi
grep -q "AUTH_SECRET" .env || {
  echo "AUTH_SECRET=\"$(openssl rand -hex 32 2>/dev/null || echo change-me-to-a-long-random-string)\"" >> .env
  ok "Added a generated AUTH_SECRET to .env"
}
ok ".env present"

# ── 2. Dependencies ───────────────────────────────────────
step "Installing dependencies (clean install)"
rm -rf node_modules package-lock.json
npm install
ok "Dependencies installed"

# ── 3. Prisma client ──────────────────────────────────────
step "Generating Prisma client"
npx prisma generate
ok "Prisma client generated"

# ── 4. Database migration ─────────────────────────────────
step "Applying database migration"
# Uses a fixed name on first run; harmless if migrations already exist.
npx prisma migrate dev --name init || {
  warn "Migration name 'init' may already exist — trying a follow-up migration."
  npx prisma migrate dev --name update
}
ok "Database schema is up to date"

# ── 5. Seed data + login account ──────────────────────────
step "Seeding data and creating your login account"
npm run db:seed
ok "Seed complete"

# ── 6. Run ────────────────────────────────────────────────
step "Starting the app"
printf "\n${GREEN}Prinodia CyberLab is starting.${NC}\n"
printf "Open ${BLUE}http://localhost:3000${NC} (redirects to /login)\n\n"
printf "Sign in with:\n  Email:    princentunka09@gmail.com\n  Password: CyberLab2026!\n\n"
npm run dev
