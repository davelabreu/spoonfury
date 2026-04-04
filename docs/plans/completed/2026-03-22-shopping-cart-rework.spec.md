# Shopping Cart Rework — Spec

**Date:** 2026-03-22
**Status:** Active
**Version:** v0.5.2
**Visual Lockup:** `docs/visual-mockups/shopping_cart_rework.html` (Stage 4: Final)

## Overview

Replace the current checklist-style `ShoppingListPage` with a professional checkout/summary experience. Two-column layout: clean accordion recipe cards on the left, receipt-styled invoice sidebar on the right. Mocked ingredient pricing, spoon ratings, and fork-based multiplier widget.

## Design Decision Trail

Explored 3 initial approaches + 3 hybrids. Final lockup merges:
- **Option A's left column** — accordion recipe cards with emoji thumbnails, dashed border headers, ingredient rows (emoji + name + qty + price), per-recipe subtotals
- **H3's right sidebar** — monospace SPOONFURY-branded receipt summary with mini recipe preview thumbnails, fulfillment toggle, itemized totals, and "Proceed to Instacart" CTA

## Layout

### Desktop (≥768px): Two-Column Grid
```
┌─────────────────────────────┬──────────────────┐
│  YOUR CART  2 recipes        │  [Pickup|Delivery]│
│                              │                   │
│  ┌─ Chicken Tikka Masala ─┐  │  [thumb] [thumb]  │
│  │ 🍛  Title   🥄🥄🥄🥄🥄 │  │                   │
│  │          🍴 2  [-][+]   │  │  ┌─ SPOONFURY ──┐ │
│  │ 🍗 Chicken    2lbs $8.99│  │  │ ORDER SUMMARY│ │
│  │ 🥫 Sauce     15oz $4.49 │  │  │ - - - - - -  │ │
│  │ 🍚 Rice      2cup $3.29 │  │  │ Tikka  $19.84│ │
│  │ ─────── subtotal $19.84 │  │  │ Caesar $13.45│ │
│  └──────────────────────────┘  │  │ - - - - - -  │ │
│                              │  │ Subtotal $33.29│ │
│  ┌─ Caesar Salad ──────────┐  │  │ Tax      $2.83│ │
│  │ ...                     │  │  │ Pickup   $1.99│ │
│  └──────────────────────────┘  │  │ ═══════════  │ │
│                              │  │ TOTAL   $38.11│ │
│                              │  │ [Instacart]   │ │
│                              │  └───────────────┘ │
└─────────────────────────────┴──────────────────┘
```

### Mobile (<768px): Stacked
Left column on top, sidebar below.

## Components

### Left Column — Recipe Cards

Each `RecipeGroup` renders as an accordion card:
- **Header:** emoji thumbnail (category gradient fallback if no image), recipe title (links to recipe page), mocked spoon rating, fork multiplier widget
- **Ingredient rows:** emoji, ingredient name, quantity × unit, mocked price. Health tip tooltip on hover (preserved from current). Swipe-to-delete on mobile (preserved from current).
- **Footer:** dashed border, recipe subtotal

### Fork Multiplier Widget

Replaces the current `MultiplierWidget`. Same logic (decrement → trash at 1, increment), but styled with fork emoji as the unit indicator: `[-] 🍴 2 [+]`

### Right Sidebar — Receipt Invoice

- **Fulfillment Toggle:** Pickup vs Delivery pill toggle, top-right. Toggling changes the fee line item (pickup fee $1.99 vs delivery fee $5.99).
- **Mini Recipe Previews:** Small gradient thumbnails for each recipe in the cart. Uses recipe image or `getCategoryFallback` gradient.
- **Receipt Summary:** Monospace `Courier New` font. Dashed-border card. SPOONFURY brand header, ORDER SUMMARY subheader. Line items per recipe (with multiplier notation), then subtotal, estimated tax, fulfillment fee, double-line total.
- **Checkout CTA:** "Proceed to Instacart" button using `buildInstacartUrl`. Opens in new tab.
- **Disclaimer:** "Prices are estimates. Final total on Instacart."

## Mocked Data

### Ingredient Pricing

No backend pricing exists. A `getEstimatedPrice(ingredientName: string): number` helper returns deterministic mocked prices based on ingredient name hashing. Range: $0.49–$12.99. The function is pure and stable (same ingredient → same price across renders).

### Spoon Rating

No rating system in DB yet (separate future task). Mock with a `getMockedRating(recipeSlug: string): number` helper that returns a deterministic value between 3.5–5.0 based on slug hashing.

### Fee Schedule

```
Pickup fee:   $1.99
Delivery fee: $5.99
Tax rate:     8.5%
```

## Preserved Mechanics

All existing functionality carries over:
- Multiplier state management (API calls to `/shopping-list/multiplier/`)
- Trash/remove recipe (API call to `/shopping-list/remove-recipe/`)
- Individual item delete (API + swipe-to-delete gesture)
- Item check/uncheck toggle
- Health tip tooltips on ingredient hover
- Instacart URL building
- Empty state display
- Auth guard
- `SHOPPING_LIST_UPDATED` event dispatch
- Broken thumbnail fallback tracking

## Out of Scope

- Backend per-ingredient pricing API
- Rating system (DB model, UI for submitting ratings)
- Actual Instacart price integration
- "Swap" ingredient feature (UI placeholder only, no backend)
