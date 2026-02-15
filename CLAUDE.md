# CLAUDE.md

This file provides guidance to Claude Code when working with the Spoonfury codebase.

## Quick Start for Agents

**Before writing any code**, load the relevant context:
1. Read this file (system overview)
2. Read `docs/context-scopes/<service>.md` for the layer you're modifying
3. Read `docs/CONVENTIONS.md` if writing new code
4. Check `docs/DECISIONS.md` if changing an existing pattern

Full documentation index: `docs/README.md`

## Project Overview

Spoonfury — a recipe-first social platform. Core mechanic: fork a recipe, make it yours (constrained edits), build a curated digital recipe book to share with family and friends. Instacart integration lets users buy ingredients directly from a recipe page.

**Status**: Prototype v0.1 — in active development.

## Architecture

**backend** — Django + Django REST Framework. REST APIs consumed by React frontend. PostgreSQL database. Django Allauth for auth.

**frontend** — React 19 + Vite + Tailwind 4 + Shadcn UI. Same stack as home_ai_project web_monitor. Django serves the production build from `frontend/dist/`.

**database** — PostgreSQL, containerized.

## Port Mapping (host → container)

| Service | Host Port | Container Port |
|---|---|---|
| backend (Django) | 8000 | 8000 |
| frontend (Vite dev) | 5173 | 5173 |
| postgres | 5432 | 5432 |

## Build & Run Commands

### Local Development
```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/Scripts/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev       # Vite dev server at localhost:5173
npm run build     # Production build → frontend/dist/
```

### Docker (Jetson)
```bash
docker compose up --build -d
./deploy.sh
```

## Key Conventions

- **Recipe data**: ingredients stored as `JSONField` `[{quantity, unit, name, note}]`. All other fields (instructions, notes) are markdown text blobs.
- **Fork constraints**: max ±3 ingredient changes, category locked, enforced by UI + validated on backend save.
- **Instacart integration**: pure frontend URL construction from checked ingredient list. No API key for prototype.
- **Frontend stack**: React 19, Tailwind 4, Shadcn UI (same as web_monitor). Hooks in `src/hooks/`, components in `src/components/`.
- **Auth**: Django Allauth, email/password for prototype.
- **Git**: Semantic commits on `master`. Feature branches for larger work.

## Design Doc

Full prototype design: `docs/plans/2026-02-15-spoonfury-design.md`
