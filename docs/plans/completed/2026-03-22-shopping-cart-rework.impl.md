# Shopping Cart Rework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the checklist ShoppingListPage with a professional two-column checkout experience featuring accordion recipe cards and a receipt-styled invoice sidebar.

**Architecture:** Frontend-only change. New pricing/rating mock helpers in `lib/`, refactored page component split into focused sub-components, Shadcn UI for structure. No backend changes.

**Tech Stack:** React 19, Tailwind 4, Shadcn UI (Card, Button, Tooltip), existing ShoppingContext + API layer.

**Visual Reference:** `docs/visual-lockups/shopping_cart_rework.html` — Stage 4 is the build target.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `frontend/src/lib/pricing.ts` | `getEstimatedPrice()`, `getMockedRating()`, fee constants, tax calculation |
| Create | `frontend/src/components/checkout/ForkMultiplier.tsx` | Fork-emoji multiplier widget (replaces MultiplierWidget) |
| Create | `frontend/src/components/checkout/IngredientRow.tsx` | Single ingredient row: emoji, name, qty, price, tooltip, swipe-to-delete |
| Create | `frontend/src/components/checkout/RecipeCard.tsx` | Accordion card: header (thumb + title + rating + multiplier), ingredient rows, subtotal |
| Create | `frontend/src/components/checkout/ReceiptSidebar.tsx` | Fulfillment toggle, mini previews, monospace receipt summary, checkout CTA |
| Modify | `frontend/src/pages/ShoppingListPage.tsx` | Full rewrite: two-column grid layout composing the above components |
| — | `frontend/src/lib/instacart.ts` | No changes needed (existing URL builder works as-is) |
| — | `frontend/src/types.ts` | No changes needed (existing types sufficient) |

---

### Task 1: Pricing & Rating Mock Helpers

**Files:**
- Create: `frontend/src/lib/pricing.ts`

- [ ] **Step 1: Create the pricing helper module**

```typescript
// frontend/src/lib/pricing.ts

/**
 * Deterministic mock pricing for ingredients.
 * Uses simple string hashing so the same ingredient always gets the same price.
 * Range: $0.49 – $12.99
 */
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getEstimatedPrice(ingredientName: string): number {
  const hash = hashString(ingredientName.toLowerCase().trim());
  const price = 0.49 + (hash % 1250) / 100; // $0.49 – $12.99
  return Math.round(price * 100) / 100;
}

/**
 * Deterministic mock rating for a recipe.
 * Returns 3.5 – 5.0 based on slug hashing.
 */
export function getMockedRating(recipeSlug: string): number {
  const hash = hashString(recipeSlug);
  const rating = 3.5 + (hash % 16) / 10; // 3.5 – 5.0
  return Math.round(rating * 10) / 10;
}

/** Renders N filled spoons + remainder empty. Max 5. */
export function renderSpoonRating(rating: number): string {
  const full = Math.floor(rating);
  const spoons = "🥄".repeat(full);
  return `${spoons} ${rating.toFixed(1)}`;
}

// ── Fee schedule ──
export const FEES = {
  pickup: 1.99,
  delivery: 5.99,
  taxRate: 0.085,
} as const;

export type Fulfillment = "pickup" | "delivery";

export function calculateSummary(
  recipeSubtotals: { slug: string; title: string; multiplier: number; subtotal: number }[],
  fulfillment: Fulfillment
) {
  const subtotal = recipeSubtotals.reduce((sum, r) => sum + r.subtotal, 0);
  const tax = Math.round(subtotal * FEES.taxRate * 100) / 100;
  const fee = FEES[fulfillment];
  const total = Math.round((subtotal + tax + fee) * 100) / 100;
  return { subtotal, tax, fee, total, fulfillment };
}
```

- [ ] **Step 2: Verify module compiles**

Run: `cd frontend && npx tsc --noEmit src/lib/pricing.ts`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/pricing.ts
git commit -m "feat(checkout): add mocked pricing, rating, and fee helpers"
```

---

### Task 2: ForkMultiplier Widget

**Files:**
- Create: `frontend/src/components/checkout/ForkMultiplier.tsx`

- [ ] **Step 1: Create the fork multiplier component**

```tsx
// frontend/src/components/checkout/ForkMultiplier.tsx
import { Minus, Trash2, Plus } from "lucide-react";

interface ForkMultiplierProps {
  multiplier: number;
  onDecrement: () => void;
  onIncrement: () => void;
  recipeTitle: string;
}

export function ForkMultiplier({ multiplier, onDecrement, onIncrement, recipeTitle }: ForkMultiplierProps) {
  return (
    <div className="flex items-center bg-muted rounded-lg overflow-hidden shrink-0">
      <button
        type="button"
        onClick={onDecrement}
        className="px-2 py-1.5 hover:bg-muted-foreground/10 transition-colors"
        aria-label={multiplier > 1
          ? `Decrease ${recipeTitle} to ${multiplier - 1}`
          : `Remove ${recipeTitle} from shopping list`}
      >
        {multiplier > 1
          ? <Minus className="w-3.5 h-3.5 text-muted-foreground" />
          : <Trash2 className="w-3.5 h-3.5 text-destructive" />}
      </button>
      <span className="px-2 py-1.5 text-sm font-bold text-amber-500 min-w-[3rem] text-center select-none">
        🍴 {multiplier}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        className="px-2 py-1.5 hover:bg-muted-foreground/10 transition-colors"
        aria-label={`Increase ${recipeTitle} to ${multiplier + 1}`}
      >
        <Plus className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/checkout/ForkMultiplier.tsx
git commit -m "feat(checkout): fork multiplier widget with 🍴 styling"
```

---

### Task 3: IngredientRow Component

**Files:**
- Create: `frontend/src/components/checkout/IngredientRow.tsx`

This extracts and adapts the existing `ItemRow` from `ShoppingListPage.tsx`. Preserves: swipe-to-delete, health tip tooltip, emoji tile. Adds: mocked price column.

- [ ] **Step 1: Create the ingredient row component**

```tsx
// frontend/src/components/checkout/IngredientRow.tsx
import { useRef } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2 } from "lucide-react";
import { getIngredientEmoji } from "@/lib/ingredientEmoji";
import { getIngredientInfo } from "@/lib/ingredientInfo";
import { getEstimatedPrice } from "@/lib/pricing";
import type { ShoppingItem } from "@/types";

const TOOLTIP_CONTENT_CLASS =
  "max-w-sm p-0 text-pretty bg-neutral-100 text-neutral-950 border border-neutral-300 shadow-lg rounded-xl overflow-hidden [&>svg]:bg-neutral-100 [&>svg]:fill-neutral-100 [&>svg]:size-4 [&>svg]:translate-y-[calc(-50%_-_1px)]";

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

interface IngredientRowProps {
  item: ShoppingItem;
  multiplier?: number;
  onDelete: (item: ShoppingItem) => void;
  onToggle: (item: ShoppingItem) => void;
}

export function IngredientRow({ item, multiplier = 1, onDelete, onToggle }: IngredientRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const swiping = useRef(false);

  // ── Swipe-to-delete (mobile) ──
  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
    swiping.current = true;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!swiping.current || !rowRef.current) return;
    const dx = e.touches[0].clientX - startX.current;
    currentX.current = Math.min(0, dx);
    rowRef.current.style.transform = `translateX(${currentX.current}px)`;
    rowRef.current.style.transition = "none";
    const progress = Math.min(1, Math.abs(currentX.current) / 80);
    rowRef.current.style.backgroundColor = `rgba(239, 68, 68, ${progress * 0.15})`;
  };
  const onTouchEnd = () => {
    if (!swiping.current || !rowRef.current) return;
    swiping.current = false;
    rowRef.current.style.transition = "transform 0.2s ease-out, background-color 0.2s ease-out";
    if (currentX.current < -80) {
      rowRef.current.style.transform = "translateX(-100%)";
      rowRef.current.style.backgroundColor = "rgba(239, 68, 68, 0.3)";
      setTimeout(() => onDelete(item), 200);
    } else {
      rowRef.current.style.transform = "translateX(0)";
      rowRef.current.style.backgroundColor = "";
    }
  };

  const rawEmoji = getIngredientEmoji(item.name);
  const emoji = rawEmoji !== "🛒" ? rawEmoji : "";
  const info = getIngredientInfo(item.name);
  const price = getEstimatedPrice(item.name);

  const qty = item.quantity
    ? (multiplier > 1 && !isNaN(Number(item.quantity))
        ? String(Number(item.quantity) * multiplier)
        : item.quantity)
    : "";

  const tooltipInner = info ? (
    <div className="flex">
      <div className="w-1 shrink-0 bg-indigo-400 rounded-l-xl" />
      <div className="px-3 py-2.5 space-y-1.5">
        <div>
          <p className="text-sm font-semibold">{emoji || "🛒"} {item.name}</p>
          <p className="text-[10px] text-neutral-500 leading-tight mt-0.5">{info.description}</p>
        </div>
        {info.nutrition && (
          <p className="text-xs leading-snug">
            <span className="font-semibold text-green-700">🌱 Health: </span>
            <span className="text-neutral-700">{info.nutrition}</span>
          </p>
        )}
        {info.tip && (
          <p className="text-xs leading-snug">
            <span className="font-semibold text-amber-600">✦ Tip: </span>
            <span className="text-neutral-700">{info.tip}</span>
          </p>
        )}
      </div>
    </div>
  ) : null;

  const emojiTile = (
    <div className={`w-7 h-7 flex items-center justify-center text-base shrink-0 rounded-lg select-none ${item.is_checked ? "bg-muted/30" : "bg-muted/50"}`}>
      {emoji || "🛒"}
    </div>
  );

  const nameAndQty = (
    <div className="flex flex-col min-w-0 flex-1">
      <span className={`text-sm leading-tight ${item.is_checked ? "line-through text-muted-foreground opacity-60" : ""}`}>
        {titleCase(item.name)}
      </span>
      {(qty || item.note) && (
        <span className="text-xs text-muted-foreground mt-0.5">
          {qty && <>{qty}{item.unit ? ` ${item.unit}` : ""}</>}
          {qty && item.note && " · "}
          {item.note}
        </span>
      )}
    </div>
  );

  const content = (
    <div className="flex items-center gap-2.5 flex-1 min-w-0">
      {emojiTile}
      {nameAndQty}
    </div>
  );

  return (
    <div
      ref={rowRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="flex items-center gap-2 py-1.5 px-3 border-b border-border/30 last:border-b-0"
    >
      <input
        type="checkbox"
        checked={item.is_checked}
        onChange={() => onToggle(item)}
        className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer shrink-0"
        aria-label={`Mark ${item.name} as picked up`}
      />
      {info ? (
        <div className="flex-1 min-w-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <div tabIndex={0} className="cursor-default outline-none inline-flex">{content}</div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={14} className={TOOLTIP_CONTENT_CLASS}>
              {tooltipInner}
            </TooltipContent>
          </Tooltip>
        </div>
      ) : <div className="flex-1 min-w-0">{content}</div>}
      <span className="text-sm font-semibold text-amber-500 min-w-[3rem] text-right tabular-nums">
        ${price.toFixed(2)}
      </span>
      <button
        type="button"
        onClick={() => onDelete(item)}
        className="trash-shake p-1 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
        aria-label={`Remove ${item.name}`}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/checkout/IngredientRow.tsx
git commit -m "feat(checkout): ingredient row with price, tooltip, swipe-to-delete"
```

---

### Task 4: RecipeCard Component

**Files:**
- Create: `frontend/src/components/checkout/RecipeCard.tsx`

- [ ] **Step 1: Create the recipe card component**

```tsx
// frontend/src/components/checkout/RecipeCard.tsx
import { Link } from "react-router-dom";
import { getCategoryFallback } from "@/lib/categoryFallback";
import { getMockedRating, renderSpoonRating, getEstimatedPrice } from "@/lib/pricing";
import { ForkMultiplier } from "./ForkMultiplier";
import { IngredientRow } from "./IngredientRow";
import type { RecipeGroup, ShoppingItem } from "@/types";

interface RecipeCardProps {
  group: RecipeGroup;
  brokenThumbs: Set<string>;
  onBrokenThumb: (slug: string) => void;
  onUpdateMultiplier: (slug: string, multiplier: number) => void;
  onRemoveRecipe: (slug: string) => void;
  onDeleteItem: (item: ShoppingItem) => void;
  onToggleItem: (item: ShoppingItem) => void;
}

export function RecipeCard({
  group, brokenThumbs, onBrokenThumb,
  onUpdateMultiplier, onRemoveRecipe, onDeleteItem, onToggleItem,
}: RecipeCardProps) {
  const rating = getMockedRating(group.recipe_slug);
  const fb = getCategoryFallback(group.recipe_category ?? "other");

  const recipeSubtotal = group.items.reduce(
    (sum, item) => sum + getEstimatedPrice(item.name), 0
  ) * group.multiplier;

  return (
    <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-dashed border-border/50">
        <Link to={`/recipes/${group.recipe_slug}`} className="shrink-0">
          {group.recipe_image_url && !brokenThumbs.has(group.recipe_slug) ? (
            <img
              src={group.recipe_image_url}
              alt=""
              className="w-10 h-10 rounded-lg object-cover"
              onError={() => onBrokenThumb(group.recipe_slug)}
            />
          ) : (
            <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-gradient-to-br ${fb.gradient}`}>
              {fb.emoji}
            </span>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/recipes/${group.recipe_slug}`} className="text-sm font-bold hover:underline">
            {group.recipe_title}
          </Link>
          <div className="text-xs text-amber-500">{renderSpoonRating(rating)}</div>
        </div>
        <ForkMultiplier
          multiplier={group.multiplier}
          onDecrement={() => group.multiplier > 1
            ? onUpdateMultiplier(group.recipe_slug, group.multiplier - 1)
            : onRemoveRecipe(group.recipe_slug)}
          onIncrement={() => onUpdateMultiplier(group.recipe_slug, group.multiplier + 1)}
          recipeTitle={group.recipe_title}
        />
      </div>

      {/* Ingredient rows */}
      <div>
        {group.items.map(item => (
          <IngredientRow
            key={item.id}
            item={item}
            multiplier={group.multiplier}
            onDelete={onDeleteItem}
            onToggle={onToggleItem}
          />
        ))}
      </div>

      {/* Subtotal */}
      <div className="flex justify-between items-center px-3 py-2 border-t border-dashed border-border/50 text-sm">
        <span className="text-muted-foreground">Recipe subtotal</span>
        <span className="font-semibold text-amber-500">${recipeSubtotal.toFixed(2)}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/checkout/RecipeCard.tsx
git commit -m "feat(checkout): recipe card with header, ingredients, subtotal"
```

---

### Task 5: ReceiptSidebar Component

**Files:**
- Create: `frontend/src/components/checkout/ReceiptSidebar.tsx`

- [ ] **Step 1: Create the receipt sidebar component**

```tsx
// frontend/src/components/checkout/ReceiptSidebar.tsx
import { getCategoryFallback } from "@/lib/categoryFallback";
import { getEstimatedPrice, calculateSummary, FEES } from "@/lib/pricing";
import { buildInstacartUrl } from "@/lib/instacart";
import type { Fulfillment } from "@/lib/pricing";
import type { RecipeGroup, Ingredient } from "@/types";

interface ReceiptSidebarProps {
  groups: RecipeGroup[];
  fulfillment: Fulfillment;
  onFulfillmentChange: (f: Fulfillment) => void;
  brokenThumbs: Set<string>;
  onBrokenThumb: (slug: string) => void;
}

function itemToIngredient(item: { quantity: string; unit: string; name: string; note: string }, multiplier: number): Ingredient {
  const ing: Ingredient = { quantity: item.quantity, unit: item.unit, name: item.name, note: item.note };
  if (multiplier > 1 && ing.quantity && !isNaN(Number(ing.quantity))) {
    return { ...ing, quantity: String(Number(ing.quantity) * multiplier) };
  }
  return ing;
}

export function ReceiptSidebar({ groups, fulfillment, onFulfillmentChange, brokenThumbs, onBrokenThumb }: ReceiptSidebarProps) {
  const recipeSubtotals = groups.map(g => ({
    slug: g.recipe_slug,
    title: g.recipe_title,
    multiplier: g.multiplier,
    subtotal: g.items.reduce((sum, item) => sum + getEstimatedPrice(item.name), 0) * g.multiplier,
  }));

  const summary = calculateSummary(recipeSubtotals, fulfillment);

  const uncheckedIngredients = groups.flatMap(g =>
    g.items.filter(i => !i.is_checked).map(i => itemToIngredient(i, g.multiplier))
  );

  const instacartUrl = buildInstacartUrl(uncheckedIngredients, fulfillment);

  return (
    <div className="space-y-4">
      {/* Fulfillment toggle */}
      <div className="flex justify-end">
        <div className="flex bg-muted rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => onFulfillmentChange("pickup")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              fulfillment === "pickup" ? "bg-amber-500 text-black" : "text-muted-foreground"
            }`}
          >
            🚗 Pickup
          </button>
          <button
            type="button"
            onClick={() => onFulfillmentChange("delivery")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              fulfillment === "delivery" ? "bg-amber-500 text-black" : "text-muted-foreground"
            }`}
          >
            🏠 Delivery
          </button>
        </div>
      </div>

      {/* Mini recipe previews */}
      {groups.length > 0 && (
        <div className="flex gap-2">
          {groups.map(g => {
            const fb = getCategoryFallback(g.recipe_category ?? "other");
            return (
              <div key={g.recipe_slug} className="flex-1 h-14 rounded-lg overflow-hidden relative">
                {g.recipe_image_url && !brokenThumbs.has(g.recipe_slug) ? (
                  <img
                    src={g.recipe_image_url}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={() => onBrokenThumb(g.recipe_slug)}
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${fb.gradient} flex items-center justify-center text-xl`}>
                    {fb.emoji}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-1 left-1.5 text-[9px] font-bold text-white z-10">
                  {g.recipe_title}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Receipt summary */}
      <div className="bg-card border border-dashed border-border/50 rounded-lg p-4 font-mono text-sm">
        <div className="text-center font-bold text-amber-500 tracking-[0.15em] text-sm">SPOONFURY</div>
        <div className="text-center text-[9px] text-muted-foreground mb-2">ORDER SUMMARY</div>
        <div className="text-center text-muted-foreground/30 text-xs tracking-[0.2em] my-1">- - - - - - - - - - -</div>

        {recipeSubtotals.map(r => (
          <div key={r.slug} className="flex justify-between text-xs py-0.5">
            <span className="text-muted-foreground truncate">
              {r.title}{r.multiplier > 1 ? ` (x${r.multiplier})` : ""}
            </span>
            <span className="text-muted-foreground">${r.subtotal.toFixed(2)}</span>
          </div>
        ))}

        <div className="text-center text-muted-foreground/30 text-xs tracking-[0.2em] my-1">- - - - - - - - - - -</div>

        <div className="flex justify-between text-xs py-0.5">
          <span className="text-muted-foreground">Subtotal</span>
          <span>${summary.subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs py-0.5">
          <span className="text-muted-foreground">Estimated tax</span>
          <span>${summary.tax.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs py-0.5">
          <span className="text-muted-foreground">{fulfillment === "pickup" ? "Pickup" : "Delivery"} fee</span>
          <span>${summary.fee.toFixed(2)}</span>
        </div>

        <div className="border-t-2 border-border mt-2 pt-2 flex justify-between text-base font-extrabold">
          <span>TOTAL</span>
          <span className="text-amber-500">${summary.total.toFixed(2)}</span>
        </div>

        <a
          href={instacartUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full mt-3 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-center text-black font-extrabold text-sm tracking-wide font-sans hover:brightness-110 transition"
        >
          Proceed to Instacart
        </a>
        <p className="text-center text-[10px] text-muted-foreground mt-1.5 font-sans">
          Prices are estimates. Final total on Instacart.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/checkout/ReceiptSidebar.tsx
git commit -m "feat(checkout): receipt-styled sidebar with fulfillment toggle and summary"
```

---

### Task 6: Rewrite ShoppingListPage

**Files:**
- Modify: `frontend/src/pages/ShoppingListPage.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the page with two-column layout**

Replace the entire file. The new page:
- Uses `grid grid-cols-1 md:grid-cols-[1fr_300px]` for the two-column layout
- Composes `RecipeCard` and `ReceiptSidebar`
- Preserves all API handlers (load, toggleItem, deleteItem, removeRecipe, updateMultiplier, clearList)
- Preserves auth guard, error state, empty state, `SHOPPING_LIST_UPDATED` dispatch
- Adds `fulfillment` state (`"pickup" | "delivery"`)

```tsx
// frontend/src/pages/ShoppingListPage.tsx
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { SHOPPING_LIST_UPDATED } from "@/contexts/ShoppingContext";
import { Button } from "@/components/ui/button";
import { RecipeCard } from "@/components/checkout/RecipeCard";
import { ReceiptSidebar } from "@/components/checkout/ReceiptSidebar";
import type { Fulfillment } from "@/lib/pricing";
import type { ShoppingItem, ShoppingListData } from "@/types";

export function ShoppingListPage() {
  const { token } = useAuth();
  const [data, setData] = useState<ShoppingListData | null>(null);
  const [error, setError] = useState("");
  const [clearing, setClearing] = useState(false);
  const [brokenThumbs, setBrokenThumbs] = useState<Set<string>>(new Set());
  const [fulfillment, setFulfillment] = useState<Fulfillment>("pickup");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const d = await api.get("/shopping-list/", token);
      setData(d);
    } catch {
      setError("Failed to load shopping list.");
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const toggleItem = async (item: ShoppingItem) => {
    if (!token) return;
    const optimistic = !item.is_checked;
    setData(prev => prev ? {
      ...prev,
      items_by_recipe: prev.items_by_recipe.map(g => ({
        ...g,
        items: g.items.map(i => i.id === item.id ? { ...i, is_checked: optimistic } : i),
      })),
    } : prev);
    try {
      await api.patch(`/shopping-list/items/${item.id}/`, { is_checked: optimistic }, token);
    } catch {
      load();
    }
  };

  const deleteItem = async (item: ShoppingItem) => {
    if (!token) return;
    setData(prev => prev ? {
      ...prev,
      total_items: prev.total_items - 1,
      items_by_recipe: prev.items_by_recipe
        .map(g => ({ ...g, items: g.items.filter(i => i.id !== item.id) }))
        .filter(g => g.items.length > 0),
    } : prev);
    try {
      await api.delete(`/shopping-list/items/${item.id}/`, token);
      window.dispatchEvent(new Event(SHOPPING_LIST_UPDATED));
    } catch {
      load();
    }
  };

  const removeRecipe = async (recipeSlug: string) => {
    if (!token) return;
    const group = data?.items_by_recipe.find(g => g.recipe_slug === recipeSlug);
    const count = group?.items.length ?? 0;
    setData(prev => prev ? {
      ...prev,
      total_items: prev.total_items - count,
      items_by_recipe: prev.items_by_recipe.filter(g => g.recipe_slug !== recipeSlug),
    } : prev);
    try {
      await api.post("/shopping-list/remove-recipe/", { recipe_slug: recipeSlug }, token);
      window.dispatchEvent(new Event(SHOPPING_LIST_UPDATED));
    } catch {
      load();
    }
  };

  const updateMultiplier = async (recipeSlug: string, newMultiplier: number) => {
    if (!token || newMultiplier < 1) return;
    setData(prev => prev ? {
      ...prev,
      items_by_recipe: prev.items_by_recipe.map(g =>
        g.recipe_slug === recipeSlug ? { ...g, multiplier: newMultiplier } : g
      ),
    } : prev);
    try {
      await api.patch("/shopping-list/multiplier/", { recipe_slug: recipeSlug, multiplier: newMultiplier }, token);
    } catch {
      load();
    }
  };

  const clearList = async () => {
    if (!token) return;
    setClearing(true);
    try {
      await api.post("/shopping-list/clear/", {}, token);
      setData(prev => prev ? { ...prev, total_items: 0, items_by_recipe: [] } : prev);
      window.dispatchEvent(new CustomEvent(SHOPPING_LIST_UPDATED, { detail: { cleared: true } }));
    } catch {
      setError("Failed to clear list.");
    } finally {
      setClearing(false);
    }
  };

  const handleBrokenThumb = (slug: string) => {
    setBrokenThumbs(prev => new Set(prev).add(slug));
  };

  // ── Guards ──
  if (!token) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center">
        <p className="text-muted-foreground mb-4">Sign in to use your shopping list.</p>
        <Button asChild variant="outline"><Link to="/login">Sign in</Link></Button>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <p className="text-destructive font-medium">{error}</p>
        <Button variant="link" onClick={load} className="mt-2 p-0">Try again</Button>
      </div>
    );
  }
  if (!data) return <p className="text-muted-foreground">Loading…</p>;

  const isEmpty = data.total_items === 0;
  const groups = data.items_by_recipe;

  if (isEmpty) {
    return (
      <div className="max-w-2xl mx-auto w-full text-center py-16">
        <p className="text-4xl mb-4">🛒</p>
        <p className="text-muted-foreground font-medium">Your cart is empty</p>
        <p className="text-sm text-muted-foreground mt-1">Open a recipe and tap "Add to List" to get started.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">
          Your Cart{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {groups.length} recipe{groups.length !== 1 ? "s" : ""}, {data.total_items} item{data.total_items !== 1 ? "s" : ""}
          </span>
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
        {/* Left: Recipe cards */}
        <div className="space-y-4">
          {groups.map(group => (
            <RecipeCard
              key={group.recipe_slug}
              group={group}
              brokenThumbs={brokenThumbs}
              onBrokenThumb={handleBrokenThumb}
              onUpdateMultiplier={updateMultiplier}
              onRemoveRecipe={removeRecipe}
              onDeleteItem={deleteItem}
              onToggleItem={toggleItem}
            />
          ))}

          {/* Clear all */}
          <div className="flex justify-center py-2">
            <Button onClick={clearList} disabled={clearing} variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
              {clearing ? "Clearing…" : "🗑️ Start fresh"}
            </Button>
          </div>
        </div>

        {/* Right: Receipt sidebar */}
        <div className="md:sticky md:top-20 md:self-start">
          <ReceiptSidebar
            groups={groups}
            fulfillment={fulfillment}
            onFulfillmentChange={setFulfillment}
            brokenThumbs={brokenThumbs}
            onBrokenThumb={handleBrokenThumb}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Start dev server and visually verify**

Run: `cd frontend && npm run dev`

Check:
1. Navigate to `/shopping-list` with items in cart
2. Two-column layout renders on desktop
3. Recipe cards show emoji thumbnails, spoon ratings, fork multipliers
4. Ingredient rows show prices and health tip tooltips
5. Receipt sidebar shows monospace summary with SPOONFURY header
6. Fulfillment toggle switches between pickup/delivery and fee updates
7. "Proceed to Instacart" opens correct URL
8. Swipe-to-delete works on mobile viewport
9. Empty state shows when cart is empty
10. Columns stack on mobile (< 768px)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ShoppingListPage.tsx
git commit -m "feat(checkout): rewrite ShoppingListPage with two-column checkout layout"
```

---

### Task 7: Final Cleanup & Max-Width Adjustment

**Files:**
- Modify: `frontend/src/App.tsx:23` — The current `max-w-5xl` (1024px) may need adjustment to `max-w-6xl` (1152px) to accommodate the two-column layout comfortably. Verify visually and adjust if needed.

- [ ] **Step 1: Check if max-width needs adjustment**

Open the app at full desktop width. If the left column feels cramped with the 300px sidebar, change:

```tsx
// frontend/src/App.tsx line 23
// FROM:
<main className="w-full max-w-5xl mx-auto px-4 py-6 flex-1">
// TO:
<main className="w-full max-w-6xl mx-auto px-4 py-6 flex-1">
```

Only make this change if the layout feels cramped. If `max-w-5xl` works fine, skip.

- [ ] **Step 2: Remove BuyNowSheet if no longer referenced**

Check if `BuyNowSheet.tsx` is still imported anywhere:

Run: `cd frontend && grep -r "BuyNowSheet" src/ --include="*.tsx" --include="*.ts"`

If it's only imported in files unrelated to this change, leave it. If it's orphaned, note it for future cleanup but don't delete — it may be used on RecipePage.

- [ ] **Step 3: Final visual QA pass**

Verify against `docs/visual-lockups/shopping_cart_rework.html` Stage 4:
- Card header: emoji thumb + title + spoon rating + fork multiplier ✓
- Ingredient rows: emoji + name + qty + price ✓
- Per-recipe subtotals ✓
- Receipt sidebar: fulfillment toggle + mini previews + monospace summary ✓
- Responsive stacking ✓

- [ ] **Step 4: Commit all remaining changes**

```bash
git add -A
git commit -m "feat(checkout): v0.5.2 shopping cart rework complete"
```
