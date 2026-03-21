# Recipe Search & Filtering — Spec

**Date:** 2026-03-21
**Status:** Active
**Approach:** Option C — Hybrid structured category + flexible tag system

## Overview

Add multi-dimensional recipe filtering to Spoonfury. The `category` field becomes a richer structural classifier (15 choices), and a new `Tag` model with a `kind` field provides flexible cross-cutting dimensions (cuisine, dietary, ingredient, vibe). Ingredient search queries the existing JSONField directly.

## Data Model

### Recipe Model Changes

**Modified field — `category`:**

```python
CATEGORY_CHOICES = [
    ("sandwich_burger", "Sandwiches & Burgers"),
    ("pizza", "Pizza & Flatbreads"),
    ("soup", "Soup & Stews"),
    ("salad", "Salads"),
    ("pasta_noodles", "Pasta & Noodles"),
    ("meat_seafood", "Meat & Seafood"),
    ("bowl", "Bowls"),
    ("casserole_bake", "Casseroles & Bakes"),
    ("side_dish", "Side Dishes"),
    ("sauce_condiment", "Sauces & Condiments"),
    ("breakfast_bakery", "Breakfast & Bakery"),
    ("dessert", "Desserts"),
    ("drink", "Drinks"),
    ("snack_app", "Snacks & Appetizers"),
    ("other", "Other"),
]
```

**New field:**

```python
tags = models.ManyToManyField("Tag", blank=True, related_name="recipes")
```

### New Tag Model

Lives in the `recipes` app (co-located with Recipe).

```python
TAG_KIND_CHOICES = [
    ("cuisine", "Cuisine"),
    ("dietary", "Dietary"),
    ("ingredient", "Ingredient"),
    ("vibe", "Vibe"),
]

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    kind = models.CharField(max_length=20, choices=TAG_KIND_CHOICES, default="vibe")

    class Meta:
        ordering = ["kind", "name"]

    def save(self, *args, **kwargs):
        self.name = self.name.lower().strip()
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
```

### Seed Data

Loaded via a data migration (`RunPython`):

| Kind       | Tags |
|------------|------|
| cuisine    | mediterranean, mexican, asian, american, chinese, italian, japanese, indian |
| dietary    | vegetarian, vegan, healthy |
| ingredient | steak, seafood, chicken, sushi |
| vibe       | *(empty — user-generated later)* |

### Category Data Migration

Custom `RunPython` migration mapping old values to new:

| Old Value   | New Value         |
|-------------|-------------------|
| soup        | soup              |
| pasta       | pasta_noodles     |
| bake        | casserole_bake    |
| salad       | salad             |
| grill       | meat_seafood      |
| breakfast   | breakfast_bakery  |
| dessert     | dessert           |
| drink       | drink             |
| snack       | snack_app         |
| other       | other             |

**Migration order:** (1) add Tag model, (2) run category data migration via `RunPython`, (3) update category choices on field, (4) add M2M field, (5) seed tags via `RunPython`.

**Note:** Django `choices=` is a validation-only constraint, not enforced at the DB level. Step (2) safely writes new values (e.g. `pasta_noodles`) before step (3) updates the choices list. All new category keys fit within the existing `max_length=20` (longest: `breakfast_bakery` = 16 chars).

**Tag uniqueness:** `name` is globally unique (not per-kind). A tag named "chicken" can only exist once with one `kind`. This is intentional — one canonical meaning per tag name. Admin can reclassify kind if needed.

## API

### Enhanced Recipe List

`GET /api/recipes/` gains query parameters:

| Parameter   | Type     | Example                          | Behavior |
|-------------|----------|----------------------------------|----------|
| `category`  | string   | `?category=pizza`                | Exact match on CharField |
| `tags`      | string[] | `?tags=vegan&tags=mexican`       | AND filter — recipes must have ALL specified tags |
| `ingredient`| string   | `?ingredient=chicken`            | Case-insensitive substring match on ingredient names in JSONField |
| `search`    | string   | `?search=rigatoni`               | Searches title and description |
| `ordering`  | string   | `?ordering=-fork_count`          | Sort by field. Options: `-created_at` (default), `-fork_count`, `title` |

### Recipe Create/Update

`POST /api/recipes/` and `PATCH /api/recipes/:slug/` accept:

```json
{
  "tags": ["vegan", "mexican"]
}
```

Backend behavior: for each tag name, get-or-create a Tag (lowercase, default kind="vibe" for new tags). Assign all to the recipe's M2M.

Recipe responses include tags as:

```json
{
  "tags": [
    {"name": "vegan", "slug": "vegan", "kind": "dietary"},
    {"name": "mexican", "slug": "mexican", "kind": "cuisine"}
  ]
}
```

### New Tag Endpoint

`GET /api/tags/` — read-only, public.

| Parameter | Example          | Behavior |
|-----------|------------------|----------|
| `kind`    | `?kind=cuisine`  | Filter by tag kind |
| `search`  | `?search=veg`    | Case-insensitive prefix/substring match on tag name (for typeahead autocomplete) |

Response: list of `{name, slug, kind}` objects. No pagination (tag count will stay small).

The `search` parameter is required for the frontend tag picker — typeahead/autocomplete needs to suggest existing tags as the user types.

### Filtering Implementation

Use `django-filter` library:

- `FilterSet` on `RecipeViewSet` for `category` (exact match) and `tags` (AND filter)
- **Tags AND filter:** Use `django_filters.ModelMultipleChoiceFilter` with `conjoined=True`. This is django-filter's built-in AND mode for M2M — no custom chaining logic needed. The library handles the SQL joins and `.distinct()` correctly.
- **Ingredient search:** Uses a chainable `RawSQL` annotation with PostgreSQL `EXISTS` — never `.raw()` (which breaks django-filter's queryset chaining):

```python
from django.db.models.expressions import RawSQL

# Inside the custom filter method:
queryset = queryset.annotate(
    has_ingredient=RawSQL(
        "EXISTS(SELECT 1 FROM jsonb_array_elements(ingredients) elem "
        "WHERE LOWER(elem->>'name') LIKE LOWER(%s))",
        (f"%{value}%",)
    )
).filter(has_ingredient=True)
```

This keeps the queryset pure and chainable so other filters (category, tags, search) compose correctly.

- `SearchFilter` for title and description text search
- `OrderingFilter` for sort options. Note: `?ordering=-fork_count` is acceptable for v0.1 but has a recency bias problem (old recipes with high fork counts dominate). A time-decay "Stir Score" will replace this in a future version.

### Performance

Update `RecipeViewSet` queryset to include `.prefetch_related("tags")` to prevent N+1 queries on the recipe list endpoint.

### Serializer Design

Use a custom `TagListField` for the `tags` field on `RecipeSerializer`:
- **On write:** Accepts `["vegan", "mexican"]` (list of strings). Does get-or-create for each tag name (lowercase, default kind="vibe" for new tags).
- **On read:** Returns `[{name, slug, kind}]` (list of tag objects via `TagSerializer`).

Implement as a `serializers.ListField(child=CharField())` for input, with a custom `create`/`update` method on `RecipeSerializer` to handle the M2M assignment. Use `TagSerializer` as a read-only nested serializer via `to_representation`.

**Concurrency safety:** The `create`/`update` methods must wrap tag get-or-create logic in `transaction.atomic()`. Because `Tag.name` is `unique=True`, two simultaneous requests creating the same novel tag (e.g. `#girldinner`) will race on `get_or_create` and one will hit an `IntegrityError`. The atomic block with a retry-on-conflict pattern (or simply catching `IntegrityError` and re-fetching) prevents 500 crashes.

### Tag Endpoint

`TagListView` — a simple `ListAPIView` with `pagination_class = None`. Not a ViewSet (read-only, no detail route needed).

## Frontend Impact (Out of Scope)

These are documented for future sessions, not built now:

- Filter bar UI on Stir the Pot page
- Tag picker on recipe create/edit forms
- Tag pills on RecipeCard
- "Similar recipes" engine

### Deployment Note: categoryFallback.ts

The category data migration will change values like `pasta` → `pasta_noodles`. The frontend's `getCategoryFallback()` in `categoryFallback.ts` uses old keys — it must be updated in the same session to avoid broken placeholder images. **Include a minimal update to `categoryFallback.ts` with new keys as part of this work.**

### Known Limitation: User-Created Tags

Tags created via the recipe create/update endpoint always default to `kind="vibe"`. There is no API surface for users to specify kind. Admin reclassification via Django admin is the expected workflow for promoting organic tags to proper categories.

## Testing

- **Model tests:** Tag creation, lowercase enforcement, slug generation, M2M relationship
- **Migration test:** Old category values map correctly to new values
- **API tests:** Filter by category, filter by tags (single and multi), ingredient search, text search, ordering
- **Serializer tests:** Tags accepted as string list on write, returned as objects on read
- **Tag endpoint tests:** List all, filter by kind

## Dependencies

- `django-filter` — add to requirements
