# Fridge Sticker NavBar Implementation Plan

> **For Gemini:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the Soft Neo-brutalist "Fridge Sticker" NavBar with "Fury" animations.

---

## Task 1: Create NavSticker Component & Palette

**Files:**
- Modify: `frontend/src/components/NavBar.tsx`

**Step 1: Define the Sticker Palette**
Create a mapping of routes to their "Food Group" colors and optional icons.

**Step 2: Create the `NavSticker` component**
A functional component that wraps `Link` and handles the `framer-motion` logic (Lift, Shadow, Jitter).

**Step 3: Replace Desktop Mapping**
Replace the current Column 2 and Column 3 mapping with the new `NavSticker` component.

**Step 4: Verify Layout**
Open http://localhost:5173/ and ensure stickers look like "magnets on a fridge."

---

## Task 2: Implement "Fury" (Stirring) Animations

**Files:**
- Modify: `frontend/src/components/NavBar.tsx`

**Step 1: Add Jitter Keyframes**
Add a `transition` or `animate` prop to the `NavSticker` that triggers a subtle rotation jitter on hover.

**Step 2: Implement the "Pinned" Active State**
Ensure the active sticker stays lifted and has the larger shadow.

**Step 3: Verification**
Hover and click tabs—verify the "pop" and "jitter" feel responsive.

---

## Task 3: "Stir the Pot" Main Character Polish

**Files:**
- Modify: `frontend/src/components/NavBar.tsx`

**Step 1: Add the Spoon Icon**
Add a `Utensils` icon inside the "Stir the Pot" sticker.

**Step 2: Implement Animated Gradient**
Add a custom Tailwind class or inline style for the "Simmering Soup" gradient.

**Step 3: Add Steam Particles**
Use 2-3 small absolute-positioned `motion.span` elements that appear and float up on hover.

**Step 4: Verification**
Verify "Stir the Pot" looks and feels distinct from other stickers.

---

## Task 4: Mobile Drawer Stickers

**Files:**
- Modify: `frontend/src/components/NavBar.tsx`

**Step 1: Update Mobile Mapping**
Use the `NavSticker` (or a simplified mobile version) inside the `AnimatePresence` drawer.

**Step 2: Verify Mobile UI**
Verify stickers stack correctly in the mobile menu.

---

## Task 5: Cleanup & Commit

**Step 1: Remove Old Constants**
Clean up `AUTH_TABS`, `PUBLIC_TABS`, and the old `SPRING` constant if no longer needed.

**Step 2: Final Type Check**
`npm run build` to ensure no regressions.

**Step 3: Commit**
`git add . && git commit -m "feat(nav): implement Soft Neo-brutalist Fridge Sticker NavBar"`
