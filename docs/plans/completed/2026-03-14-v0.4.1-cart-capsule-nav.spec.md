# Cart Capsule Nav — Design Spec
**Date:** 2026-03-14
**Status:** Approved

## Overview

Replace the redundant "Shopping List" nav tab with an integrated cart capsule in the nav top-right. The capsule combines Pickup, Delivery, and the cart icon into one cohesive pill widget that only appears when the cart has items.

## Visual Design

### Structure
A single pill capsule: `[ 🚗 Pickup | 🏠 Delivery | 🛒⁴ ]`

Three segments connected with no visible gap. Hairline divider between Pickup and Delivery. Cart end has a mint tint to differentiate it.

### Gradient Border Technique
CSS gradients cannot be applied directly to `border`. Use a **wrapper div** approach:
```tsx
<div style={{ padding: 2, borderRadius: 9999, background: "linear-gradient(...)", animation: "..." }}>
  <div style={{ borderRadius: 9999, overflow: "hidden", background: "#fff", display: "flex" }}>
    {/* segments */}
  </div>
</div>
```
The `border-image` approach does not support `border-radius` and must not be used.

### Shimmer Animation
Add a `@keyframes shimmer` block to `frontend/src/index.css`. Place it **outside** the `@theme {}` block (bare `@keyframes` inside `@theme` is invalid CSS):
```css
@keyframes shimmer {
  0%, 100% { background-position: 0% 50%; }
  50%       { background-position: 100% 50%; }
}
```
Apply via inline `style` on the wrapper div:
```tsx
style={{
  backgroundImage: "linear-gradient(270deg, #86efac, #93c5fd, #c4b5fd, #fda4af, #86efac)",
  backgroundSize: "300% 300%",
  animation: "shimmer 8s ease infinite",
  boxShadow: "0 2px 8px rgba(147,197,253,0.3)",
  padding: 2,
  borderRadius: 9999,
}}
```

### Segment Styling
- **Interior background:** `#fff`
- **Segment text:** `color: #374151`, `fontSize: 12`, `fontWeight: 600`
- **Divider:** 1px wide, 20px tall, `backgroundColor: #e5e7eb`
- **Padding per segment:** `0 13px`

### Cart End
- **Background:** `#f0fdf4` (mint)
- **Text/icon color:** `#15803d`
- **Border-left:** `1px solid rgba(0,0,0,0.06)`
- **Border-radius:** `0 9999px 9999px 0` (right side only)

### Cart Icon & Badge
- Lucide `ShoppingCart` at `className="w-[22px] h-[22px]"` (~30% larger than default `w-5 h-5`)
- Corner badge: `absolute -top-1 -right-1`, `bg-green-500` text-white, `text-[9px] font-black`, `rounded-full`, `min-w-[16px] h-[16px]`
- Badge border: `border-[1.5px] border-[#f0fdf4]` (matches cart end bg for clean inset look)
- **IMPORTANT — badge overflow:** The inner capsule div uses `overflow: hidden`, which would clip the badge. The badge must be positioned relative to the **outer gradient-border wrapper div** (outside the `overflow: hidden` inner div). Structure the cart end as a sibling of the inner capsule, not inside it, or break the cart end out of the `overflow: hidden` container:

```tsx
{/* outer shimmer wrapper — position: relative */}
<div style={{ position: "relative", padding: 2, borderRadius: 9999, ... }}>
  {/* inner overflow:hidden capsule */}
  <div style={{ overflow: "hidden", borderRadius: 9999, display: "flex" }}>
    <a>🚗 Pickup</a>
    <div />{/* divider */}
    <a>🏠 Delivery</a>
    <Link>{/* cart end bg + icon, NO badge here */}</Link>
  </div>
  {/* badge lives on outer wrapper, not inside overflow:hidden */}
  <span style={{ position: "absolute", top: 0, right: 0 }}>4</span>
</div>
```

### Visibility & Auth
- Capsule only renders when `username` is present AND `cartCount > 0`
- When `cartCount === 0` or user is logged out: no capsule, no placeholder
- Auth gate matches every other auth-gated element in the file: `{username && count > 0 && <CartCapsule ... />}`
- Do NOT use `token` for this gate — `username` is the canonical "logged in" signal from `useAuth` throughout NavBar

## Nav Changes

### Desktop (both themes)
- Remove `Shopping List` from `STICKERS` array — it disappears from the desktop tab row and fridge sticker nav
- `CartCapsule` replaces it in the top-right area of both `MinimalNav` and `NavBar`

### Mobile
- **Header:** No capsule (no room). The standalone `CartButton` stays in the Fridge Sticker mobile header as-is. `MinimalNav` mobile header gets no capsule.
- **Drawer:** `Shopping List` is removed from `STICKERS` so it won't appear via the `visibleStickers` map. Add it back as an **explicit hardcoded link** in both drawer sections, gated with `{username && ...}`.

**Fridge Sticker drawer** — add after the `visibleStickers.map(...)` block, using `NavSticker` with `variant="button"` to match the other drawer items:
```tsx
{username && (
  <NavSticker
    label="Shopping List"
    to="/shopping-list"
    color="bg-[#95D5B2]"
    icon={ShoppingCart}
    variant="button"
    isActive={location.pathname === "/shopping-list"}
    onClick={() => setMobileOpen(false)}
  />
)}
```

**MinimalNav drawer** — add after the `visibleStickers.map(...)` block, using a plain `<Link>` to match the other drawer items:
```tsx
{username && (
  <Link
    to="/shopping-list"
    onClick={() => setMobileOpen(false)}
    className={`px-4 py-3 text-base font-semibold rounded-lg transition-colors ${
      location.pathname === "/shopping-list" ? "bg-muted" : "hover:bg-muted/50"
    }`}
  >
    Shopping List
  </Link>
)}
```

## Data Requirements

### API Response Shape
`GET /shopping-list/` returns:
```json
{
  "total_items": 4,
  "items_by_recipe": [
    {
      "recipe_slug": "...",
      "recipe_title": "...",
      "multiplier": 1,
      "items": [
        { "id": 1, "name": "Salt", "quantity": "1", "unit": "g", "note": "", "is_checked": false, ... }
      ]
    }
  ]
}
```

### Extending the Hook
Rename `useShoppingCount` → `useShoppingData`, returning `{ count: number, items: Ingredient[] }`.

All call sites return a destructured object — update both consumers:
```tsx
// In NavBar (Fridge Sticker theme)
const { count: cartCount, items: cartItems } = useShoppingData(token, location.key);

// In MinimalNav — receives count and items as props; update prop types:
// cartCount: number → cartCount: number (unchanged)
// Add: cartItems: Ingredient[]
// Pass { count, items } = useShoppingData(...) from NavBar and destructure in MinimalNav
```
`CartButton` only uses `count`, so it continues to receive `cartCount` (a number) and requires no type change.

```tsx
function useShoppingData(token: string | null | undefined, locationKey: string) {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Ingredient[]>([]);
  // ... existing event listener for shopping-list-updated ...
  useEffect(() => {
    if (!token) { setCount(0); setItems([]); return; }
    api.get("/shopping-list/", token).then((d: any) => {
      setCount(d.total_items ?? 0);
      // Flatten unchecked items across all recipe groups, map to Ingredient shape
      const unchecked: Ingredient[] = (d.items_by_recipe ?? [])
        .flatMap((g: any) => g.items.filter((i: any) => !i.is_checked))
        .map((i: any) => ({ quantity: i.quantity, unit: i.unit, name: i.name, note: i.note }));
      setItems(unchecked);
    }).catch(() => {});
  }, [token, locationKey, bump]);
  return { count, items };
}
```

The mapping to `Ingredient` shape (`{ quantity, unit, name, note }`) matches what `buildInstacartUrl` expects. This mirrors the existing `itemToIngredient` helper in `ShoppingListPage.tsx`.

### Instacart Fulfillment Note
`buildInstacartUrl` currently **ignores** the `_fulfillment` parameter — both Pickup and Delivery produce the same Instacart search URL. This is a pre-existing stub (noted in `instacart.ts` comments as "reserved for Instacart Shoppable Recipe API post-v0.4"). The capsule ships with this known limitation: both buttons open the same URL. No changes to `instacart.ts` in this spec.

## Component Design

```tsx
function CartCapsule({ count, items }: { count: number; items: Ingredient[] }) {
  return (
    <div style={{ /* shimmer wrapper */ }}>
      <div style={{ /* white inner capsule */ }}>
        <a href={buildInstacartUrl(items, "pickup")} target="_blank" rel="noopener noreferrer"
           style={{ /* segment styles */ }}>
          🚗 Pickup
        </a>
        <div style={{ /* divider */ }} />
        <a href={buildInstacartUrl(items, "delivery")} target="_blank" rel="noopener noreferrer"
           style={{ /* segment styles */ }}>
          🏠 Delivery
        </a>
        <Link to="/shopping-list" style={{ /* cart end styles */ }}>
          <div className="relative">
            <ShoppingCart className="w-[22px] h-[22px]" />
            <span className="absolute -top-1 -right-1 ...badge styles...">{count > 99 ? "99+" : count}</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
```

## Files Affected

| File | Change |
|------|--------|
| `NavBar.tsx` | Remove Shopping List from STICKERS; add CartCapsule component; rename useShoppingCount → useShoppingData; update MinimalNav + NavBar desktop; add hardcoded Shopping List link to both drawers |
| `index.css` | Add `@keyframes shimmer` block |
| `instacart.ts` | No changes |
