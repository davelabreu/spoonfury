# v0.4.3 — Recipe Image Upload & Display Rework

**Date**: 2026-03-15
**Branch**: `feature/v0.4.3-recipe-images`
**Status**: Design approved

## Problem

The current recipe image experience has three gaps:

1. **Upload field** is bare-bones — a plain text input + "Upload" button. No drag-and-drop, no visual feedback, no clear distinction between file upload and URL paste.
2. **Recipe cards** on the home/explore page are text-only — no images at all. Recipes with great photos get no visual payoff in the listing.
3. **Recipe page hero** vanishes entirely when there's no image, leaving a jarring gap. No encouragement for owners to add a photo.

## Goals

- Users can **confidently upload an image or paste a URL** with clear visual feedback at every step.
- Recipe cards are **image-forward** — photos make the listing pop, and missing photos degrade gracefully.
- The recipe page hero **never leaves a blank gap** — placeholder for everyone, "add a photo" prompt for owners.
- **No backend changes** — same `image_url` URLField, same upload endpoint.
- **No breaking changes** — `ImageUploadField` keeps the same props API (`value`, `onChange`, `token`).

## Design

### 1. ImageUploadField Rework

**File**: `frontend/src/components/ImageUploadField.tsx` (rewrite)

Replace the current text input + button with a **unified drop zone** where upload is the primary action and URL paste is secondary.

**Layout**: Rectangular drop zone (~200px tall) with dashed border.

**States**:

| State | Visual | Behavior |
|-------|--------|----------|
| **Idle** | Dashed border, camera icon, "Drop your photo here or click to browse". Small "or paste a URL" link below. | Click opens file picker. Drag enters dragover state. Link click reveals URL input. |
| **Drag over** | Border goes solid indigo, background tints indigo-50, "Drop it!" text. | File drop triggers upload. |
| **Uploading** | Spinner/progress indicator, "Uploading..." text, interactions disabled. | Calls `api.upload()` to existing endpoint. |
| **Preview** | Uploaded/linked image fills the zone as `object-cover`. Hover overlay with trash icon to remove. URL input hidden. | Trash click clears value, returns to idle. |
| **Error** | Red border flash, error message below zone, reverts to idle. | Shown on upload failure or broken URL. |

**URL input behavior**: Clicking "or paste a URL" reveals a text input inline below the drop zone. On paste/blur, if the value looks like a URL, it's set immediately (preview state kicks in). The drop zone stays visible above so the user can always switch back to uploading.

**Props API unchanged**: `{ value: string, onChange: (url: string) => void, token: string }` — drop-in replacement. CreateRecipePage and EditRecipePage require zero changes.

### 2. RecipeCard Component

**File**: `frontend/src/components/RecipeCard.tsx` (new)

A **compact horizontal card** — thumbnail on the left, text on the right. Inspired by bistro template card patterns.

**Props**: Takes a recipe object matching the API list response shape (`slug`, `title`, `description`, `image_url`, `category`, `author_username`, `fork_count`).

**Layout**:
- Wrapped in `<Link to={/recipes/${slug}}>` for navigation
- **Left (thumbnail, ~140px wide)**:
  - If `image_url` exists: `<img>` with `object-cover`. `onError` falls back to placeholder.
  - If no image: Emoji + gradient placeholder from `categoryFallback.ts`
- **Right (text content)**:
  - Title (font-weight 700)
  - Description (1-2 line clamp via `line-clamp-2`)
  - Category badge (pill style)
  - Author (`by @username`)
  - Fork badge: `🍴 Forked 12 times` (or `Forked once`). Hidden when `fork_count` is 0.
- **Responsive**: Thumbnail shrinks to ~100px on mobile. Text truncates gracefully.

**Usage**: Replaces inline card markup in `HomePage.tsx` with `<RecipeCard recipe={r} />`. Reusable on book pages, search results, etc.

### 3. Recipe Page Hero Upgrade

**File**: `frontend/src/pages/RecipePage.tsx` (edit)

**When image exists**: Same `aspect-video`, `rounded-2xl`, `shadow-md`, `object-cover`. Add `onError` handler that falls back to the category placeholder (consistent with RecipeCard behavior for broken URLs).

**When no image**:
- **All users**: Emoji + gradient placeholder fills the same `aspect-video` space. Uses `categoryFallback.ts` for category-matched colors. Large centered emoji.
- **Owner overlay**: Semi-transparent bar at the bottom of the placeholder with camera icon and "Add a photo" text. Clicking navigates to `/recipes/${slug}/edit`.
- **Non-owners**: Just the placeholder, no prompt.

This keeps page layout stable — no layout shift whether there's an image or not.

### 4. Category Fallback System

**File**: `frontend/src/lib/categoryFallback.ts` (new)

Shared utility returning `{ emoji: string, gradient: string }` for a given category string. Case-insensitive lookup with a default fallback.

| Category | Emoji | Gradient |
|----------|-------|----------|
| Pasta | 🍝 | warm orange |
| Salad | 🥗 | fresh green |
| Dessert | 🍰 | soft pink |
| Soup | 🍲 | amber/brown |
| Breakfast | 🍳 | sunny yellow |
| Seafood | 🦐 | ocean blue |
| Meat | 🥩 | deep red |
| Vegetarian | 🥬 | leaf green |
| Default | 🍽️ | neutral slate |

**Used by**: `RecipeCard` thumbnail fallback, `RecipePage` hero fallback.

## Files Changed

| File | Action | Notes |
|------|--------|-------|
| `frontend/src/components/ImageUploadField.tsx` | Rewrite | Unified drop zone, same props API |
| `frontend/src/components/RecipeCard.tsx` | New | Compact horizontal card component |
| `frontend/src/lib/categoryFallback.ts` | New | Shared emoji + gradient mapping |
| `frontend/src/pages/HomePage.tsx` | Edit | Swap inline cards for `<RecipeCard>` |
| `frontend/src/pages/RecipePage.tsx` | Edit | Hero fallback + owner "Add a photo" prompt |

## Not In Scope

- **Backend changes** — no model, serializer, or endpoint modifications
- **Image cropping/resizing** — out of scope, keep it simple
- **URL validation** — trust + fallback; broken URLs show the placeholder
- **New dependencies** — use existing shadcn `Card`, `Badge`, `Button`
- **CreateRecipePage / EditRecipePage changes** — same `ImageUploadField` props, just looks better

## Code Style

- Clear comments throughout, especially on the upload field state machine and category mapping
- Well-commented code so the codebase owner can follow the logic
