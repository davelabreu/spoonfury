# Changelog

Dev log for Spoonfury. **Focus** statements are top-level human summaries of dev sessions. Below, AI dives what changed, why, and how it felt.

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

