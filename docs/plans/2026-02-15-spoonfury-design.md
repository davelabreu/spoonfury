# Spoonfury — Prototype Design

**Date**: 2026-02-15
**Status**: Approved
**Scope**: Prototype v0.1 — Recipe-first social recipe platform with forking and Instacart integration

---

## Overview

Spoonfury is a recipe-first social platform. The core mechanic is the **fork** — users find a recipe they love, clone it to their profile, make constrained personal tweaks, and build a curated digital recipe book to share with family and friends. Recipes are concise and chef-focused. Instacart integration lets users buy checked ingredients directly from a recipe page.

---

## Architecture

### Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend | Django + Django REST Framework | ORM, admin panel, auth, REST APIs |
| Database | PostgreSQL (containerized) | Production-grade from day one |
| Frontend | React 19 + Vite + Tailwind 4 + Shadcn UI | Same stack as home_ai_project web_monitor |
| Auth | Django Allauth | Email/password for prototype, social login later |
| Container | Docker + docker-compose | Jetson deployment pattern |

### Repo Layout

```
spoonfury/
├── CLAUDE.md
├── docs/
│   ├── plans/                    # Design and implementation plans
│   ├── context-scopes/
│   │   ├── backend.md
│   │   ├── frontend.md
│   │   └── infrastructure.md
│   ├── ARCHITECTURE.md
│   ├── CONVENTIONS.md
│   ├── DECISIONS.md
│   └── ROADMAP.md
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── spoonfury/               # Django project settings
│       └── apps/
│           ├── recipes/         # Recipe, Fork, Annotation models
│           ├── books/           # RecipeBook model
│           └── users/           # Extended user profile
├── frontend/
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       ├── components/
│       ├── hooks/
│       └── pages/
├── docker-compose.yml
└── deploy.sh
```

### Local Dev

- Django: `localhost:8000`
- Vite dev server: `localhost:5173`
- Postgres: Docker container, port `5432`

### Jetson Deployment

All three services containerized. Django serves the built React app (`frontend/dist/`). Same pattern as `web_monitor`. Spoonfury gets its own `deploy.sh` independent of `home_ai_project`.

---

## Data Model

### Recipe

```python
title           CharField(max_length=100)
description     CharField(max_length=280)   # Twitter-esque blurb
serves          CharField(max_length=50)    # e.g. "6 (about 2 cups each)"
ingredients     JSONField                   # [{quantity, unit, name, note}]
instructions    TextField                   # Markdown blob, rendered as-is
notes           TextField(blank=True)       # Optional markdown (tips, context)
category        CharField(choices=CATEGORY_CHOICES)
author          ForeignKey(User)
parent_recipe   ForeignKey('self', null=True, blank=True)  # Lineage
fork_count      PositiveIntegerField(default=0)            # Denormalized
slug            SlugField(unique=True)
created_at      DateTimeField(auto_now_add=True)
```

### Fork Constraints (structural, enforced by UI)

- Max ±3 ingredient changes (add / remove / swap)
- Quantities and notes may change freely
- Title must retain the original title or an obvious variant
- Category is locked to parent category
- Attribution: "Forked from @author's [Title]" always displayed

### RecipeBook

```python
title           CharField(max_length=100)
cover_image     ImageField(blank=True)
owner           ForeignKey(User)
recipes         ManyToManyField(Recipe, through='BookRecipe')  # ordered
is_public       BooleanField(default=False)
share_token     UUIDField(default=uuid4, unique=True)
created_at      DateTimeField(auto_now_add=True)
```

Shareable link: `/books/<share_token>`

### User (extended)

Standard Django auth + display name, one-line bio, avatar.

---

## Core UX Flows

### 1. Recipe Page (`/recipes/<slug>`)

- **Header**: Title, author attribution, "Forked from @X's [Recipe]" if a fork, fork count badge
- **Description**: 280-char prose blurb
- **Serves**: plain string
- **Ingredient checklist**: Checkbox list — `[✓] 2 Tbsp olive oil`, `[ ] 0.6 lb chouriço`
  - Default: all checked
  - Users uncheck ingredients they already have
- **Instacart button**: "Order checked items on Instacart →"
  - Constructs Instacart shoppable URL from checked `{quantity} {unit} {name}` entries
  - Opens in new tab
- **Instructions**: Rendered markdown
- **Notes**: Rendered markdown (optional section)
- **Fork button**: "Make it mine →"

### 2. Fork a Recipe

- Clicking "Make it mine" opens an inline edit form — same recipe layout, editable
- **Ingredient editor**: add/remove/swap up to 3 items; UI shows live change counter ("2 of 3 changes used")
- **Category**: locked, displayed but not editable
- **Title**: pre-filled with suggested variant, editable (must contain original title or obvious variant)
- **Instructions + Notes**: freely editable markdown
- On save: new Recipe created with `parent_recipe` set, `fork_count` on parent incremented, redirected to new recipe page

### 3. Recipe Books (`/books/`)

- List of user's books with cover, title, recipe count
- "New Book": name + optional cover image
- Book page: ordered list of recipe cards, "Add recipe" from your collection
- Toggle public/private
- Share link: `spoonfury.com/books/<share_token>` — viewable by anyone with the link, no login required
- Recipe cards in book show: thumbnail, title, author credit

---

## Instacart Integration

**Prototype approach**: Instacart Shoppable Recipe URL format. No API key required.

```
https://www.instacart.com/store/<retailer>/product_page?
  product_id=<search_term>&quantity=<qty>
```

Or simpler affiliate link format:
```
https://instacart.com/products/search?q={ingredient_name}
```

For the prototype: construct a multi-item Instacart URL from checked ingredients, open in new tab. No backend call needed — pure frontend URL construction.

**Path to monetization**: Apply to Instacart Affiliate Program (instacart.com/affiliates) for revenue share on completed orders. Same link format, add affiliate tag.

---

## Prototype Scope (v0.1)

### In
- Recipe page (read) with ingredient checklist
- Instacart button (checked items → Instacart link)
- Fork a recipe (structural constraints, lineage attribution)
- Create recipe (original, from scratch)
- Recipe books (create, add recipes, share link)
- User registration + login (email/password)
- PostgreSQL + Django REST + React in Docker

### Out (v0.2+)
- AI-driven contextual ads
- Community feed / discovery / explore
- Star ratings and written reviews
- Social follows and notifications
- Instacart affiliate revenue tracking
- Admin moderation tools
- Image uploads for recipes (text-first for prototype)

---

## Key Decisions

| Decision | Rationale |
|---|---|
| New standalone repo, not in home_ai_project | Different product, different lifecycle. Spoonfury is a business; home_ai_project is a home tool. |
| PostgreSQL from day one | No SQLite-to-Postgres migration pain later. Containerizes cleanly. |
| Ingredients as JSON array | Needed for fork diff counting. All other fields are markdown text. |
| Instacart via URL construction (no API key) | Fastest path to working prototype. Affiliate program applied for separately. |
| Recipe-first information hierarchy | Recipe page is the primary unit. Book and author are context, not the hero. |
| Fork constraints enforced by UI, not backend | Simpler to build, easier to adjust limits without migrations. Backend validates count on save. |
