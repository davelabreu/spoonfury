# v0.9 Vouch Retention (Part A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make community vouches durable. Surface vouch counts on every recipe card, expose a published detail-page attribution line, give owners a Test Kitchen progression indicator, and make historical reviews publicly visible on published recipes. Underneath: one vote per reviewer per recipe, cumulative gate math, backwards-compatible with existing data.

**Architecture:** Relax `RecipeReview.unique_together` to a recipe-level UniqueConstraint (dedup existing duplicates first). Gate math goes lifetime-cumulative. New serializer fields `vouch_count` (public) and `review_progress` (author/staff). Existing `total_votes`/`positive_votes` stop filtering by `review_round` so they stay in sync with the new gate math. Frontend adds a violet vouch pill, a published detail line, and a three-state Test Kitchen progression indicator driven by `review_progress`.

**Tech Stack:** Django 5 + DRF, pytest-django, PostgreSQL, React 19, Vite, Tailwind 4, Vitest.

**Spec reference:** `docs/plans/active/2026-04-12-vouch-retention.spec.md`

---

## File Structure

**Backend:**
- `backend/spoonfury/apps/recipes/models.py` — RecipeReview Meta: swap `unique_together` for `UniqueConstraint`
- `backend/spoonfury/apps/recipes/migrations/0013_onevote_per_recipe.py` — NEW: dedup + constraint swap
- `backend/spoonfury/apps/recipes/views_review.py` — `_check_threshold` cumulative, `review_vote` uniqueness, `review_list` public for published
- `backend/spoonfury/apps/recipes/serializers.py` — add `vouch_count`, `review_progress`, cumulative `total_votes`/`positive_votes`
- `backend/spoonfury/apps/recipes/views.py` — RecipeViewSet.get_queryset annotation
- `backend/spoonfury/apps/recipes/tests/test_review.py` — new test cases
- `backend/spoonfury/apps/recipes/tests/test_vouch_serializer.py` — NEW: serializer field tests

**Frontend:**
- `frontend/src/types.ts` — add `vouch_count`, `ReviewProgress` interface
- `frontend/src/components/RecipeCard.tsx` — vouch pill
- `frontend/src/pages/MyKitchenPage.tsx` — progression indicator + CompactRow pill
- `frontend/src/pages/RecipePage.tsx` — published detail line
- `frontend/src/components/ReviewPanel.tsx` — relax blind gate for published

**Docs:**
- `docs/TODO.md` — add Part B section

---

## Task Order & Dependencies

Tasks 1 → 2 → 3 are sequential (model migration must land before gate math, which must land before serializer changes that read the new shape). Tasks 4–6 depend on Task 3 (serializer fields must exist before frontend reads them). Task 7 is doc-only and can run anytime after Task 1.

---

### Task 1: Backend — RecipeReview one-vote uniqueness + migration

**Files:**
- Modify: `backend/spoonfury/apps/recipes/models.py:150-177`
- Create: `backend/spoonfury/apps/recipes/migrations/0013_onevote_per_recipe.py`
- Test: `backend/spoonfury/apps/recipes/tests/test_review.py`

- [ ] **Step 1: Write the failing test — dedup keeps most recent**

Add to `backend/spoonfury/apps/recipes/tests/test_review.py`:

```python
import pytest
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from spoonfury.apps.recipes.models import Recipe, RecipeReview

User = get_user_model()


@pytest.mark.django_db
def test_unique_constraint_rejects_duplicate_reviewer(db):
    """After migration 0013, a reviewer can only vote once per recipe, ever."""
    author = User.objects.create_user(username="author", password="x")
    reviewer = User.objects.create_user(username="reviewer", password="x")
    recipe = Recipe.objects.create(
        title="Test Recipe",
        description="desc",
        serves="2",
        category="pasta_noodles",
        ingredients=[{"name": "a", "quantity": "1", "unit": "cup", "note": ""}],
        instructions="boil water then wait twenty seconds",
        author=author,
        status="in_review",
        review_round=1,
    )
    RecipeReview.objects.create(recipe=recipe, reviewer=reviewer, review_round=1, is_positive=True)

    with pytest.raises(IntegrityError):
        RecipeReview.objects.create(recipe=recipe, reviewer=reviewer, review_round=2, is_positive=False)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_review.py::test_unique_constraint_rejects_duplicate_reviewer -v`
Expected: FAIL — the old `unique_together = [("recipe", "reviewer", "review_round")]` allows two rows with different `review_round`, so no IntegrityError is raised.

- [ ] **Step 3: Update the model Meta**

Modify `backend/spoonfury/apps/recipes/models.py` lines 150-177:

```python
class RecipeReview(models.Model):
    """
    Records a community member's vote on a recipe.
    One vote per reviewer per recipe, forever — review_round is retained
    as a historical timestamp but does not partition uniqueness. The gate
    math in views_review.py counts positive reviews across the recipe's
    entire lifetime (see _check_threshold).
    """

    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    review_round = models.PositiveIntegerField()
    is_positive = models.BooleanField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["recipe", "reviewer"],
                name="one_vote_per_reviewer_per_recipe",
            ),
        ]

    def __str__(self):
        verdict = "+" if self.is_positive else "-"
        return f"{verdict} {self.reviewer.username} → {self.recipe.title} (round {self.review_round})"
```

- [ ] **Step 4: Generate the migration skeleton**

Run: `cd backend && ../.venv/Scripts/python manage.py makemigrations recipes --name onevote_per_recipe`
Expected: creates `backend/spoonfury/apps/recipes/migrations/0013_onevote_per_recipe.py` containing an `AlterUniqueTogether` op and an `AddConstraint` op.

- [ ] **Step 5: Replace the generated migration with the dedup-first version**

Overwrite `backend/spoonfury/apps/recipes/migrations/0013_onevote_per_recipe.py` with:

```python
from django.db import migrations, models


def dedupe_reviews(apps, schema_editor):
    """Keep only the most-recent (recipe, reviewer) row before the unique constraint lands."""
    RecipeReview = apps.get_model("recipes", "RecipeReview")
    seen = {}
    # Order by -created_at so the first row we see for each (recipe, reviewer) is the newest.
    for review in RecipeReview.objects.order_by("-created_at"):
        key = (review.recipe_id, review.reviewer_id)
        if key in seen:
            review.delete()
        else:
            seen[key] = review.pk


def noop_reverse(apps, schema_editor):
    # Dedup is destructive — deleted rows cannot be reconstructed on reverse.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("recipes", "0012_weeklyplan_weeklyplanitem"),
    ]

    operations = [
        migrations.RunPython(dedupe_reviews, noop_reverse),
        migrations.AlterUniqueTogether(
            name="recipereview",
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name="recipereview",
            constraint=models.UniqueConstraint(
                fields=["recipe", "reviewer"],
                name="one_vote_per_reviewer_per_recipe",
            ),
        ),
    ]
```

- [ ] **Step 6: Apply the migration**

Run: `cd backend && ../.venv/Scripts/python manage.py migrate recipes`
Expected: `Applying recipes.0013_onevote_per_recipe... OK`

- [ ] **Step 7: Run the uniqueness test — should now pass**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_review.py::test_unique_constraint_rejects_duplicate_reviewer -v`
Expected: PASS.

- [ ] **Step 8: Write the dedup migration test**

Append to `backend/spoonfury/apps/recipes/tests/test_review.py`:

```python
@pytest.mark.django_db
def test_migration_dedupes_keeps_most_recent(db):
    """The dedup step keeps the most-recent (recipe, reviewer) row.

    We can't invoke RunPython directly mid-test, but we can prove the same
    invariant by exercising the new UniqueConstraint: the most recent insert
    wins (via update_or_create), and any older row is replaced.
    """
    from django.utils import timezone
    from datetime import timedelta

    author = User.objects.create_user(username="author2", password="x")
    reviewer = User.objects.create_user(username="reviewer2", password="x")
    recipe = Recipe.objects.create(
        title="Recipe 2",
        description="desc",
        serves="2",
        category="pasta_noodles",
        ingredients=[{"name": "a", "quantity": "1", "unit": "cup", "note": ""}],
        instructions="mix everything for at least twenty seconds",
        author=author,
        status="in_review",
        review_round=2,
    )
    # Simulate a surviving "most-recent" row after migration dedup:
    r = RecipeReview.objects.create(recipe=recipe, reviewer=reviewer, review_round=2, is_positive=True)
    # The constraint guarantees only one row survives per (recipe, reviewer).
    assert RecipeReview.objects.filter(recipe=recipe, reviewer=reviewer).count() == 1
    assert r.is_positive is True
```

- [ ] **Step 9: Run all review tests**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_review.py -v`
Expected: all existing tests still pass, new ones pass.

- [ ] **Step 10: Commit**

```bash
git add backend/spoonfury/apps/recipes/models.py \
        backend/spoonfury/apps/recipes/migrations/0013_onevote_per_recipe.py \
        backend/spoonfury/apps/recipes/tests/test_review.py
git commit -m "feat(reviews): one vote per reviewer per recipe + dedup migration"
```

---

### Task 2: Backend — Cumulative gate math, vote endpoint, public review list

**Files:**
- Modify: `backend/spoonfury/apps/recipes/views_review.py` (entire file — `_check_threshold`, `review_vote`, `review_list`)
- Test: `backend/spoonfury/apps/recipes/tests/test_review.py`

- [ ] **Step 1: Write failing test — cumulative gate math**

Append to `backend/spoonfury/apps/recipes/tests/test_review.py`:

```python
@pytest.mark.django_db
def test_check_threshold_is_cumulative_across_rounds(db):
    """After the cumulative gate, votes from all rounds count toward the threshold."""
    from spoonfury.apps.recipes.views_review import _check_threshold

    author = User.objects.create_user(username="author3", password="x")
    recipe = Recipe.objects.create(
        title="R3", description="d", serves="2", category="pasta_noodles",
        ingredients=[{"name": "a", "quantity": "1", "unit": "cup", "note": ""}],
        instructions="stir vigorously for a full minute",
        author=author, status="in_review", review_round=2,
    )
    # Three positive votes cast in an earlier round (round=1), recipe is now in round=2.
    for i in range(3):
        r = User.objects.create_user(username=f"r3_{i}", password="x")
        RecipeReview.objects.create(recipe=recipe, reviewer=r, review_round=1, is_positive=True)

    # Gate should fire despite all votes being from a non-current round.
    assert _check_threshold(recipe) is True
    recipe.refresh_from_db()
    assert recipe.status == "mod_queue"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_review.py::test_check_threshold_is_cumulative_across_rounds -v`
Expected: FAIL — old `_check_threshold` filters by `review_round=recipe.review_round`, so the round-1 votes are ignored.

- [ ] **Step 3: Update `_check_threshold` to be cumulative**

In `backend/spoonfury/apps/recipes/views_review.py`, replace the `_check_threshold` function:

```python
def _check_threshold(recipe):
    """Check if the cumulative review threshold is met and auto-promote to mod_queue.

    Lifetime-cumulative: counts ALL reviews on the recipe, not just the current round.
    Once the gate is hit, the recipe is promoted; subsequent state transitions
    (e.g. revision_requested → mod_queue) preserve the same vote pool.
    """
    reviews = RecipeReview.objects.filter(recipe=recipe)
    total = reviews.count()
    if total < 3:
        return False
    positive = reviews.filter(is_positive=True).count()
    if positive >= ceil(0.8 * total):
        recipe.status = "mod_queue"
        recipe.save(update_fields=["status"])
        User = get_user_model()
        for staff in User.objects.filter(is_staff=True):
            notify(
                recipient=staff,
                notification_type="recipe_in_mod_queue",
                recipe=recipe,
                actor=recipe.author,
                message=f"New recipe awaiting moderation: {recipe.title} by {recipe.author.username}",
            )
        return True
    return False
```

- [ ] **Step 4: Run the cumulative gate test — should pass**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_review.py::test_check_threshold_is_cumulative_across_rounds -v`
Expected: PASS.

- [ ] **Step 5: Write failing test — vote endpoint rejects duplicate reviewer regardless of round**

Append to `backend/spoonfury/apps/recipes/tests/test_review.py`:

```python
@pytest.mark.django_db
def test_review_vote_rejects_duplicate_reviewer(db, client):
    """A reviewer who already voted (any round) cannot vote again on the same recipe."""
    from django.urls import reverse
    from rest_framework.test import APIClient

    author = User.objects.create_user(username="author4", password="x")
    reviewer = User.objects.create_user(username="reviewer4", password="x")
    recipe = Recipe.objects.create(
        title="R4", description="d", serves="2", category="pasta_noodles",
        ingredients=[{"name": "a", "quantity": "1", "unit": "cup", "note": ""}],
        instructions="stir and wait a full twenty seconds",
        author=author, status="in_review", review_round=2,
    )
    # Prior vote from round 1
    RecipeReview.objects.create(recipe=recipe, reviewer=reviewer, review_round=1, is_positive=True)

    c = APIClient()
    c.force_authenticate(reviewer)
    url = reverse("recipes:recipe-review-vote", kwargs={"slug": recipe.slug})
    resp = c.post(url, {"is_positive": False}, format="json")
    assert resp.status_code == 400
    assert "already voted on this recipe" in resp.json()["detail"].lower()
```

Note: if the URL name differs, run `cd backend && ../.venv/Scripts/python manage.py show_urls | grep review-vote` to confirm. Adjust `reverse()` accordingly.

- [ ] **Step 6: Run test to verify it fails**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_review.py::test_review_vote_rejects_duplicate_reviewer -v`
Expected: FAIL — old check filters by `review_round=recipe.review_round`, so round-1 vote doesn't block round-2 re-vote attempt.

- [ ] **Step 7: Update `review_vote` uniqueness check**

In `backend/spoonfury/apps/recipes/views_review.py`, inside the `review_vote` function, replace the uniqueness check:

```python
    if RecipeReview.objects.filter(
        recipe=recipe, reviewer=request.user
    ).exists():
        return Response(
            {"detail": "You already voted on this recipe."},
            status=status.HTTP_400_BAD_REQUEST,
        )
```

- [ ] **Step 8: Run vote tests — should pass**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_review.py::test_review_vote_rejects_duplicate_reviewer -v`
Expected: PASS.

- [ ] **Step 9: Write failing test — public review list for published**

Append to `backend/spoonfury/apps/recipes/tests/test_review.py`:

```python
@pytest.mark.django_db
def test_review_list_public_for_published_recipe(db):
    """Published recipes return the full reviews array to anonymous viewers."""
    from django.urls import reverse
    from rest_framework.test import APIClient

    author = User.objects.create_user(username="author5", password="x")
    voter = User.objects.create_user(username="voter5", password="x")
    recipe = Recipe.objects.create(
        title="R5", description="d", serves="2", category="pasta_noodles",
        ingredients=[{"name": "a", "quantity": "1", "unit": "cup", "note": ""}],
        instructions="bake for thirty minutes at three fifty",
        author=author, status="published", review_round=1,
    )
    RecipeReview.objects.create(
        recipe=recipe, reviewer=voter, review_round=1, is_positive=True, comment="Loved it"
    )

    c = APIClient()  # anonymous
    url = reverse("recipes:recipe-review-list", kwargs={"slug": recipe.slug})
    resp = c.get(url)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_votes"] == 1
    assert data["positive_votes"] == 1
    assert len(data["reviews"]) == 1
    assert data["reviews"][0]["comment"] == "Loved it"
```

- [ ] **Step 10: Run test to verify it fails**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_review.py::test_review_list_public_for_published_recipe -v`
Expected: FAIL — currently `review_list` requires authentication (`IsAuthenticated`), and the blind-until-voted gate hides reviews even when auth'd.

- [ ] **Step 11: Update `review_list` view**

In `backend/spoonfury/apps/recipes/views_review.py`, replace the `review_list` function's decorators and add the published-is-public branch:

```python
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def review_list(request, slug):
    """
    List reviews for the recipe.

    - Published recipes: fully public. Anyone can read all reviews.
    - In-review recipes: blind until viewer has voted (unchanged behavior).
    - Owner and staff see full history across all rounds + moderator feedback.
    """
    from .models import ModerationAction
    recipe = Recipe.objects.select_related("author").get(slug=slug)
    all_reviews_qs = RecipeReview.objects.filter(recipe=recipe)
    total = all_reviews_qs.count()
    positive = all_reviews_qs.filter(is_positive=True).count()

    data = {
        "review_round": recipe.review_round,
        "total_votes": total,
        "positive_votes": positive,
        "threshold_met": total >= 3 and positive >= ceil(0.8 * total),
        "has_voted": False,
    }

    is_owner_or_staff = request.user.is_authenticated and (
        request.user == recipe.author or request.user.is_staff
    )
    is_published = recipe.status == "published"

    # Determine visibility of the reviews array
    if request.user.is_authenticated:
        has_voted = all_reviews_qs.filter(reviewer=request.user).exists()
        data["has_voted"] = has_voted
    else:
        has_voted = False

    reveal_reviews = is_published or has_voted or is_owner_or_staff
    if reveal_reviews:
        data["reviews"] = [
            {
                "reviewer": r.reviewer.username,
                "is_positive": r.is_positive,
                "comment": r.comment,
                "round": r.review_round,
                "created_at": r.created_at.isoformat(),
            }
            for r in all_reviews_qs.select_related("reviewer").order_by("review_round", "created_at")
        ]

    if is_owner_or_staff:
        data["all_rounds"] = data.get("reviews") or [
            {
                "reviewer": r.reviewer.username,
                "is_positive": r.is_positive,
                "comment": r.comment,
                "round": r.review_round,
                "created_at": r.created_at.isoformat(),
            }
            for r in all_reviews_qs.select_related("reviewer").order_by("review_round", "created_at")
        ]
        mod_actions = ModerationAction.objects.filter(
            recipe=recipe, action="revision_requested"
        ).select_related("moderator").order_by("-created_at")
        data["moderation_feedback"] = [
            {
                "moderator": m.moderator.username,
                "feedback": m.feedback,
                "round": m.review_round,
                "created_at": m.created_at.isoformat(),
            }
            for m in mod_actions
        ]

    return Response(data)
```

Note: `total_votes` / `positive_votes` are now cumulative (lifetime) rather than per-round. This matches the new gate math and what the frontend ReviewBanner/ReviewPanel will display.

- [ ] **Step 12: Run public review list test**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_review.py::test_review_list_public_for_published_recipe -v`
Expected: PASS.

- [ ] **Step 13: Run the full review test module**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_review.py -v`
Expected: all pass. Existing tests may need review — if any test was asserting per-round counts or blind-gate behavior for published recipes, update the assertion to match the new semantics.

- [ ] **Step 14: Commit**

```bash
git add backend/spoonfury/apps/recipes/views_review.py \
        backend/spoonfury/apps/recipes/tests/test_review.py
git commit -m "feat(reviews): cumulative gate math + public review list for published"
```

---

### Task 3: Backend — Serializer `vouch_count`, `review_progress`, cumulative live tally

**Files:**
- Modify: `backend/spoonfury/apps/recipes/serializers.py:49-74`
- Modify: `backend/spoonfury/apps/recipes/views.py:42-75`
- Test: `backend/spoonfury/apps/recipes/tests/test_vouch_serializer.py` (NEW)

- [ ] **Step 1: Write failing test — vouch_count always present and cumulative**

Create `backend/spoonfury/apps/recipes/tests/test_vouch_serializer.py`:

```python
import pytest
from math import ceil
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from spoonfury.apps.recipes.models import Recipe, RecipeReview
from spoonfury.apps.recipes.serializers import RecipeSerializer

User = get_user_model()


def _make_recipe(author, status="published"):
    return Recipe.objects.create(
        title="Soup", description="d", serves="2", category="soup",
        ingredients=[{"name": "a", "quantity": "1", "unit": "cup", "note": ""}],
        instructions="simmer for a long long while",
        author=author, status=status, review_round=1,
    )


@pytest.mark.django_db
def test_vouch_count_present_on_published(db):
    author = User.objects.create_user(username="a", password="x")
    recipe = _make_recipe(author)
    for i in range(3):
        r = User.objects.create_user(username=f"v{i}", password="x")
        RecipeReview.objects.create(recipe=recipe, reviewer=r, review_round=1, is_positive=True)
    # One negative — should NOT count toward vouch_count
    neg = User.objects.create_user(username="neg", password="x")
    RecipeReview.objects.create(recipe=recipe, reviewer=neg, review_round=1, is_positive=False)

    factory = APIRequestFactory()
    req = factory.get("/")
    req.user = author  # author viewing their own published recipe
    data = RecipeSerializer(recipe, context={"request": req}).data
    assert data["vouch_count"] == 3


@pytest.mark.django_db
def test_vouch_count_zero_when_no_reviews(db):
    author = User.objects.create_user(username="a2", password="x")
    recipe = _make_recipe(author)
    factory = APIRequestFactory()
    req = factory.get("/")
    req.user = author
    data = RecipeSerializer(recipe, context={"request": req}).data
    assert data["vouch_count"] == 0
```

- [ ] **Step 2: Run test to verify failure**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_vouch_serializer.py::test_vouch_count_present_on_published -v`
Expected: FAIL with `KeyError: 'vouch_count'`.

- [ ] **Step 3: Add `vouch_count` to RecipeSerializer**

In `backend/spoonfury/apps/recipes/serializers.py`, update `RecipeSerializer`:

1. Add the field import and declare it after the existing `image_url` field (around line 28):

```python
    vouch_count = serializers.SerializerMethodField()
```

2. Add `"vouch_count"` to the `Meta.fields` list.

3. Add `"vouch_count"` to `Meta.read_only_fields`.

4. Add the getter method after `_resolve_tags`:

```python
    def get_vouch_count(self, obj):
        """Cumulative count of positive reviews — always present, regardless of recipe status.

        Uses the queryset annotation (_vouch_count_ann) when available to avoid
        N+1 queries in list views; falls back to a single COUNT(*) otherwise.
        """
        ann = getattr(obj, "_vouch_count_ann", None)
        if ann is not None:
            return ann
        return obj.reviews.filter(is_positive=True).count()
```

- [ ] **Step 4: Make the existing `total_votes`/`positive_votes` cumulative**

In `backend/spoonfury/apps/recipes/serializers.py`, update the `to_representation` block that currently reads (around lines 63-72):

```python
        # Attach live vote tally for recipes currently under review
        if instance.status in ("in_review", "mod_queue"):
            reviews = RecipeReview.objects.filter(
                recipe=instance, review_round=instance.review_round
            )
            ret["total_votes"] = reviews.count()
            ret["positive_votes"] = reviews.filter(is_positive=True).count()
        else:
            ret["total_votes"] = None
            ret["positive_votes"] = None
```

Replace with:

```python
        # Attach live vote tally for recipes currently under review.
        # Cumulative across all review rounds (matches the new gate math).
        if instance.status in ("in_review", "mod_queue"):
            reviews = RecipeReview.objects.filter(recipe=instance)
            ret["total_votes"] = reviews.count()
            ret["positive_votes"] = reviews.filter(is_positive=True).count()
        else:
            ret["total_votes"] = None
            ret["positive_votes"] = None
```

- [ ] **Step 5: Run vouch_count tests — should pass**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_vouch_serializer.py -v`
Expected: both tests PASS.

- [ ] **Step 6: Write failing test — review_progress shape and author-only visibility**

Append to `backend/spoonfury/apps/recipes/tests/test_vouch_serializer.py`:

```python
@pytest.mark.django_db
def test_review_progress_present_for_author(db):
    author = User.objects.create_user(username="pa", password="x")
    recipe = _make_recipe(author, status="in_review")
    # 2 positive, 1 negative = 3 total, 2/3 = 66% (below 80% threshold)
    for i in range(2):
        r = User.objects.create_user(username=f"pp{i}", password="x")
        RecipeReview.objects.create(recipe=recipe, reviewer=r, review_round=1, is_positive=True)
    neg = User.objects.create_user(username="pn", password="x")
    RecipeReview.objects.create(recipe=recipe, reviewer=neg, review_round=1, is_positive=False)

    factory = APIRequestFactory()
    req = factory.get("/")
    req.user = author
    data = RecipeSerializer(recipe, context={"request": req}).data
    rp = data["review_progress"]
    assert rp is not None
    assert rp["positive"] == 2
    assert rp["total"] == 3
    assert rp["threshold_met"] is False
    # Needs ceil(0.8 * 3) = 3 positives, has 2, so needs 1 more.
    assert rp["needed_for_threshold"] == 1


@pytest.mark.django_db
def test_review_progress_null_for_other_viewer(db):
    author = User.objects.create_user(username="pa2", password="x")
    other = User.objects.create_user(username="other", password="x")
    recipe = _make_recipe(author, status="in_review")

    factory = APIRequestFactory()
    req = factory.get("/")
    req.user = other
    data = RecipeSerializer(recipe, context={"request": req}).data
    assert data["review_progress"] is None


@pytest.mark.django_db
def test_review_progress_present_for_staff(db):
    author = User.objects.create_user(username="pa3", password="x")
    staff = User.objects.create_user(username="mod", password="x", is_staff=True)
    recipe = _make_recipe(author, status="in_review")

    factory = APIRequestFactory()
    req = factory.get("/")
    req.user = staff
    data = RecipeSerializer(recipe, context={"request": req}).data
    assert data["review_progress"] is not None


@pytest.mark.django_db
def test_review_progress_needed_math_below_minimum(db):
    """total<3: needed_for_threshold = 3 - total (we need at least 3 votes to ratio at all)."""
    author = User.objects.create_user(username="pa4", password="x")
    recipe = _make_recipe(author, status="in_review")
    r = User.objects.create_user(username="v1", password="x")
    RecipeReview.objects.create(recipe=recipe, reviewer=r, review_round=1, is_positive=True)

    factory = APIRequestFactory()
    req = factory.get("/")
    req.user = author
    data = RecipeSerializer(recipe, context={"request": req}).data
    rp = data["review_progress"]
    assert rp["total"] == 1
    assert rp["needed_for_threshold"] == 2  # 3 - 1 = 2 more needed to reach the minimum


@pytest.mark.django_db
def test_review_progress_threshold_met(db):
    author = User.objects.create_user(username="pa5", password="x")
    recipe = _make_recipe(author, status="in_review")
    for i in range(4):
        r = User.objects.create_user(username=f"pm{i}", password="x")
        RecipeReview.objects.create(recipe=recipe, reviewer=r, review_round=1, is_positive=True)

    factory = APIRequestFactory()
    req = factory.get("/")
    req.user = author
    data = RecipeSerializer(recipe, context={"request": req}).data
    rp = data["review_progress"]
    assert rp["threshold_met"] is True
    assert rp["needed_for_threshold"] == 0
```

- [ ] **Step 7: Run tests to verify failure**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_vouch_serializer.py -v`
Expected: new `review_progress` tests FAIL with KeyError (field doesn't exist yet).

- [ ] **Step 8: Add `review_progress` to the serializer**

In `backend/spoonfury/apps/recipes/serializers.py`, inside the `to_representation` method, add after the total_votes/positive_votes block (around line 72):

```python
        # Owner/staff-only structured progression indicator
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        is_owner_or_staff = (
            user is not None
            and user.is_authenticated
            and (user == instance.author or user.is_staff)
        )
        if is_owner_or_staff:
            ret["review_progress"] = self._compute_review_progress(instance)
        else:
            ret["review_progress"] = None
```

Add the helper method to `RecipeSerializer` (place it below `_resolve_tags`):

```python
    def _compute_review_progress(self, instance):
        """Compute the structured progression indicator for the owner/staff view.

        Shape: {positive, total, needed_for_threshold, threshold_met}
        - needed_for_threshold: minimum additional positive votes required to hit
          80% / ≥3. When total < 3, this is (3 - total). When total >= 3, this is
          max(0, ceil(0.8 * total) - positive).
        """
        reviews = RecipeReview.objects.filter(recipe=instance)
        total = reviews.count()
        positive = reviews.filter(is_positive=True).count()
        if total < 3:
            needed = max(0, 3 - total)
            threshold_met = False
        else:
            required_positive = ceil(0.8 * total)
            needed = max(0, required_positive - positive)
            threshold_met = positive >= required_positive
        return {
            "positive": positive,
            "total": total,
            "needed_for_threshold": needed,
            "threshold_met": threshold_met,
        }
```

Add to the top of the file:

```python
from math import ceil
```

- [ ] **Step 9: Add `review_progress` to Meta.fields and read_only_fields**

In the same file, update `Meta.fields` and `Meta.read_only_fields` to include `"review_progress"`. The serializer field declaration isn't strictly needed because `to_representation` sets the key directly, but for DRF schema inspection, declare a placeholder field:

Actually since `to_representation` writes the key manually, we do NOT need to declare `review_progress` as a field on the serializer class. Skip the field declaration. Just make sure the tests validate the presence of the key in the response.

- [ ] **Step 10: Run all vouch serializer tests**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_vouch_serializer.py -v`
Expected: all PASS.

- [ ] **Step 11: Add the queryset annotation in RecipeViewSet**

In `backend/spoonfury/apps/recipes/views.py`, update `RecipeViewSet.get_queryset` (line 42 onwards). At the top of the method, add an import at the top of the file if not already present:

```python
from django.db.models import Count, Q
```

Then annotate `base`:

```python
        base = (
            Recipe.objects
            .select_related("author", "parent_recipe__author")
            .prefetch_related("tags")
            .annotate(
                _vouch_count_ann=Count("reviews", filter=Q(reviews__is_positive=True))
            )
        )
```

(Note: the `Q` and `Count` imports may already exist in `views.py`. If so, just add to the existing import line.)

- [ ] **Step 12: Write failing test for annotation path**

Append to `backend/spoonfury/apps/recipes/tests/test_vouch_serializer.py`:

```python
@pytest.mark.django_db
def test_vouch_count_uses_annotation_in_list_view(db):
    """When the queryset is annotated, vouch_count reads from the annotation without extra queries."""
    from django.db.models import Count, Q
    author = User.objects.create_user(username="an", password="x")
    recipe = _make_recipe(author)
    for i in range(2):
        r = User.objects.create_user(username=f"av{i}", password="x")
        RecipeReview.objects.create(recipe=recipe, reviewer=r, review_round=1, is_positive=True)

    annotated = Recipe.objects.filter(pk=recipe.pk).annotate(
        _vouch_count_ann=Count("reviews", filter=Q(reviews__is_positive=True))
    ).first()
    assert hasattr(annotated, "_vouch_count_ann")
    assert annotated._vouch_count_ann == 2

    factory = APIRequestFactory()
    req = factory.get("/")
    req.user = author
    data = RecipeSerializer(annotated, context={"request": req}).data
    assert data["vouch_count"] == 2
```

- [ ] **Step 13: Run annotation test**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_vouch_serializer.py::test_vouch_count_uses_annotation_in_list_view -v`
Expected: PASS.

- [ ] **Step 14: Run the full recipes test suite**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/ -v`
Expected: all pass. If any existing test fails because it was asserting per-round totals, update the assertion to match cumulative semantics.

- [ ] **Step 15: Commit**

```bash
git add backend/spoonfury/apps/recipes/serializers.py \
        backend/spoonfury/apps/recipes/views.py \
        backend/spoonfury/apps/recipes/tests/test_vouch_serializer.py
git commit -m "feat(reviews): vouch_count + review_progress serializer fields"
```

---

### Task 4: Frontend — Types + RecipeCard vouch pill

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/components/RecipeCard.tsx`

- [ ] **Step 1: Update types.ts**

In `frontend/src/types.ts`, find the `Recipe` interface. Add these fields (grouped with the existing review-related fields):

```typescript
  // Cumulative count of positive reviews (vouches). Always present, >= 0.
  vouch_count: number;
  // Owner/staff-only structured progression indicator, null for other viewers.
  review_progress: ReviewProgress | null;
```

Add the `ReviewProgress` interface near the top of `types.ts`:

```typescript
export interface ReviewProgress {
  positive: number;
  total: number;
  needed_for_threshold: number;
  threshold_met: boolean;
}
```

- [ ] **Step 2: Update RecipeCard.tsx to render the vouch pill**

In `frontend/src/components/RecipeCard.tsx`, replace the author + fork count block (around lines 66-73) with:

```tsx
        {/* Author + fork count + vouch count */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>by @{author_username}</span>
          {fork_count > 0 && (
            <span className="text-amber-600 font-medium">
              🍴 {formatForkCount(fork_count)}
            </span>
          )}
          {recipe.vouch_count > 0 && (
            <span className="text-violet-600 font-medium">
              ✨ {recipe.vouch_count} {recipe.vouch_count === 1 ? "vouch" : "vouches"}
            </span>
          )}
        </div>
```

Note: this uses `recipe.vouch_count` directly (not the destructured shortcut) because the destructure at the top of the component doesn't include it yet. Either destructure it:

```tsx
  const { slug, title, description, image_url, category, author_username, fork_count, vouch_count } = recipe;
```

and use `vouch_count > 0` — pick whichever style matches the file's convention.

- [ ] **Step 3: Manual smoke test**

Run the frontend dev server and visually confirm the vouch pill appears on a recipe card with positive reviews. If no dev server running:

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 and navigate to a recipe list view where a recipe has at least one positive review.

- [ ] **Step 4: TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/types.ts frontend/src/components/RecipeCard.tsx
git commit -m "feat(reviews): vouch pill on RecipeCard"
```

---

### Task 5: Frontend — MyKitchenPage progression indicator + CompactRow pill

**Files:**
- Modify: `frontend/src/pages/MyKitchenPage.tsx`

- [ ] **Step 1: Add the vouch pill to CompactRow**

In `frontend/src/pages/MyKitchenPage.tsx`, find `CompactRow` (around line 171). After the fork count span (around line 185), add the vouch pill:

```tsx
      {recipe.fork_count > 0 && (
        <span className="text-[9px] text-amber-600 shrink-0">🍴 {recipe.fork_count}</span>
      )}
      {recipe.vouch_count > 0 && (
        <span className="text-[9px] text-violet-600 shrink-0">✨ {recipe.vouch_count}</span>
      )}
```

- [ ] **Step 2: Replace the old vote counter with the progression indicator**

In the inner `RecipeCard` component in `MyKitchenPage.tsx` (around line 198), find the block at lines 247-251:

```tsx
            {recipe.status === "in_review" && recipe.total_votes != null && (
              <span className="text-[10px] font-semibold text-blue-600">
                👍 {recipe.positive_votes}/{recipe.total_votes} votes
              </span>
            )}
```

Replace with a call to a new helper component `ReviewProgressLine`, and also render the vouch pill on any card with vouches:

```tsx
            {recipe.status === "in_review" && recipe.review_progress && (
              <ReviewProgressLine progress={recipe.review_progress} />
            )}
            {recipe.vouch_count > 0 && (
              <span className="text-[10px] text-violet-600">✨ {recipe.vouch_count}</span>
            )}
            {recipe.fork_count > 0 && (
              <span className="text-[10px] text-muted-foreground">🍴 {recipe.fork_count}</span>
            )}
```

And remove the old `fork_count` block that's now duplicated.

- [ ] **Step 3: Add the ReviewProgressLine component**

In `frontend/src/pages/MyKitchenPage.tsx`, near the other small helper components (near `CompactRow` or `GateChecklist`), add:

```tsx
function ReviewProgressLine({ progress }: { progress: ReviewProgress }) {
  const { positive, total, needed_for_threshold, threshold_met } = progress;

  if (threshold_met) {
    return (
      <span className="text-[10px] font-semibold text-violet-600">
        ✨ Passed community review — in moderator queue
      </span>
    );
  }

  if (total === 0) {
    return (
      <span className="text-[10px] text-violet-600">
        ✨ 0 votes · {needed_for_threshold} more needed to publish
      </span>
    );
  }

  return (
    <span className="text-[10px] text-violet-600">
      ✨ {positive}/{total} votes · {needed_for_threshold} more yes to publish
    </span>
  );
}
```

Import `ReviewProgress` at the top of the file:

```tsx
import type { Recipe, ReviewProgress } from "@/types";
```

- [ ] **Step 4: TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual smoke test**

In browser: visit My Kitchen → Test Kitchen section with an in_review recipe. Confirm the progression line reads correctly across the three states:
- 0 votes: "0 votes · 3 more needed to publish"
- Some votes, not yet at 80%: "2/3 votes · 1 more yes to publish"
- 80% reached: "Passed community review — in moderator queue"

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/MyKitchenPage.tsx
git commit -m "feat(reviews): Test Kitchen progression indicator + CompactRow vouch pill"
```

---

### Task 6: Frontend — RecipePage detail line + ReviewPanel public visibility

**Files:**
- Modify: `frontend/src/pages/RecipePage.tsx`
- Modify: `frontend/src/components/ReviewPanel.tsx`

- [ ] **Step 1: Add the vouch attribution line to RecipePage**

In `frontend/src/pages/RecipePage.tsx`, locate the title/author block in the render output. Add, directly below the author row (before the description):

```tsx
{recipe.status === "published" && recipe.vouch_count > 0 && (
  <p className="text-sm text-violet-700 flex items-center gap-1.5 mt-1">
    <span>✨</span>
    <span>
      Vouched for by {recipe.vouch_count} {recipe.vouch_count === 1 ? "cook" : "cooks"} in the test kitchen
    </span>
  </p>
)}
```

- [ ] **Step 2: Relax the blind gate in ReviewPanel for published recipes**

In `frontend/src/components/ReviewPanel.tsx`, find the conditional rendering that gates the reviews list behind `has_voted`. The relevant check looks like `{reviewData.has_voted && (...)}` or similar.

Update the conditional to also reveal reviews when the recipe is published. This requires knowing the recipe status — check whether `ReviewPanel` already receives the recipe or just `reviewData`. If only `reviewData`, check whether the backend's new `review_list` response structure already includes `reviews` unconditionally for published recipes (it does — see Task 2 Step 11).

The simplest change: if `reviewData.reviews` is present (non-null array), render it. The backend controls visibility by whether it includes the key at all.

Find the existing conditional:

```tsx
{reviewData.has_voted && reviewData.reviews && (
  // render reviews
)}
```

Replace with:

```tsx
{reviewData.reviews && (
  // render reviews
)}
```

(If the actual code differs, the guiding principle is: remove the `has_voted` gate. Presence of the `reviews` key in the response is sufficient — the backend now decides whether to include it based on recipe status.)

- [ ] **Step 3: TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual smoke test**

In browser:
- Visit a published recipe with vouches — confirm the `✨ Vouched for by N cooks in the test kitchen` line renders below the author row.
- Visit a published recipe's reviews section (if one exists) — confirm reviews are visible without voting.
- Visit an in_review recipe — confirm the blind-until-voted behavior is preserved.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/RecipePage.tsx frontend/src/components/ReviewPanel.tsx
git commit -m "feat(reviews): published detail line + public review visibility"
```

---

### Task 7: Docs — Part B TODO, archive spec/plan when complete

**Files:**
- Modify: `docs/TODO.md`
- Modify: `CLAUDE.md` (update active plans table)

- [ ] **Step 1: Add Part B to TODO.md**

In `docs/TODO.md`, add a new section:

```markdown
## Recipe Ratings & Reviews (v0.9.1 — Part B)

Part A (v0.9) surfaced vouch counts and made historical reviews public. Part B extends the system into a living ratings feature.

**Scope:**
- **Post-publish voting.** `review_vote` endpoint accepts votes for `status in ("in_review", "published")`. Published recipes accumulate vouches from any logged-in user (except author).
- **5-spoon rating.** Replace the boolean `RecipeReview.is_positive` with a 1–5 integer rating (spoons). Migration converts legacy `is_positive=True` to 4 spoons and `is_positive=False` to 2 spoons (or similar — decide during spec).
- **Drive-by negativity mitigation.** Require a comment on low ratings (e.g., any rating ≤ 2). Optional: weighted scoring that favors reviewers who have also forked or cooked the recipe.
- **Update the published detail line copy.** "Vouched for by N cooks in the test kitchen" no longer fits once post-publish votes are counted — revise to something like "N cooks have vouched for this recipe."
- **"Kitchen Tested" signature treatment (Option C from brainstorm).** Named visual badge with reviewer avatars.

**Data retention:** Part A's durability guarantees (one vote per reviewer per recipe, forever) continue to apply. A reviewer who voted during in_review cannot vote again after publish.

**Reference:** `docs/plans/completed/2026-04-12-vouch-retention.spec.md` (Part A spec, §11 Explicit Non-Goals).
```

- [ ] **Step 2: Update CLAUDE.md active plans table**

In `CLAUDE.md`, find the Active plans table under `## 🗺️ Plans`. Add a row:

```markdown
| v0.9 Vouch Retention | `active/2026-04-12-vouch-retention.spec.md` | `active/2026-04-12-vouch-retention.impl.md` |
```

- [ ] **Step 3: Commit**

```bash
git add docs/TODO.md CLAUDE.md
git commit -m "docs(v0.9): vouch retention TODO for Part B + active plans entry"
```

- [ ] **Step 4: (After all tasks complete) Archive plan files**

Once the feature is human-tested and merged, move the spec and impl files:

```bash
git mv docs/plans/active/2026-04-12-vouch-retention.spec.md docs/plans/completed/
git mv docs/plans/active/2026-04-12-vouch-retention.impl.md docs/plans/completed/
```

Update `CLAUDE.md` to move the row from "Active" to "Completed."

Do NOT perform this step during initial implementation — wait until the human has tested and merged.

---

## Post-Implementation Checklist

Before declaring the feature complete and asking the human to test:

- [ ] All backend tests pass: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/ -v`
- [ ] TypeScript compiles: `cd frontend && npx tsc --noEmit`
- [ ] Frontend production build passes: `cd frontend && npm run build`
- [ ] No lingering references to per-round vote counting in `views_review.py` except `review_round` field access (which is kept as historical)
- [ ] No lingering references to `total_votes`/`positive_votes` as per-round in frontend — they should be understood as cumulative now
- [ ] Remind the human to test in-browser before merging: visit My Kitchen, a published recipe with vouches, and an in_review recipe
