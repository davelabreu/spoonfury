# Stir the Pot — Filter Bar & Discovery Redesign

**Date:** 2026-04-05  
**Version target:** v0.8  
**Visual mockup:** `docs/visual-mockups/filter-bar-v6.html`

---

## Overview

Redesign the Stir the Pot (HomePage) from a simple recipe list into a discovery-first experience. Adds a hero search banner, three-tier chip filter shelf (Category, Cuisine & Heritage, Lifestyle & Constraints), a "Hot this month" featured strip, and a filterable recipe grid with sort controls.

---

## Page Structure (top to bottom)

### 1\. Hero Search Banner

Full-width indigo/purple gradient banner fused to the top of the filter shelf.

*   **Headline:** "What will you cook today?"
*   **Subtext:** "Explore recipes from our community kitchen"
*   **Search input:** Embedded in the banner, frosted-glass style. Fires text search on Enter. Maps to `?search=` backend param.
*   Decorative emoji watermark row (low opacity, top-right).

### 2\. Filter Shelf

White panel fused to the bottom of the hero banner (no gap, shared border-radius: top on banner, bottom on shelf). Contains three chip rows separated by subtle dividers, plus an action bar.

#### Row 1 — Category (indigo chips)

Uses the existing `CATEGORY_CHOICES` from the Recipe model. Single-select (radio behavior). "All" chip = no category filter.

| Chip label | Backend value |
| --- | --- |
| All | _(no filter)_ |
| 🍔 Burger | `sandwich_burger` |
| 🍕 Pizza | `pizza` |
| 🍲 Soup | `soup` |
| 🥗 Salad | `salad` |
| 🍝 Pasta | `pasta_noodles` |
| 🥩 Meat & Seafood | `meat_seafood` |
| 🥣 Bowl | `bowl` |
| 🍞 Casserole | `casserole_bake` |
| 🥦 Side Dish | `side_dish` |
| 🫙 Sauce | `sauce_condiment` |
| 🍳 Breakfast | `breakfast_bakery` |
| 🍰 Dessert | `dessert` |
| 🍹 Drink | `drink` |
| 🍿 Snack | `snack_app` |
| 🍽️ Other | `other` |

#### Row 2 — Cuisine & Heritage (amber chips)

Backed by Tag model with `kind="cuisine"`. Single-select. "All" = no cuisine filter.

| Chip label | Tag slug |
| --- | --- |
| All | _(no filter)_ |
| 🇺🇸 American | `american` |
| 🇮🇹 Italian | `italian` |
| 🇲🇽 Mexican | `mexican` |
| 🥢 Asian | `asian` |
| 🥐 European & Iberian | `european-iberian` |
| 🫒 Mediterranean | `mediterranean` |
| 🌴 Latin American | `latin-american` |

#### Row 3 — Lifestyle & Constraints (green chips)

Backed by Tag model. `kind="dietary"` for diet-related, `kind="vibe"` for effort/planning.

| Chip label | Tag slug | Tag kind |
| --- | --- | --- |
| All | _(no filter)_ | — |
| ⚡ Quick & Easy | `quick-easy` | `vibe` |
| 🌿 Vegetarian / Vegan | `vegetarian-vegan` | `dietary` |
| 💪 Health & Fitness | `health-fitness` | `vibe` |
| 🏠 Weeknight Staples | `weeknight-staples` | `vibe` |
| 🌾 Gluten-Free / Dairy-Free | `gluten-free-dairy-free` | `dietary` |
| 🥩 High Protein / Keto | `high-protein-keto` | `dietary` |
| 📦 Meal Prep / Freezer | `meal-prep-freezer` | `vibe` |

#### Action Bar

Bottom row of the filter shelf, light gray background.

*   **Left:** "Filtering by:" + active filter pills (removable via ✕). Only visible when at least one non-"All" filter is selected.
*   **Right:** "Clear all" text link + **"Search Recipes"** primary button (indigo).
*   Clicking "Search Recipes" fires the combined query. Nothing fires until this button is pressed.

### 3\. Hot This Month Strip

Two side-by-side horizontal cards below the filter shelf.

*   **Section header:** "🔥 Hot this month" (uppercase, same style as "All Recipes" header).
*   **Card contents:** Category emoji thumbnail (left, 80px), then title (bold), @author + fork count + approval %, and 2-line muted description (clamped).
*   **Amber border** on cards to visually distinguish from the main grid.

#### Hotness Score Formula

```
score = (fork_count × 0.4) + (positive_vote_rate × 0.6)
```

Where `positive_vote_rate = positive_votes / total_votes` (0–1 scale, multiplied by 10 to bring it into a comparable range with fork\_count). Only recipes published in the last 30 days are eligible. Minimum 1 vote required to avoid empty-state noise.

Backend computes this via annotation (`F('fork_count') * 0.4 + (F('positive_votes') * 10.0 / NullIf(F('total_votes'), 0)) * 0.6`) and returns the top 2 ordered by score descending.

### 4\. All Recipes Grid

*   **Section header:** "All Recipes" (left) + sort dropdown (right).
*   **Sort options:** Newest (default, `-created_at`), Most Forked (`-fork_count`), A–Z (`title`).
*   **Grid:** 2-column layout, existing `GridCard` component. Paginated (existing PAGE\_SIZE=20).

---

## Filter Behavior

*   **Single-select per row.** Clicking a chip deselects the previous chip in that row (radio behavior). Clicking "All" clears that row's filter.
*   **AND across rows.** Category AND tags are sent together. Backend already supports `?category=X&tags=Y,Z` with AND logic.
*   **No live filtering.** Filters only apply when "Search Recipes" is clicked.
*   **AND-first with OR fallback.** If the AND query returns zero results, the frontend makes a second API call with each filter as a separate `?tags=` param (OR). Shows a muted notice above the grid: "No exact matches — showing related recipes." If OR also returns empty, show a friendly empty state.
*   **URL param sync.** Active filters are reflected in `?category=&cuisine=&lifestyle=&search=&ordering=`. Loading the page with params pre-fills the chips. This makes filtered views shareable.

---

## Backend Changes

### 1\. Seed new tags (data migration)

Seed the following tags if they don't already exist:

**Cuisine & Heritage** (`kind="cuisine"`): american, italian, mexican, asian, european-iberian, mediterranean, latin-american

**Lifestyle & Constraints** (`kind="dietary"`): vegetarian-vegan, gluten-free-dairy-free, high-protein-keto

**Lifestyle & Constraints** (`kind="vibe"`): quick-easy, health-fitness, weeknight-staples, meal-prep-freezer

### 2\. Hot recipes ordering

Add a `hot` ordering option to the existing `RecipeViewSet` filter:

*   Annotate: `score = F('fork_count') * 0.4 + (F('positive_votes') * 10.0 / NullIf(F('total_votes'), 0)) * 0.6`
*   Filter: `published_at__gte=now - 30 days`, `total_votes__gte=1`
*   A new query param `?hot=true&limit=2` or use `?ordering=hot&page_size=2`

### 3\. No model changes

Category stays as the existing `category` field. Cuisine & Lifestyle are tags — no schema changes needed. The existing `?category=` and `?tags=` filters handle all filtering. `?search=` handles text search.

---

## Frontend Changes

### New Components

| Component | Purpose |
| --- | --- |
| `SearchBanner` | Hero gradient banner with embedded search input |
| `FilterShelf` | 3-row chip filter + action bar, manages selected state |
| `HotStrip` | "Hot this month" section header + 2 horizontal cards |

### Modified Components

| Component | Change |
| --- | --- |
| `HomePage` | Replace `HeroCard` + current layout with new page structure. Add filter state, URL param sync via `useSearchParams`, search button handler. |

### Removed

*   `HeroCard` component usage from HomePage (component file can stay if used elsewhere, but currently it's only in HomePage — can be deleted).

### State Management

All local to `HomePage` — no new context needed.

*   `selectedCategory: string | null`
*   `selectedCuisine: string | null`
*   `selectedLifestyle: string | null`
*   `searchQuery: string`
*   `sortOrder: string`
*   Synced bidirectionally with `useSearchParams`.

### Shadcn Components Used

*   `Badge` — filter pills in action bar
*   `Button` — "Search Recipes" primary button
*   `Input` — search input (styled with custom classes for the banner)
*   `Select` — sort dropdown
*   Chips are custom styled `<button>` elements (no Shadcn equivalent for chip/toggle groups at this scale)

---

## Mobile Considerations

*   Filter shelf chips wrap naturally (flex-wrap).
*   Hot strip stacks to single column on `sm:` breakpoint.
*   Action bar stacks vertically on narrow screens (filter pills above, buttons below).
*   Search banner padding reduces on mobile.

---

## What This Does NOT Include

*   Pagination controls (existing scroll-based pagination continues as-is).
*   Rising Stars sidebar (remains unchanged — shown when in-review recipes exist).
*   Tag management UI (recipes are tagged at create/edit time, not from the filter bar).
*   Auto-tagging / smart suggestions (future work).