# CLAUDE.md

This is the canonical project context for Spoonfury. All AI agents should read this file first.

## Quick Start

**Before writing any code**, load the relevant context:
1. Read this file (system overview, conventions, design history)
2. Read `docs/context-scopes/core-flow.md` for the fork + book data model
3. Read `docs/plans/` for the latest implementation status
4. Read `docs/CONVENTIONS.md` if writing new code (if available)

## Project Overview

Spoonfury — a recipe-first social platform. Core mechanic: fork a recipe, make it yours, build curated digital recipe books.

**Status**: Prototype v0.4.1 — CartCapsule nav pill, persistent in-list badge, Shopping List feedback polish, and all v0.4 features (Shopping List, Buy it NOW! / Instacart, Cook Now / Wake Lock, NavBar theme toggle) and all v0.3 features (Stir the Pot, Sharing, fork-to-book loop, ownership security).

**Active worktrees**:
- `.worktrees/test-kitchen` — test kitchen / recipe privacy feature

**Stack**: Django 5 + DRF + PostgreSQL | React 19 + Vite + Tailwind 4 + Shadcn UI + Framer Motion

**Core Models**: `Recipe`, `User`, `RecipeBook`, `BookRecipe`, `ShoppingList`, `ShoppingListItem`

## Build & Run Commands

### Local Development

```bash
# Backend (from repo root)
cd backend
../.venv/Scripts/python manage.py runserver

# Frontend (from repo root)
cd frontend
npm install
npm run dev
```

## Architecture & Code Patterns

### Backend

- **Ownership Security**: `RecipeViewSet` enforces ownership on `PATCH` and `DELETE` via `perform_update` and `perform_destroy`.
- **Action Pattern**: Custom actions like `add-recipe` and `remove-recipe` use `POST` to handle request bodies (recipe slugs) reliably.
- **Shopping App**: `spoonfury/apps/shopping/` — `ShoppingListAddView` and `ShoppingListClearView` handle list management. Each user has one `ShoppingList` (OneToOne). `ShoppingListItem` stores ingredients with `recipe_slug` for grouping.
- **App layout**: All Django apps live under `backend/spoonfury/apps/`. Config lives in `backend/config/`.

### Auth Patterns

- **Registration Flow**: Some configurations return `204 No Content` on registration. The frontend `AuthContext` catches this and performs a background `login` to ensure the user is immediately authenticated.
- **Token Auth**: DRF token auth. The `token` from `AuthContext` is passed to all API calls via the `api` utility (`src/lib/api.ts`).

### Frontend

- **Recipe Data**: Blank ingredient rows (empty `name`) must be filtered before API submission and during rendering.
- **Forking**: "Fork" creates a copy and saves it to a selected book. No ingredient editing during the fork step.
- **Action Bar**: Compact header area for recipe actions (Edit, Fork, Share, Delete).
  - **Styling**: `bg-indigo-50/50`, `border-indigo-100/50`, `px-4 py-2.5`.
  - **Visibility**: Shown to all users (Share always visible). Auth-gated actions appear based on role.
  - **Owner Actions**: Labeled `Owner Actions` in small caps.
- **NavBar**: "Fridge Sticker" / "Cookbook Tab" aesthetic. Uses `NavSticker` component with `tab` (desktop) and `button` (mobile) variants. Bottom edges anchored to nav border via dynamic `clip-path`. Supports two themes (`fridge-sticker` / `minimal`) stored in localStorage.
- **Logo**: Spoon emoji features a "Pro" fire effect using an SVG gooey filter (`#goo`) and screen blend mode on hover.
- **Modal Pattern**: `ForkModal` and `ShareModal` use `backdrop-blur-[2px]`, `bg-black/30` overlay, solid `bg-white` card.
- **Sharing**: QR code generation and direct WhatsApp links for social sharing.
- **Shopping List UI**: `IngredientChecklist` shows a shadcn `Button` "+ Add to Shopping List" and "Buy it NOW!". A shadcn `Alert` green badge ("🛍️❤️ In your shopping list") appears when the recipe's ingredients are already in the cart — checked via `GET /shopping-list/status/` on page load. Add button disables while badge is showing.
- **CartCapsule**: Replaces the Shopping List nav tab on desktop. A shimmer gradient pill (`🚗 Pickup | 🏠 Delivery | 🛒`) always visible when logged in. Badge shows item count when cart is non-empty. Shopping List accessible via mobile drawer in both nav themes. `useShoppingData` hook returns `{ count, items }` (flattened unchecked ingredients for Instacart URLs). Exports `SHOPPING_LIST_UPDATED` event constant.
- **Cook Now**: Wake Lock API (`useWakeLock` hook) keeps screen awake while cooking. Gracefully falls back when Wake Lock is unsupported.
- **Navigation**: "Stir the Pot" (`/`) is the public explore root. Use `navigate(-1)` or `ChevronLeft` for "Back" affordances.
- **Markdown**: `react-markdown` with `@tailwindcss/typography` (`prose` classes). Plugin imported via `@plugin "@tailwindcss/typography";` in `index.css`.

## Key Files

| File | Purpose |
|------|---------|
| `backend/spoonfury/apps/recipes/views.py` | `RecipeViewSet` — ownership, fork action |
| `backend/spoonfury/apps/books/views.py` | Book management, add/remove recipe actions |
| `backend/spoonfury/apps/shopping/views.py` | Shopping list add, clear, status endpoints |
| `frontend/src/pages/RecipePage.tsx` | Main recipe UI — action bar, checklist, modals |
| `frontend/src/components/IngredientChecklist.tsx` | Shopping list add + Buy Now buttons + in-list badge |
| `frontend/src/components/NavBar.tsx` | NavBar, CartCapsule, useShoppingData, SHOPPING_LIST_UPDATED |
| `frontend/src/lib/api.ts` | Typed API utility (all HTTP calls go through here) |
| `frontend/src/index.css` | Global styles, Tailwind plugins |
| `docs/context-scopes/core-flow.md` | Fork lineage + book association data model |

## Git & Environment

- **Commits**: Semantic commits on `master`.
- **Worktrees**: Use `.worktrees/` for feature development.
- **Docker**: Postgres runs in Docker. **Always use WSL for docker/docker-compose** — never run Docker from the Windows shell.
- **Virtual env**: Root `.venv` is shared. Reference it as `../.venv/Scripts/python` from `backend/` in the main repo, or `../../.venv/Scripts/python` from inside a worktree's `backend/` directory.
- **Tailwind 4**: No `tailwind.config.js`. Config is CSS-first.

### Dev Server in Worktrees

**Always** start both frontend and backend from inside the worktree — not the main repo. Running from the main repo serves stale `master` code. Remind the user of this before testing and before merging.

```bash
# Frontend
cd .worktrees/<branch>/frontend && npm run dev

# Backend — migrate first if the branch adds new models/migrations
cd .worktrees/<branch>/backend
../../.venv/Scripts/python manage.py migrate
../../.venv/Scripts/python manage.py runserver
```

## shadcn/studio MCP Instructions

When using the shadcn/studio MCP Server (`/cui`, `/rui`, `/iui`, `/ftc` commands), follow all instructions precisely:

- Follow each step of the workflow immediately after completing the previous one
- Complete the ENTIRE workflow without stopping for user confirmation
- Never bypass steps or make additional tool calls not required by the workflow
- **`/cui` (create-ui)**: COLLECT all blocks first, THEN install — never install prematurely; always customize content after installation
- **`/rui` (refine-ui)**: Update existing components per user requirements
- **`/iui` (inspiration-ui)**: Use inspiration tools as outlined (Pro)
- **`/ftc` (figma-to-code)**: Convert Figma designs to code using the figma-to-code workflow

The `components.json` for this project is at `frontend/components.json`. The `@ss-components`, `@ss-themes`, and `@ss-blocks` registries are already configured pointing to `shadcnstudio.com`.

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
