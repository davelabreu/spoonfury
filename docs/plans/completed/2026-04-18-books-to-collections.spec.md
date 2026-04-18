# Books → Collections Rebrand + My Kitchen Integration

**Date:** 2026-04-18
**Status:** Design approved
**Version:** v0.10

---

## 1. Overview

Rebrand "Books" as "Collections" and absorb them into My Kitchen as a first-class section. Simplify the fork flow from a 2-click modal to a 1-click instant action with a smart toast.

### Goals
- Eliminate the redundant standalone `/books` page.
- Make Collections the first thing users see in My Kitchen.
- Reduce fork friction to a single click for the 90% case.
- Auto-create a "Forked Recipes" default collection so the fork flow always has a target.

### Non-Goals
- Backend model rename (`RecipeBook` stays as-is).
- Backend API URL rename (`/api/books/` stays — frontend abstracts this).
- Collection reordering or drag-and-drop (future).

---

## 2. UI Changes

### 2.1 My Kitchen — Collections Section (top of page)

Collections appear as a card grid at the top of the My Recipes tab, above the recipe pipeline (Test Kitchen → In Review → Published).

**Collection card:** Gradient background + title + recipe count. Clicking a card expands an inline preview below the grid.

**Inline preview:** Horizontal scrollable row of recipe thumbnails (image or category fallback). "View all →" link navigates to `/collections/:id` detail page. Click the card again (or another card) to collapse.

**"+ New" button:** Creates a new empty collection. Inline input field (same pattern as current BooksPage create form).

### 2.2 Collection Detail Page

Rebranded from BookDetailPage. Route changes from `/books/:id` to `/collections/:id`. Shared route changes from `/books/share/:token` to `/collections/share/:token`.

Functionality unchanged: recipe list, remove recipe, visibility toggle, share link. Adds "← Back to Kitchen" link.

### 2.3 Navigation

- Remove "My Books" sticker/link from NavBar entirely.
- Remove "My Books" from user dropdown menu.
- My Kitchen remains the single hub — collections are accessed from there.

### 2.4 Fork Flow (one-click with toast)

**Before:** Click Fork → modal appears → pick a book → confirm → forked.

**After:** Click Fork → instant fork to "Forked Recipes" → Sonner toast: `Saved to Forked Recipes | Change`. Clicking "Change" opens a compact popover/dropdown listing the user's collections. Selecting one moves the recipe to that collection instead.

The ForkModal Dialog is replaced by this toast + optional popover pattern.

If the fork API call fails, show an error toast instead.

### 2.5 Removed Pages

- `/books` (BooksPage) — removed. Collections live inside My Kitchen.
- `BooksPage.tsx` — deleted or repurposed.

---

## 3. Backend Changes

### 3.1 Default Collection on Registration

Auto-create a "Forked Recipes" `RecipeBook` for every new user on registration. Implementation: Django signal on `User` post_save (when `created=True`), or a one-time migration for existing users + signal for new ones.

The default collection should be identifiable — add a `is_default` BooleanField to `RecipeBook` (default `False`). The "Forked Recipes" collection gets `is_default=True`. This prevents accidental deletion and lets the fork endpoint find it reliably.

### 3.2 Fork Endpoint Default

Modify the fork endpoint: if no `book_id` is provided in the request body, look up the user's default collection (`RecipeBook.objects.get(owner=user, is_default=True)`) and add the forked recipe there automatically.

The frontend will stop sending `book_id` in the default case — it only sends one if the user picks a different collection via the toast's "Change" action.

### 3.3 Serializer

Add `is_default` to the `RecipeBookSerializer` so the frontend can identify and protect the default collection (e.g., prevent rename/delete of "Forked Recipes").

### 3.4 Migration for Existing Users

Data migration: for each existing user, `get_or_create` a "Forked Recipes" collection with `is_default=True`. Idempotent — safe to run multiple times.

---

## 4. Frontend Changes

### 4.1 New/Modified Components

| Component | Change |
|-----------|--------|
| `MyKitchenPage.tsx` | Add Collections section at top. Fetch `/api/books/`. Collection cards + inline expand. |
| `CollectionDetailPage.tsx` | Rename from `BookDetailPage.tsx`. Update labels from "book" to "collection". Add back link. |
| `ForkModal.tsx` | Replace with toast-based flow. No more Dialog. |
| `NavBar.tsx` | Remove "My Books" sticker and dropdown item. |
| `App.tsx` | Remove `/books` route. Add `/collections/:id` and `/collections/share/:token`. Redirect `/books/*` to `/collections/*` for bookmarks. |
| `RecipePage.tsx` | Fork button triggers instant API call + toast instead of opening modal. |

### 4.2 Toast System

Add Shadcn Sonner component (`npx shadcn@latest add sonner`). Mount `<Toaster />` in App.tsx layout. Use `toast()` from sonner for fork confirmation with custom action button.

### 4.3 Inline Collection Preview

State in MyKitchenPage: `expandedCollectionId`. When set, fetch the collection's recipes (or use already-fetched detail data) and render a horizontal scroll row below the card grid. Animate expand/collapse.

### 4.4 Types

Update `Book` interface — add `is_default: boolean`. Consider renaming to `Collection` in types.ts (non-breaking since it's internal).

---

## 5. Route Changes

| Old | New | Notes |
|-----|-----|-------|
| `/books` | removed | Absorbed into `/kitchen` |
| `/books/:id` | `/collections/:id` | Rebranded detail page |
| `/books/share/:token` | `/collections/share/:token` | Public shared view |

Backend API routes (`/api/books/`) remain unchanged.

---

## 6. UI Copy Changes

| Location | Old | New |
|----------|-----|-----|
| NavBar sticker | "My Books" | removed |
| NavBar dropdown | "My Books" | removed |
| ForkModal | "Save to book" | toast: "Saved to Forked Recipes" |
| ForkModal empty state | "Create my first book" | "Create my first collection" |
| BookDetailPage | "Remove recipe from book" | "Remove recipe from collection" |
| RecipePage | "Create a book first" | handled by auto-default — no empty state needed |
| My Kitchen | (new) | "My Collections" section header |

---

## 7. Edge Cases

- **User deletes "Forked Recipes" collection:** Prevent deletion of `is_default=True` collections in the backend. Return 400 with message.
- **User renames "Forked Recipes":** Allowed — the `is_default` flag identifies it, not the title.
- **User has no collections somehow:** Fork endpoint falls back to creating the default collection on the fly (`get_or_create`).
- **Existing bookmarks to `/books/...`:** App.tsx redirect catches these.
- **Toast dismissed before clicking "Change":** Recipe stays in Forked Recipes. User can move it from the collection detail page later.
- **"Change" action semantics:** Move, not copy. The recipe is removed from "Forked Recipes" and added to the selected collection. A recipe lives in one collection at a time (enforced by the existing `unique_together` on `BookRecipe`).
