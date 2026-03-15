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

## Social Login (Google, Facebook, Apple)

Add OAuth quick-login alongside existing username/password auth. Reduces sign-up
friction and improves security (no password to leak).

- Backend: `django-allauth` (already using `dj-rest-auth` for token auth) handles the
  OAuth provider dance. Add Google, Facebook, and Apple as providers.
- Frontend: OAuth redirect flow or SDK-based sign-in buttons on login/register pages.
- Decide whether to keep username/password as a fallback or go social-only.

## Recipe Filtering & Smart Categories

Replace the flat `category` field with three filtering dimensions:

**1. Moment (meal type)** — Breakfast, Lunch, Dinner, Snack, Dessert.
  - Single-select radio on create/edit.
  - Smart default: suggest category from ingredients (eggs + toast → Breakfast).

**2. Vibe / Effort** — Weeknight Dash (<30 min), Project Cook (longer/complex), Meal Prep (high yield).
  - Auto-calculated from recipe metadata (prep time, cook time).
  - If total <20 min → auto-tag "Quick Fix."

**3. Dietary Protocol** — Vegetarian, Vegan, Keto, Gluten-Free, High-Protein.
  - Auto-derived from ingredient list (no meat → Vegetarian flag, etc.).

**UI: Horizontal Filter Bar** at top of HomePage/BooksPage (not a sidebar):
  - Primary row: Icons (Sun, Sandwich, Moon) for Breakfast/Lunch/Dinner.
  - Secondary row: Small outline badges for "High Protein", "< 30 mins", etc.
  - Sorting dropdown: Newest, Most Forked, Trending.

Current `category` (pasta, salad, etc.) may become a sub-category or "cuisine type."

## Cook Mode: Sticky Ingredients

When Cook Now mode is active, ingredients should follow the user while scrolling
through instructions so they can reference amounts without losing their place.

- **Desktop (lg:+)**: Two-column layout — instructions left, ingredients sticky-pinned right.
- **Mobile**: Floating "Ingredients" pill/FAB that opens a bottom sheet drawer.
- Step interactivity: border glow or slight scale-up on the active instruction step.
- Activates when Cook Now is on — doesn't change layout in normal reading mode.
