# CLAUDE.md

Canonical project context for Spoonfury. AI agents: Read this first.

## Quick Start
1. **Context**: Read `docs/context-scopes/` (system reference), then `docs/plans/active/` (current work).
2. **Commands**: See `backend/README.md` and `frontend/README.md` for local dev/test commands.
3. **Build**: Django 5 + DRF + PostgreSQL | React 19 + Vite + Tailwind 4 + Shadcn UI.

## Project Overview
Spoonfury — a recipe-first social platform. Core mechanic: **Fork** a recipe, make it yours, build curated digital recipe books.

**Status**: Prototype v0.4.4 (Navbar polish: B4a breathing badge, combined mobile hamburger+badge, compact cart pill).

## Core Architecture
- **Data Model**: Recipe (fork lineage) -> User -> RecipeBook -> ShoppingList.
- **Backend Patterns**: Ownership-enforced ViewSets, POST-based custom actions (fork, add-to-book).
- **Frontend Patterns**: Context-based global state, B1 layout (title above fused hero image), emoji-guessing logic for ingredients.

## Environment & Git
- **Docker**: Postgres/DB runs in Docker. Always use WSL for docker commands.
- **Worktrees**: Use `.worktrees/` for features. Start dev servers from *inside* the worktree directory.
- **Python**: Root `.venv` is shared. Ref it via `../.venv/Scripts/python` (backend) or `../../.venv/Scripts/python` (worktree backend).

## MCP Server Usage
AI agents have access to specialized tools for development:
- **shadcn/studio**: `/cui`, `/rui`, `/ftc` for UI components.
- **context7 (Upstash)**: Real-time documentation for modern frameworks (Next.js, Tailwind 4).
- **postgresPRO (Crystal DBA)**: Database analysis, query plans, and index tuning.

## Context Scopes

Standing reference for the codebase. Read before diving into plans.

- `docs/context-scopes/core-flow.md` — Fork & book data model
- `docs/context-scopes/backend.md` — Django patterns & conventions
- `docs/context-scopes/frontend.md` — React architecture & components
- `docs/context-scopes/api-reference.md` — REST API endpoints

## Plans

Active plans live in `docs/plans/active/`. Shipped features are archived in `docs/plans/completed/`.

**Convention**: `*.spec.md` = design (what & why). `*.impl.md` = implementation steps (agent work order). When a feature ships, move both files from `active/` to `completed/`.

### Active

| Feature | Spec | Impl |
|---------|------|------|
| Test Kitchen & Privacy | `active/2026-03-08-test-kitchen.spec.md` | `active/2026-03-08-test-kitchen.impl.md` |

### Completed

| Feature | Spec | Impl |
|---------|------|------|
| v0.1 Spoonfury | `completed/2026-02-15-v0.1-spoonfury.spec.md` | `completed/2026-02-15-v0.1-spoonfury.impl.md` |
| v0.2 Animated Header | `completed/2026-02-16-v0.2-animated-header.spec.md` | `completed/2026-02-16-v0.2-animated-header.impl.md` |
| v0.2 Improvements | `completed/2026-02-16-v0.2-improvements.spec.md` | `completed/2026-02-16-v0.2-improvements.impl.md` |
| v0.3 Stir the Pot & Sharing | `completed/2026-02-17-v0.3-stir-the-pot.spec.md` | `completed/2026-02-17-v0.3-stir-the-pot.impl.md` |
| v0.3.1 Fridge Sticker NavBar | `completed/2026-02-17-v0.3.1-fridge-sticker-navbar.spec.md` | `completed/2026-02-17-v0.3.1-fridge-sticker-navbar.impl.md` |
| v0.4 Shopping List | `completed/2026-02-27-v0.4-shopping-list.spec.md` | `completed/2026-02-27-v0.4-shopping-list.impl.md` |
| v0.4 Shopping Feedback | `completed/2026-03-08-v0.4-shopping-feedback.spec.md` | `completed/2026-03-08-v0.4-shopping-feedback.impl.md` |
| v0.4.1 CartCapsule Nav | `completed/2026-03-14-v0.4.1-cart-capsule-nav.spec.md` | — |
| v0.4.3 Recipe Images | `completed/2026-03-15-v0.4.3-recipe-images.spec.md` | `completed/2026-03-15-v0.4.3-recipe-images.impl.md` |
| v0.4.4 Navbar Polish | `completed/2026-03-15-v0.4.4-navbar-polish.spec.md` | — |

All plan paths are relative to `docs/plans/`.
