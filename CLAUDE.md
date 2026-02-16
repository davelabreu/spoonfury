# CLAUDE.md

This file provides guidance to Claude Code when working with the Spoonfury codebase.

## Quick Start for Agents

**Before writing any code**, load the relevant context:
1. Read this file (system overview)
2. Read `GEMINI.md` for Gemini-specific context and patterns
3. Read `docs/plans/` for the latest implementation status
4. Read `docs/CONVENTIONS.md` if writing new code (if available)

## Project Overview

Spoonfury — a recipe-first social platform. Core mechanic: fork a recipe, make it yours, build curated digital recipe books.

**Status**: Prototype v0.2 — Improved data quality, fork-to-book loop, and ownership security.

## Architecture

**backend** — Django + DRF. REST APIs. Ownership enforced on write/delete.
**frontend** — React 19 + Vite + Tailwind 4 + Shadcn UI. Markdown rendering via `react-markdown`.
**database** — PostgreSQL, containerized.

## Build & Run Commands

### Local Development
```bash
# Backend
cd backend
# Use root .venv: ../.venv/Scripts/python manage.py runserver

# Frontend
cd frontend
npm install
npm run dev
```

## Key Conventions

### Backend
- **Security**: Ownership check enforced in `RecipeViewSet` for `update` and `destroy`.
- **Actions**: Custom actions (e.g., `add-recipe`, `remove-recipe`) use `POST` to handle request bodies reliably.

### Frontend
- **Recipe Data**: Blank ingredient rows (empty name) are filtered before submission and rendering.
- **Forking**: Simplified flow — "Fork" creates a copy and saves it to a selected book. No ingredient editing during the fork step.
- **Action Bar**: Compact header area for recipe actions (`bg-indigo-50/50`).
- **Modal UI**: `ForkModal` uses `backdrop-blur-[2px]` and solid `bg-white` card.
- **Markdown**: Styled via `@tailwindcss/typography` (`prose` classes). Plugin imported in `index.css`.
- **Navigation**: Use `navigate(-1)` or `ChevronLeft` for "Back" links to maintain user context.

### Git
- **Commits**: Semantic commits on `master`.
- **Worktrees**: Use `.worktrees/` for feature development.

## Design Docs
- v0.1 Design: `docs/plans/2026-02-15-spoonfury-design.md`
- v0.2 Improvements: `docs/plans/2026-02-16-v0.2-improvements.md`
