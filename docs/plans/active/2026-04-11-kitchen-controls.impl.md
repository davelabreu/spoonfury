# v0.85 Kitchen Controls — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-section micro-tab sorting, card/compact view toggle, and collapsible invite to the My Kitchen page.

**Architecture:** All changes are frontend-only in `MyKitchenPage.tsx`. Sorting, view mode, and invite collapse are local `useState` per section. The sort logic uses the existing `Recipe.tags` array (filtering by `tag.kind`) and `Recipe.category` field. No new dependencies.

**Tech Stack:** React 19, Tailwind 4, Lucide icons (`LayoutGrid`, `List`), existing `getCategoryFallback` utility.

---

### Task 1: Extract sorting utility function

**Files:**
- Modify: `frontend/src/pages/MyKitchenPage.tsx` (add `sortRecipes` function above `MyKitchenPage` component, ~line 80)

- [ ] **Step 1: Add the SortMode type and sortRecipes function**

Add this above the `RecipeCard` component definition (before line 82):

```tsx
type SortMode = "newest" | "az" | "category" | "cuisine" | "lifestyle";

const SORT_TABS: { key: SortMode; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "az", label: "A-Z" },
  { key: "category", label: "Category" },
  { key: "cuisine", label: "Cuisine" },
  { key: "lifestyle", label: "Lifestyle" },
];

function sortRecipes(recipes: Recipe[], mode: SortMode): Recipe[] {
  const sorted = [...recipes];
  switch (mode) {
    case "newest":
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case "az":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "category":
      return sorted.sort((a, b) => {
        const cmp = a.category.localeCompare(b.category);
        return cmp !== 0 ? cmp : a.title.localeCompare(b.title);
      });
    case "cuisine": {
      const getTag = (r: Recipe) =>
        r.tags?.find(t => t.kind === "cuisine")?.name ?? "\uffff";
      return sorted.sort((a, b) => {
        const cmp = getTag(a).localeCompare(getTag(b));
        return cmp !== 0 ? cmp : a.title.localeCompare(b.title);
      });
    }
    case "lifestyle": {
      const getTag = (r: Recipe) =>
        r.tags?.find(t => t.kind === "dietary")?.name ?? "\uffff";
      return sorted.sort((a, b) => {
        const cmp = getTag(a).localeCompare(getTag(b));
        return cmp !== 0 ? cmp : a.title.localeCompare(b.title);
      });
    }
    default:
      return sorted;
  }
}
```

Note: "Lifestyle" maps to `kind === "dietary"` because the Tag model uses `dietary` for lifestyle-oriented tags like "vegetarian", "vegan", "quick & easy". The `"\uffff"` sentinel sorts untagged recipes to the end.

- [ ] **Step 2: Verify build passes**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors (the function is defined but not yet called).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/MyKitchenPage.tsx
git commit -m "feat(kitchen): add sortRecipes utility for per-section sorting"
```

---

### Task 2: Add SortTabs component and wire up state

**Files:**
- Modify: `frontend/src/pages/MyKitchenPage.tsx`

- [ ] **Step 1: Add the SortTabs component**

Add this after the `sortRecipes` function:

```tsx
function SortTabs({ active, onChange }: { active: SortMode; onChange: (m: SortMode) => void }) {
  return (
    <div className="flex gap-3 border-b border-muted overflow-x-auto">
      {SORT_TABS.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`text-[10px] pb-1 whitespace-nowrap transition-colors ${
            active === tab.key
              ? "font-semibold text-foreground border-b-2 border-foreground -mb-px"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add sort state to MyKitchenPage**

Inside the `MyKitchenPage` component, after the existing `useState` declarations (~line 154), add:

```tsx
const [draftSort, setDraftSort] = useState<SortMode>("newest");
const [publishedSort, setPublishedSort] = useState<SortMode>("newest");
```

- [ ] **Step 3: Apply sorting to recipe lists**

Find where `drafts` and `published` are used in the JSX. Replace the direct usage with sorted versions. After the filter lines (~line 178), add:

```tsx
const sortedDrafts = sortRecipes(drafts, draftSort);
const sortedInReview = sortRecipes(inReview, draftSort);
const sortedInModeration = sortRecipes(inModeration, draftSort);
const sortedPublished = sortRecipes(published, publishedSort);
```

Then in the JSX:
- Replace `drafts.map(r =>` with `sortedDrafts.map(r =>`
- Replace `inReview.map(r =>` with `sortedInReview.map(r =>`
- Replace `inModeration.map(r =>` with `sortedInModeration.map(r =>`
- Replace `published.map(r =>` with `sortedPublished.map(r =>`
- Keep `drafts.length`, `inReview.length`, `inModeration.length`, `published.length` for the count badges (those should reflect total, not sorted count — they're the same, but semantically the unsorted array is clearer).

- [ ] **Step 4: Render SortTabs in both sections**

In the Test Kitchen section, add `<SortTabs>` after the section header `<div>` (after the closing `</div>` of the header row with the 🧪 emoji, ~line 244) and before the recipe list:

```tsx
<SortTabs active={draftSort} onChange={setDraftSort} />
```

In the Published section, add `<SortTabs>` after the Published header `<div>` (~line 325) and before the recipe list:

```tsx
<SortTabs active={publishedSort} onChange={setPublishedSort} />
```

Add a `mb-3` or wrap with a spacing div if needed to separate the tabs from the recipe cards below.

- [ ] **Step 5: Verify build passes**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Manual test in browser**

Start the dev server (`cd frontend && npm run dev`). Log in and navigate to `/kitchen`.
- Verify micro-tabs appear below "🧪 Test Kitchen" and "✅ Published" headings
- Click "A-Z" — recipes should reorder alphabetically
- Click "Newest" — should revert to chronological
- Click "Category" — recipes should group by category
- Verify each section sorts independently

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/MyKitchenPage.tsx
git commit -m "feat(kitchen): add per-section micro-tab sorting"
```

---

### Task 3: Add card/compact view toggle

**Files:**
- Modify: `frontend/src/pages/MyKitchenPage.tsx`

- [ ] **Step 1: Add lucide icon imports**

Update the import block at the top of the file. Add:

```tsx
import { LayoutGrid, List } from "lucide-react";
```

- [ ] **Step 2: Add ViewToggle component**

Add after the `SortTabs` component:

```tsx
type ViewMode = "card" | "compact";

function ViewToggle({ active, onChange }: { active: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-muted rounded-md p-0.5">
      <button
        onClick={() => onChange("card")}
        className={`p-1 rounded transition-all ${
          active === "card"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Card view"
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onChange("compact")}
        className={`p-1 rounded transition-all ${
          active === "compact"
            ? "bg-background shadow-sm text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
        title="Compact view"
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Add CompactRow component**

Add after `ViewToggle`:

```tsx
function CompactRow({ recipe, showGate }: { recipe: Recipe; showGate?: boolean }) {
  const gate = showGate ? getPublishGate(recipe) : null;
  const gateCount = gate ? Object.values(gate).filter(Boolean).length : null;
  const fallback = getCategoryFallback(recipe.category);

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="flex items-center gap-2.5 px-3 py-2 bg-background hover:bg-accent transition-colors"
    >
      <span className="text-sm w-5 text-center shrink-0">{fallback.emoji}</span>
      <span className="text-xs font-semibold flex-1 truncate">{recipe.title}</span>
      {recipe.fork_count > 0 && (
        <span className="text-[9px] text-amber-600 shrink-0">🍴 {recipe.fork_count}</span>
      )}
      <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground shrink-0 hidden sm:inline">
        {recipe.category.replace(/_/g, " ").split(" ")[0]}
      </span>
      <StatusBadge status={recipe.status} />
      {gateCount !== null && (
        <span className="text-[9px] text-muted-foreground shrink-0">{gateCount}/4</span>
      )}
    </Link>
  );
}
```

- [ ] **Step 4: Add view state to MyKitchenPage**

Inside `MyKitchenPage`, after the sort state declarations, add:

```tsx
const [draftView, setDraftView] = useState<ViewMode>("card");
const [publishedView, setPublishedView] = useState<ViewMode>("card");
```

- [ ] **Step 5: Add ViewToggle to section headers**

In the Test Kitchen section header row (the `<div>` with 🧪), add `ViewToggle` at the far right. The header row should become:

```tsx
<div className="flex items-center gap-3 mb-2">
  <h2 className="text-xl font-bold">🧪 Test Kitchen</h2>
  <Badge variant="outline" className="font-mono">{drafts.length} draft{drafts.length !== 1 ? "s" : ""}</Badge>
  <div className="ml-auto flex items-center gap-2">
    {/* Invite button will go here in Task 4 */}
    <ViewToggle active={draftView} onChange={setDraftView} />
  </div>
</div>
```

In the Published section header row, same pattern:

```tsx
<div className="flex items-center gap-3 mb-2">
  <h2 className="text-xl font-bold">✅ Published</h2>
  <Badge variant="outline" className="font-mono">{published.length} recipe{published.length !== 1 ? "s" : ""}</Badge>
  <div className="ml-auto">
    <ViewToggle active={publishedView} onChange={setPublishedView} />
  </div>
</div>
```

- [ ] **Step 6: Render card or compact view based on state**

Replace the Test Kitchen recipe list. Where you currently have:

```tsx
<div className="space-y-3">
  {sortedDrafts.map(r => (
    <RecipeCard key={r.slug} recipe={r} showGate />
  ))}
</div>
```

Replace with:

```tsx
{draftView === "card" ? (
  <div className="space-y-3">
    {sortedDrafts.map(r => (
      <RecipeCard key={r.slug} recipe={r} showGate />
    ))}
  </div>
) : (
  <div className="flex flex-col gap-px bg-muted rounded-lg overflow-hidden">
    {sortedDrafts.map(r => (
      <CompactRow key={r.slug} recipe={r} showGate />
    ))}
  </div>
)}
```

Do the same for the In Review section (`sortedInReview`, no `showGate`), In Moderation section (`sortedInModeration`, no `showGate`), and Published section (`sortedPublished`, `publishedView`, no `showGate`).

- [ ] **Step 7: Verify build passes**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 8: Manual test in browser**

- Toggle between card and compact views in both sections
- Verify compact rows show: emoji, title, fork count (if > 0), category badge (hidden on mobile), status badge, gate score (Test Kitchen only)
- Verify sorting still works in compact view
- Resize browser to mobile width — category badge should hide

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/MyKitchenPage.tsx
git commit -m "feat(kitchen): add card/compact view toggle with CompactRow"
```

---

### Task 4: Collapsible invite panel

**Files:**
- Modify: `frontend/src/pages/MyKitchenPage.tsx`

- [ ] **Step 1: Add invite collapse state**

Inside `MyKitchenPage`, after the view state declarations, add:

```tsx
const [inviteOpen, setInviteOpen] = useState(false);
```

- [ ] **Step 2: Add invite button to the Test Kitchen header**

In the Test Kitchen header row, insert the invite button before the `ViewToggle` (inside the `ml-auto` div added in Task 3):

```tsx
<div className="ml-auto flex items-center gap-2">
  <button
    onClick={() => setInviteOpen(o => !o)}
    className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
      inviteOpen
        ? "bg-purple-100 text-purple-800 border border-purple-300"
        : "bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"
    }`}
  >
    <span>💌</span>
    <span className="hidden sm:inline">Invite a friend</span>
  </button>
  <ViewToggle active={draftView} onChange={setDraftView} />
</div>
```

- [ ] **Step 3: Add the collapsible invite panel**

Between the header row and the `<SortTabs>`, add the expandable panel:

```tsx
{inviteOpen && (
  <div className="animate-in fade-in slide-in-from-top-1 duration-300 p-3 bg-purple-50/50 border border-purple-100 rounded-lg">
    <p className="text-[11px] text-purple-700 mb-2">
      Invite someone to peek behind the curtain — they'll see your experiments before anyone else.
    </p>
    <div className="flex gap-2">
      <input
        className="bg-background border border-purple-200 rounded-lg px-3 py-1.5 text-sm flex-1 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
        placeholder="Enter their username..."
        value={inviteUsername}
        onChange={e => setInviteUsername(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleInvite()}
      />
      <Button
        size="sm"
        onClick={handleInvite}
        disabled={!inviteUsername.trim()}
        className="rounded-lg bg-purple-600 hover:bg-purple-700"
      >
        Send
      </Button>
    </div>
    {inviteMsg && (
      <p className="text-[10px] font-medium text-purple-600 mt-1.5 animate-in fade-in">
        {inviteMsg}
      </p>
    )}
  </div>
)}
```

- [ ] **Step 4: Remove the old invite box**

Delete the old "Kitchen sharing" `<div>` block. This is the block starting with:

```tsx
{/* Kitchen sharing */}
<div className="mt-6 p-4 bg-muted/30 rounded-xl border border-muted/50">
```

Remove the entire block through its closing `</div>` (currently ~lines 262–284).

- [ ] **Step 5: Verify build passes**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Manual test in browser**

- Verify "💌 Invite a friend" button appears in the Test Kitchen header
- Click it — panel slides down with warm copy and input
- Click again — panel collapses
- On mobile width — button should show only 💌 icon, no text
- Submit an invite — success/error message appears inline
- Verify the old invite box is gone
- Verify the Published section does NOT have the invite button

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/MyKitchenPage.tsx
git commit -m "feat(kitchen): collapsible invite panel with warm copy"
```

---

### Task 5: Final polish and empty states

**Files:**
- Modify: `frontend/src/pages/MyKitchenPage.tsx`

- [ ] **Step 1: Handle empty sections gracefully**

When a section has 0 recipes, the sort tabs and view toggle should still render (so the UI doesn't jump when recipes are added), but the empty state message should appear below them. Verify this is already the case — the empty state `<div>` renders inside the conditional `drafts.length === 0` block, which is below the sort tabs. If the sort tabs are outside the conditional, this should work. If not, restructure so the section always renders: header → sort tabs → (recipes or empty state).

- [ ] **Step 2: Ensure compact view empty state**

Both view modes should show the same empty state (the dashed border message). The card/compact conditional should wrap only the recipe list, not the empty state. The structure should be:

```tsx
{sortedDrafts.length === 0 ? (
  <div className="p-8 text-center bg-muted/20 rounded-xl border border-dashed">
    <p className="text-sm text-muted-foreground">
      No recipes in the test kitchen.{" "}
      <Link to="/recipes/new" className="text-primary hover:underline font-medium">Create one</Link> to get started.
    </p>
  </div>
) : draftView === "card" ? (
  <div className="space-y-3">
    {sortedDrafts.map(r => (
      <RecipeCard key={r.slug} recipe={r} showGate />
    ))}
  </div>
) : (
  <div className="flex flex-col gap-px bg-muted rounded-lg overflow-hidden">
    {sortedDrafts.map(r => (
      <CompactRow key={r.slug} recipe={r} showGate />
    ))}
  </div>
)}
```

Apply the same pattern for the Published section.

- [ ] **Step 3: Add spacing between sort tabs and recipes**

Ensure there's a `mb-3` on the `<SortTabs>` wrapper or a `mt-3` on the recipe list, so the sort tabs don't sit flush against the cards.

- [ ] **Step 4: Verify build passes**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Full manual test checklist**

Test all features together:

1. **Sort tabs:** Click each tab in Test Kitchen — recipes reorder. Click each tab in Published — recipes reorder independently.
2. **View toggle:** Switch to compact in Test Kitchen — dense rows appear. Switch to compact in Published — same. Switch back to card — thumbnails return.
3. **Sort + view:** Sort by A-Z, then switch to compact. Recipes should stay A-Z in compact view. Switch sort to Category — compact rows reorder by category.
4. **Invite:** Click 💌 — panel expands. Enter username, press Enter or click Send. Success message appears. Click 💌 again — panel collapses.
5. **Mobile:** Resize to ~375px width. Invite button shows only 💌. Compact rows hide category badge. Sort tabs don't overflow (or scroll horizontally).
6. **Empty states:** If either section has 0 recipes, the empty state message shows below the sort tabs.
7. **Fork count:** Verify fork count badge (`🍴 N`) appears in both card and compact views for recipes with forks > 0.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/MyKitchenPage.tsx
git commit -m "feat(kitchen): polish empty states and spacing for v0.85"
```

---

### Post-Implementation

After all tasks pass, update `CLAUDE.md` to reflect the plan has an impl file:

```
| v0.85 Kitchen Controls | `active/2026-04-11-kitchen-controls.spec.md` | `active/2026-04-11-kitchen-controls.impl.md` |
```

Do NOT merge to master. Remind the human to test in the browser first.
