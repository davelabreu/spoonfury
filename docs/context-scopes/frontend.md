# Context Scope: Frontend

React 19 + Vite + Tailwind 4 + Shadcn UI. Client-side SPA with token auth.

## Project Layout

```
frontend/src/
  App.tsx              # Router + layout (AuthProvider → ShoppingProvider → TooltipProvider)
  index.css            # Tailwind theme + custom keyframes
  main.tsx             # React entry
  types.ts             # TypeScript interfaces (Recipe, Ingredient, Tag, Book, ShoppingItem, etc.)
  components/          # Flat — NavBar, RecipeCard, ImageUploadField, ForkModal, ShareModal, TagInput, etc.
    ui/                # Shadcn components (button, card, badge, checkbox, dropdown-menu, tooltip, select, input, textarea, label, command, popover, etc.)
  contexts/
    AuthContext.tsx     # Token + username, login/register/logout
    ShoppingContext.tsx # Cart count + items, refresh from API
  hooks/
    useMediaQuery.ts   # Responsive breakpoint detection
    useNavTheme.ts     # Nav theme persistence (sticker/minimal)
    useWakeLock.ts     # Screen wake lock during cooking
  lib/
    api.ts             # Fetch wrapper with Token auth
    categoryFallback.ts # Category → emoji + gradient fallback
    ingredientEmoji.ts # Regex-based emoji guessing + picker categories
    ingredientInfo.ts  # Cooking tips per ingredient (tooltip content)
    instacart.ts       # Instacart URL builder
    utils.ts           # cn() — clsx + tailwind-merge
  pages/               # Route-level components (HomePage, RecipePage, CreateRecipePage, etc.)
```

## Routing (App.tsx)

| Route | Page | Auth |
|-------|------|------|
| `/` | HomePage | No |
| `/recipes/new` | CreateRecipePage | Yes |
| `/recipes/:slug` | RecipePage | No |
| `/recipes/:slug/edit` | EditRecipePage | Yes |
| `/login` | LoginPage | No |
| `/register` | RegisterPage | No |
| `/books` | BooksPage | Yes |
| `/books/:id` | BookDetailPage | Yes |
| `/books/share/:token` | BookDetailPage | No |
| `/shopping-list` | ShoppingListPage | Yes |

Layout: `<NavBar />` + `<main className="w-full max-w-5xl mx-auto px-4 py-6">`.

## Global State

### AuthContext
- `token` / `username` in localStorage
- `login()`, `register()`, `logout()`
- Registration fallback: if no token in response, auto-logs in via `/auth/login/`

### ShoppingContext
- `count` (unchecked items), `items` (flat ingredient list), `loading`, `refresh()`
- Fetches from `GET /shopping-list/` on token change
- Window event: `"shopping-list-updated"` dispatched by RecipePage and ShoppingListPage

## API Layer (lib/api.ts)

Simple fetch wrapper. Base path: `/api` (Vite proxy → Django in dev).
```
api.get(path, token?)
api.post(path, body, token?)
api.patch(path, body, token?)
api.delete(path, token?)
api.upload(path, file, token)  // FormData multipart
```
Token passed as `Authorization: Token <key>` header. 204 responses return `null`.

## Key Components

| Component | Purpose |
|-----------|---------|
| **NavBar** | Fridge-sticker tabs + breathing badge + CartCapsule. Framer Motion animations. Mobile hamburger integrated into badge. Theme toggle in dropdown. |
| **RecipeCard** | Horizontal card with image thumbnail. Falls back to category emoji gradient via `getCategoryFallback()`. Fork count badge. |
| **ImageUploadField** | Drag-drop zone with states: idle → dragover → uploading → preview. URL paste secondary. |
| **ForkModal** | Fork recipe → select book. Validates max 3 ingredient changes. |
| **ShareModal** | QR code (qrcode.react) + copy URL + WhatsApp link. |
| **IngredientChecklist** | Ingredient rows with emoji, checkbox, tooltips with cooking tips. |
| **TagInput** | Autocomplete tag input. Debounced search against `/api/tags/?search=`, keyboard navigation, badges with remove. Novel tags accepted on Enter (backend creates as "vibe"). |
| **CartCapsule** | Nav pill: `[Pickup | Delivery | 🛒⁴]`. Shimmer border, shake animation, emoji burst on add. `compact` prop for mobile. |

## Styling

- **Tailwind 4** via `@tailwindcss/vite` plugin
- **Theme**: CSS custom properties in `@theme {}` block (index.css). Shadcn palette.
- **Custom keyframes**: `badge-breathe` (4s glow pulse), `shake` (trash hover), `shimmer` (gradient border)
- **Class merging**: `cn()` (clsx + tailwind-merge) used everywhere
- **Animations**: Framer Motion for nav tabs, modals, emoji pop, steam particles

## TypeScript Interfaces (types.ts)

- `Ingredient`: `{quantity, unit, name, note, emoji?}`
- `Tag`: `{name, slug, kind}` — kind is `"cuisine" | "dietary" | "ingredient" | "vibe"`
- `Recipe`: Full recipe with author info, fork lineage, image_url, optional `tags: Tag[]`
- `Book`: Recipe book with optional nested recipes
- `ShoppingItem`: Denormalized item with recipe_slug for grouping
- `RecipeGroup`: Items grouped by recipe with multiplier + image/category
- `ShoppingListData`: `{total_items, items_by_recipe: RecipeGroup[]}`

## Key Utilities

- **ingredientEmoji.ts**: Regex map of ~200 ingredients → emoji. `PICKER_CATEGORIES` for manual selection (11 categories).
- **categoryFallback.ts**: Maps 15 recipe categories → `{emoji, gradient}` for placeholder images.
- **ingredientInfo.ts**: Cooking tips for 100+ ingredients (tooltips on hover).
- **instacart.ts**: Builds Instacart search URL from ingredient list.

## Dev Server

```bash
npm run dev          # localhost:5173
npm run dev:network  # 0.0.0.0 (mobile testing)
npm run build        # TypeScript + Vite production build
npm run test         # Vitest + @testing-library/react
```

Vite proxy: `/api/*` and `/media/*` → `http://localhost:8000` (Django backend).
