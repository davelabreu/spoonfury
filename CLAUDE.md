# CLAUDE.md

Canonical project context for Spoonfury. AI agents: Read this first.

## 🚀 Quick Start
1. **Orientation**: Read `@HEARTBEAT.md` first — last session summary, current state, what's next.
2. **Context**: Recursively load system references below.
   - Flow & Data Model: @docs/context-scopes/core-flow.md
   - Backend Architecture: @docs/context-scopes/backend.md
   - Frontend Architecture: @docs/context-scopes/frontend.md
   - REST API: @docs/context-scopes/api-reference.md
3. **Current Work**: Read `@docs/plans/active/` to understand the current objective.
3. **Commands**: See `backend/README.md` and `frontend/README.md` for local dev/test commands.
4. **Build**: Django 5 + DRF + PostgreSQL | React 19 + Vite + Tailwind 4 + Shadcn UI.

## 🛑 Project Gotchas (Do NOT Do This)
To maintain our architecture, AI agents MUST adhere to these negative constraints:
* **Ingredients**: Do NOT create relational PostgreSQL tables for individual recipe ingredients. They MUST remain stored as a `JSONField` array.
* **Forks**: Do NOT allow free-form editing on a recipe fork. You MUST enforce a maximum limit of ±3 ingredient changes, and the recipe category is strictly locked to the parent's category.
* **Instacart/Fulfillment**: Do NOT attempt to integrate Instacart API keys or backend SDKs. Shopping list fulfillment relies purely on frontend URL string construction.
* **Styling**: Do NOT write raw CSS or use outdated styling libraries. We strictly use React 19, Tailwind 4, and Shadcn UI components.

## 🏗️ Project Overview
Spoonfury — a recipe-first social platform. Core mechanic: **Fork** a recipe, make it yours, build curated digital recipe books.

**Status**: Prototype v0.5 (Recipe filtering: Tag model, 15 categories, django-filter, Shadcn CreateRecipePage with TagInput autocomplete).

## 🧠 Core Architecture
- **Data Model**: Recipe (fork lineage) -> Tag (M2M, 4 kinds) -> User -> RecipeBook -> ShoppingList.
- **Backend Patterns**: Ownership-enforced ViewSets, POST-based custom actions (fork, add-to-book), django-filter for search/filtering.
- **Frontend Patterns**: Context-based global state, B1 layout (title above fused hero image), emoji-guessing logic for ingredients.

## 💻 Environment & Git
- **Docker**: Postgres/DB runs in Docker. Always use WSL for docker commands.
- **Worktrees**: Use `.worktrees/` for features. Start dev servers from *inside* the worktree directory.
- **Python**: Root `.venv` is shared. Ref it via `../.venv/Scripts/python` (backend) or `../../.venv/Scripts/python` (worktree backend).

## Merge Policy

**Never merge a feature branch to `master` without a human-initiated test session.**

The workflow is:
1. AI implements the feature on a worktree branch and runs automated tests.
2. Human starts the dev servers from inside the worktree and tests in the browser.
3. Human explicitly says "merge" or "ready to merge" — only then does merging happen.

AI agents must not offer, suggest, or attempt a merge to `master` at the end of an implementation session. Always stop at "keep the branch as-is" and remind the human to test first.

## 🛠️ MCP Server Usage
AI agents have access to specialized tools for development:
- **shadcn/studio**: `/cui`, `/rui`, `/ftc` for UI components.
- **context7 (Upstash)**: Real-time documentation for modern frameworks (Next.js, Tailwind 4).
- **postgresPRO (Crystal DBA)**: Database analysis, query plans, and index tuning.

## 📋 TODO List
`docs/TODO.md` — deferred work items organized by category. When something is out of scope for the current task, add it here instead of leaving inline `// TODO` comments in code. Check it before starting new work to avoid duplicating planned items.

## 📝 Changelog
`docs/CHANGELOG.md` — human-first dev log. **Focus** lines are written by the human; bullet lists are AI-generated detail. Update it at the end of each session. **Always ask the user for their Focus statement before writing a changelog entry.** The Focus must capture the human's emotional intent and motivation — never generate it yourself.

## 🎨 Visual Mockups
Interactive HTML mockups live in `docs/visual-mockups/`. Organize into **unique folders per feature/version** (e.g., `docs/visual-mockups/v0.85-kitchen-controls/`). Never dump loose files into the root. Always save UI/UX brainstorming mockups here (not just in `.superpowers/brainstorm/`) so they persist and can be shared. Present visual options in the browser before implementing UI changes.

## 🗺️ Plans
Active plans live in `docs/plans/active/`. Shipped features are archived in `docs/plans/completed/`.
**Convention**: `*.spec.md` = design (what & why). `*.impl.md` = implementation steps (agent work order). When a feature ships, move both files from `active/` to `completed/`.

### Active
| Feature | Spec | Impl |
|---------|------|------|
| v0.85 Kitchen Controls | `active/2026-04-11-kitchen-controls.spec.md` | `active/2026-04-11-kitchen-controls.impl.md` |
| v0.9 Vouch Retention | `active/2026-04-12-vouch-retention.spec.md` | `active/2026-04-12-vouch-retention.impl.md` |

### Completed
| Feature | Spec | Impl |
|---------|------|------|
| v0.7 Community Review Gate | `completed/2026-04-03-community-review-gate.spec.md` | `completed/2026-04-03-community-review-gate.impl.md` |
| v0.6 Test Kitchen & Privacy | `completed/2026-03-08-test-kitchen.spec.md` | `completed/2026-03-08-test-kitchen.impl.md` |
| v0.5.2 Shopping Cart Rework | `completed/2026-03-22-shopping-cart-rework.spec.md` | `completed/2026-03-22-shopping-cart-rework.impl.md` |
| v0.5 Recipe Filtering | `completed/2026-03-21-recipe-filtering.spec.md` | `completed/2026-03-21-recipe-filtering.impl.md` |
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