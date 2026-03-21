# Animated Header & Responsive Nav Design

**Date**: 2026-02-16
**Status**: Approved

## Goal

Replace the plain `NavBar` with an animated, responsive navigation bar inspired by [mehrdadrafiee/animated-tabs](https://github.com/mehrdadrafiee/animated-tabs). Works on mobile (hamburger drawer) and desktop (animated tab indicators).

## Scope

- `frontend/src/components/NavBar.tsx` — full replacement
- `frontend/src/App.tsx` — bump `max-w-3xl` → `max-w-5xl` for responsive breathing room
- `frontend/package.json` — add `framer-motion`

## Animation Technique

Uses Framer Motion's `layoutId` pattern (same as animated-tabs repo):
- **Hover bubble**: A `motion.div` with `layoutId="hoverBubble"` renders inside the hovered tab. Framer Motion smoothly interpolates its position between tabs as the mouse moves.
- **Active underline**: A `motion.div` with `layoutId="activeUnderline"` renders inside the active tab (matched via `useLocation()`). Slides to the new tab on navigation.
- Both indicators animate with `type: "spring", stiffness: 300, damping: 30`.

## Desktop Layout (≥768px)

```
[ 🥄 Spoonfury ]     [ My Books ] [ + Recipe ]     [ @username  Sign out ]
       ←logo                ←tabs (animated)              ←identity/actions
```

- Nav tabs: `My Books` (`/books`), `+ Recipe` (`/recipes/new`)
- Identity area: `@username` (muted text) + `Sign out` (ghost button, no animation indicator)
- Active tab: persistent `bg-primary` underline bar (2px, rounded-full)
- Hovered tab: subtle `bg-muted` rounded pill behind text
- Tab text: `text-sm font-medium`, `text-muted-foreground` default → `text-foreground` on active/hover

## Mobile Layout (<768px)

- Header bar: logo left, `Menu`/`X` lucide icon right
- On open: `AnimatePresence` + `motion.div` drawer slides down (y: -8 → 0, opacity: 0 → 1, 200ms ease-out)
- Drawer content: full-width stacked links (My Books, + Recipe, username display, Sign out)
- Drawer closes automatically on any link click or Sign out

## Custom Hook

`useMediaQuery(query: string): boolean` — small hook (no extra dep) that wraps `window.matchMedia` with a resize listener. Used to toggle between desktop and mobile rendering.

## Responsive: `App.tsx`

Change `max-w-3xl` → `max-w-5xl` in the `<main>` wrapper to give content more room on wider screens.

## Dependencies

- Add `framer-motion` to `frontend/package.json` (peerDep compatible with React 19)

## Files Changed

| File | Change |
|------|--------|
| `frontend/package.json` | Add `framer-motion` |
| `frontend/src/components/NavBar.tsx` | Full replacement |
| `frontend/src/App.tsx` | `max-w-3xl` → `max-w-5xl` |
