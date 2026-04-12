# v0.85 Kitchen Controls

**Goal:** Make the My Kitchen page scale gracefully as the user's recipe collection grows, with lightweight sorting, a compact view option, and a warmer sharing experience.

**Scope:** Frontend-only. All changes are in `MyKitchenPage.tsx`. No backend changes needed — all data is already fetched (`page_size=200`) and sorting/grouping happens client-side.

**Visual mockups:** `docs/visual-mockups/v0.85-kitchen-controls/`

---

## 1. Per-Section Micro-Tab Sorting

A row of tiny underlined text tabs below each section header (Test Kitchen, Published). Each section sorts independently.

**Sort options:**
- **Newest** (default) — `created_at` descending, current behavior
- **A-Z** — alphabetical by `title`
- **Category** — group by `category`, A-Z within each group
- **Cuisine** — group by cuisine tag, A-Z within each group
- **Lifestyle** — group by lifestyle tag, A-Z within each group

**Grouping behavior:** When sorting by Category/Cuisine/Lifestyle, recipes are reordered so items sharing the same value are adjacent (A-Z within each group). No visual dividers for now — just reordering. Recipes with no matching tag for Cuisine/Lifestyle sort into an implicit "Other" group at the end.

**Style:** 10px text, spaced with `gap-12px`, sitting on a `border-bottom: 1px solid` line. Active tab gets `font-weight: 600` + `border-bottom: 2px solid` (matching the top-level My Recipes / Weekly Planner tab pattern at a smaller scale). Inactive tabs are `text-muted-foreground`.

**State:** Local `useState` per section. Not persisted — resets to "Newest" on page load.

---

## 2. Card / Compact View Toggle

A tiny segmented icon toggle in the section header row (far right). Each section (Test Kitchen, Published) has its own independent toggle.

**Icons:** Grid icon (card view, default) and list icon (compact view). Active icon gets a white background with subtle shadow; inactive is transparent.

**Card view:** Current layout — 72/88px thumbnail on left, title, description, status/category badges, gate checklist (Test Kitchen only), fork count.

**Compact view:** Dense single-line rows with 1px gap between them, rounded container. Each row contains:
- Category emoji (14px, 20px width)
- Recipe title (12px, font-weight 600, flex-1, truncate)
- Fork count if > 0 (`🍴 N`, 9px, amber)
- Category badge (9px pill, `background: muted`)
- Status badge (9px pill, same styling as card view)
- Gate score for Test Kitchen (9px, `3/4` format, `text-muted-foreground`)

**Mobile compact:** Drops the category badge to save space. Keeps emoji + title + fork count + status + gate score.

**State:** Local `useState` per section. Not persisted.

---

## 3. Collapsible Kitchen Invite

Replace the current always-visible invite box with a button in the Test Kitchen section header that expands an invite panel on click.

**Collapsed (default):** A small button in the header row: `💌 Invite a friend`. Styled with `border: 1px solid purple-200`, `bg-purple-50`, `text-purple-700`, `rounded-lg`, `text-10px font-semibold`. Sits between the draft count badge and the view toggle.

**Mobile:** On `xs` screens, the button text hides and only the `💌` icon shows.

**Expanded (on click):** A warm panel slides down between the header row and the sort tabs. Contains:
- Copy: "Invite someone to peek behind the curtain — they'll see your experiments before anyone else."
- Input + "Send" button (same functionality as current invite)
- Success/error message inline

**Animation:** Simple height transition, `animate-in fade-in`.

**Only appears in Test Kitchen section** — not in Published.

---

## Mobile Summary

- Sort micro-tabs: horizontal scroll if needed (unlikely — short words)
- Invite button: collapses to 💌 icon only on xs screens
- View toggle: unchanged (already compact)
- Compact view: drops category badge, keeps emoji + title + fork count + status + gate score
- Card view thumbnail: already responsive (72px → 88px)

---

## Out of Scope

- Visual group dividers for Category/Cuisine/Lifestyle sorting (deferred — revisit when we see real data)
- Persisting sort/view preferences (localStorage or backend)
- Ratings/spoon system surviving publish gate (tracked in TODO.md under Recipe Ratings & Comments)
- Any backend changes
