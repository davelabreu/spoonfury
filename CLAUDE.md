# CLAUDE.md

Canonical project context for Spoonfury. AI agents: Read this first.

## Quick Start
1. **Context**: Read `docs/context-scopes/core-flow.md` (data model) and `docs/plans/` (current status).
2. **Commands**: See `backend/README.md` and `frontend/README.md` for local dev/test commands.
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

## Key Reference Docs
- **API Reference**: `docs/api-reference.md`
- **Data Model**: `docs/context-scopes/core-flow.md`
- **Latest Plan**: `docs/plans/2026-03-08-test-kitchen-implementation.md`
- **Feature Specs**: `docs/superpowers/specs/`
