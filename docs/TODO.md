# Spoonfury TODO
[ AI assisted to do list ]

Deferred items that need focused effort in future sessions.
Organized by category — add new items under the right heading.

---
## Recipes
- May need more information such as estimated cook time (active and passive), effort estimation, whatever


## 🔍 Search & Discovery

### Recipe Search & Filtering (HIGH PRIORITY — NEEDS BRAINSTORM)

The Stir the Pot explore feed needs real search and filtering. This is central to making the platform useful and discoverable. **No decisions are final yet — this needs a full brainstorm session.**

**Ideas on the table:**

- **Meal type** — Breakfast, Lunch, Dinner, Snack, Dessert, Any Time
- **Main ingredients** — Search by what's in the recipe
- **Cultural / Heritage** — Italian, Mexican, Japanese, Southern, Caribbean, etc. Celebrate where recipes come from
- **Vibe / Effort** — Quick weeknight vs. weekend project vs. meal prep
- **Dietary** — Vegetarian, Vegan, Keto, Gluten-Free, etc. Could be auto-derived from ingredients
- **Similar recipes** — "Recipes like this one" — find related recipes across any dimension
- **Smart auto-tagging** — Can we derive some of this automatically from ingredients and metadata?

**Open questions:**
- Tag-based system (M2M) vs. flat fields vs. something else? Leaning tags for scalability but needs exploration.
- How does this interact with the current `category` field? Replace it? Absorb it?
- What does the UI look like? Filter bar? Sidebar? Search modal? Needs visual brainstorming.
- How much is user-entered vs. auto-derived?
- What makes search feel *good* on a recipe platform specifically?
- How do we handle recipes that don't have tags yet (migration/backfill)?

**Where it lives:** Stir the Pot page. This is the front door for discovery.

---

## 👥 Social & Auth

### Social Login (Google, Facebook, Apple)

Add OAuth quick-login alongside existing username/password auth. Reduces sign-up
friction and improves security (no password to leak).

- Backend: `django-allauth` (already using `dj-rest-auth` for token auth) handles the
  OAuth provider dance. Add Google, Facebook, and Apple as providers.
- Frontend: OAuth redirect flow or SDK-based sign-in buttons on login/register pages.
- Decide whether to keep username/password as a fallback or go social-only.

### User communication
- Users should be able to tag others, and message them as well.

### Community ratings for recipes
- Recipes should include a voting, and recipe comment system (Use spoons instead of stars?)

### User Menu & Account Hub

The username badge (top-right) should be the entry point for a user acount page and dropdown menu.
Currently sign-out is buried. Long-term this becomes the account hub.

**Account hub**: Should celebrate a user's recipes, forked and original, and allow the user to edit their page for others to see! It could include social links, or favorite recipes.

**MVP (done):** Dropdown with "My Books" link and "Sign out".

**Future items for the menu:**
- Account management (display name, avatar, password, linked OAuth accounts)
- My Forked Recipes (filtered view where `parent_recipe_slug` is non-null)
- Test Kitchen (private drafts — depends on test-kitchen feature branch)
- Comments / Activity (social features — needs its own brainstorm)
- Settings (nav theme, preferences)

**Implementation:** Shadcn `DropdownMenu` anchored to the username badge in NavBar.

---

## 🎨 UI / UX

### NavBar Theme Toggle Button

The ☰/🏷️ icons for switching between Fridge Sticker and Minimal nav themes are
functional but not obvious to users. Revisit with a more intentional theme picker UI
(e.g. a small labelled button or palette icon in the settings area).

### Cook Mode: Sticky Ingredients

When Cook Now mode is active, ingredients should follow the user while scrolling
through instructions so they can reference amounts without losing their place.

- **Desktop (lg:+)**: Two-column layout — instructions left, ingredients sticky-pinned right.
- **Mobile**: Floating "Ingredients" pill/FAB that opens a bottom sheet drawer.
- Step interactivity: border glow or slight scale-up on the active instruction step.
- Activates when Cook Now is on — doesn't change layout in normal reading mode.

### Shopping List UX Polish

- Ingredient count badge on the cart icon updates on navigation — consider real-time
  updates via a shared context so the count updates immediately after "Add to List"
  without requiring a page navigation.
- BuyNowSheet UX/UI improvements deferred.

---

## 🛒 Integrations

### Instacart Integration

The "Buy it NOW!" button links to Instacart but the URL builder is not yet producing
results that match their product catalogue. This requires dedicated integration work:

- Research Instacart's Partner API / Shoppable Recipes API for proper product lookup
- Current approach: builds a search URL with ingredient terms joined by `\n` — works as
  a fallback but doesn't reliably match products
- Consider whether Instacart requires an API key / affiliate agreement for deep-linking
- File: `frontend/src/lib/instacart.ts`
