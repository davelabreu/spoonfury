# Spoonfury TODO

Deferred items that need focused effort in future sessions.

## Instacart Integration

The "Buy it NOW!" button links to Instacart but the URL builder is not yet producing
results that match their product catalogue. This requires dedicated integration work:

- Research Instacart's Partner API / Shoppable Recipes API for proper product lookup
- Current approach: builds a search URL with ingredient terms joined by `\n` — works as
  a fallback but doesn't reliably match products
- Consider whether Instacart requires an API key / affiliate agreement for deep-linking
- File: `frontend/src/lib/instacart.ts`

## NavBar Theme Toggle Button

The ☰/🏷️ icons for switching between Fridge Sticker and Minimal nav themes are
functional but not obvious to users. Revisit with a more intentional theme picker UI
(e.g. a small labelled button or palette icon in the settings area).

## Shopping List UX Polish

- Ingredient count badge on the cart icon updates on navigation — consider real-time
  updates via a shared context so the count updates immediately after "Add to List"
  without requiring a page navigation.
- BuyNowSheet UX/UI improvements deferred.
