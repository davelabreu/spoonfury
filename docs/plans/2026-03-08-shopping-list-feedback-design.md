# Shopping List Feedback Refinement

**Date**: 2026-03-08
**Version**: v0.4 polish (pre-merge)

## Problem

When a user clicks "Add to Shopping List" a second time, the message "Added 0 items to shopping list" feels like a punishment. There's no persistent confirmation that ingredients are already in the cart.

## Design

### Backend Change

`ShoppingListAddView` returns an additional field in the response:

```json
{ "added": 3, "already_in_list": true }
```

`already_in_list` is `true` when the recipe has any items in the user's shopping list after the add operation.

New endpoint for checking status on page load:

```
GET /api/shopping-list/status/?recipe_slug=<slug>
→ { "in_list": true }
```

Returns whether any items from the given recipe exist in the user's shopping list.

### Frontend — Badge

A persistent green badge below the "Add to Shopping List" button:

- **Style**: `bg-green-50 border border-green-200 rounded-md px-3 py-2`
- **Icon**: Shopping bag + heart (`🛍️❤️`) — dopamine reward
- **Text**: "In your shopping list"
- **Behavior**:
  - On page load: check `/shopping-list/status/?recipe_slug=X` — show badge if true
  - After successful add: show badge immediately
  - If shopping list is cleared or items removed: badge disappears on next page visit

### Frontend — Button State

When badge is showing, the "Add to Shopping List" button becomes disabled/muted (same `disabled:opacity-40` style). Re-enables if the list is cleared.

### What Doesn't Change

- Shopping list page, Buy Now flow, Cook Now, NavBar badge
- Backend models and deduplication logic
- Ingredient checklist checkbox semantics
