# CLAUDE.md

Canonical project context for Spoonfury. AI agents: Read this first.

## Quick Start
1. **Context**: Read `docs/context-scopes/core-flow.md` (data model) and `docs/plans/` (current status).
2. **Commands**: See `backend/README.md` and `frontend/README.md` for local dev/test .commands.
3. **Build**: Django 5 + DRF + PostgreSQL | React 19 + Vite + Tailwind 4 + Shadcn UI.

## Project Overview
Spoonfury — a recipe-first social platform. Core mechanic: **Fork** a recipe, make it yours, build curated digital recipe books.

**Status**: Prototype v0.4.3 (Recipe images, B1 fused hero+actions, shopping list refactor).

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

## Design Docs

| Version | Doc |
|---------|-----|
| v0.1 Design | `docs/plans/2026-02-15-spoonfury-design.md` |
| v0.2 Improvements | `docs/plans/2026-02-16-v0.2-improvements.md` |
| v0.3 Stir the Pot & Sharing | `docs/plans/2026-02-17-stir-the-pot-and-share-design.md` |
| v0.3.1 Fridge Sticker NavBar | `docs/plans/2026-02-17-fridge-sticker-navbar-design.md` |
| v0.4 Shopping List | `docs/plans/2026-02-27-v0.4-shopping-list-design.md` |
| v0.4 Shopping Feedback | `docs/plans/2026-03-08-shopping-list-feedback-design.md` |
| v0.4.1 CartCapsule Nav | `docs/superpowers/specs/2026-03-14-cart-capsule-nav-design.md` |
| v0.4.3 Recipe Images | `docs/superpowers/specs/2026-03-15-recipe-images-design.md` |
