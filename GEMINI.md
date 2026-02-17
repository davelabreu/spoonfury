# GEMINI.md

This file provides guidance to the Gemini CLI agent when working with the Spoonfury codebase.

## Quick Start for Gemini

**Before writing any code**, load the relevant context:
1. Read `CLAUDE.md` for the system overview and build/run commands.
2. Read `docs/context-scopes/` for the layer you're modifying.
3. Read `docs/plans/` for the most recent development status.

## Project Context Summary

Spoonfury is a recipe-first social platform focusing on the **fork** mechanic.

- **Stack**: Django (REST API) + PostgreSQL + React 19 (Vite/Tailwind 4/Shadcn/Framer Motion).
- **Core Models**: `Recipe`, `User`, `RecipeBook`.
- **Key Feature**: Recipe forking with save-to-book flow.

## Architecture & UI Patterns

### Backend
- **Ownership Security**: `RecipeViewSet` enforces ownership on `PATCH` and `DELETE` via `perform_update` and `perform_destroy`.
- **Action Pattern**: Custom actions like `add-recipe` and `remove-recipe` use `POST` to handle request bodies (recipe slugs) reliably.

### Auth Patterns
- **Registration Flow**: Some configurations return `204 No Content` on registration. The frontend `AuthContext` is designed to catch this and perform a background `login` automatically to ensure the user is immediately authenticated.

### Frontend
- **NavBar**: "Fridge Sticker" / "Cookbook Tab" aesthetic. Uses `NavSticker` component with `tab` (PC) and `button` (Mobile) variants. Bottom edges are anchored to the nav border via dynamic `clip-path`.
- **Logo**: Spoon emoji features a "Pro" fire effect using an SVG gooey filter (`#goo`) and screen blend mode on hover.
- **Action Bar**: Compact header area for recipe actions (Edit, Add to Book, Share, Delete). 
  - **Styling**: `bg-indigo-50/50`, `border-indigo-100/50`, `px-4 py-2.5`.
  - **Visibility**: Action bar is visible to all users (shows Share action). Auth-gated actions (Fork, Edit, Delete) appear inside based on role.
  - **Owner Actions**: Clearly labeled with `Owner Actions` in small caps.
- **Modal Pattern**: `ForkModal` and `ShareModal` use `backdrop-blur-[2px]`, `bg-black/30` overlay, and a brilliant `bg-white` card.
- **Navigation**: "Stir the Pot" is the public explore tab. Uses `navigate(-1)` for "Back" affordances.
- **Markdown Rendering**: Uses `react-markdown` with the `@tailwindcss/typography` plugin (`prose` classes).
- **Data Filtering**: Blank ingredient rows (empty `name`) must be filtered out before API submission and during rendering.

## Environment-Specific Reminders

- **Git**: Always use semantic commits on `master`.
- **Worktrees**: Use `.worktrees/` for isolated feature work. Note that `.env` files and `.venv` must be manually managed in new worktrees.
- **Tailwind 4**: Typography plugin is imported via `@plugin "@tailwindcss/typography";` in `index.css`.

## Key Files to Watch
- `backend/spoonfury/apps/books/views.py`: Book management logic.
- `frontend/src/pages/RecipePage.tsx`: Main UI container for recipes.
- `frontend/src/index.css`: Global styles and tailwind plugins.
