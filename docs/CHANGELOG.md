# Changelog

Dev log for Spoonfury. **Focus** statements are top-level human summaries of dev sessions. Below, AI dives into what changed, why, and how it felt.

---

## 2026-04-04 — v0.7 UI Polish & Review Pipeline Hardening

**Focus:** Wrapping up the community review system, how it flows and feels including comments review and addition to main page Stir the Pot, and moderation system scaffold for Spoonfury.

- **Magazine-style homepage** (Stir the Pot): hero card (`aspect-[16/7]`, gradient overlay, "Recipe of the Day" label), 2-column responsive recipe grid, "Rising Stars" sidebar with rank numbers, live vote progress bars (`total_votes/3`), approval percentage — sidebar only appears when recipes are under community review
- **RecipePage editorial split layout**: 12-column grid — story/image left (7 cols), sticky context right (5 cols). About card with serves + cook time placeholder, notes card. Ingredients below image in left column, natural reading flow. Header (title, author, breadcrumb) hoisted above grid so right column aligns with image top. Cook Now banner sits between action strip and ingredients
- **BooksPage library grid**: portrait `aspect-[3/4]` book cards, deterministic gradient covers (8-palette cycle by ID), monogram watermark letter, spine strip, hover-lift effect
- **`is_staff` exposed** via `/api/auth/user/` endpoint (custom `SpoonfuryUserSerializer`); `AuthContext` stores `isStaff`; Moderation Queue link appears in username dropdown for staff only; `MinimalNav` wired through
- **Staff recipe visibility**: `mod_queue` recipes included in staff queryset so navigating from notifications doesn't 404
- **Notification routing**: `recipe_in_mod_queue` notification type navigates to `/moderation` instead of the recipe page
- **Moderator feedback surfaced to author**: `ModerationAction.feedback` returned in `review_list` response as `moderation_feedback[]`; DraftBanner displays it in an orange callout block with moderator username, round, and date when status is `revision_requested`
- **Full vote history preserved**: `review_list` returns `all_rounds` (all votes across every round) to recipe owner and staff; `RecipeReviewItem` extended with `round` field; owner sees "Community Votes" panel on RecipePage grouped by round
- **Vote tally in RecipeSerializer**: `total_votes` and `positive_votes` injected for `in_review`/`mod_queue` recipes — no extra requests needed; shown on MyKitchenPage in-review cards as `👍 2/3 votes`
- **Revision resubmit shortcut**: resubmitting from `revision_requested` skips community voting entirely → goes straight to `mod_queue`; previous votes retained; staff notified; button label reads "Send to Moderation"
- **Staff recipe page**: ReviewBanner shown for `mod_queue` recipes, full vote history panel visible, "⚖️ Back to Moderation Queue" button in nav bar
- `review_list` returns `all_rounds` and `moderation_feedback` to staff as well as owner
- Rising Stars sidebar footer CTA context-aware: "Click a recipe to cast your vote" when logged in vs "Log in to cast your vote" when not

---

## 2026-04-04 — v0.6 Test Kitchen & Recipe Privacy

**Focus:** I wanted to get the test kitchen workflow from draft recipes to published kicked off. Will need more work, but at least now it flows nicely. Will need peer review and other functions added later. Added WYSIWYG markdown editor Tiptap.

- `status` field on Recipe (`draft` / `published`) with `published_at` timestamp — all existing recipes auto-migrated to published
- Privacy-aware queryset: drafts visible only to their author (or invited users via `TestKitchenInvite`)
- My Kitchen page (`/kitchen`): lists all your drafts with per-recipe publish gate progress bars
- Publish gate: 4 criteria must pass before a recipe can go public — 2+ ingredients, description, 20+ char instructions, category
- Draft banner on RecipePage: amber (incomplete) → green (ready) with live gate pill checklist and score; shown only to the owner
- Reactive draft banner on EditRecipePage: same gate checklist updates in real time as you type — you see criteria flip green without saving
- "🎉 Perfect It" publish button: greyed until all gates pass, triggers confetti (`canvas-confetti`) on publish
- Unpublish action returns a published recipe to draft status
- `TestKitchenInvite` model: owner can invite specific users to preview a draft before publishing
- EditRecipePage fully redesigned to match CreateRecipePage layout: 4-section Card with Shadcn components, pre-filled from API, tags loaded and editable
- **Tiptap WYSIWYG editor** for instructions and notes on both Create and Edit pages — users see formatted text (bold is bold, headings are big) and edit directly in the preview; stores clean markdown; toolbar: B, I, H1, H2, H3, bullet list, numbered list, undo/redo; zero raw markdown syntax exposed
- Branch rebased onto master to incorporate v0.5 recipe filtering, cart rework, and image features before merging
- 89 tests passing across all apps

---

## 2026-03-22 — v0.5.2 Shopping Cart Rework

**Focus:** Wanted the shopping cart to feel like a real checkout — not a checklist. Took inspiration from REI and Uber Eats cart pages to build something that respects the user with real data: per-ingredient prices, recipe subtotals, a receipt-style summary. The kind of page that makes you feel like you're actually about to go shopping.

- Full ShoppingListPage rewrite: checklist replaced with professional two-column checkout layout
- Left column: accordion-style recipe cards with emoji thumbnails, spoon ratings (🥄, mocked via slug hashing), fork multiplier widget (🍴), per-ingredient prices, per-recipe subtotals
- Right column: sticky receipt-styled sidebar with SPOONFURY monospace branding, fulfillment toggle (Pickup $1.99 / Delivery $5.99), mini recipe preview thumbnails, itemized order summary, "Proceed to Instacart" CTA
- Deterministic mock pricing system: `getEstimatedPrice()` and `getMockedRating()` use string hashing for consistent fake data — same ingredient always gets the same price across renders
- Fee schedule: pickup $1.99, delivery $5.99, 8.5% tax — fulfillment toggle reactively updates the receipt total
- 5 new focused components: `pricing.ts`, `ForkMultiplier.tsx`, `IngredientRow.tsx`, `RecipeCard.tsx`, `ReceiptSidebar.tsx`
- All existing mechanics preserved: multiplier API calls, trash/remove recipe, swipe-to-delete, health tip tooltips, Instacart URL builder, auth guard, empty state, broken thumbnail tracking
- Visual design evolution documented: 3 approaches → 3 hybrids → final lockup (A's cards + H3's receipt sidebar) saved to `docs/visual-mockups/shopping_cart_rework.html`
- App max-width bumped from `max-w-5xl` to `max-w-6xl` for two-column breathing room
- Spec and impl plan at `docs/plans/active/2026-03-22-shopping-cart-rework.{spec,impl}.md`

---

## 2026-03-21 — v0.5 Recipe Filtering

**Focus**: I want to future proof the recipe categorization, so that the database can support a robust search filtering mechanism for finding recipes based on tags, ingredients, category, vibe, meal type, etc!

- Hybrid "Bones + Vibes" architecture: 15 strict categories (the bones) + flexible Tag M2M with 4 kinds — cuisine, dietary, ingredient, vibe (the vibes)
- Tag model with auto-lowercase, slug generation, and `kind` field (default "vibe" so user-created tags just work)
- django-filter integration: `?category=`, `?tags=` (AND logic via `conjoined=True`), `?ingredient=` (PostgreSQL jsonb EXISTS annotation), `?search=`, `?ordering=`
- Data migration expanding 10 categories to 15 (sandwich_burger, pizza, bowl, casserole_bake, side_dish, sauce_condiment added) with reversible RunPython
- Seed migration with 15 initial tags (8 cuisine, 3 dietary, 4 ingredient)
- GET /api/tags/ endpoint with `?kind=` and `?search=` params for frontend autocomplete
- Tag admin with kind filter, recipe admin with tag picker (`filter_horizontal`)
- RecipeSerializer read/write asymmetry: accepts tag name strings on write, returns full `{name, slug, kind}` objects on read
- Per-tag savepoints (`transaction.atomic()` inside the loop) for race condition safety on `get_or_create`
- CreateRecipePage completely overhauled: 4-section cognitive layout (Identity → Classification → Blueprint → Execution)
- Shadcn Select for category dropdown with human-readable labels
- TagInput component: debounced autocomplete from /api/tags/?search=, keyboard nav (arrows, enter, escape, backspace), removable Badge pills, novel tags accepted on Enter
- Frontend types updated: Tag interface, Recipe.tags optional field, 15-key categoryFallback map
- 64 backend tests passing (30 new), TypeScript clean
- Worktree-isolated development on `recipe-filtering` branch, fast-forward merged to master

---

## 2026-03-21 — Cart Animation & Minimal Default

**Focus**: The shopping cart and recipe page interaction with it needed soul and refinement. I want to implement a fun, simple animation that draws the user in to how powerful, slick, and sexy this website may be.

- Arc & Absorb animation: real ingredient emojis from recipes (not random ones) fly from the "Add to List" button into the cart basket along a bezier arc, staggered and stacking
- Badge enumerates (1, 2, 3...) as each emoji lands — not a jarring jump to the final count
- Emojis linger in the cart briefly before shrinking away — the dopamine hit of "stuff going in"
- Empty cart flourish: ghost cart floats up when you clear the list
- Capsule shake + cart icon wobble preserved from the original
- Switched default nav theme from fridge sticker to minimal
- Added `docs/visual-mockups/` convention — brainstorm mockups get saved as standalone HTML files you can open and share
- Iterated landing position until emojis drop right into the cart basket (human-tuned values!)

---

## 2026-03-15 — v0.4.3 Recipe Images + v0.4.4 Navbar Polish

**Focus**: Recipes needed more visual identity. The navbar needed to feel cleaner as well.

- Recipe hero images: upload, drag-and-drop, category-based emoji+gradient fallbacks
- B1 layout: title sits above the fused hero image + action strip
- RecipeCard thumbnails on the home feed
- Shopping list ingredient tooltips with nutritional info and tips
- B4a breathing badge: purple-blue glow + border tint on hover
- Combined mobile hamburger + badge capsule
- Compact CartCapsule with "Order now!" CTA for mobile
- Glass pill hamburger for logged-out users
- Theme switcher in dropdown menu
- Pop & Land emoji flair animation (first pass — later replaced by Arc & Absorb)
- shadcn/studio MCP integration for component tooling


---

## 2026-03-14 — v0.4.1 CartCapsule + Ingredient Emoji System

**Focus**: [The shopping cart is a central focus for user interaction and utility for the website. Need to focus on getting it to look clean and professional, at least for a baseline.]

- CartCapsule: 3-segment pill (Pickup | Delivery | Cart) with shimmer gradient
- Instacart deep links from the capsule
- Emoji auto-guessing for ingredients (`getIngredientEmoji` regex matcher)
- Categorized emoji picker on recipe create/edit
- Ingredient info tooltips (nutrition, tips)
- Emoji burst celebration on cart add (original random-emoji version)
- Shopping list feedback: persistent badge, smart button states


---

## 2026-03-08 — v0.4 Shopping List + Shopping Feedback

**Focus**: [human focus needed — what was the vision for the shopping list?]

- Shopping list backend: models, API views, add/clear/check endpoints
- Shopping list page: grouped by recipe, swipe-to-delete, recipe multiplier with ingredient scaling
- Inline Pickup/Delivery checkout buttons (Instacart)
- BuyNowSheet modal for instant purchase
- Cook Now mode with screen wake lock
- Inverted checkbox semantics: unchecked = need to buy
- Status endpoint for "already in list" badge
- Test Kitchen & Privacy design spec started


---

## 2026-02-17 — v0.3 Stir the Pot + Sharing + v0.3.1 Fridge Sticker NavBar

**Focus**: [human focus needed — what was the push behind sharing and the fridge sticker nav?]

- Stir the Pot: public explore feed
- Share modal: copy URL, QR code, WhatsApp deep link
- Fridge Sticker NavBar: cookbook tab stickers with steam particles
- Pro Fire Logo: spoon catches fire on hover
- Animated tabs with Framer Motion layoutId
- Mobile drawer with outside-click-to-close
- Widened content area for responsiveness


---

## 2026-02-16 — v0.2 Animated Header + v0.2 Improvements

**Focus**: [human focus needed — what needed fixing after v0.1?]

- Animated header with Framer Motion
- Ownership checks on recipe edit/delete
- Blank ingredient filtering
- Registration bug fix
- Back navigation
- Server status management script
- Core-flow context scope documentation


---

## 2026-02-15–16 — v0.1 Spoonfury Prototype

**Focus**: [human focus needed — what kicked off Spoonfury?]

- Django 5 + DRF backend with PostgreSQL
- React 19 + Vite + Tailwind 4 + Shadcn UI frontend
- Recipe CRUD with slug auto-generation and fork lineage
- Fork endpoint with ingredient change validation
- RecipeBook model with share links
- Custom User model
- Auth pages, NavBar, recipe page, fork modal, books pages
- Docker setup for Jetson deployment
- 16-task TDD implementation plan, executed start to finish

