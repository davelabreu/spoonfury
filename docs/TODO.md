# Spoonfury TODO
[ AI assisted to do list ]

Deferred items that need focused effort in future sessions.
Organized by category — add new items under the right heading.

---
## Recipes
- May need more information such as estimated cook time (active and passive), effort estimation, whatever


## 🔍 Search & Discovery

### Filter Bar on Stir the Pot (HIGH PRIORITY — READY TO BUILD)

Backend filtering already works (`?category=`, `?tags=`, `?search=`, `?ingredient=`). Just needs UI.

- Horizontal category chip row above the hero card (15 categories + "All")
- Debounced text search input
- Active filters reflected in URL params so links are shareable
- Re-fetches recipe list when filters change, clears hero/grid accordingly

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

### Recipe Ratings & Comments

Published recipes should have a community rating system and comment threads.

- Use spoons (🥄) instead of stars — fits the Spoonfury brand
- 1–5 spoon rating, average displayed on recipe cards and recipe page
- Comment threads on published recipes — top-level comments + replies
- **Data Retention**: Reviews and votes from the "Community Review Gate" phase MUST be retained and visible even after a recipe is upgraded to "Published".
- Needs backend models: `RecipeRating`, `RecipeComment`
- Comment attribution by username, timestamp, optional edit/delete by author

### User Profile & Account Hub

Clicking a username anywhere should go to a public profile page (`/@username`).

- Public page: bio, avatar, their published recipes, fork count, member since
- Owner view: also shows drafts, in-review, forked recipes
- Edit profile: display name, bio, avatar upload, social links
- Account hub replaces the current minimal username badge dropdown

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

### Shadcn UI Consistency Pass

Uniform UI — replace remaining raw HTML elements with installed Shadcn components.
Currently ~60% adopted. No functional changes, just consistency.

- **Phase 1 (quick):** EditRecipePage raw inputs/textareas → Shadcn Input/Textarea (match CreateRecipePage), LoginPage + RegisterPage raw inputs → Shadcn Input, BooksPage input, IngredientRow raw checkbox → Shadcn Checkbox
- **Phase 2 (medium):** 4 raw `<select>` elements → Shadcn Select (CreateRecipe, EditRecipe, RecipePage, ForkModal), simple raw buttons → Shadcn Button (ShareModal, BuyNowSheet, ReceiptSidebar)
- **Phase 3 (larger):** Custom modals (ForkModal, ShareModal, BuyNowSheet) → Shadcn Dialog (needs Framer Motion animation preservation). NavBar buttons are fine as-is (justified by animation needs).

### Shopping List UX Polish

- Ingredient count badge on the cart icon updates on navigation — consider real-time
  updates via a shared context so the count updates immediately after "Add to List"
  without requiring a page navigation.
- BuyNowSheet UX/UI improvements deferred.

---

## 🛒 Integrations

### Real Ingredient Pricing

Replace mock pricing in `frontend/src/lib/pricing.ts` with real grocery data.
Currently prices are generated from ingredient name hashing — believable but fake.

- Research Instacart Catalog API, Kroger API, or Spoonacular for per-ingredient pricing
- Could also scrape/aggregate from grocery sites and cache in our backend
- Needs a backend endpoint (`GET /api/pricing/?ingredients=chicken,rice,...`)
- Frontend swap: replace `getEstimatedPrice()` with API call + cache layer
- Consider regional pricing differences

### Instacart Integration

The "Buy it NOW!" button links to Instacart but the URL builder is not yet producing
results that match their product catalogue. This requires dedicated integration work:

- Research Instacart's Partner API / Shoppable Recipes API for proper product lookup
- Current approach: builds a search URL with ingredient terms joined by `\n` — works as
  a fallback but doesn't reliably match products
- Consider whether Instacart requires an API key / affiliate agreement for deep-linking
- File: `frontend/src/lib/instacart.ts`


---

## 🛡️ Security & Stability (Technical Debt)

Items identified during v0.5 security audit to move from prototype to production-ready.

### Authentication & Sessions
- **Risk:** Token stored in `localStorage` is vulnerable to XSS.
- **Fix:** Transition to `HttpOnly` cookies for session management in production.

### Rate Limiting
- **Risk:** No protection against brute-force or spamming (Fork/Register/Login).
- **Fix:** Implement `django-ratelimit` or DRF Throttling on all mutation endpoints.

### File Upload Safety
- **Risk:** No file size limit on image uploads (`views_upload.py`).
- **Fix:** Enforce a maximum file size (e.g., 5MB) in the backend and frontend.

### Data Integrity (JSON Ingredients)
- **Risk:** `JSONField` ingredients lack schema validation.
- **Fix:** Implement JSON Schema validation in the backend to ensure data structure consistency.

### Concurrency (Slug Generation)
- **Risk:** Non-atomic slug generation in `Recipe.save()` could lead to race conditions.
- **Fix:** Use a database-level unique constraint with a retry loop or switch to UUID-suffixed slugs.

### Account Spam
- **Risk:** `ACCOUNT_EMAIL_VERIFICATION = "none"` allows fake account bloat.
- **Fix:** Enable email verification and add CAPTCHA to registration before public launch.

## Recipe Ratings & Reviews (v0.9.1 — Part B)

Part A (v0.9) surfaced vouch counts and made historical reviews public. Part B extends the system into a living ratings feature.

**Scope:**
- **Post-publish voting.** `review_vote` endpoint accepts votes for `status in ("in_review", "published")`. Published recipes accumulate vouches from any logged-in user (except author).
- **5-spoon rating.** Replace the boolean `RecipeReview.is_positive` with a 1–5 integer rating (spoons). Migration converts legacy `is_positive=True` → 4 spoons, `is_positive=False` → 2 spoons (or similar — decide during spec).
- **Drive-by negativity mitigation.** Require a comment on low ratings (e.g., any rating ≤ 2). Optional: weighted scoring that favors reviewers who have also forked or cooked the recipe.
- **Update the published detail-line copy.** "Vouched for by N cooks in the test kitchen" no longer fits once post-publish votes are counted — revise to something like "N cooks have vouched for this recipe."
- **"Kitchen Tested" signature treatment (Option C from brainstorm).** Named visual badge with reviewer avatars.

**Data retention:** Part A's durability guarantees (one vote per reviewer per recipe, forever) continue to apply. A reviewer who voted during in_review cannot vote again after publish.

**Reference:** `docs/plans/completed/2026-04-12-vouch-retention.spec.md` (Part A spec, §11 Explicit Non-Goals).
