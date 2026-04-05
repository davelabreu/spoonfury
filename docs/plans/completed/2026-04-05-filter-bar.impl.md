# Filter Bar & Discovery Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Stir the Pot page into a discovery-first experience with hero search banner, three-tier chip filter shelf, "Hot this month" featured strip, and filtered recipe grid.

**Architecture:** Backend seeds new tags and adds a hot-recipes annotation. Frontend replaces the old HomePage layout with new SearchBanner, FilterShelf, HotStrip, and GridCard components. Filter state is local, URL-synced via useSearchParams.

**Tech Stack:** Django 5 + DRF + django-filter, React 19 + Vite + Tailwind 4 + Shadcn UI (Badge, Button, Input, Select)

**Spec:** `docs/plans/active/2026-04-05-filter-bar.spec.md`
**Mockup:** `docs/visual-mockups/filter-bar-v6.html`

---

## Task 1: Seed Cuisine & Lifestyle Tags (Backend)

**Files:**
- Create: `backend/spoonfury/apps/recipes/migrations/0011_seed_filter_tags.py`
- Test: `backend/spoonfury/apps/recipes/tests/test_seed_filter_tags.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/spoonfury/apps/recipes/tests/test_seed_filter_tags.py
import pytest
from spoonfury.apps.recipes.models import Tag


@pytest.mark.django_db
class TestFilterTagSeeds:
    """Verify the seeded cuisine/lifestyle tags exist after migration."""

    EXPECTED_CUISINE = [
        ("american", "cuisine"),
        ("italian", "cuisine"),
        ("mexican", "cuisine"),
        ("asian", "cuisine"),
        ("european-iberian", "cuisine"),
        ("mediterranean", "cuisine"),
        ("latin-american", "cuisine"),
    ]

    EXPECTED_LIFESTYLE = [
        ("quick-easy", "vibe"),
        ("vegetarian-vegan", "dietary"),
        ("health-fitness", "vibe"),
        ("weeknight-staples", "vibe"),
        ("gluten-free-dairy-free", "dietary"),
        ("high-protein-keto", "dietary"),
        ("meal-prep-freezer", "vibe"),
    ]

    def test_cuisine_tags_exist(self):
        for slug, kind in self.EXPECTED_CUISINE:
            tag = Tag.objects.get(slug=slug)
            assert tag.kind == kind, f"{slug} should be kind={kind}, got {tag.kind}"

    def test_lifestyle_tags_exist(self):
        for slug, kind in self.EXPECTED_LIFESTYLE:
            tag = Tag.objects.get(slug=slug)
            assert tag.kind == kind, f"{slug} should be kind={kind}, got {tag.kind}"

    def test_no_duplicates(self):
        all_slugs = [s for s, _ in self.EXPECTED_CUISINE + self.EXPECTED_LIFESTYLE]
        for slug in all_slugs:
            assert Tag.objects.filter(slug=slug).count() == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_seed_filter_tags.py -v`
Expected: FAIL — tags don't exist yet.

- [ ] **Step 3: Create the data migration**

```python
# backend/spoonfury/apps/recipes/migrations/0011_seed_filter_tags.py
from django.db import migrations
from django.utils.text import slugify


FILTER_TAGS = {
    "cuisine": [
        # Some already seeded in 0007 (american, italian, mexican, asian, mediterranean)
        # This migration ensures the full set + correct slugs for new ones
        "european-iberian",
        "latin-american",
    ],
    "dietary": [
        "vegetarian-vegan",
        "gluten-free-dairy-free",
        "high-protein-keto",
    ],
    "vibe": [
        "quick-easy",
        "health-fitness",
        "weeknight-staples",
        "meal-prep-freezer",
    ],
}

# Display names for tags that differ from their slug
DISPLAY_NAMES = {
    "european-iberian": "european & iberian",
    "latin-american": "latin american",
    "vegetarian-vegan": "vegetarian / vegan",
    "gluten-free-dairy-free": "gluten-free / dairy-free",
    "high-protein-keto": "high protein / keto",
    "quick-easy": "quick & easy",
    "health-fitness": "health & fitness",
    "weeknight-staples": "weeknight staples",
    "meal-prep-freezer": "meal prep / freezer",
}


def seed_filter_tags_forward(apps, schema_editor):
    Tag = apps.get_model("recipes", "Tag")
    for kind, slugs in FILTER_TAGS.items():
        for tag_slug in slugs:
            name = DISPLAY_NAMES.get(tag_slug, tag_slug)
            Tag.objects.get_or_create(
                slug=tag_slug,
                defaults={"name": name, "kind": kind},
            )


def seed_filter_tags_reverse(apps, schema_editor):
    Tag = apps.get_model("recipes", "Tag")
    all_slugs = [s for slugs in FILTER_TAGS.values() for s in slugs]
    Tag.objects.filter(slug__in=all_slugs).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("recipes", "0010_moderationaction_authorstrike_recipereview"),
    ]

    operations = [
        migrations.RunPython(seed_filter_tags_forward, seed_filter_tags_reverse),
    ]
```

- [ ] **Step 4: Run the migration and test**

Run:
```bash
cd backend
../.venv/Scripts/python manage.py migrate
../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_seed_filter_tags.py -v
```
Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/spoonfury/apps/recipes/migrations/0011_seed_filter_tags.py backend/spoonfury/apps/recipes/tests/test_seed_filter_tags.py
git commit -m "feat: seed cuisine & lifestyle filter tags (migration 0011)"
```

---

## Task 2: Hot Recipes Endpoint (Backend)

**Files:**
- Modify: `backend/spoonfury/apps/recipes/views.py` (RecipeViewSet — add `hot_recipes` action)
- Test: `backend/spoonfury/apps/recipes/tests/test_hot_recipes.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/spoonfury/apps/recipes/tests/test_hot_recipes.py
import pytest
from datetime import timedelta
from django.utils import timezone
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe, RecipeReview


@pytest.fixture
def hot_recipe(user):
    """A published recipe with votes, published recently."""
    r = Recipe.objects.create(
        title="Hot Tacos",
        description="The hottest tacos in town.",
        serves="4",
        category="snack_app",
        ingredients=[{"name": "taco shells", "quantity": "8", "unit": "pcs", "note": ""}],
        instructions="Fill the shells with goodness. Eat immediately.",
        author=user,
        slug="hot-tacos",
        status="published",
        published_at=timezone.now() - timedelta(days=5),
        fork_count=10,
    )
    # Add 3 positive votes (current round = 0, but published recipes use round 0)
    for i in range(3):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        voter = User.objects.create_user(username=f"voter{i}", password="pass")
        RecipeReview.objects.create(
            recipe=r, reviewer=voter, review_round=0, is_positive=True, comment=""
        )
    return r


@pytest.fixture
def cold_recipe(user):
    """A published recipe with no votes — should not appear in hot."""
    return Recipe.objects.create(
        title="Cold Salad",
        description="A boring salad.",
        serves="2",
        category="salad",
        ingredients=[{"name": "lettuce", "quantity": "1", "unit": "head", "note": ""}],
        instructions="Wash the lettuce. Put it on a plate. Done.",
        author=user,
        slug="cold-salad",
        status="published",
        published_at=timezone.now() - timedelta(days=3),
        fork_count=0,
    )


@pytest.fixture
def old_recipe(user):
    """A recipe published 60 days ago — outside the 30-day window."""
    return Recipe.objects.create(
        title="Old Stew",
        description="Grandma's stew from ages ago.",
        serves="6",
        category="soup",
        ingredients=[{"name": "potatoes", "quantity": "4", "unit": "pcs", "note": ""}],
        instructions="Boil everything for a really long time. Serve warm.",
        author=user,
        slug="old-stew",
        status="published",
        published_at=timezone.now() - timedelta(days=60),
        fork_count=20,
    )


@pytest.mark.django_db
class TestHotRecipes:

    def test_returns_hot_recipes_with_votes(self, api_client, hot_recipe, cold_recipe):
        url = reverse("recipe-hot")
        resp = api_client.get(url)
        assert resp.status_code == 200
        slugs = [r["slug"] for r in resp.data]
        assert "hot-tacos" in slugs
        assert "cold-salad" not in slugs  # no votes

    def test_excludes_old_recipes(self, api_client, hot_recipe, old_recipe):
        # Give old_recipe a vote so it would qualify except for the date filter
        from django.contrib.auth import get_user_model
        User = get_user_model()
        voter = User.objects.create_user(username="oldvoter", password="pass")
        RecipeReview.objects.create(
            recipe=old_recipe, reviewer=voter, review_round=0,
            is_positive=True, comment="",
        )
        url = reverse("recipe-hot")
        resp = api_client.get(url)
        slugs = [r["slug"] for r in resp.data]
        assert "old-stew" not in slugs

    def test_returns_max_two(self, api_client, user):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        for i in range(5):
            r = Recipe.objects.create(
                title=f"Recipe {i}", description=f"Desc {i}", serves="2",
                category="pizza",
                ingredients=[{"name": "cheese", "quantity": "1", "unit": "cup", "note": ""}],
                instructions="Make the pizza. Bake it. Eat it with joy.",
                author=user, slug=f"recipe-{i}",
                status="published",
                published_at=timezone.now() - timedelta(days=1),
                fork_count=i * 2,
            )
            voter = User.objects.create_user(username=f"hotvoter{i}", password="pass")
            RecipeReview.objects.create(
                recipe=r, reviewer=voter, review_round=0,
                is_positive=True, comment="",
            )
        url = reverse("recipe-hot")
        resp = api_client.get(url)
        assert len(resp.data) <= 2

    def test_is_public(self, api_client, hot_recipe):
        url = reverse("recipe-hot")
        resp = api_client.get(url)
        assert resp.status_code == 200
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_hot_recipes.py -v`
Expected: FAIL — `NoReverseMatch: 'recipe-hot' is not a valid view name`.

- [ ] **Step 3: Implement the hot_recipes action**

Add to `backend/spoonfury/apps/recipes/views.py` — a new standalone view (keeps RecipeViewSet clean):

```python
# Add these imports at the top of views.py:
from django.db.models import Count, F, FloatField, Value
from django.db.models.functions import Coalesce, NullIf, Cast
from datetime import timedelta

# Add this view function after the existing force_publish view:

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def hot_recipes(request):
    """
    Return the top 2 'hot' recipes from the last 30 days.
    Score = (fork_count * 0.4) + (positive_vote_rate * 10 * 0.6)
    where positive_vote_rate = positive_votes / total_votes (0–1).
    Requires at least 1 vote.
    """
    cutoff = timezone.now() - timedelta(days=30)
    qs = (
        Recipe.objects
        .filter(status="published", published_at__gte=cutoff)
        .select_related("author", "parent_recipe__author")
        .prefetch_related("tags")
        .annotate(
            total_votes=Count("reviews"),
            positive_votes=Count("reviews", filter=Q(reviews__is_positive=True)),
        )
        .filter(total_votes__gte=1)
        .annotate(
            vote_rate=Cast(F("positive_votes"), FloatField()) / Cast(
                NullIf(F("total_votes"), Value(0)), FloatField()
            ),
            hot_score=F("fork_count") * 0.4 + Coalesce(F("vote_rate"), 0.0) * 10.0 * 0.6,
        )
        .order_by("-hot_score")[:2]
    )
    serializer = RecipeSerializer(qs, many=True, context={"request": request})
    return Response(serializer.data)
```

Register the URL in `backend/spoonfury/apps/recipes/urls.py` — add before the router urls:

```python
path("recipes/hot/", hot_recipes, name="recipe-hot"),
```

And update the import at the top of urls.py:

```python
from .views import RecipeViewSet, TagListView, force_publish, hot_recipes
```

- [ ] **Step 4: Run tests**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_hot_recipes.py -v`
Expected: All 4 tests PASS.

- [ ] **Step 5: Run the full test suite to check for regressions**

Run: `cd backend && ../.venv/Scripts/pytest -v`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/spoonfury/apps/recipes/views.py backend/spoonfury/apps/recipes/urls.py backend/spoonfury/apps/recipes/tests/test_hot_recipes.py
git commit -m "feat: add GET /api/recipes/hot/ endpoint for trending recipes"
```

---

## Task 3: Install Shadcn ToggleGroup Component

**Files:**
- Create: `frontend/src/components/ui/toggle-group.tsx` (via shadcn CLI)
- Create: `frontend/src/components/ui/toggle.tsx` (dependency)

- [ ] **Step 1: Install toggle-group via shadcn CLI**

Run:
```bash
cd frontend
npx shadcn@latest add toggle-group
```

This installs both `toggle.tsx` and `toggle-group.tsx` in `src/components/ui/`. The ToggleGroup from Radix gives us accessible single-select radio behavior out of the box — exactly what the filter chips need.

- [ ] **Step 2: Verify installation**

Check that both files exist:
```bash
ls frontend/src/components/ui/toggle.tsx frontend/src/components/ui/toggle-group.tsx
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ui/toggle.tsx frontend/src/components/ui/toggle-group.tsx frontend/package.json frontend/package-lock.json
git commit -m "chore: install shadcn toggle-group component"
```

---

## Task 4: SearchBanner Component (Frontend)

**Files:**
- Create: `frontend/src/components/SearchBanner.tsx`

- [ ] **Step 1: Create SearchBanner**

```tsx
// frontend/src/components/SearchBanner.tsx
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchBannerProps {
  initialQuery: string;
  onSearch: (query: string) => void;
}

export function SearchBanner({ initialQuery, onSearch }: SearchBannerProps) {
  const [query, setQuery] = useState(initialQuery);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      onSearch(query);
    }
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-t-2xl",
        "bg-gradient-to-br from-indigo-950 via-indigo-600 to-violet-600",
        "px-8 pt-10 pb-8 sm:px-10"
      )}
    >
      {/* Decorative emoji watermark */}
      <div
        className="pointer-events-none absolute top-3 right-0 text-xl tracking-[6px] opacity-[0.15] select-none"
        aria-hidden
      >
        🍳 🥗 🍕 🍝 🥩 🍜 🥣 🍰 🍹 🥪
      </div>

      <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
        What will you cook today?
      </h1>
      <p className="mt-1.5 text-sm text-white/60">
        Explore recipes from our community kitchen
      </p>

      <div className="relative mt-5">
        <Input
          type="text"
          placeholder="Search recipes, ingredients, vibes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-12 rounded-xl border-none pr-12 pl-5 text-sm text-white",
            "bg-white/[0.12] placeholder:text-white/45",
            "focus-visible:ring-white/30 focus-visible:ring-2"
          )}
        />
        <Search className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-white/45" />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/SearchBanner.tsx
git commit -m "feat: add SearchBanner component with search input"
```

---

## Task 5: FilterShelf Component (Frontend)

**Files:**
- Create: `frontend/src/components/FilterShelf.tsx`
- Reference: `frontend/src/lib/categoryFallback.ts` (for category emoji map)

This is the largest frontend component. It renders three ToggleGroup rows (Category, Cuisine & Heritage, Lifestyle & Constraints) plus an action bar with active filter pills and the Search Recipes button.

- [ ] **Step 1: Create FilterShelf**

```tsx
// frontend/src/components/FilterShelf.tsx
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Filter data ─────────────────────────────────────────────────────────────

interface ChipDef {
  value: string;
  label: string;
  emoji: string;
}

const CATEGORY_CHIPS: ChipDef[] = [
  { value: "sandwich_burger", label: "Burger", emoji: "🍔" },
  { value: "pizza", label: "Pizza", emoji: "🍕" },
  { value: "soup", label: "Soup", emoji: "🍲" },
  { value: "salad", label: "Salad", emoji: "🥗" },
  { value: "pasta_noodles", label: "Pasta", emoji: "🍝" },
  { value: "meat_seafood", label: "Meat & Seafood", emoji: "🥩" },
  { value: "bowl", label: "Bowl", emoji: "🥣" },
  { value: "casserole_bake", label: "Casserole", emoji: "🍞" },
  { value: "side_dish", label: "Side Dish", emoji: "🥦" },
  { value: "sauce_condiment", label: "Sauce", emoji: "🫙" },
  { value: "breakfast_bakery", label: "Breakfast", emoji: "🍳" },
  { value: "dessert", label: "Dessert", emoji: "🍰" },
  { value: "drink", label: "Drink", emoji: "🍹" },
  { value: "snack_app", label: "Snack", emoji: "🍿" },
  { value: "other", label: "Other", emoji: "🍽️" },
];

const CUISINE_CHIPS: ChipDef[] = [
  { value: "american", label: "American", emoji: "🇺🇸" },
  { value: "italian", label: "Italian", emoji: "🇮🇹" },
  { value: "mexican", label: "Mexican", emoji: "🇲🇽" },
  { value: "asian", label: "Asian", emoji: "🥢" },
  { value: "european-iberian", label: "European & Iberian", emoji: "🥐" },
  { value: "mediterranean", label: "Mediterranean", emoji: "🫒" },
  { value: "latin-american", label: "Latin American", emoji: "🌴" },
];

const LIFESTYLE_CHIPS: ChipDef[] = [
  { value: "quick-easy", label: "Quick & Easy", emoji: "⚡" },
  { value: "vegetarian-vegan", label: "Vegetarian / Vegan", emoji: "🌿" },
  { value: "health-fitness", label: "Health & Fitness", emoji: "💪" },
  { value: "weeknight-staples", label: "Weeknight Staples", emoji: "🏠" },
  { value: "gluten-free-dairy-free", label: "Gluten-Free / Dairy-Free", emoji: "🌾" },
  { value: "high-protein-keto", label: "High Protein / Keto", emoji: "🥩" },
  { value: "meal-prep-freezer", label: "Meal Prep / Freezer", emoji: "📦" },
];

// ─── Component ───────────────────────────────────────────────────────────────

export interface FilterState {
  category: string;
  cuisine: string;
  lifestyle: string;
}

interface FilterShelfProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onSearch: () => void;
}

// Chip style config per row
const chipStyles = {
  category: {
    base: "bg-secondary text-secondary-foreground border-border",
    active: "bg-indigo-600 text-white border-indigo-600",
  },
  cuisine: {
    base: "bg-amber-50 text-amber-900 border-amber-200",
    active: "bg-amber-500 text-white border-amber-500",
  },
  lifestyle: {
    base: "bg-emerald-50 text-emerald-900 border-emerald-200",
    active: "bg-emerald-500 text-white border-emerald-500",
  },
} as const;

type FilterGroup = keyof typeof chipStyles;

function ChipRow({
  label,
  group,
  chips,
  value,
  onChange,
}: {
  label: string;
  group: FilterGroup;
  chips: ChipDef[];
  value: string;
  onChange: (value: string) => void;
}) {
  const styles = chipStyles[group];

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5">
      <span className="w-full text-[9px] font-extrabold uppercase tracking-widest text-muted-foreground/50 mb-0.5">
        {label}
      </span>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(v) => onChange(v ?? "")}
        className="flex flex-wrap gap-1.5"
      >
        <ToggleGroupItem
          value=""
          className={cn(
            "h-auto rounded-full border px-3 py-1 text-xs font-semibold transition-all",
            value === "" ? styles.active : styles.base
          )}
        >
          All
        </ToggleGroupItem>
        {chips.map((chip) => (
          <ToggleGroupItem
            key={chip.value}
            value={chip.value}
            className={cn(
              "h-auto rounded-full border px-3 py-1 text-xs font-semibold transition-all",
              value === chip.value ? styles.active : styles.base
            )}
          >
            {chip.emoji} {chip.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

function getActiveFilters(filters: FilterState): { key: FilterGroup; label: string }[] {
  const result: { key: FilterGroup; label: string }[] = [];
  if (filters.category) {
    const chip = CATEGORY_CHIPS.find((c) => c.value === filters.category);
    if (chip) result.push({ key: "category", label: `${chip.emoji} ${chip.label}` });
  }
  if (filters.cuisine) {
    const chip = CUISINE_CHIPS.find((c) => c.value === filters.cuisine);
    if (chip) result.push({ key: "cuisine", label: `${chip.emoji} ${chip.label}` });
  }
  if (filters.lifestyle) {
    const chip = LIFESTYLE_CHIPS.find((c) => c.value === filters.lifestyle);
    if (chip) result.push({ key: "lifestyle", label: `${chip.emoji} ${chip.label}` });
  }
  return result;
}

export function FilterShelf({ filters, onFiltersChange, onSearch }: FilterShelfProps) {
  const activeFilters = getActiveFilters(filters);
  const hasFilters = activeFilters.length > 0;

  const clearFilter = (key: FilterGroup) => {
    onFiltersChange({ ...filters, [key]: "" });
  };

  const clearAll = () => {
    onFiltersChange({ category: "", cuisine: "", lifestyle: "" });
  };

  return (
    <div className="overflow-hidden rounded-b-2xl border border-t-0 border-border bg-card shadow-sm">
      {/* Category row */}
      <ChipRow
        label="Category"
        group="category"
        chips={CATEGORY_CHIPS}
        value={filters.category}
        onChange={(v) => onFiltersChange({ ...filters, category: v })}
      />

      <div className="mx-4 border-t border-border/40" />

      {/* Cuisine & Heritage row */}
      <ChipRow
        label="Cuisine & Heritage"
        group="cuisine"
        chips={CUISINE_CHIPS}
        value={filters.cuisine}
        onChange={(v) => onFiltersChange({ ...filters, cuisine: v })}
      />

      <div className="mx-4 border-t border-border/40" />

      {/* Lifestyle & Constraints row */}
      <ChipRow
        label="Lifestyle & Constraints"
        group="lifestyle"
        chips={LIFESTYLE_CHIPS}
        value={filters.lifestyle}
        onChange={(v) => onFiltersChange({ ...filters, lifestyle: v })}
      />

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 bg-muted/50 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {hasFilters ? (
            <>
              <span>Filtering by:</span>
              {activeFilters.map((f) => (
                <Badge
                  key={f.key}
                  variant="secondary"
                  className="gap-1 pl-2.5 pr-1.5 text-[10px] font-semibold"
                >
                  {f.label}
                  <button
                    onClick={() => clearFilter(f.key)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </>
          ) : (
            <span className="text-muted-foreground/60">
              Select filters to narrow results
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Clear all
            </button>
          )}
          <Button onClick={onSearch} size="sm">
            Search Recipes
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/FilterShelf.tsx
git commit -m "feat: add FilterShelf component with 3-tier chip selection"
```

---

## Task 6: HotStrip Component (Frontend)

**Files:**
- Create: `frontend/src/components/HotStrip.tsx`

- [ ] **Step 1: Create HotStrip**

```tsx
// frontend/src/components/HotStrip.tsx
import { Link } from "react-router-dom";
import { getCategoryFallback } from "@/lib/categoryFallback";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/types";

interface HotStripProps {
  recipes: Recipe[];
}

function HotCard({ recipe }: { recipe: Recipe }) {
  const fallback = getCategoryFallback(recipe.category);

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className={cn(
        "group flex items-stretch overflow-hidden rounded-xl border border-amber-200",
        "bg-card transition-shadow hover:shadow-md"
      )}
    >
      {/* Thumbnail */}
      <div className="flex w-20 shrink-0 items-center justify-center">
        {recipe.image_url ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={cn(
              "flex h-full w-full items-center justify-center bg-gradient-to-br",
              fallback.gradient
            )}
          >
            <span className="text-2xl">{fallback.emoji}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1 p-3 min-w-0">
        <h3 className="truncate text-sm font-bold leading-snug group-hover:text-indigo-600 transition-colors">
          {recipe.title}
        </h3>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>@{recipe.author_username}</span>
          <span>🍴 {recipe.fork_count}</span>
          {recipe.total_votes != null && recipe.total_votes > 0 && (
            <span>
              👍 {Math.round(((recipe.positive_votes ?? 0) / recipe.total_votes) * 100)}%
            </span>
          )}
        </div>
        {recipe.description && (
          <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
            {recipe.description}
          </p>
        )}
      </div>
    </Link>
  );
}

export function HotStrip({ recipes }: HotStripProps) {
  if (recipes.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-foreground">
        <span>🔥</span> Hot this month
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {recipes.map((r) => (
          <HotCard key={r.slug} recipe={r} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/HotStrip.tsx
git commit -m "feat: add HotStrip component for trending recipes"
```

---

## Task 7: Rewrite HomePage (Frontend)

**Files:**
- Modify: `frontend/src/pages/HomePage.tsx` (full rewrite)

This is the integration task. Replace the old layout with the new discovery-first structure: SearchBanner → FilterShelf → HotStrip → Grid. Wire up filter state, URL params, and API calls.

- [ ] **Step 1: Rewrite HomePage.tsx**

```tsx
// frontend/src/pages/HomePage.tsx
import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCategoryFallback } from "@/lib/categoryFallback";
import { SearchBanner } from "@/components/SearchBanner";
import { FilterShelf, type FilterState } from "@/components/FilterShelf";
import { HotStrip } from "@/components/HotStrip";
import { cn } from "@/lib/utils";
import type { Recipe } from "@/types";

// ─── Grid card (kept from old layout, slightly refined) ──────────────────────

function GridCard({ recipe }: { recipe: Recipe }) {
  const [err, setErr] = useState(false);
  const fallback = getCategoryFallback(recipe.category);

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="group flex flex-col rounded-xl overflow-hidden border border-border hover:border-foreground/20 hover:shadow-md hover:scale-[1.01] transition-all duration-200 bg-card"
    >
      <div className="aspect-[4/3] w-full shrink-0 overflow-hidden">
        {recipe.image_url && !err ? (
          <img
            src={recipe.image_url}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setErr(true)}
          />
        ) : (
          <div
            className={cn(
              "w-full h-full flex items-center justify-center bg-gradient-to-br",
              fallback.gradient
            )}
          >
            <span className="text-5xl drop-shadow">{fallback.emoji}</span>
          </div>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-sm leading-snug line-clamp-2 flex-1">
            {recipe.title}
          </h3>
          <Badge variant="secondary" className="text-[10px] shrink-0 mt-0.5">
            {recipe.category.replace(/_/g, " ")}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground line-clamp-2">
          {recipe.description}
        </p>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-auto pt-1">
          <span>@{recipe.author_username}</span>
          {recipe.fork_count > 0 && (
            <span className="text-amber-600 font-semibold">
              🍴 {recipe.fork_count}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Rising Stars sidebar (unchanged — preserved from old layout) ────────────

function CommunityKitchenSidebar({
  recipes,
  isLoggedIn,
}: {
  recipes: Recipe[];
  isLoggedIn: boolean;
}) {
  return (
    <aside className="w-72 shrink-0 hidden lg:block">
      <div className="sticky top-4 rounded-2xl border border-indigo-200/60 bg-gradient-to-b from-indigo-50 to-white overflow-hidden shadow-sm">
        <div className="px-4 pt-4 pb-3 border-b border-indigo-100">
          <div className="flex items-center gap-2">
            <span className="text-base">🧪</span>
            <span className="text-sm font-bold text-indigo-950">
              Rising Stars
            </span>
            <Badge className="ml-auto bg-indigo-100 text-indigo-700 border-indigo-200 text-[10px]">
              {recipes.length} in review
            </Badge>
          </div>
          <p className="text-[11px] text-indigo-400 mt-1">
            Community voting in progress
          </p>
        </div>
        <div className="divide-y divide-indigo-50">
          {recipes.slice(0, 5).map((r, idx) => {
            const fallback = getCategoryFallback(r.category);
            return (
              <Link
                key={r.slug}
                to={`/recipes/${r.slug}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/80 transition-colors group"
              >
                <span className="text-[11px] font-bold text-indigo-300 w-3 shrink-0">
                  {idx + 1}
                </span>
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0">
                  {r.image_url ? (
                    <img
                      src={r.image_url}
                      alt={r.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className={cn(
                        "w-full h-full flex items-center justify-center bg-gradient-to-br",
                        fallback.gradient
                      )}
                    >
                      <span className="text-lg">{fallback.emoji}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-700 transition-colors">
                    {r.title}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    by @{r.author_username}
                  </p>
                  {(() => {
                    const total = r.total_votes ?? 0;
                    const positive = r.positive_votes ?? 0;
                    const pct = Math.min(100, Math.round((total / 3) * 100));
                    const approvalPct =
                      total > 0 ? Math.round((positive / total) * 100) : 0;
                    return (
                      <>
                        <div className="mt-1.5 h-1 bg-indigo-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              background:
                                pct >= 100 && approvalPct >= 80
                                  ? "linear-gradient(90deg, #10b981, #34d399)"
                                  : "linear-gradient(90deg, #6366f1, #818cf8)",
                            }}
                          />
                        </div>
                        <p className="text-[9px] text-indigo-400 mt-0.5">
                          {total === 0
                            ? "Needs votes"
                            : `${total}/3 vote${total !== 1 ? "s" : ""} · ${approvalPct}% positive`}
                        </p>
                      </>
                    );
                  })()}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-indigo-100 text-center">
          <p className="text-[11px] text-indigo-400">
            {isLoggedIn
              ? "Click a recipe to cast your vote"
              : "Log in to cast your vote"}
          </p>
        </div>
      </div>
    </aside>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function HomePage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // ─ Filter state from URL
  const [filters, setFilters] = useState<FilterState>({
    category: searchParams.get("category") ?? "",
    cuisine: searchParams.get("cuisine") ?? "",
    lifestyle: searchParams.get("lifestyle") ?? "",
  });
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") ?? ""
  );
  const [sortOrder, setSortOrder] = useState(
    searchParams.get("ordering") ?? "-created_at"
  );

  // ─ Data
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [hotRecipes, setHotRecipes] = useState<Recipe[]>([]);
  const [inReviewRecipes, setInReviewRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState("");
  const [orFallback, setOrFallback] = useState(false);

  // ─ Fetch hot recipes (once)
  useEffect(() => {
    api.get("/recipes/hot/").then((data) => setHotRecipes(data ?? [])).catch(() => {});
  }, []);

  // ─ Fetch in-review recipes for sidebar
  useEffect(() => {
    if (!token) return;
    api
      .get("/recipes/?status=in_review", token)
      .then((data) => setInReviewRecipes(data.results || []))
      .catch(() => {});
  }, [token]);

  // ─ Build query string from current state
  const buildQueryString = useCallback(
    (opts?: { orMode?: boolean }) => {
      const params = new URLSearchParams();
      // In OR fallback mode, drop the category constraint to broaden results
      if (filters.category && !opts?.orMode) {
        params.set("category", filters.category);
      }
      // Collect tag slugs for cuisine and lifestyle
      const tags: string[] = [];
      if (filters.cuisine) tags.push(filters.cuisine);
      if (filters.lifestyle) tags.push(filters.lifestyle);
      tags.forEach((t) => params.append("tags", t));
      if (searchQuery) params.set("search", searchQuery);
      params.set("ordering", sortOrder);
      return params.toString();
    },
    [filters, searchQuery, sortOrder]
  );

  // ─ Fetch recipes
  const fetchRecipes = useCallback(async () => {
    setError("");
    setOrFallback(false);
    try {
      const qs = buildQueryString();
      const data = await api.get(`/recipes/?${qs}`);
      const results = data.results || [];
      if (results.length === 0 && (filters.category || filters.cuisine || filters.lifestyle)) {
        // AND returned nothing — try OR (broaden by dropping category)
        const orQs = buildQueryString({ orMode: true });
        const orData = await api.get(`/recipes/?${orQs}`);
        const orResults = orData.results || [];
        setRecipes(orResults);
        if (orResults.length > 0) setOrFallback(true);
      } else {
        setRecipes(results);
      }
    } catch {
      setError("Failed to load recipes. Try refreshing.");
    }
  }, [buildQueryString, filters]);

  // ─ Initial load
  useEffect(() => {
    fetchRecipes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─ Sync filters to URL
  const syncUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.cuisine) params.set("cuisine", filters.cuisine);
    if (filters.lifestyle) params.set("lifestyle", filters.lifestyle);
    if (searchQuery) params.set("search", searchQuery);
    if (sortOrder !== "-created_at") params.set("ordering", sortOrder);
    setSearchParams(params, { replace: true });
  }, [filters, searchQuery, sortOrder, setSearchParams]);

  // ─ Handle search button click
  const handleSearch = () => {
    syncUrlParams();
    fetchRecipes();
  };

  // ─ Handle text search from banner
  const handleTextSearch = (query: string) => {
    setSearchQuery(query);
    // Trigger search immediately when pressing Enter in the banner
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.cuisine) params.set("cuisine", filters.cuisine);
    if (filters.lifestyle) params.set("lifestyle", filters.lifestyle);
    if (query) params.set("search", query);
    if (sortOrder !== "-created_at") params.set("ordering", sortOrder);
    setSearchParams(params, { replace: true });

    // Re-fetch with updated query
    setError("");
    setOrFallback(false);
    const qs = new URLSearchParams();
    if (filters.category) qs.set("category", filters.category);
    const tags: string[] = [];
    if (filters.cuisine) tags.push(filters.cuisine);
    if (filters.lifestyle) tags.push(filters.lifestyle);
    tags.forEach((t) => qs.append("tags", t));
    if (query) qs.set("search", query);
    qs.set("ordering", sortOrder);
    api.get(`/recipes/?${qs.toString()}`).then((data) => {
      setRecipes(data.results || []);
    }).catch(() => setError("Failed to load recipes. Try refreshing."));
  };

  // ─ Handle sort change (immediate, no search button needed)
  const handleSortChange = (value: string) => {
    setSortOrder(value);
    const params = new URLSearchParams();
    if (filters.category) params.set("category", filters.category);
    if (filters.cuisine) params.set("cuisine", filters.cuisine);
    if (filters.lifestyle) params.set("lifestyle", filters.lifestyle);
    if (searchQuery) params.set("search", searchQuery);
    if (value !== "-created_at") params.set("ordering", value);
    setSearchParams(params, { replace: true });

    const qs = new URLSearchParams();
    if (filters.category) qs.set("category", filters.category);
    const tags: string[] = [];
    if (filters.cuisine) tags.push(filters.cuisine);
    if (filters.lifestyle) tags.push(filters.lifestyle);
    tags.forEach((t) => qs.append("tags", t));
    if (searchQuery) qs.set("search", searchQuery);
    qs.set("ordering", value);
    api.get(`/recipes/?${qs.toString()}`).then((data) => {
      setRecipes(data.results || []);
    }).catch(() => setError("Failed to load recipes."));
  };

  if (error) return <p className="text-destructive">{error}</p>;

  const showSidebar = inReviewRecipes.length > 0;

  return (
    <div className="flex gap-8 items-start">
      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">
        {/* Search banner + filter shelf (fused) */}
        <div>
          <SearchBanner initialQuery={searchQuery} onSearch={handleTextSearch} />
          <FilterShelf
            filters={filters}
            onFiltersChange={setFilters}
            onSearch={handleSearch}
          />
        </div>

        {/* Hot this month */}
        <HotStrip recipes={hotRecipes} />

        {/* All Recipes */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">
              All Recipes
            </h2>
            <Select value={sortOrder} onValueChange={handleSortChange}>
              <SelectTrigger size="sm" className="w-auto text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-created_at">Sort: Newest</SelectItem>
                <SelectItem value="-fork_count">Most Forked</SelectItem>
                <SelectItem value="title">A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {orFallback && (
            <p className="mb-3 text-xs text-muted-foreground italic">
              No exact matches — showing related recipes
            </p>
          )}

          {recipes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recipes.map((r) => (
                <GridCard key={r.slug} recipe={r} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-8 text-center">
              No recipes found. Try broadening your filters.
            </p>
          )}
        </section>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <CommunityKitchenSidebar
          recipes={inReviewRecipes}
          isLoggedIn={!!token}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/HomePage.tsx
git commit -m "feat: rewrite HomePage with discovery banner, filter shelf, hot strip"
```

---

## Task 8: Smoke Test & Visual QA

**Files:** No new files — manual verification.

- [ ] **Step 1: Start backend and run migrations**

```bash
cd backend
../.venv/Scripts/python manage.py migrate
../.venv/Scripts/python manage.py runserver 0.0.0.0:8000
```

- [ ] **Step 2: Start frontend**

```bash
cd frontend
npm run dev
```

- [ ] **Step 3: Run full backend test suite**

```bash
cd backend && ../.venv/Scripts/pytest -v
```
Expected: All tests PASS.

- [ ] **Step 4: Run frontend type check**

```bash
cd frontend && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 5: Visual QA checklist**

Open `http://localhost:5173` in browser and verify:
- [ ] Hero banner renders with "What will you cook today?" and search input
- [ ] Filter shelf shows 3 rows: Category (indigo), Cuisine (amber), Lifestyle (green)
- [ ] Clicking a chip highlights it, clicking another deselects the previous
- [ ] "All" chip clears that row's filter
- [ ] Active filter pills show in the action bar with ✕ remove
- [ ] "Search Recipes" button fires the query and updates the grid
- [ ] "Clear all" resets all chips
- [ ] Search input in banner fires on Enter
- [ ] Sort dropdown works (Newest, Most Forked, A–Z)
- [ ] Hot this month strip shows (if any published recipes have votes in the last 30 days; may be empty in dev)
- [ ] Rising Stars sidebar still appears (if in-review recipes exist)
- [ ] URL params update when filtering and are shareable (copy URL, paste in new tab → same filters)
- [ ] Mobile: chips wrap, hot strip stacks vertically

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: filter bar visual QA pass — all checks green"
```

---

## Task 9: Update Vite Proxy (if needed)

**Files:**
- Check: `frontend/vite.config.ts`

The `/api/recipes/hot/` endpoint is new. Verify it's covered by the existing Vite proxy rule (`/api/*` → Django). This should already work — no change expected.

- [ ] **Step 1: Verify proxy config**

Read `frontend/vite.config.ts` and confirm that `/api` proxy is present and covers all paths.

- [ ] **Step 2: Test the hot endpoint through Vite proxy**

Open `http://localhost:5173/api/recipes/hot/` in browser.
Expected: JSON response (may be empty array if no qualifying recipes in dev DB).

- [ ] **Step 3: Skip or commit**

If changes were needed:
```bash
git add frontend/vite.config.ts
git commit -m "fix: add hot recipes endpoint to Vite proxy"
```

---

## Task 10: Update CLAUDE.md Plans Table

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the filter bar plan to the Active plans table**

In `CLAUDE.md`, update the Active plans section:

```markdown
### Active
| Feature | Spec | Impl |
|---------|------|------|
| v0.8 Filter Bar & Discovery | `active/2026-04-05-filter-bar.spec.md` | `active/2026-04-05-filter-bar.impl.md` |
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: add filter bar plan to CLAUDE.md active table"
```
