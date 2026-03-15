# Spoonfury Frontend

React 19 single-page application built with Vite, Tailwind CSS 4, and Shadcn UI.

## Architecture & Code Patterns

### Component Architecture
- **Naming**: PascalCase for components, camelCase for hooks and utilities.
- **State Management**: React Context (`AuthContext`, `ShoppingContext`) for global state.
- **Icons**: [Lucide React](https://lucide.dev/icons/) standard.

### Recipe Page & Cards
- **Recipe Data**: Blank ingredient rows (empty `name`) must be filtered before API submission and during rendering.
- **Action Bar**: Indigo action strip (`bg-indigo-50`) fused to the bottom of the hero image.
- **Recipe Images**: Unified file upload + URL paste for hero photos.
- **Hero Fallback**: Category-themed emojis with gradients via `getCategoryFallback()`.

### Ingredient Logic
- **Ingredient Emojis**: Auto-matched via regex or manually selected via `IngredientEmojiPicker`.
- **Tooltips**: Description, nutrition, and cooking tips via `ingredientInfo.ts`.

### Shopping List & Auth
- **Instacart Integration**: `Buy Now!` buttons for quick shopping.
- **CartCapsule**: Interactive pill with shimmer effect and shimmer-gradient badge for item counts.
- **Registration Flow**: Background login on 204 response.

## Development
```bash
npm install
npm run dev
```

## Production Build
```bash
npm run build
```
The build artifacts will be in `dist/`. In production, these are served by the Django backend.
