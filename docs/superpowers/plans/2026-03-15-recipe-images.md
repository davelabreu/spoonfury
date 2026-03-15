# v0.4.3 Recipe Image Upload & Display — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the recipe image experience — polished upload drop zone, image-forward recipe cards, and hero placeholders for missing images.

**Architecture:** Four independent frontend units: a shared `categoryFallback` utility, a rewritten `ImageUploadField` with drag-and-drop, a new `RecipeCard` component, and recipe page hero upgrades. No backend changes. Each unit can be built and visually tested independently.

**Tech Stack:** React 19, TypeScript, Tailwind 4, shadcn UI (`Card`, `Badge`, `Button`), existing `api.ts` upload utility.

**Spec:** `docs/superpowers/specs/2026-03-15-recipe-images-design.md`

**Branch:** `feature/v0.4.3-recipe-images` (worktree at `.worktrees/v0.4.3-recipe-images`)

**Code style:** Well-commented code throughout. Explain the "why" — state machines, fallback logic, mapping choices. The codebase owner wants to understand what's happening.

---

## Chunk 0: Worktree Setup

### Task 0: Create worktree and branch

- [ ] **Step 1: Create the feature branch and worktree**

```bash
cd G:/Projects/dev/1.work/Spoonfury
git worktree add .worktrees/v0.4.3-recipe-images -b feature/v0.4.3-recipe-images
```

- [ ] **Step 2: Install frontend dependencies in the worktree**

```bash
cd .worktrees/v0.4.3-recipe-images/frontend && npm install
```

- [ ] **Step 3: Verify the worktree is set up correctly**

```bash
cd .worktrees/v0.4.3-recipe-images && git branch --show-current
```
Expected: `feature/v0.4.3-recipe-images`

---

## Chunk 1: Foundation + Upload Field

### Task 1: Category Fallback Utility

**Files:**
- Create: `frontend/src/lib/categoryFallback.ts`

This is the shared dependency — build it first so both RecipeCard and RecipePage can import it.

- [ ] **Step 1: Create `categoryFallback.ts`**

Write the category-to-emoji+gradient mapping. The categories come from the Django model's `CATEGORY_CHOICES`: `soup`, `pasta`, `bake`, `salad`, `grill`, `breakfast`, `dessert`, `drink`, `snack`, `other`.

```typescript
/**
 * categoryFallback.ts
 *
 * Maps recipe categories to emoji + Tailwind gradient classes.
 * Used as a visual placeholder when a recipe has no image — both
 * in RecipeCard thumbnails and the RecipePage hero section.
 *
 * Categories match the Django model's CATEGORY_CHOICES exactly.
 * Unknown categories fall back to a neutral default.
 */

interface CategoryFallback {
  emoji: string;
  /** Tailwind gradient classes for the placeholder background */
  gradient: string;
}

/**
 * Each entry maps a lowercase category slug to its visual fallback.
 * Gradients are chosen to feel appetizing and category-appropriate.
 */
const CATEGORY_MAP: Record<string, CategoryFallback> = {
  pasta:     { emoji: "🍝", gradient: "from-orange-400 to-orange-600" },
  salad:     { emoji: "🥗", gradient: "from-green-400 to-green-600" },
  dessert:   { emoji: "🍰", gradient: "from-pink-300 to-pink-500" },
  soup:      { emoji: "🍲", gradient: "from-amber-400 to-amber-600" },
  breakfast: { emoji: "🍳", gradient: "from-yellow-300 to-yellow-500" },
  grill:     { emoji: "🥩", gradient: "from-red-400 to-red-600" },
  bake:      { emoji: "🍞", gradient: "from-amber-300 to-amber-500" },
  drink:     { emoji: "🍹", gradient: "from-cyan-400 to-cyan-600" },
  snack:     { emoji: "🍿", gradient: "from-violet-400 to-violet-600" },
  other:     { emoji: "🍽️", gradient: "from-slate-400 to-slate-500" },
};

/** Neutral fallback for categories not in the map */
const DEFAULT_FALLBACK: CategoryFallback = {
  emoji: "🍽️",
  gradient: "from-slate-400 to-slate-500",
};

/**
 * Get the emoji + gradient for a recipe category.
 * Case-insensitive lookup with a safe default.
 */
export function getCategoryFallback(category: string): CategoryFallback {
  return CATEGORY_MAP[category.toLowerCase()] ?? DEFAULT_FALLBACK;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `categoryFallback.ts`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/categoryFallback.ts
git commit -m "feat(recipes): add category fallback emoji+gradient utility"
```

---

### Task 2: ImageUploadField Rewrite

**Files:**
- Rewrite: `frontend/src/components/ImageUploadField.tsx`

Replace the current bare-bones text input + button with a unified drop zone. Same props API (`value`, `onChange`, `token`) — drop-in replacement.

**Important:** `CreateRecipePage.tsx` and `EditRecipePage.tsx` both use `<ImageUploadField value={...} onChange={...} token={...} />`. Do NOT change those files. The new component must accept the same props.

- [ ] **Step 1: Rewrite `ImageUploadField.tsx`**

The component has 5 visual states: idle, dragover, uploading, preview, error. Managed with a simple state machine via `useState`.

```typescript
import { useRef, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Camera, Trash2, Upload, Loader2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * ImageUploadField — unified drop zone for recipe hero photos.
 *
 * Supports two input methods:
 *   1. File upload (drag-and-drop or click-to-browse) — PRIMARY action
 *   2. URL paste — secondary, revealed via "or paste a URL" toggle
 *
 * Props API is unchanged from the previous version so CreateRecipePage
 * and EditRecipePage don't need any modifications.
 *
 * Visual states: idle → dragover → uploading → preview
 *                                 ↘ error → idle
 */

interface Props {
  value: string;
  onChange: (url: string) => void;
  token: string;
}

export function ImageUploadField({ value, onChange, token }: Props) {
  // --- State machine ---
  // `uploading` and `dragover` drive the visual state.
  // `value` being truthy means we're in "preview" state.
  const [uploading, setUploading] = useState(false);
  const [dragover, setDragover] = useState(false);
  const [error, setError] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file selection — from either the file picker or a drop event.
   * Uploads to the existing backend endpoint and calls onChange with the URL.
   */
  const uploadFile = useCallback(async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const res = await api.upload("/recipes/upload-image/", file, token);
      onChange(res.url);
    } catch {
      setError("Upload failed. Try again or paste a URL instead.");
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [token, onChange]);

  /** File input change handler — extracts the file and delegates to uploadFile */
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  // --- Drag-and-drop handlers ---
  // dragover state drives the visual "Drop it!" indicator
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragover(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragover(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      uploadFile(file);
    } else {
      setError("Please drop an image file (JPG, PNG, etc.).");
    }
  }, [uploadFile]);

  /** Remove the current image and reset to idle state */
  const handleRemove = () => {
    onChange("");
    setShowUrlInput(false);
    setError("");
  };

  // =====================
  // PREVIEW STATE — image is set, show it with a remove overlay
  // =====================
  if (value && !uploading) {
    return (
      <div className="space-y-2">
        <div className="relative rounded-xl overflow-hidden aspect-video w-full border group">
          <img
            src={value}
            alt="Recipe photo preview"
            className="w-full h-full object-cover"
            onError={() => setError("Image failed to load. Try a different URL or upload a file.")}
          />
          {/* Hover overlay with remove button */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRemove}
              className="opacity-0 group-hover:opacity-100 transition-opacity gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Remove photo
            </Button>
          </div>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  }

  // =====================
  // IDLE / DRAGOVER / UPLOADING STATE — show the drop zone
  // =====================
  return (
    <div className="space-y-2">
      {/* Drop zone — click to browse, drag to upload */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && fileRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={[
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer",
          // Visual state classes
          dragover
            ? "border-indigo-400 bg-indigo-50/50"
            : "border-muted-foreground/25 hover:border-muted-foreground/40 hover:bg-muted/30",
          uploading && "pointer-events-none opacity-60",
        ].filter(Boolean).join(" ")}
        style={{ minHeight: "180px" }}
      >
        {uploading ? (
          // UPLOADING state
          <>
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm font-medium text-muted-foreground">Uploading...</p>
          </>
        ) : dragover ? (
          // DRAGOVER state
          <>
            <Upload className="w-8 h-8 text-indigo-500" />
            <p className="text-sm font-medium text-indigo-600">Drop it!</p>
          </>
        ) : (
          // IDLE state — primary upload prompt
          <>
            <Camera className="w-8 h-8 text-muted-foreground/60" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                Drop your photo here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, WebP — recommended 16:9
              </p>
            </div>
          </>
        )}
        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Secondary action: URL paste toggle */}
      {!uploading && (
        <div className="text-center">
          {showUrlInput ? (
            <div className="flex gap-2 items-center">
              <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="url"
                className="border rounded-md px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="https://example.com/photo.jpg"
                autoFocus
                onPaste={(e) => {
                  // Grab the pasted text and set it immediately
                  const pasted = e.clipboardData.getData("text");
                  if (pasted.startsWith("http")) {
                    e.preventDefault();
                    onChange(pasted);
                  }
                }}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val.startsWith("http")) onChange(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val.startsWith("http")) onChange(val);
                  }
                }}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowUrlInput(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
            >
              or paste a URL
            </button>
          )}
        </div>
      )}

      {/* Error message */}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors. The component uses `lucide-react` icons (already a project dependency) and existing `api.ts`.

- [ ] **Step 3: Visual smoke test**

Start the dev server from the worktree and navigate to the create recipe page. Verify:
1. Drop zone renders with camera icon and "Drop your photo here" text
2. Clicking the zone opens the file picker
3. "or paste a URL" link reveals the URL input
4. Uploading a file shows the spinner then transitions to preview
5. Preview shows the image with a hover "Remove photo" button
6. Removing returns to idle state

Run:
```bash
cd .worktrees/v0.4.3-recipe-images/frontend && npm run dev
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ImageUploadField.tsx
git commit -m "feat(recipes): rewrite ImageUploadField with drag-and-drop drop zone

Upload is the primary action (drag-and-drop + click-to-browse).
URL paste is secondary, revealed via toggle link.
Same props API — no changes needed to create/edit pages."
```

---

## Chunk 2: RecipeCard + HomePage + Recipe Page Hero

### Task 3: RecipeCard Component + HomePage Integration

**Files:**
- Create: `frontend/src/components/RecipeCard.tsx`
- Modify: `frontend/src/pages/HomePage.tsx` (lines 22-36 — the recipe list)

- [ ] **Step 1: Create `RecipeCard.tsx`**

Compact horizontal card: thumbnail left, text right. Uses `getCategoryFallback` for the no-image placeholder.

```typescript
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { getCategoryFallback } from "@/lib/categoryFallback";
import { useState } from "react";

/**
 * RecipeCard — compact horizontal card for recipe listings.
 *
 * Layout: thumbnail on the left (~140px, shrinks to ~100px on mobile),
 * text content on the right (title, description, author, fork count).
 *
 * When the recipe has no image (or the image fails to load), we show
 * a category-themed emoji + gradient placeholder instead.
 */

interface RecipeCardProps {
  recipe: {
    slug: string;
    title: string;
    description: string;
    image_url: string;
    category: string;
    author_username: string;
    fork_count: number;
  };
}

/**
 * Format the fork count into a human-readable string.
 * "Forked once", "Forked 5 times", etc.
 */
function formatForkCount(count: number): string {
  if (count === 1) return "Forked once";
  return `Forked ${count} times`;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  const { slug, title, description, image_url, category, author_username, fork_count } = recipe;
  const fallback = getCategoryFallback(category);

  // Track whether the image failed to load — if so, show the placeholder
  const [imgError, setImgError] = useState(false);
  const showImage = image_url && !imgError;

  return (
    <Link
      to={`/recipes/${slug}`}
      className="flex rounded-xl overflow-hidden border hover:border-foreground/20 hover:shadow-sm transition-all"
    >
      {/* Left: thumbnail or category placeholder */}
      <div className="w-[100px] sm:w-[140px] shrink-0 relative">
        {showImage ? (
          <img
            src={image_url}
            alt={title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          // Placeholder: category emoji on a matching gradient background
          <div
            className={`w-full h-full bg-gradient-to-br ${fallback.gradient} flex items-center justify-center`}
          >
            <span className="text-3xl sm:text-4xl drop-shadow-sm">{fallback.emoji}</span>
          </div>
        )}
      </div>

      {/* Right: text content */}
      <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center min-w-0">
        {/* Title + category badge */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="font-semibold text-sm sm:text-base truncate">{title}</h2>
          <Badge variant="secondary" className="shrink-0 text-xs">{category}</Badge>
        </div>

        {/* Description — 2 line clamp so cards stay uniform height */}
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mb-2">
          {description}
        </p>

        {/* Author + fork count */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>by @{author_username}</span>
          {fork_count > 0 && (
            <span className="text-amber-600 font-medium">
              🍴 {formatForkCount(fork_count)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Update `HomePage.tsx` to use `RecipeCard`**

Replace the inline card markup with the new component. The page structure stays the same — just swap the map body.

**Imports change:**
- Remove: `Link` from `react-router-dom` (no longer used — `RecipeCard` handles its own link)
- Remove: `Badge` from `@/components/ui/badge` (no longer used — `RecipeCard` handles badges)
- Add: `RecipeCard` from `@/components/RecipeCard`

Full rewrite of `frontend/src/pages/HomePage.tsx`:

```typescript
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { RecipeCard } from "@/components/RecipeCard";

export function HomePage() {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/recipes/")
      .then(data => setRecipes(data.results || []))
      .catch(() => setError("Failed to load recipes. Try refreshing."));
  }, []);

  if (error) return <p className="text-destructive">{error}</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Latest Recipes</h1>
      <div className="space-y-3">
        {recipes.map((r: any) => (
          <RecipeCard key={r.slug} recipe={r} />
        ))}
        {recipes.length === 0 && (
          <p className="text-muted-foreground">No recipes yet. Be the first!</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 4: Visual smoke test**

Navigate to the home page. Verify:
1. Recipe cards show as compact horizontal layout
2. Recipes with images show the thumbnail on the left
3. Recipes without images show the emoji + gradient placeholder
4. Fork count shows "Forked X times" text
5. Cards are clickable and navigate to the recipe page
6. Cards look good on mobile (smaller thumbnail)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/RecipeCard.tsx frontend/src/pages/HomePage.tsx
git commit -m "feat(recipes): add RecipeCard component with image thumbnails

Compact horizontal card with image thumbnail (or category emoji
placeholder), description, fork count badge. Replaces text-only
cards on the home page."
```

---

### Task 4: Recipe Page Hero Upgrade

**Files:**
- Modify: `frontend/src/pages/RecipePage.tsx` (lines 124-133 — the hero image block)

- [ ] **Step 1: Update the hero image section in `RecipePage.tsx`**

Replace the conditional `{recipe.image_url && (...)}` block (lines 124-133) with a hero that always renders — either the real image or a category placeholder with optional "Add a photo" prompt for owners.

**Changes to make (3 edits to `RecipePage.tsx`):**

**Edit 1:** Add imports at the top of the file (after the existing imports, around line 16):

```typescript
import { getCategoryFallback } from "@/lib/categoryFallback";
import { Camera } from "lucide-react";
```

**Edit 2:** Add state declaration near the other `useState` calls (around line 37, after `const [inList, setInList] = useState(false);`):

```typescript
  // Tracks broken hero image URLs — falls back to category placeholder on error
  const [heroImgError, setHeroImgError] = useState(false);
```

Note: `useState` is already imported on line 1 — no change needed there.

**Edit 3:** Replace the hero image block (lines 124-133, the `{recipe.image_url && (...)}` conditional) with:

```typescript
      {/* Hero image — always rendered. Shows the actual image, or a category
          placeholder with an "Add a photo" prompt for owners. This prevents
          layout shift and encourages photo uploads. */}
      <div className="rounded-2xl overflow-hidden shadow-md aspect-video w-full relative">
        {recipe.image_url && !heroImgError ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover"
            onError={() => setHeroImgError(true)}
          />
        ) : (
          /* Category placeholder — emoji on gradient background */
          <div
            className={`w-full h-full bg-gradient-to-br ${getCategoryFallback(recipe.category).gradient} flex items-center justify-center`}
          >
            <span className="text-6xl sm:text-7xl drop-shadow-md">
              {getCategoryFallback(recipe.category).emoji}
            </span>
          </div>
        )}

        {/* Owner prompt: "Add a photo" overlay — only shown on the placeholder */}
        {isOwner && (!recipe.image_url || heroImgError) && (
          <Link
            to={`/recipes/${slug}/edit`}
            className="absolute bottom-0 inset-x-0 bg-black/40 backdrop-blur-sm text-white px-4 py-2.5 flex items-center gap-2 text-sm font-medium hover:bg-black/50 transition-colors"
          >
            <Camera className="w-4 h-4" />
            Add a photo to your recipe
          </Link>
        )}
      </div>
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors. New imports: `getCategoryFallback` from `@/lib/categoryFallback`, `Camera` from `lucide-react`.

- [ ] **Step 3: Visual smoke test**

Navigate to recipe pages and verify:
1. Recipe WITH image: hero shows the photo (same as before)
2. Recipe WITHOUT image: hero shows category emoji + gradient placeholder
3. Recipe WITHOUT image + you're the owner: "Add a photo" bar at bottom of placeholder
4. Recipe WITHOUT image + you're NOT the owner: just the placeholder, no prompt
5. Page layout is stable — no shift between states

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/RecipePage.tsx
git commit -m "feat(recipes): recipe page hero with category placeholder + owner prompt

Hero always renders — shows image or category emoji placeholder.
Owners see an 'Add a photo' prompt over the placeholder.
Broken image URLs fall back to the placeholder via onError."
```

---

## Post-Implementation

- [ ] **Final visual check**: Run both frontend and backend from the worktree. Walk through the full flow:
  1. Create a recipe without an image → verify placeholder on card + hero
  2. Edit recipe → upload an image via drop zone → verify preview
  3. Edit recipe → paste a URL → verify preview
  4. View recipe → verify hero image
  5. View recipe as non-owner → verify no "Add a photo" prompt
  6. Home page → verify all cards look consistent

- [ ] **Merge prep**: When ready, merge the worktree branch into master.
