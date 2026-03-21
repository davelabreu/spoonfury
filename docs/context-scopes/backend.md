# Context Scope: Backend

Django 5 + DRF + PostgreSQL. Token auth via dj-rest-auth + django-allauth.

## Project Layout

```
backend/
  config/            # Django project settings, root urls, wsgi/asgi
  spoonfury/apps/
    users/           # Custom User model (AbstractUser)
    recipes/         # Recipe CRUD, fork, image upload
    books/           # RecipeBook + BookRecipe join table
    shopping/        # ShoppingList, items, multipliers
  conftest.py        # Shared pytest fixtures
  media/recipes/     # Uploaded recipe images (WebP)
```

## Models

### User (users)
Custom `AbstractUser`. Added fields: `display_name`, `bio`, `avatar`.

### Recipe (recipes)
Core domain model. Key fields:
- `title`, `description` (280 char), `serves`, `category` (10 choices), `image_url` (URLField, accepts relative + full URLs)
- `ingredients`: **JSONField** — list of `{name, quantity, unit, note}` dicts
- `instructions`, `notes`: TextField (markdown)
- `slug`: unique, auto-generated from title on `save()`
- `author`: FK → User (CASCADE)
- `parent_recipe`: self-FK (null=True) — fork lineage
- `fork_count`: PositiveIntegerField, incremented atomically via `F()` on fork
- Ordering: `-created_at`

### RecipeBook (books)
- `owner`: FK → User (CASCADE)
- `recipes`: M2M → Recipe through `BookRecipe`
- `is_public`, `share_token` (UUID, immutable)

### BookRecipe (books — ordered join table)
- `book` FK, `recipe` FK, `order` int
- `unique_together: [book, recipe]`

### ShoppingList (shopping)
- `owner`: OneToOne → User. One list per user, auto-created via `get_or_create`.
- Related: `ShoppingListItem` (FK), `RecipeMultiplier` (FK)

### ShoppingListItem (shopping)
Denormalized — copies `recipe_title` and `recipe_slug` at add time so items survive recipe deletion.
- `recipe`: FK → Recipe (SET_NULL, null=True)
- `name`, `quantity`, `unit`, `note`, `is_checked`

### RecipeMultiplier (shopping)
- `shopping_list` FK, `recipe_slug`, `multiplier` (default 1)
- `unique_together: [shopping_list, recipe_slug]`

## ViewSet Patterns

### RecipeViewSet (`ModelViewSet`, lookup by `slug`)
- **GET list/retrieve**: `AllowAny` (public)
- **POST/PATCH/DELETE**: `IsAuthenticated`, ownership enforced in `perform_update`/`perform_destroy`
- `select_related("author", "parent_recipe__author")`

### RecipeBookViewSet (`ModelViewSet`, lookup by `id`)
- Queryset filtered to `owner=request.user`
- Custom POST actions: `add-recipe`, `remove-recipe`
- `share/<token>/` action: `AllowAny` for public shared books
- Toggles between summary and detail serializer by action

### Shopping Views (7 standalone `APIView` classes, not ViewSet)
All `IsAuthenticated`. Auto `get_or_create` ShoppingList per user.

### Fork (`fork_recipe` — standalone `@api_view`)
- Copies recipe fields, sets new author, links `parent_recipe`
- Validates max 3 ingredient name changes (prevents drift)
- Atomically increments `parent.fork_count` via `F()`

### Image Upload (`upload_recipe_image` — standalone `@api_view`)
- Accepts multipart file (JPG/PNG/WebP/GIF)
- Returns relative path: `{"url": "/media/recipes/abc.webp"}`

## Serializer Patterns

- `RecipeSerializer`: Flattens author/parent info into read-only fields. Uses `CharField` for `image_url` (not URLField) to accept both relative paths and full URLs.
- `RecipeBookDetailSerializer` extends `RecipeBookSerializer` with nested `recipes` (full `RecipeSerializer`).
- `ShoppingListSerializer`: Groups items by `recipe_slug`, bulk-fetches recipe metadata for image/category.

## URL Routing

All under `/api/`. Auth under `/api/auth/` (dj-rest-auth). Recipes and books use DRF routers; shopping uses explicit paths. Fork and upload-image are standalone paths registered before the router catch-all.

## Settings

- Auth: `TokenAuthentication`, `IsAuthenticatedOrReadOnly` default
- CORS: localhost:5173 (Vite dev), plus local IPs for mobile testing
- DB: PostgreSQL via env vars (`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`)
- Media: `/media/` → `backend/media/`
- Pagination: `PageNumberPagination`, `PAGE_SIZE=20`

## Test Patterns

pytest-django. Shared fixtures in `conftest.py`: `user`, `api_client` (unauth), `auth_client` (authenticated via `force_authenticate`). Tests use `reverse()` for named URLs, `@pytest.mark.django_db` decorator. Factory-boy available but not heavily used.

## Dev Server

### 1. Database (Docker via WSL)

Postgres runs in Docker. Always use WSL (or native Linux) for docker commands:

```bash
# From WSL / Linux shell:
cd /mnt/g/Projects/dev/1.work/Spoonfury   # adjust to your mount path
docker compose -f docker-compose.dev.yml up -d
```

This starts Postgres 16 on `localhost:5432` with DB/user/password all `spoonfury`.

### 2. Django Server

```bash
# From backend/ directory (Windows):
..\.venv\Scripts\activate
python manage.py migrate          # if model changes were made
python manage.py runserver 0.0.0.0:8000

# From backend/ directory (Linux/WSL):
source ../.venv/bin/activate
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

The `0.0.0.0` bind allows mobile device testing on the local network.

### 3. Tests

```bash
cd backend
../.venv/Scripts/pytest            # Windows
../.venv/bin/pytest                # Linux
```
