# Recipe Search & Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Tag model, expand category choices, and wire up filtering/search on the recipe list API.

**Architecture:** Hybrid Option C — structured `category` CharField (15 choices) + flexible `Tag` M2M with `kind` field (cuisine, dietary, ingredient, vibe). Ingredient search via PostgreSQL `jsonb_array_elements` EXISTS annotation. `django-filter` for all query composition.

**Tech Stack:** Django 5 + DRF + PostgreSQL, django-filter, pytest-django

**Spec:** `docs/plans/active/2026-03-21-recipe-filtering.spec.md`

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `backend/spoonfury/apps/recipes/models.py` | Add Tag model, update CATEGORY_CHOICES, add M2M field |
| Create | `backend/spoonfury/apps/recipes/filters.py` | RecipeFilter FilterSet |
| Modify | `backend/spoonfury/apps/recipes/serializers.py` | TagSerializer, update RecipeSerializer for tag read/write |
| Modify | `backend/spoonfury/apps/recipes/views.py` | Add filtering backends, TagListView |
| Modify | `backend/spoonfury/apps/recipes/urls.py` | Add `/tags/` endpoint |
| Modify | `backend/spoonfury/apps/recipes/admin.py` | Register Tag, update RecipeAdmin |
| Modify | `backend/requirements.txt` | Add django-filter |
| Modify | `backend/config/settings.py` | Add django_filters to INSTALLED_APPS |
| Create | `backend/spoonfury/apps/recipes/migrations/XXXX_add_tag_model.py` | Auto-generated |
| Create | `backend/spoonfury/apps/recipes/migrations/XXXX_migrate_categories.py` | Data migration (RunPython) |
| Create | `backend/spoonfury/apps/recipes/migrations/XXXX_seed_tags.py` | Seed data migration (RunPython) |
| Create | `backend/spoonfury/apps/recipes/tests/test_tag_model.py` | Tag model unit tests |
| Create | `backend/spoonfury/apps/recipes/tests/test_filters.py` | Filtering API tests |
| Create | `backend/spoonfury/apps/recipes/tests/test_tag_api.py` | Tag endpoint tests |
| Create | `backend/spoonfury/apps/recipes/tests/test_tag_serializer.py` | Tag read/write serializer tests |
| Modify | `frontend/src/lib/categoryFallback.ts` | Update keys to match new CATEGORY_CHOICES |
| Modify | `frontend/src/types.ts` | Add Tag interface, update Recipe interface |

---

## Pre-Flight

### Task 0: Setup

- [ ] **Step 0.1: Create worktree branch**

```bash
cd G:/Projects/dev/1.work/Spoonfury
git branch recipe-filtering
git worktree add .worktrees/recipe-filtering recipe-filtering
```

- [ ] **Step 0.2: Install django-filter**

```bash
cd .worktrees/recipe-filtering/backend
echo "django-filter==24.3" >> requirements.txt
../../.venv/Scripts/pip install django-filter==24.3
```

- [ ] **Step 0.3: Add django_filters to INSTALLED_APPS**

In `backend/config/settings.py`, find the `INSTALLED_APPS` list and add `"django_filters"` after `"rest_framework"`.

**Note:** Do NOT add `DEFAULT_FILTER_BACKENDS` to `REST_FRAMEWORK` settings globally — filter backends will be set per-ViewSet on `RecipeViewSet` only, to avoid side effects on books/shopping apps.

**Note:** The `backend/spoonfury/apps/recipes/tests/` directory already exists with `__init__.py`, `test_api.py`, `test_fork.py`, and `test_models.py`. No need to create it.

- [ ] **Step 0.4: Commit setup**

```bash
git add requirements.txt config/settings.py
git commit -m "chore: add django-filter dependency"
```

---

## Task 1: Tag Model

**Files:**
- Modify: `backend/spoonfury/apps/recipes/models.py`
- Create: `backend/spoonfury/apps/recipes/tests/test_tag_model.py`

- [ ] **Step 1.1: Write Tag model tests**

Create `backend/spoonfury/apps/recipes/tests/test_tag_model.py`:

```python
import pytest
from django.db import IntegrityError
from spoonfury.apps.recipes.models import Tag


@pytest.mark.django_db
class TestTagModel:
    def test_create_tag(self):
        tag = Tag.objects.create(name="Mexican", kind="cuisine")
        assert tag.name == "mexican"  # lowercase enforced
        assert tag.slug == "mexican"  # auto-generated
        assert tag.kind == "cuisine"

    def test_slug_auto_generated(self):
        tag = Tag.objects.create(name="Gluten Free", kind="dietary")
        assert tag.slug == "gluten-free"

    def test_name_unique(self):
        Tag.objects.create(name="vegan", kind="dietary")
        with pytest.raises(IntegrityError):
            Tag.objects.create(name="vegan", kind="vibe")

    def test_name_stripped_and_lowered(self):
        tag = Tag.objects.create(name="  Italian  ", kind="cuisine")
        assert tag.name == "italian"

    def test_default_kind_is_vibe(self):
        tag = Tag.objects.create(name="girldinner")
        assert tag.kind == "vibe"

    def test_ordering(self):
        Tag.objects.create(name="zebra", kind="cuisine")
        Tag.objects.create(name="alpha", kind="cuisine")
        Tag.objects.create(name="beta", kind="dietary")
        names = list(Tag.objects.values_list("name", flat=True))
        assert names == ["alpha", "zebra", "beta"]

    def test_str(self):
        tag = Tag.objects.create(name="vegan", kind="dietary")
        assert str(tag) == "vegan"
```

- [ ] **Step 1.2: Run tests — verify they fail**

```bash
cd .worktrees/recipe-filtering/backend
../../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_tag_model.py -v
```

Expected: FAIL — `ImportError: cannot import name 'Tag' from 'spoonfury.apps.recipes.models'`

- [ ] **Step 1.3: Implement Tag model**

In `backend/spoonfury/apps/recipes/models.py`, add above the `Recipe` class (after imports):

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

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.name = self.name.lower().strip()
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
```

Then add the M2M field to the `Recipe` model (after `image_url` on line 40):

```python
    tags = models.ManyToManyField("Tag", blank=True, related_name="recipes")
```

- [ ] **Step 1.4: Generate and run migrations**

```bash
cd .worktrees/recipe-filtering/backend
../../.venv/Scripts/python manage.py makemigrations recipes
../../.venv/Scripts/python manage.py migrate
```

- [ ] **Step 1.5: Run tests — verify they pass**

```bash
../../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_tag_model.py -v
```

Expected: All 7 tests PASS.

- [ ] **Step 1.6: Commit**

```bash
git add spoonfury/apps/recipes/models.py spoonfury/apps/recipes/migrations/ spoonfury/apps/recipes/tests/test_tag_model.py
git commit -m "feat: add Tag model with kind field and M2M on Recipe"
```

---

## Task 2: Category Data Migration

**Files:**
- Create: `backend/spoonfury/apps/recipes/migrations/XXXX_migrate_category_values.py` (hand-written)
- Modify: `backend/spoonfury/apps/recipes/models.py` (update CATEGORY_CHOICES)

- [ ] **Step 2.1: Create the data migration**

```bash
cd .worktrees/recipe-filtering/backend
../../.venv/Scripts/python manage.py makemigrations recipes --empty --name migrate_category_values
```

Edit the generated file to contain:

```python
from django.db import migrations


CATEGORY_MAP = {
    "soup": "soup",
    "pasta": "pasta_noodles",
    "bake": "casserole_bake",
    "salad": "salad",
    "grill": "meat_seafood",
    "breakfast": "breakfast_bakery",
    "dessert": "dessert",
    "drink": "drink",
    "snack": "snack_app",
    "other": "other",
}


def migrate_categories_forward(apps, schema_editor):
    Recipe = apps.get_model("recipes", "Recipe")
    for old_val, new_val in CATEGORY_MAP.items():
        Recipe.objects.filter(category=old_val).update(category=new_val)


def migrate_categories_reverse(apps, schema_editor):
    REVERSE_MAP = {v: k for k, v in CATEGORY_MAP.items()}
    Recipe = apps.get_model("recipes", "Recipe")
    for new_val, old_val in REVERSE_MAP.items():
        Recipe.objects.filter(category=new_val).update(category=old_val)


class Migration(migrations.Migration):
    dependencies = [
        # This must depend on the previous migration (the Tag model one)
        ("recipes", "XXXX_previous"),  # UPDATE to actual migration name
    ]

    operations = [
        migrations.RunPython(
            migrate_categories_forward,
            migrate_categories_reverse,
        ),
    ]
```

- [ ] **Step 2.2: Update CATEGORY_CHOICES in models.py**

Replace lines 6-17 of `backend/spoonfury/apps/recipes/models.py`:

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

- [ ] **Step 2.3: Update existing test files for new category values**

The existing test files use old category keys that will now fail Django validation. Update:

- `backend/spoonfury/apps/recipes/tests/test_api.py` — replace all old category values with new ones (e.g. `"pasta"` → `"pasta_noodles"`, `"soup"` stays `"soup"`, `"breakfast"` → `"breakfast_bakery"`, `"snack"` → `"snack_app"`, `"grill"` → `"meat_seafood"`, `"bake"` → `"casserole_bake"`)
- `backend/spoonfury/apps/recipes/tests/test_fork.py` — same replacements
- `backend/spoonfury/apps/recipes/tests/test_models.py` — same replacements if any category values are used

Search each file for the old category strings and replace with the mapped new values from the CATEGORY_MAP.

- [ ] **Step 2.4: Generate choices migration and run all**

```bash
../../.venv/Scripts/python manage.py makemigrations recipes
../../.venv/Scripts/python manage.py migrate
```

This creates a migration that updates the `choices` kwarg on the CharField (no-op at DB level, but records the new valid choices).

- [ ] **Step 2.5: Verify migration worked**

```bash
../../.venv/Scripts/python manage.py shell -c "
from spoonfury.apps.recipes.models import Recipe
cats = Recipe.objects.values_list('category', flat=True).distinct()
print('Categories in DB:', list(cats))
"
```

Expected: Only new category values appear (no `pasta`, `bake`, `grill`, `breakfast`, `snack`).

- [ ] **Step 2.6: Commit**

```bash
git add spoonfury/apps/recipes/models.py spoonfury/apps/recipes/migrations/ spoonfury/apps/recipes/tests/
git commit -m "feat: expand category choices to 15 with data migration"
```

---

## Task 3: Seed Tags Migration

**Files:**
- Create: `backend/spoonfury/apps/recipes/migrations/XXXX_seed_tags.py`

- [ ] **Step 3.1: Create seed data migration**

```bash
../../.venv/Scripts/python manage.py makemigrations recipes --empty --name seed_tags
```

Edit the generated file:

```python
from django.db import migrations
from django.utils.text import slugify


SEED_TAGS = {
    "cuisine": [
        "mediterranean", "mexican", "asian", "american",
        "chinese", "italian", "japanese", "indian",
    ],
    "dietary": ["vegetarian", "vegan", "healthy"],
    "ingredient": ["steak", "seafood", "chicken", "sushi"],
}


def seed_tags_forward(apps, schema_editor):
    Tag = apps.get_model("recipes", "Tag")
    for kind, names in SEED_TAGS.items():
        for name in names:
            Tag.objects.get_or_create(
                name=name,
                defaults={"slug": slugify(name), "kind": kind},
            )


def seed_tags_reverse(apps, schema_editor):
    Tag = apps.get_model("recipes", "Tag")
    all_names = [n for names in SEED_TAGS.values() for n in names]
    Tag.objects.filter(name__in=all_names).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("recipes", "XXXX_previous"),  # UPDATE to actual migration name
    ]

    operations = [
        migrations.RunPython(seed_tags_forward, seed_tags_reverse),
    ]
```

- [ ] **Step 3.2: Run migration**

```bash
../../.venv/Scripts/python manage.py migrate
```

- [ ] **Step 3.3: Verify seed data**

```bash
../../.venv/Scripts/python manage.py shell -c "
from spoonfury.apps.recipes.models import Tag
for kind in ['cuisine', 'dietary', 'ingredient']:
    tags = Tag.objects.filter(kind=kind).values_list('name', flat=True)
    print(f'{kind}: {list(tags)}')
"
```

Expected: 8 cuisine, 3 dietary, 4 ingredient tags.

- [ ] **Step 3.4: Commit**

```bash
git add spoonfury/apps/recipes/migrations/
git commit -m "feat: seed 15 initial tags (cuisine, dietary, ingredient)"
```

---

## Task 4: Tag Serializer & RecipeSerializer Update

**Files:**
- Modify: `backend/spoonfury/apps/recipes/serializers.py`
- Create: `backend/spoonfury/apps/recipes/tests/test_tag_serializer.py`

- [ ] **Step 4.1: Write serializer tests**

Create `backend/spoonfury/apps/recipes/tests/test_tag_serializer.py`:

```python
import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from spoonfury.apps.recipes.models import Tag, Recipe
from spoonfury.apps.recipes.serializers import RecipeSerializer, TagSerializer

User = get_user_model()


@pytest.mark.django_db
class TestTagSerializer:
    def test_serialize_tag(self):
        tag = Tag.objects.create(name="vegan", kind="dietary")
        data = TagSerializer(tag).data
        assert data == {"name": "vegan", "slug": "vegan", "kind": "dietary"}


@pytest.mark.django_db
class TestRecipeSerializerTags:
    @pytest.fixture
    def user(self):
        return User.objects.create_user(username="chef", password="pass123")

    @pytest.fixture
    def request_context(self, user):
        factory = APIRequestFactory()
        request = factory.post("/api/recipes/")
        request.user = user
        return {"request": request}

    def test_create_recipe_with_existing_tags(self, request_context):
        Tag.objects.create(name="vegan", kind="dietary")
        Tag.objects.create(name="mexican", kind="cuisine")
        data = {
            "title": "Vegan Tacos",
            "description": "Tasty plant tacos",
            "serves": "4",
            "category": "snack_app",
            "ingredients": [{"name": "tortilla", "quantity": "4", "unit": "pcs", "note": ""}],
            "instructions": "Fill and fold.",
            "tags": ["vegan", "mexican"],
        }
        serializer = RecipeSerializer(data=data, context=request_context)
        assert serializer.is_valid(), serializer.errors
        recipe = serializer.save()
        assert set(recipe.tags.values_list("name", flat=True)) == {"vegan", "mexican"}

    def test_create_recipe_with_new_tag_defaults_to_vibe(self, request_context):
        data = {
            "title": "Mystery Bowl",
            "description": "A surprise",
            "serves": "2",
            "category": "bowl",
            "ingredients": [{"name": "rice", "quantity": "1", "unit": "cup", "note": ""}],
            "instructions": "Cook it.",
            "tags": ["girldinner"],
        }
        serializer = RecipeSerializer(data=data, context=request_context)
        assert serializer.is_valid(), serializer.errors
        recipe = serializer.save()
        tag = Tag.objects.get(name="girldinner")
        assert tag.kind == "vibe"
        assert tag in recipe.tags.all()

    def test_read_recipe_includes_tag_objects(self, request_context, user):
        tag = Tag.objects.create(name="italian", kind="cuisine")
        recipe = Recipe.objects.create(
            title="Pasta", description="Yum", serves="2",
            category="pasta_noodles", ingredients=[], instructions="Boil",
            author=user,
        )
        recipe.tags.add(tag)
        data = RecipeSerializer(recipe, context=request_context).data
        assert data["tags"] == [{"name": "italian", "slug": "italian", "kind": "cuisine"}]

    def test_update_recipe_tags(self, request_context, user):
        tag_v = Tag.objects.create(name="vegan", kind="dietary")
        tag_m = Tag.objects.create(name="mexican", kind="cuisine")
        recipe = Recipe.objects.create(
            title="Tacos", description="Good", serves="4",
            category="snack_app", ingredients=[], instructions="Cook",
            author=user,
        )
        recipe.tags.add(tag_v)
        # Update to different tags
        serializer = RecipeSerializer(
            recipe, data={"tags": ["mexican"]}, partial=True, context=request_context
        )
        assert serializer.is_valid(), serializer.errors
        updated = serializer.save()
        assert list(updated.tags.values_list("name", flat=True)) == ["mexican"]

    def test_update_without_tags_field_preserves_existing(self, request_context, user):
        tag = Tag.objects.create(name="italian", kind="cuisine")
        recipe = Recipe.objects.create(
            title="Pasta", description="Yum", serves="2",
            category="pasta_noodles", ingredients=[], instructions="Boil",
            author=user,
        )
        recipe.tags.add(tag)
        # PATCH without tags field — should not clear existing tags
        serializer = RecipeSerializer(
            recipe, data={"title": "Better Pasta"}, partial=True, context=request_context
        )
        assert serializer.is_valid(), serializer.errors
        updated = serializer.save()
        assert updated.tags.count() == 1

    def test_create_recipe_without_tags(self, request_context):
        data = {
            "title": "Plain Rice",
            "description": "Just rice",
            "serves": "1",
            "category": "side_dish",
            "ingredients": [{"name": "rice", "quantity": "1", "unit": "cup", "note": ""}],
            "instructions": "Cook.",
        }
        serializer = RecipeSerializer(data=data, context=request_context)
        assert serializer.is_valid(), serializer.errors
        recipe = serializer.save()
        assert recipe.tags.count() == 0
```

- [ ] **Step 4.2: Run tests — verify they fail**

```bash
../../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_tag_serializer.py -v
```

Expected: FAIL — `ImportError: cannot import name 'TagSerializer'`

- [ ] **Step 4.3: Implement serializers**

Replace `backend/spoonfury/apps/recipes/serializers.py` entirely:

```python
from django.db import IntegrityError, transaction
from rest_framework import serializers
from .models import Recipe, Tag


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["name", "slug", "kind"]
        read_only_fields = ["slug", "kind"]


class RecipeSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    author_display_name = serializers.CharField(source="author.display_name", read_only=True)
    parent_recipe_slug = serializers.SlugRelatedField(
        source="parent_recipe", slug_field="slug", read_only=True
    )
    parent_recipe_title = serializers.CharField(
        source="parent_recipe.title", read_only=True
    )
    parent_recipe_author = serializers.CharField(
        source="parent_recipe.author.username", read_only=True
    )

    # CharField instead of URLField — accepts both relative paths (/media/...)
    # from the file upload endpoint and full URLs pasted by the user.
    image_url = serializers.CharField(allow_blank=True, required=False, default="")

    # Tags: accept list of strings on write, return full objects on read
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        default=list,
    )

    class Meta:
        model = Recipe
        fields = [
            "id", "slug", "title", "description", "serves",
            "ingredients", "instructions", "notes", "category",
            "image_url", "tags",
            "author_username", "author_display_name",
            "parent_recipe_slug", "parent_recipe_title", "parent_recipe_author",
            "fork_count", "created_at",
        ]
        read_only_fields = ["slug", "fork_count", "created_at", "author_username"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["tags"] = TagSerializer(instance.tags.all(), many=True).data
        return data

    def _resolve_tags(self, tag_names):
        """Get-or-create tags with race condition safety.
        Each get_or_create runs in its own savepoint so that an IntegrityError
        on one tag does not abort the outer transaction.
        """
        tags = []
        for name in tag_names:
            name = name.lower().strip()
            if not name:
                continue
            try:
                with transaction.atomic():
                    tag, _ = Tag.objects.get_or_create(name=name)
            except IntegrityError:
                tag = Tag.objects.get(name=name)
            tags.append(tag)
        return tags

    def create(self, validated_data):
        tag_names = validated_data.pop("tags", [])
        validated_data["author"] = self.context["request"].user
        recipe = super().create(validated_data)
        if tag_names:
            recipe.tags.set(self._resolve_tags(tag_names))
        return recipe

    def update(self, instance, validated_data):
        tag_names = validated_data.pop("tags", None)
        recipe = super().update(instance, validated_data)
        if tag_names is not None:
            recipe.tags.set(self._resolve_tags(tag_names))
        return recipe
```

- [ ] **Step 4.4: Run tests — verify they pass**

```bash
../../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_tag_serializer.py -v
```

Expected: All 7 tests PASS.

- [ ] **Step 4.5: Commit**

```bash
git add spoonfury/apps/recipes/serializers.py spoonfury/apps/recipes/tests/test_tag_serializer.py
git commit -m "feat: TagSerializer + RecipeSerializer tag read/write with atomic safety"
```

---

## Task 5: Recipe Filters

**Files:**
- Create: `backend/spoonfury/apps/recipes/filters.py`
- Create: `backend/spoonfury/apps/recipes/tests/test_filters.py`

- [ ] **Step 5.1: Write filter tests**

Create `backend/spoonfury/apps/recipes/tests/test_filters.py`:

```python
import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe, Tag


def make_recipe(user, title, category="other", ingredients=None, **kwargs):
    """Helper to create recipes with unique slugs."""
    return Recipe.objects.create(
        title=title,
        description=f"Desc for {title}",
        serves="4",
        category=category,
        ingredients=ingredients or [],
        instructions="Do the thing.",
        author=user,
        **kwargs,
    )


@pytest.mark.django_db
class TestRecipeFilters:
    @pytest.fixture
    def recipes(self, user):
        t_vegan = Tag.objects.create(name="vegan", kind="dietary")
        t_mexican = Tag.objects.create(name="mexican", kind="cuisine")
        t_italian = Tag.objects.create(name="italian", kind="cuisine")

        r1 = make_recipe(user, "Vegan Tacos", "snack_app",
                         ingredients=[{"name": "tortilla", "quantity": "4", "unit": "pcs", "note": ""}])
        r1.tags.set([t_vegan, t_mexican])

        r2 = make_recipe(user, "Vegan Pasta", "pasta_noodles",
                         ingredients=[{"name": "pasta", "quantity": "1", "unit": "lb", "note": ""},
                                      {"name": "tomato", "quantity": "2", "unit": "pcs", "note": ""}])
        r2.tags.set([t_vegan, t_italian])

        r3 = make_recipe(user, "Steak Dinner", "meat_seafood",
                         ingredients=[{"name": "ribeye steak", "quantity": "1", "unit": "lb", "note": ""}])
        r3.tags.set([])

        return r1, r2, r3

    def test_filter_by_category(self, api_client, recipes):
        url = reverse("recipe-list") + "?category=pasta_noodles"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles == ["Vegan Pasta"]

    def test_filter_by_single_tag(self, api_client, recipes):
        url = reverse("recipe-list") + "?tags=vegan"
        resp = api_client.get(url)
        titles = sorted([r["title"] for r in resp.data["results"]])
        assert titles == ["Vegan Pasta", "Vegan Tacos"]

    def test_filter_by_multiple_tags_and_logic(self, api_client, recipes):
        url = reverse("recipe-list") + "?tags=vegan&tags=mexican"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles == ["Vegan Tacos"]

    def test_filter_by_ingredient(self, api_client, recipes):
        url = reverse("recipe-list") + "?ingredient=steak"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles == ["Steak Dinner"]

    def test_ingredient_search_case_insensitive(self, api_client, recipes):
        url = reverse("recipe-list") + "?ingredient=TORTILLA"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles == ["Vegan Tacos"]

    def test_search_by_title(self, api_client, recipes):
        url = reverse("recipe-list") + "?search=Tacos"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles == ["Vegan Tacos"]

    def test_ordering_by_fork_count(self, api_client, recipes):
        r1, r2, r3 = recipes
        r3.fork_count = 10
        r3.save()
        url = reverse("recipe-list") + "?ordering=-fork_count"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles[0] == "Steak Dinner"

    def test_ordering_by_title(self, api_client, recipes):
        url = reverse("recipe-list") + "?ordering=title"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles == sorted(titles)

    def test_combined_category_and_tag_filter(self, api_client, recipes):
        url = reverse("recipe-list") + "?category=pasta_noodles&tags=vegan"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles == ["Vegan Pasta"]

    def test_no_results_for_nonexistent_tag(self, api_client, recipes):
        url = reverse("recipe-list") + "?tags=keto"
        resp = api_client.get(url)
        assert resp.data["results"] == []
```

- [ ] **Step 5.2: Run tests — verify they fail**

```bash
../../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_filters.py -v
```

Expected: FAIL — no filtering is wired up yet.

- [ ] **Step 5.3: Create filters.py**

Create `backend/spoonfury/apps/recipes/filters.py`:

```python
import django_filters
from django.db import models as db_models
from django.db.models.expressions import RawSQL
from .models import Recipe, Tag


class RecipeFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="category", lookup_expr="exact")
    tags = django_filters.ModelMultipleChoiceFilter(
        field_name="tags__name",
        to_field_name="name",
        queryset=Tag.objects.all(),
        conjoined=True,  # AND logic — recipe must have ALL specified tags
    )
    ingredient = django_filters.CharFilter(method="filter_by_ingredient")

    class Meta:
        model = Recipe
        fields = ["category", "tags", "ingredient"]

    def filter_by_ingredient(self, queryset, name, value):
        if not value:
            return queryset
        # Escape SQL LIKE wildcards in user input
        safe_value = value.replace("%", r"\%").replace("_", r"\_")
        return queryset.annotate(
            has_ingredient=RawSQL(
                "EXISTS(SELECT 1 FROM jsonb_array_elements(ingredients) elem "
                "WHERE LOWER(elem->>'name') LIKE LOWER(%s))",
                (f"%{safe_value}%",),
                output_field=db_models.BooleanField(),
            )
        ).filter(has_ingredient=True)
```

- [ ] **Step 5.4: Wire up filters in views.py**

Replace `backend/spoonfury/apps/recipes/views.py`:

```python
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import Recipe
from .serializers import RecipeSerializer
from .filters import RecipeFilter


class RecipeViewSet(viewsets.ModelViewSet):
    queryset = (
        Recipe.objects
        .select_related("author", "parent_recipe__author")
        .prefetch_related("tags")
        .all()
    )
    lookup_field = "slug"
    serializer_class = RecipeSerializer
    # Filter backends set per-ViewSet (not globally) to avoid side effects on other apps
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = RecipeFilter
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "fork_count", "title"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_update(self, serializer):
        if serializer.instance.author != self.request.user:
            raise PermissionDenied("You can only edit your own recipes.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author != self.request.user:
            raise PermissionDenied("You can only delete your own recipes.")
        instance.delete()
```

- [ ] **Step 5.5: Run tests — verify they pass**

```bash
../../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_filters.py -v
```

Expected: All 10 tests PASS.

- [ ] **Step 5.6: Commit**

```bash
git add spoonfury/apps/recipes/filters.py spoonfury/apps/recipes/views.py spoonfury/apps/recipes/tests/test_filters.py
git commit -m "feat: recipe filtering by category, tags (AND), ingredient, search, ordering"
```

---

## Task 6: Tag API Endpoint

**Files:**
- Modify: `backend/spoonfury/apps/recipes/views.py`
- Modify: `backend/spoonfury/apps/recipes/urls.py`
- Create: `backend/spoonfury/apps/recipes/tests/test_tag_api.py`

- [ ] **Step 6.1: Write tag endpoint tests**

Create `backend/spoonfury/apps/recipes/tests/test_tag_api.py`:

```python
import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Tag


@pytest.mark.django_db
class TestTagListEndpoint:
    @pytest.fixture(autouse=True)
    def seed_tags(self):
        Tag.objects.create(name="mexican", kind="cuisine")
        Tag.objects.create(name="italian", kind="cuisine")
        Tag.objects.create(name="vegan", kind="dietary")
        Tag.objects.create(name="healthy", kind="vibe")

    def test_list_all_tags(self, api_client):
        resp = api_client.get(reverse("tag-list"))
        assert resp.status_code == 200
        assert len(resp.data) == 4  # no pagination wrapping

    def test_filter_by_kind(self, api_client):
        resp = api_client.get(reverse("tag-list") + "?kind=cuisine")
        names = [t["name"] for t in resp.data]
        assert set(names) == {"mexican", "italian"}

    def test_search_by_name(self, api_client):
        resp = api_client.get(reverse("tag-list") + "?search=veg")
        names = [t["name"] for t in resp.data]
        assert names == ["vegan"]

    def test_search_case_insensitive(self, api_client):
        resp = api_client.get(reverse("tag-list") + "?search=MEXICAN")
        assert len(resp.data) == 1
        assert resp.data[0]["name"] == "mexican"

    def test_tag_response_shape(self, api_client):
        resp = api_client.get(reverse("tag-list") + "?kind=dietary")
        tag = resp.data[0]
        assert set(tag.keys()) == {"name", "slug", "kind"}

    def test_endpoint_is_public(self, api_client):
        # api_client is unauthenticated
        resp = api_client.get(reverse("tag-list"))
        assert resp.status_code == 200
```

- [ ] **Step 6.2: Run tests — verify they fail**

```bash
../../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_tag_api.py -v
```

Expected: FAIL — `NoReverseMatch: 'tag-list' is not a valid view name`

- [ ] **Step 6.3: Add TagListView to views.py**

Append to `backend/spoonfury/apps/recipes/views.py`:

```python
from rest_framework.generics import ListAPIView
from .models import Tag
from .serializers import TagSerializer


class TagListView(ListAPIView):
    serializer_class = TagSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = Tag.objects.all()
        kind = self.request.query_params.get("kind")
        if kind:
            qs = qs.filter(kind=kind)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs
```

- [ ] **Step 6.4: Add URL route**

In `backend/spoonfury/apps/recipes/urls.py`, add the import and path:

```python
from .views import RecipeViewSet, TagListView
```

Add to `urlpatterns` (before the router URLs):

```python
    path("tags/", TagListView.as_view(), name="tag-list"),
```

The full `urlpatterns` should look like:

```python
urlpatterns = [
    path("recipes/upload-image/", upload_recipe_image, name="recipe-upload-image"),
    path("tags/", TagListView.as_view(), name="tag-list"),
] + router.urls + [
    path("recipes/<slug:slug>/fork/", fork_recipe, name="recipe-fork"),
]
```

- [ ] **Step 6.5: Run tests — verify they pass**

```bash
../../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_tag_api.py -v
```

Expected: All 6 tests PASS.

- [ ] **Step 6.6: Commit**

```bash
git add spoonfury/apps/recipes/views.py spoonfury/apps/recipes/urls.py spoonfury/apps/recipes/tests/test_tag_api.py
git commit -m "feat: add GET /api/tags/ endpoint with kind filter and search"
```

---

## Task 7: Admin Registration

**Files:**
- Modify: `backend/spoonfury/apps/recipes/admin.py`

- [ ] **Step 7.1: Update admin.py**

Replace `backend/spoonfury/apps/recipes/admin.py`:

```python
from django.contrib import admin
from .models import Recipe, Tag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "kind", "slug"]
    list_filter = ["kind"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "category", "fork_count", "created_at"]
    list_filter = ["category", "tags"]
    search_fields = ["title", "author__username"]
    readonly_fields = ["slug", "fork_count", "created_at", "updated_at"]
    filter_horizontal = ["tags"]
```

- [ ] **Step 7.2: Commit**

```bash
git add spoonfury/apps/recipes/admin.py
git commit -m "feat: register Tag in admin with kind filter and recipe tag picker"
```

---

## Task 8: Frontend Category Fallback Update

**Files:**
- Modify: `frontend/src/lib/categoryFallback.ts`
- Modify: `frontend/src/types.ts`

- [ ] **Step 8.1: Update categoryFallback.ts**

Replace the `CATEGORY_MAP` in `frontend/src/lib/categoryFallback.ts` (lines 22-33):

```typescript
const CATEGORY_MAP: Record<string, CategoryFallback> = {
  sandwich_burger:  { emoji: "🍔", gradient: "from-amber-400 to-amber-600" },
  pizza:            { emoji: "🍕", gradient: "from-red-400 to-orange-500" },
  soup:             { emoji: "🍲", gradient: "from-amber-400 to-amber-600" },
  salad:            { emoji: "🥗", gradient: "from-green-400 to-green-600" },
  pasta_noodles:    { emoji: "🍝", gradient: "from-orange-400 to-orange-600" },
  meat_seafood:     { emoji: "🥩", gradient: "from-red-400 to-red-600" },
  bowl:             { emoji: "🥣", gradient: "from-teal-400 to-teal-600" },
  casserole_bake:   { emoji: "🍞", gradient: "from-amber-300 to-amber-500" },
  side_dish:        { emoji: "🥦", gradient: "from-lime-400 to-lime-600" },
  sauce_condiment:  { emoji: "🫙", gradient: "from-rose-400 to-rose-600" },
  breakfast_bakery: { emoji: "🍳", gradient: "from-yellow-300 to-yellow-500" },
  dessert:          { emoji: "🍰", gradient: "from-pink-300 to-pink-500" },
  drink:            { emoji: "🍹", gradient: "from-cyan-400 to-cyan-600" },
  snack_app:        { emoji: "🍿", gradient: "from-violet-400 to-violet-600" },
  other:            { emoji: "🍽️", gradient: "from-slate-400 to-slate-500" },
};
```

- [ ] **Step 8.2: Update types.ts**

Add `Tag` interface and update `Recipe` in `frontend/src/types.ts`:

After the `Ingredient` interface (line 7), add:

```typescript
export interface Tag {
  name: string;
  slug: string;
  kind: "cuisine" | "dietary" | "ingredient" | "vibe";
}
```

In the `Recipe` interface, add after `category: string;` (line 15):

```typescript
  tags?: Tag[];
```

- [ ] **Step 8.3: Commit**

```bash
cd .worktrees/recipe-filtering
git add frontend/src/lib/categoryFallback.ts frontend/src/types.ts
git commit -m "feat: update frontend category keys and add Tag type"
```

---

## Task 9: Full Test Suite Run & Cleanup

- [ ] **Step 9.1: Run all backend tests**

```bash
cd .worktrees/recipe-filtering/backend
../../.venv/Scripts/pytest -v
```

Expected: All tests pass (existing + new).

- [ ] **Step 9.2: Run frontend type check**

```bash
cd .worktrees/recipe-filtering/frontend
npx tsc --noEmit
```

Fix any type errors from the `tags` field addition. Existing code that doesn't use `tags` should be unaffected since it's optional.

- [ ] **Step 9.3: Verify dev server starts**

```bash
cd .worktrees/recipe-filtering/backend
../../.venv/Scripts/python manage.py runserver
```

Hit `http://localhost:8000/api/recipes/` and `http://localhost:8000/api/tags/` to verify both endpoints respond.

- [ ] **Step 9.4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: test suite and type check cleanup"
```

---

## Design Decisions (for the implementing agent)

- **Fork tag inheritance:** The `fork_recipe` view in `views_fork.py` does NOT currently copy tags to forked recipes. This is intentional for now — forkers should choose their own tags. If the user later wants forks to inherit parent tags, add `recipe.tags.set(parent.tags.all())` after the fork create in `views_fork.py`.
- **Filter backends are per-ViewSet:** Set on `RecipeViewSet` only, not in `REST_FRAMEWORK` global settings, to avoid unintended side effects on books/shopping apps.
