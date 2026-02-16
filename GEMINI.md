# GEMINI.md

This file provides guidance to the Gemini CLI agent when working with the Spoonfury codebase.

## Quick Start for Gemini

**Before writing any code**, load the relevant context:
1. Read `CLAUDE.md` for the system overview and build/run commands.
2. Read `docs/context-scopes/<service>.md` for the layer you're modifying.
3. Read `docs/plans/` for recent design and implementation details.
4. Follow project-specific conventions as detailed in `CLAUDE.md` and `docs/plans/2026-02-15-spoonfury-design.md`.

## Project Context Summary

Spoonfury is a recipe-first social platform focusing on the **fork** mechanic — users can clone and modify recipes within constraints. It integrates with Instacart for easy ingredient purchasing.

- **Stack**: Django (REST API) + PostgreSQL + React 19 (Vite/Tailwind 4/Shadcn).
- **Core Models**: `Recipe`, `User`, `RecipeBook`.
- **Key Feature**: Recipe forking with ±3 ingredient change constraint.
- **Deployment**: Docker-compose for Jetson deployment.

## Workflow Integration

This project uses a hybrid workflow involving both Claude and Gemini.
- **Claude**: Used for initial scaffolding and major feature implementations following `CLAUDE.md`.
- **Gemini**: Used for ongoing development, reviews, and specific tasks using this `GEMINI.md` and the `gemini-superpowers` extension.

## Environment-Specific Reminders

- **Git**: Always use semantic commits on `master` (or feature branches for large work).
- **Testing**: Use `pytest` for backend and verify frontend changes locally.
- **Architecture**: Mimic the style and structure established in the `backend/spoonfury/apps/` and `frontend/src/` directories.

## Key Files to Watch
- `CLAUDE.md`: System overview and commands.
- `docker-compose.yml`: Single source of truth for deployment.
- `backend/requirements.txt` & `frontend/package.json`: Dependencies.
