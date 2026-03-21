# Spoonfury API Reference

All endpoints are prefixed with `/api/`. Auth uses DRF token auth: `Authorization: Token <key>`.

---

## Recipes

### `GET /api/recipes/`
List all recipes. **Public.**

### `POST /api/recipes/`
Create a recipe. **Auth required.**

```json
{
  "title": "Spicy Rigatoni",
  "description": "Creamy vodka sauce...",
  "serves": "4",
  "category": "pasta",
  "image_url": "/media/recipes/abc.webp",
  "ingredients": [
    { "quantity": "1", "unit": "lb", "name": "rigatoni", "note": "", "emoji": "" }
  ],
  "instructions": "Boil pasta...",
  "notes": "Optional tips"
}
```

- `image_url` — optional. Accepts both relative paths (`/media/...` from upload endpoint) and full URLs (`https://...` pasted by user).
- `category` — one of: `soup`, `pasta`, `bake`, `salad`, `grill`, `breakfast`, `dessert`, `drink`, `snack`, `other`.
- `ingredients[].emoji` — optional override. If blank, the frontend auto-guesses from the ingredient name.

### `GET /api/recipes/:slug/`
Get a single recipe by slug. **Public.**

Response includes: `id`, `slug`, `title`, `description`, `serves`, `category`, `image_url`, `ingredients`, `instructions`, `notes`, `author_username`, `author_display_name`, `parent_recipe_slug`, `parent_recipe_title`, `parent_recipe_author`, `fork_count`, `created_at`.

### `PATCH /api/recipes/:slug/`
Update a recipe. **Auth required. Owner only.**

Send only the fields you want to change. Same shape as `POST`.

### `DELETE /api/recipes/:slug/`
Delete a recipe. **Auth required. Owner only.**

Returns `204 No Content`.

### `POST /api/recipes/:slug/fork/`
Fork a recipe into one of your books. **Auth required.**

```json
{ "book_id": 5 }
```

Returns the newly created recipe.

### `POST /api/recipes/upload-image/`
Upload a recipe photo. **Auth required.** Uses `multipart/form-data`.

```
Content-Type: multipart/form-data
image: <file>  (JPG, PNG, WebP, GIF)
```

Returns:
```json
{ "url": "/media/recipes/abc123.webp" }
```

The returned URL is **relative** — use it directly as `image_url` when saving the recipe. The Vite dev proxy and production nginx both forward `/media` to the backend.

---

## Recipe Books

### `GET /api/books/`
List the current user's books. **Auth required.**

### `POST /api/books/`
Create a book. **Auth required.**

```json
{ "title": "Weeknight Dinners" }
```

### `GET /api/books/:id/`
Get a book with its recipes. **Auth required. Owner only.**

### `DELETE /api/books/:id/`
Delete a book. **Auth required. Owner only.**

### `POST /api/books/:id/add-recipe/`
Add a recipe to a book. **Auth required.**

```json
{ "recipe_slug": "spicy-rigatoni" }
```

### `POST /api/books/:id/remove-recipe/`
Remove a recipe from a book. **Auth required.**

```json
{ "recipe_slug": "spicy-rigatoni" }
```

Returns `204 No Content`.

### `GET /api/books/share/:share_token/`
Get a shared book by its public share token. **Public.**

---

## Shopping List

Each user has one shopping list. Ingredients are grouped by recipe.

### `GET /api/shopping-list/`
Get the full shopping list. **Auth required.**

Response:
```json
{
  "updated_at": "2026-03-15T12:00:00Z",
  "total_items": 6,
  "items_by_recipe": [
    {
      "recipe_slug": "spicy-rigatoni",
      "recipe_title": "Spicy Rigatoni",
      "recipe_image_url": "/media/recipes/abc.webp",
      "recipe_category": "pasta",
      "multiplier": 2,
      "items": [
        {
          "id": 1,
          "recipe_title": "Spicy Rigatoni",
          "recipe_slug": "spicy-rigatoni",
          "name": "rigatoni",
          "quantity": "1",
          "unit": "lb",
          "note": "",
          "is_checked": false,
          "added_at": "2026-03-15T12:00:00Z"
        }
      ]
    }
  ]
}
```

- `recipe_image_url` — the recipe's hero image URL (empty string if none). May be a relative path or full URL.
- `recipe_category` — used by the frontend for emoji+gradient fallback when no image exists.
- `multiplier` — batch multiplier (default 1). Quantities are multiplied on the frontend.

### `POST /api/shopping-list/add/`
Add a recipe's ingredients to the list. **Auth required.**

```json
{
  "recipe_slug": "spicy-rigatoni",
  "recipe_title": "Spicy Rigatoni",
  "ingredients": [
    { "quantity": "1", "unit": "lb", "name": "rigatoni", "note": "" }
  ]
}
```

Returns `201` with `{ "added": 3, "already_in_list": true }`. Duplicate ingredient names (per recipe) are silently skipped.

### `GET /api/shopping-list/status/?recipe_slug=spicy-rigatoni`
Check if a recipe's ingredients are already in the list. **Auth required.**

Returns `{ "in_list": true }`.

### `POST /api/shopping-list/remove-recipe/`
Remove all items for a recipe from the list. **Auth required.**

```json
{ "recipe_slug": "spicy-rigatoni" }
```

### `PATCH /api/shopping-list/multiplier/`
Update the batch multiplier for a recipe. **Auth required.**

```json
{ "recipe_slug": "spicy-rigatoni", "multiplier": 3 }
```

### `PATCH /api/shopping-list/items/:id/`
Toggle an item's checked state. **Auth required.**

```json
{ "is_checked": true }
```

### `DELETE /api/shopping-list/items/:id/`
Delete a single item. **Auth required.** Returns `204`.

### `POST /api/shopping-list/clear/`
Clear the entire shopping list. **Auth required.** Returns `204`.

---

## Auth

Uses `dj-rest-auth` endpoints under `/api/auth/`.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login/` | POST | `{ "username", "password" }` → `{ "key": "token" }` |
| `/api/auth/logout/` | POST | Invalidate token |
| `/api/auth/registration/` | POST | `{ "username", "password1", "password2" }` |

Note: Registration may return `204 No Content` in some configs. The frontend's `AuthContext` handles this by performing a background login.

---

## Image URLs

Recipe images can be stored as:
- **Relative paths** (`/media/recipes/abc.webp`) — returned by the upload endpoint
- **Full URLs** (`https://example.com/photo.jpg`) — pasted by the user

The `image_url` field on the Recipe model accepts both. In development, the Vite proxy forwards `/media` requests to the Django backend. In production, nginx serves `/media` directly.

When an image URL is broken (404, CORS error, etc.), the frontend falls back to a **category placeholder** — an emoji on a gradient background generated by `getCategoryFallback(category)`.
