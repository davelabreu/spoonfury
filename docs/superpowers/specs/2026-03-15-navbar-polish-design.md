# v0.4.4 — Navbar Polish

## Summary

Unified the minimal theme navbar with a cohesive glass pill design language, added breathing glow animation to the user badge, and optimized the mobile experience.

## Changes

### B4a Breathing Badge (desktop + mobile)
- **At rest**: Subtle purple-blue glow breathes behind the capsule badge (4s cycle, `#a78bfa` to `#60a5fa`, blur 6px)
- **On hover**: Glow intensifies (opacity 0.35, blur 8px), border tints purple (`#c4b5fd`), background brightens
- CSS classes: `.badge-wrap`, `.badge-glow`, `.badge-capsule` in `index.css`
- Keyframe: `badge-breathe` (opacity 0.1 → 0.22 → 0.1)

### Combined Mobile Hamburger + Badge
- Logged-in: hamburger icon integrated into the user badge capsule (`👨‍🍳 | @spoonfury | ≡`)
- Single tap target opens/closes the mobile nav
- Border tints violet when menu is open
- Breathing glow applies to the combined element
- Logged-out: standalone glass pill hamburger (rounded-full, backdrop-blur, subtle border)

### Compact CartCapsule for Mobile
- `CartCapsule` accepts `compact` prop — renders just "Order now!" + cart icon
- Retains all animations: shimmer gradient border, shake on add, emoji bursts, spring-animated count badge
- Pickup/Delivery segments hidden in compact mode
- Shows only when logged in with items in cart

### Theme Switcher Placement
- Moved into UsernameBadge dropdown menu (both themes) with Palette icon
- Logged-out users: standalone theme toggle button
- Mobile: theme switch in expanded nav menu

### Bug Fixes
- Fixed `@keyframes badge-shimmer` missing closing `}` that swallowed all subsequent CSS in `index.css`
- Fixed `load_dotenv` precedence: `backend/.env` (dev overrides) loads before root `.env` (prod defaults)

## Files Modified
- `frontend/src/components/NavBar.tsx` — UsernameBadge, CartCapsule, MinimalNav
- `frontend/src/index.css` — breathing glow keyframe + classes
- `backend/config/settings.py` — dotenv load order
