# Animated Header & Responsive Nav Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the plain NavBar with an animated, responsive navigation bar using Framer Motion's `layoutId` pattern, with a hamburger drawer on mobile.

**Architecture:** `NavBar.tsx` is a self-contained drop-in replacement. It reads the active route via `useLocation()`, renders desktop tabs with sliding Framer Motion indicators on ≥768px, and a hamburger-driven `AnimatePresence` drawer on <768px. A tiny `useMediaQuery` hook handles breakpoint detection.

**Tech Stack:** React 19, Framer Motion, Tailwind CSS 4, lucide-react, react-router-dom `useLocation`

**Design doc:** `docs/plans/2026-02-16-animated-header-design.md`

---

## Pre-flight

Before starting, verify the dev server runs:
```bash
cd frontend && npm run dev
# Should start Vite at http://localhost:5173 with no errors
```

---

### Task 1: Install framer-motion

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install the package**

```bash
cd frontend && npm install framer-motion
```

Expected: `framer-motion` appears in `package.json` dependencies, no peer-dep warnings.

**Step 2: Verify it imports cleanly**

Create a throwaway check — open `frontend/src/main.tsx` in your editor and add then immediately remove:
```ts
import { motion } from "framer-motion"; // add, verify no TS error, remove
```

**Step 3: Commit**

```bash
cd frontend && git add package.json package-lock.json
git commit -m "feat(deps): add framer-motion for animated nav"
```

---

### Task 2: Create `useMediaQuery` hook

**Files:**
- Create: `frontend/src/hooks/useMediaQuery.ts`

**Step 1: Write the hook**

Create `frontend/src/hooks/useMediaQuery.ts` with this exact content:

```ts
import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
```

**Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add frontend/src/hooks/useMediaQuery.ts
git commit -m "feat: add useMediaQuery hook"
```

---

### Task 3: Replace NavBar with animated desktop version

**Files:**
- Modify: `frontend/src/components/NavBar.tsx`

**Step 1: Write the new NavBar**

Replace the entire content of `frontend/src/components/NavBar.tsx` with:

```tsx
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Nav links shown when logged in
const AUTH_TABS = [
  { label: "My Books", to: "/books" },
  { label: "+ Recipe", to: "/recipes/new" },
];

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

export function NavBar() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleSignOut() {
    logout();
    navigate("/");
    setMobileOpen(false);
  }

  return (
    <nav className="border-b bg-background sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link
          to="/"
          className="text-xl font-bold tracking-tight flex-shrink-0"
          onClick={() => setMobileOpen(false)}
        >
          🥄 Spoonfury
        </Link>

        {isMobile ? (
          /* ── Mobile: hamburger button ── */
          <button
            className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        ) : (
          /* ── Desktop: animated tabs + identity ── */
          <div className="flex items-center gap-1">
            {username && (
              <div
                className="flex items-center gap-1"
                onMouseLeave={() => setHoveredTab(null)}
              >
                {AUTH_TABS.map((tab) => {
                  const isActive = location.pathname === tab.to;
                  return (
                    <Link
                      key={tab.to}
                      to={tab.to}
                      className="relative px-3 py-1.5 rounded-md text-sm font-medium outline-none"
                      onMouseEnter={() => setHoveredTab(tab.to)}
                    >
                      {/* Hover bubble */}
                      {hoveredTab === tab.to && (
                        <motion.span
                          layoutId="hoverBubble"
                          className="absolute inset-0 rounded-md bg-muted"
                          transition={SPRING}
                        />
                      )}
                      {/* Active underline */}
                      {isActive && (
                        <motion.span
                          layoutId="activeUnderline"
                          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-primary"
                          transition={SPRING}
                        />
                      )}
                      <span
                        className={`relative z-10 transition-colors ${
                          isActive
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tab.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Identity / auth actions */}
            <div className="flex items-center gap-2 ml-3">
              {username ? (
                <>
                  <span className="text-sm text-muted-foreground">
                    @{username}
                  </span>
                  <button
                    onClick={handleSignOut}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors px-3 py-1.5 rounded-md"
                  >
                    Join
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="border-t bg-background px-4 py-3 flex flex-col gap-1"
          >
            {username ? (
              <>
                <div className="text-sm text-muted-foreground px-2 py-1">
                  @{username}
                </div>
                {AUTH_TABS.map((tab) => (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-2 py-2 rounded-md text-sm font-medium transition-colors ${
                      location.pathname === tab.to
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.label}
                  </Link>
                ))}
                <button
                  onClick={handleSignOut}
                  className="text-left px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileOpen(false)}
                  className="block px-2 py-2 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Join
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
```

**Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Visual smoke test — desktop**

With `npm run dev` running, open http://localhost:5173.

Check:
- [ ] Logo shows left, nav items right
- [ ] Hovering "My Books" shows a muted pill that smoothly follows to "+ Recipe"
- [ ] Clicking "My Books" shows a small underline indicator that slides to "+ Recipe" if you click that
- [ ] Logged-out state shows "Sign in" + "Join" with no animation tabs

**Step 4: Visual smoke test — mobile**

Resize browser to <768px (or DevTools → mobile viewport).

Check:
- [ ] Only logo + hamburger icon visible
- [ ] Clicking hamburger slides down the drawer
- [ ] Clicking a link closes the drawer and navigates
- [ ] X icon shows when open, Menu icon when closed

**Step 5: Commit**

```bash
git add frontend/src/components/NavBar.tsx
git commit -m "feat(nav): animated tabs with Framer Motion layoutId"
```

---

### Task 4: Widen content area in App.tsx

**Files:**
- Modify: `frontend/src/App.tsx:18`

**Step 1: Change the max-width**

In `frontend/src/App.tsx`, find:
```tsx
<main className="max-w-3xl mx-auto px-4 py-8">
```

Replace with:
```tsx
<main className="max-w-5xl mx-auto px-4 py-8">
```

**Step 2: Visual check**

Reload http://localhost:5173. Content area should be visibly wider on a large monitor. Recipe cards and book lists should have more breathing room.

**Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(layout): widen content area to max-w-5xl for responsiveness"
```

---

### Task 5: Sticky nav + close-on-outside-click for mobile

**Files:**
- Modify: `frontend/src/components/NavBar.tsx`

The nav already has `sticky top-0 z-50` from Task 3. This task adds click-outside-to-close for the mobile drawer.

**Step 1: Add useEffect for outside clicks**

Inside the `NavBar` function, after the existing `useState` declarations, add:

```tsx
import { useState, useEffect, useRef } from "react";
```

Then add a ref and effect:

```tsx
const navRef = useRef<HTMLElement>(null);

useEffect(() => {
  if (!mobileOpen) return;
  function handleOutside(e: MouseEvent) {
    if (navRef.current && !navRef.current.contains(e.target as Node)) {
      setMobileOpen(false);
    }
  }
  document.addEventListener("mousedown", handleOutside);
  return () => document.removeEventListener("mousedown", handleOutside);
}, [mobileOpen]);
```

Attach the ref to the `<nav>` element:
```tsx
<nav ref={navRef} className="border-b bg-background sticky top-0 z-50">
```

**Step 2: TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

**Step 3: Visual check**

On mobile viewport: open the drawer, click outside it on the page — it should close.

**Step 4: Commit**

```bash
git add frontend/src/components/NavBar.tsx
git commit -m "feat(nav): close mobile drawer on outside click"
```

---

## Done

After all tasks, run a final check:

```bash
cd frontend && npm run build
```

Expected: build succeeds with no TypeScript errors or warnings.

The NavBar is now:
- Animated with Framer Motion `layoutId` (sliding hover bubble + active underline)
- Responsive: full tabs on desktop, hamburger drawer on mobile
- Sticky (stays at top while scrolling)
- Route-aware (active indicator tracks current page)
