# Community Review & Moderation Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Test Kitchen with a two-stage publish pipeline — community voting by invitees, followed by moderator approval — plus in-app notifications for every pipeline event.

**Architecture:** All new models live in the existing `recipes` app alongside `TestKitchenInvite`. Recipe gains a `review_round` field and extended `status` choices. `RecipeReview`, `ModerationAction`, `AuthorStrike`, and `Notification` are new models. New DRF actions hang off the existing `RecipeViewSet`. A new `ModerationViewSet` handles the staff queue. Notifications are polled from the frontend every 60 seconds.

**Tech Stack:** Django 5 / DRF (backend), React 19 / Vite / Tailwind 4 / Shadcn (frontend), Lucide icons (bell), `pytest-django` (tests)

**Depends on:** Test Kitchen & Recipe Privacy feature must be merged first (`status`, `published_at`, `TestKitchenInvite` must exist).

---

## File Map

### Backend — new/modified files

| File | Change |
|------|--------|
| `backend/spoonfury/apps/recipes/models.py` | Extend `STATUS_CHOICES` to 5 values, add `review_round` to Recipe; add `RecipeReview`, `ModerationAction`, `AuthorStrike`, `Notification` models |
| `backend/spoonfury/apps/recipes/serializers.py` | Add `RecipeReviewSerializer`, `ModerationActionSerializer`, `NotificationSerializer`; update `RecipeSerializer` to include `review_round` |
| `backend/spoonfury/apps/recipes/views.py` | Add `submit_for_review`, `withdraw_review`, `force_publish`, `submit_review`, `get_reviews` actions to `RecipeViewSet` |
| `backend/spoonfury/apps/recipes/views_moderation.py` | New file — `ModerationViewSet` (queue list, approve, request-revision) |
| `backend/spoonfury/apps/recipes/views_notifications.py` | New file — `NotificationViewSet` (list, mark-read, mark-all-read, unread-count) |
| `backend/spoonfury/apps/recipes/urls.py` | Register new actions and viewsets |
| `backend/spoonfury/apps/recipes/migrations/` | Auto-generated migration |
| `backend/spoonfury/apps/recipes/tests/test_review_pipeline.py` | New test file — submit/vote/threshold/moderation/strikes |
| `backend/spoonfury/apps/recipes/tests/test_notifications.py` | New test file — notification creation + API |

### Frontend — new/modified files

| File | Change |
|------|--------|
| `frontend/src/types.ts` | Add `ReviewStatus`, `RecipeReview`, `ModerationAction`, `Notification` types; update `Recipe` with `status`, `review_round` |
| `frontend/src/lib/api.ts` | Add notification and review API helpers |
| `frontend/src/contexts/NotificationContext.tsx` | New — polls unread count, exposes notifications state |
| `frontend/src/components/NotificationBell.tsx` | New — bell icon with badge + dropdown |
| `frontend/src/components/ReviewPanel.tsx` | New — thumbs up/down + comment form for invitees |
| `frontend/src/pages/MyKitchenPage.tsx` | New — My Recipes page (test kitchen + published sections) |
| `frontend/src/pages/ModerationQueuePage.tsx` | New — staff-only mod queue |
| `frontend/src/pages/RecipePage.tsx` | Add review panel for invitees, status badge for author |
| `frontend/src/components/NavBar.tsx` | Add NotificationBell, My Kitchen nav sticker |
| `frontend/src/App.tsx` | Add routes for `/kitchen`, `/moderation` |

---

### Task 1: Extend Recipe model + add new models + migration

**Files:**
- Modify: `backend/spoonfury/apps/recipes/models.py`
- Test: `backend/spoonfury/apps/recipes/tests/test_review_pipeline.py`

- [ ] **Step 1: Write failing tests for new models**

Create `backend/spoonfury/apps/recipes/tests/test_review_pipeline.py`:

```python
import pytest
from django.contrib.auth import get_user_model
from spoonfury.apps.recipes.models import Recipe, RecipeReview, ModerationAction, AuthorStrike, Notification

User = get_user_model()

SAMPLE_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
    {"quantity": "1", "unit": "cup", "name": "flour", "note": ""},
]


@pytest.fixture
def author(db):
    return User.objects.create_user(username="chef", email="chef@test.com", password="pass")


@pytest.fixture
def reviewer_user(db):
    return User.objects.create_user(username="taster", email="taster@test.com", password="pass")


@pytest.fixture
def draft_recipe(author):
    return Recipe.objects.create(
        title="Draft Soup",
        description="A work in progress.",
        serves="4",
        ingredients=SAMPLE_INGREDIENTS,
        instructions="Step 1: boil water. Step 2: add stuff.",
        category="soup",
        author=author,
    )


@pytest.mark.django_db
def test_recipe_has_review_round_default_zero(draft_recipe):
    """New recipes default to review_round=0 (never submitted)."""
    assert draft_recipe.review_round == 0


@pytest.mark.django_db
def test_recipe_status_choices_include_all_pipeline_states(draft_recipe):
    """Recipe status field must accept all 5 pipeline states."""
    for status in ("draft", "in_review", "mod_queue", "revision_requested", "published"):
        draft_recipe.status = status
        draft_recipe.save()
        draft_recipe.refresh_from_db()
        assert draft_recipe.status == status


@pytest.mark.django_db
def test_recipe_review_unique_per_round(draft_recipe, reviewer_user):
    """One vote per reviewer per round — duplicate raises IntegrityError."""
    import pytest
    from django.db import IntegrityError
    RecipeReview.objects.create(
        recipe=draft_recipe,
        reviewer=reviewer_user,
        review_round=1,
        is_positive=True,
    )
    with pytest.raises(IntegrityError):
        RecipeReview.objects.create(
            recipe=draft_recipe,
            reviewer=reviewer_user,
            review_round=1,
            is_positive=False,
        )


@pytest.mark.django_db
def test_author_strike_linked_to_moderation_action(draft_recipe, author):
    """AuthorStrike is created alongside a ModerationAction."""
    mod_action = ModerationAction.objects.create(
        recipe=draft_recipe,
        moderator=author,
        action="revision_requested",
        feedback="Needs more detail.",
        review_round=1,
    )
    strike = AuthorStrike.objects.create(
        author=draft_recipe.author,
        recipe=draft_recipe,
        moderation_action=mod_action,
    )
    assert AuthorStrike.objects.filter(author=draft_recipe.author).count() == 1
    assert strike.moderation_action == mod_action
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && ../.venv/Scripts/python -m pytest spoonfury/apps/recipes/tests/test_review_pipeline.py -v
```

Expected: ImportError — `RecipeReview`, `ModerationAction`, etc. not defined yet.

- [ ] **Step 3: Extend models.py**

In `backend/spoonfury/apps/recipes/models.py`, replace the `STATUS_CHOICES` list and add `review_round` to Recipe, then add new models at the bottom of the file:

```python
# Replace existing STATUS_CHOICES (currently only draft/published from Test Kitchen)
STATUS_CHOICES = [
    ("draft", "Draft"),
    ("in_review", "In Review"),
    ("mod_queue", "In Moderation"),
    ("revision_requested", "Revision Requested"),
    ("published", "Published"),
]
```

Add `review_round` to the `Recipe` model fields (after `updated_at`):

```python
review_round = models.PositiveIntegerField(
    default=0,
    help_text="0 = never submitted. Increments on each resubmission.",
)
```

Add new models at the bottom of `models.py`:

```python
class RecipeReview(models.Model):
    """
    A single invitee vote on a recipe during a review round.
    Blind until the reviewer has submitted — enforced in the API layer.
    """

    recipe = models.ForeignKey(Recipe, related_name="reviews", on_delete=models.CASCADE)
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recipe_reviews"
    )
    review_round = models.PositiveIntegerField()
    is_positive = models.BooleanField()
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("recipe", "reviewer", "review_round")]

    def __str__(self):
        vote = "+" if self.is_positive else "-"
        return f"{vote} {self.reviewer} on {self.recipe} (round {self.review_round})"


class ModerationAction(models.Model):
    """
    Immutable audit log of every moderation decision.
    feedback is required when action is 'revision_requested'.
    """

    ACTION_CHOICES = [
        ("approved", "Approved"),
        ("revision_requested", "Revision Requested"),
        ("force_published", "Force Published"),
    ]

    recipe = models.ForeignKey(
        Recipe, related_name="moderation_actions", on_delete=models.CASCADE
    )
    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="moderation_actions",
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    feedback = models.TextField(blank=True)
    review_round = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.action} — {self.recipe} (round {self.review_round})"


class AuthorStrike(models.Model):
    """
    Created automatically when a moderator sends a recipe back for revision.
    Accumulates indefinitely — no hard rejection, but high counts flag the author.
    """

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="strikes", on_delete=models.CASCADE
    )
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE)
    moderation_action = models.OneToOneField(ModerationAction, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Strike: {self.author} on {self.recipe}"


class Notification(models.Model):
    """
    In-app notification for review pipeline events.
    message is pre-rendered at creation — frontend displays it verbatim.
    """

    TYPE_CHOICES = [
        ("review_requested", "Review Requested"),
        ("review_received", "Review Received"),
        ("recipe_in_mod_queue", "Recipe In Moderation Queue"),
        ("recipe_approved", "Recipe Approved"),
        ("revision_requested", "Revision Requested"),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, related_name="notifications", on_delete=models.CASCADE
    )
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name="sent_notifications",
    )
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"→ {self.recipient}: {self.message}"
```

- [ ] **Step 4: Generate and apply migration**

```bash
cd backend && ../.venv/Scripts/python manage.py makemigrations recipes
../.venv/Scripts/python manage.py migrate
```

Expected: New migration file created and applied cleanly.

- [ ] **Step 5: Run tests — expect pass**

```bash
../.venv/Scripts/python -m pytest spoonfury/apps/recipes/tests/test_review_pipeline.py -v
```

Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/spoonfury/apps/recipes/models.py \
        backend/spoonfury/apps/recipes/migrations/ \
        backend/spoonfury/apps/recipes/tests/test_review_pipeline.py
git commit -m "feat: add review pipeline models (RecipeReview, ModerationAction, AuthorStrike, Notification)"
```

---

### Task 2: Serializers for new models

**Files:**
- Modify: `backend/spoonfury/apps/recipes/serializers.py`

- [ ] **Step 1: Read current serializers.py**

```bash
cat backend/spoonfury/apps/recipes/serializers.py
```

- [ ] **Step 2: Add new serializers**

Add to `backend/spoonfury/apps/recipes/serializers.py`:

```python
from .models import Recipe, Tag, RecipeReview, ModerationAction, Notification


class RecipeReviewSerializer(serializers.ModelSerializer):
    """Serializer for a single invitee vote on a recipe."""

    reviewer_username = serializers.CharField(source="reviewer.username", read_only=True)

    class Meta:
        model = RecipeReview
        fields = [
            "id", "reviewer_username", "review_round",
            "is_positive", "comment", "created_at",
        ]
        read_only_fields = ["id", "reviewer_username", "review_round", "created_at"]


class ModerationActionSerializer(serializers.ModelSerializer):
    """Serializer for a moderation action record."""

    moderator_username = serializers.CharField(source="moderator.username", read_only=True)

    class Meta:
        model = ModerationAction
        fields = [
            "id", "moderator_username", "action",
            "feedback", "review_round", "created_at",
        ]
        read_only_fields = ["id", "moderator_username", "action", "review_round", "created_at"]


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for an in-app notification."""

    class Meta:
        model = Notification
        fields = [
            "id", "notification_type", "message",
            "is_read", "created_at",
            "recipe_id",
        ]
        read_only_fields = ["id", "notification_type", "message", "created_at", "recipe_id"]
```

Also update `RecipeSerializer` to expose `status` and `review_round` (they must already be in fields from Test Kitchen — if not, add them):

```python
# In RecipeSerializer.Meta.fields, ensure these are present:
# "status", "review_round", "published_at"
```

- [ ] **Step 3: Commit**

```bash
git add backend/spoonfury/apps/recipes/serializers.py
git commit -m "feat: add RecipeReview, ModerationAction, Notification serializers"
```

---

### Task 3: Review pipeline — helper functions

**Files:**
- Create: `backend/spoonfury/apps/recipes/review_helpers.py`

These helpers contain the threshold logic and notification dispatch, extracted so views stay thin and the logic is testable in isolation.

- [ ] **Step 1: Write failing tests for helpers**

Add to `backend/spoonfury/apps/recipes/tests/test_review_pipeline.py`:

```python
from spoonfury.apps.recipes.review_helpers import check_threshold, dispatch_notifications
from math import ceil


@pytest.mark.django_db
def test_threshold_requires_minimum_three_votes(draft_recipe, reviewer_user):
    """Threshold must not pass with fewer than 3 votes even if all positive."""
    author2 = User.objects.create_user(username="u2", email="u2@t.com", password="p")
    for i, u in enumerate([reviewer_user, author2]):
        RecipeReview.objects.create(
            recipe=draft_recipe, reviewer=u, review_round=1, is_positive=True
        )
    assert check_threshold(draft_recipe, round=1) is False


@pytest.mark.django_db
def test_threshold_passes_with_80_percent_positive(draft_recipe):
    """5 positive out of 6 votes passes (ceil(0.8*6)=5)."""
    users = [
        User.objects.create_user(username=f"u{i}", email=f"u{i}@t.com", password="p")
        for i in range(6)
    ]
    for i, u in enumerate(users):
        RecipeReview.objects.create(
            recipe=draft_recipe, reviewer=u, review_round=1,
            is_positive=(i < 5),  # 5 positive, 1 negative
        )
    assert check_threshold(draft_recipe, round=1) is True


@pytest.mark.django_db
def test_threshold_fails_below_80_percent(draft_recipe):
    """4 positive out of 6 votes fails (need 5)."""
    users = [
        User.objects.create_user(username=f"v{i}", email=f"v{i}@t.com", password="p")
        for i in range(6)
    ]
    for i, u in enumerate(users):
        RecipeReview.objects.create(
            recipe=draft_recipe, reviewer=u, review_round=1,
            is_positive=(i < 4),  # 4 positive, 2 negative
        )
    assert check_threshold(draft_recipe, round=1) is False
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && ../.venv/Scripts/python -m pytest spoonfury/apps/recipes/tests/test_review_pipeline.py::test_threshold_requires_minimum_three_votes -v
```

Expected: ImportError — `review_helpers` does not exist yet.

- [ ] **Step 3: Create review_helpers.py**

Create `backend/spoonfury/apps/recipes/review_helpers.py`:

```python
"""
Helper functions for the review pipeline.

check_threshold: Determines whether a recipe's current round votes meet
                 the 80%-positive-from-3+ threshold for promotion to mod_queue.

dispatch_notifications: Creates Notification rows for a given pipeline event.
"""

from math import ceil
from django.contrib.auth import get_user_model
from .models import RecipeReview, Notification

User = get_user_model()


def check_threshold(recipe, round: int) -> bool:
    """
    Returns True if the votes for `round` meet the publish threshold:
    - At least 3 votes total
    - required_positive = ceil(0.8 * total_votes), positive_votes >= required_positive

    Args:
        recipe: Recipe instance
        round: The review_round integer to evaluate

    Returns:
        bool
    """
    reviews = RecipeReview.objects.filter(recipe=recipe, review_round=round)
    total = reviews.count()
    if total < 3:
        return False
    positive = reviews.filter(is_positive=True).count()
    required = ceil(0.8 * total)
    return positive >= required


def dispatch_notifications(event: str, recipe, actor) -> None:
    """
    Create Notification rows for a pipeline event.

    Events and their recipients:
        "review_requested"    → all kitchen invitees of the recipe author
        "review_received"     → recipe author
        "recipe_in_mod_queue" → all staff users
        "recipe_approved"     → recipe author
        "revision_requested"  → recipe author

    Args:
        event: One of the notification type strings
        recipe: Recipe instance
        actor: User who triggered the event
    """
    from .models import TestKitchenInvite

    templates = {
        "review_requested": "{actor} wants your feedback on {recipe}",
        "review_received": "You got a new review on {recipe}",
        "recipe_in_mod_queue": "New recipe awaiting moderation: {recipe} by {actor}",
        "recipe_approved": "Your recipe {recipe} has been published!",
        "revision_requested": "Feedback on {recipe} — revision needed",
    }

    message = templates[event].format(
        actor=actor.username,
        recipe=recipe.title,
    )

    if event == "review_requested":
        recipients = [
            invite.invitee
            for invite in TestKitchenInvite.objects.filter(
                owner=recipe.author
            ).select_related("invitee")
        ]
    elif event == "recipe_in_mod_queue":
        recipients = list(User.objects.filter(is_staff=True))
    else:
        recipients = [recipe.author]

    notifications = [
        Notification(
            recipient=recipient,
            notification_type=event,
            recipe=recipe,
            actor=actor,
            message=message,
        )
        for recipient in recipients
        if recipient != actor  # don't notify yourself
    ]
    Notification.objects.bulk_create(notifications)
```

- [ ] **Step 4: Run tests — expect pass**

```bash
../.venv/Scripts/python -m pytest spoonfury/apps/recipes/tests/test_review_pipeline.py -v
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/spoonfury/apps/recipes/review_helpers.py \
        backend/spoonfury/apps/recipes/tests/test_review_pipeline.py
git commit -m "feat: add review_helpers (check_threshold, dispatch_notifications)"
```

---

### Task 4: Recipe pipeline API endpoints

**Files:**
- Modify: `backend/spoonfury/apps/recipes/views.py`
- Modify: `backend/spoonfury/apps/recipes/urls.py`
- Test: `backend/spoonfury/apps/recipes/tests/test_review_pipeline.py`

- [ ] **Step 1: Write failing API tests**

Add to `backend/spoonfury/apps/recipes/tests/test_review_pipeline.py`:

```python
from django.urls import reverse
from rest_framework.test import APIClient
from spoonfury.apps.recipes.models import TestKitchenInvite


@pytest.fixture
def full_recipe(author):
    """A recipe that passes the 4-point checklist gate."""
    return Recipe.objects.create(
        title="Gated Soup",
        description="A complete recipe.",
        serves="4",
        ingredients=SAMPLE_INGREDIENTS,
        instructions="Step 1: boil water. Step 2: add stuff.",
        category="soup",
        author=author,
        status="draft",
    )


@pytest.fixture
def author_client(author):
    client = APIClient()
    client.force_authenticate(user=author)
    return client


@pytest.fixture
def reviewer_client(reviewer_user):
    client = APIClient()
    client.force_authenticate(user=reviewer_user)
    return client


@pytest.mark.django_db
def test_submit_for_review_transitions_to_in_review(author_client, full_recipe):
    url = reverse("recipe-submit-for-review", kwargs={"slug": full_recipe.slug})
    response = author_client.post(url)
    assert response.status_code == 200
    full_recipe.refresh_from_db()
    assert full_recipe.status == "in_review"
    assert full_recipe.review_round == 1


@pytest.mark.django_db
def test_submit_for_review_fails_checklist(author_client, author):
    """Recipes missing required fields must be rejected."""
    bad_recipe = Recipe.objects.create(
        title="Incomplete",
        description="",
        serves="2",
        ingredients=[{"quantity": "1", "unit": "cup", "name": "flour", "note": ""}],
        instructions="ok",
        category="other",
        author=author,
    )
    url = reverse("recipe-submit-for-review", kwargs={"slug": bad_recipe.slug})
    response = author_client.post(url)
    assert response.status_code == 400


@pytest.mark.django_db
def test_withdraw_review_returns_to_draft(author_client, full_recipe):
    full_recipe.status = "in_review"
    full_recipe.review_round = 1
    full_recipe.save()
    url = reverse("recipe-withdraw-review", kwargs={"slug": full_recipe.slug})
    response = author_client.post(url)
    assert response.status_code == 200
    full_recipe.refresh_from_db()
    assert full_recipe.status == "draft"


@pytest.mark.django_db
def test_invitee_can_submit_review(author_client, reviewer_client, reviewer_user, full_recipe):
    """An invited user can vote on a recipe in_review."""
    full_recipe.status = "in_review"
    full_recipe.review_round = 1
    full_recipe.save()
    TestKitchenInvite.objects.create(owner=full_recipe.author, invitee=reviewer_user)
    url = reverse("recipe-submit-review", kwargs={"slug": full_recipe.slug})
    response = reviewer_client.post(url, {"is_positive": True, "comment": "Loved it!"}, format="json")
    assert response.status_code == 201


@pytest.mark.django_db
def test_non_invitee_cannot_submit_review(reviewer_client, full_recipe):
    """A user without a kitchen invite cannot vote."""
    full_recipe.status = "in_review"
    full_recipe.review_round = 1
    full_recipe.save()
    url = reverse("recipe-submit-review", kwargs={"slug": full_recipe.slug})
    response = reviewer_client.post(url, {"is_positive": True}, format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_recipe_auto_enters_mod_queue_after_threshold(full_recipe):
    """After 3/3 positive votes, recipe automatically moves to mod_queue."""
    full_recipe.status = "in_review"
    full_recipe.review_round = 1
    full_recipe.save()

    users = [
        User.objects.create_user(username=f"w{i}", email=f"w{i}@t.com", password="p")
        for i in range(3)
    ]
    for u in users:
        TestKitchenInvite.objects.create(owner=full_recipe.author, invitee=u)

    clients = [APIClient() for u in users]
    for client, u in zip(clients, users):
        client.force_authenticate(user=u)

    url = reverse("recipe-submit-review", kwargs={"slug": full_recipe.slug})
    for client in clients:
        client.post(url, {"is_positive": True}, format="json")

    full_recipe.refresh_from_db()
    assert full_recipe.status == "mod_queue"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend && ../.venv/Scripts/python -m pytest spoonfury/apps/recipes/tests/test_review_pipeline.py -k "submit_for_review or withdraw or invitee or mod_queue" -v
```

Expected: All FAIL — URL reversals raise `NoReverseMatch`.

- [ ] **Step 3: Add pipeline actions to RecipeViewSet**

Add to `backend/spoonfury/apps/recipes/views.py`:

```python
from math import ceil
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status as http_status
from .models import Recipe, Tag, RecipeReview, TestKitchenInvite
from .serializers import RecipeSerializer, TagSerializer, RecipeReviewSerializer
from .review_helpers import check_threshold, dispatch_notifications


def _checklist_errors(recipe):
    """
    Returns a list of unmet checklist criteria.
    Empty list means the recipe may proceed to in_review.
    """
    errors = []
    valid_ingredients = [i for i in recipe.ingredients if i.get("name", "").strip()]
    if len(valid_ingredients) < 2:
        errors.append("At least 2 ingredients required.")
    if not recipe.instructions or len(recipe.instructions) < 20:
        errors.append("Instructions must be at least 20 characters.")
    if not recipe.description or not recipe.description.strip():
        errors.append("Description is required.")
    if not recipe.category:
        errors.append("Category is required.")
    return errors


# Inside RecipeViewSet, add these actions:

    @action(detail=True, methods=["post"], url_path="submit-for-review")
    def submit_for_review(self, request, slug=None):
        """Transition draft/revision_requested → in_review. Validates checklist."""
        recipe = self.get_object()
        if recipe.author != request.user:
            return Response({"detail": "Only the author can submit for review."}, status=403)
        if recipe.status not in ("draft", "revision_requested"):
            return Response({"detail": f"Cannot submit from status '{recipe.status}'."}, status=400)
        errors = _checklist_errors(recipe)
        if errors:
            return Response({"detail": "Checklist not complete.", "errors": errors}, status=400)
        recipe.status = "in_review"
        recipe.review_round += 1
        recipe.save()
        dispatch_notifications("review_requested", recipe, actor=request.user)
        return Response(RecipeSerializer(recipe).data)

    @action(detail=True, methods=["post"], url_path="withdraw-review")
    def withdraw_review(self, request, slug=None):
        """Transition in_review → draft. Invitee votes for the current round are not deleted
        but will not count toward future rounds."""
        recipe = self.get_object()
        if recipe.author != request.user:
            return Response({"detail": "Only the author can withdraw."}, status=403)
        if recipe.status != "in_review":
            return Response({"detail": "Recipe is not in review."}, status=400)
        recipe.status = "draft"
        recipe.save()
        return Response(RecipeSerializer(recipe).data)

    @action(detail=True, methods=["post"], url_path="force-publish")
    def force_publish(self, request, slug=None):
        """Superuser only: bypass pipeline and publish immediately. Checklist still enforced."""
        if not request.user.is_superuser:
            return Response({"detail": "Superuser access required."}, status=403)
        recipe = self.get_object()
        errors = _checklist_errors(recipe)
        if errors:
            return Response({"detail": "Checklist not complete.", "errors": errors}, status=400)
        from .models import ModerationAction
        ModerationAction.objects.create(
            recipe=recipe,
            moderator=request.user,
            action="force_published",
            review_round=recipe.review_round,
        )
        recipe.status = "published"
        recipe.published_at = timezone.now()
        recipe.save()
        return Response(RecipeSerializer(recipe).data)

    @action(detail=True, methods=["post"], url_path="review")
    def submit_review(self, request, slug=None):
        """Invitee submits a vote. Blind until after submission. Auto-promotes if threshold met."""
        recipe = self.get_object()
        if recipe.status != "in_review":
            return Response({"detail": "Recipe is not currently in review."}, status=400)
        if recipe.author == request.user:
            return Response({"detail": "Authors cannot review their own recipe."}, status=403)
        is_invitee = TestKitchenInvite.objects.filter(
            owner=recipe.author, invitee=request.user
        ).exists()
        if not is_invitee:
            return Response({"detail": "You must be a kitchen invitee to review."}, status=403)
        already_voted = RecipeReview.objects.filter(
            recipe=recipe, reviewer=request.user, review_round=recipe.review_round
        ).exists()
        if already_voted:
            return Response({"detail": "You have already reviewed this recipe this round."}, status=400)
        serializer = RecipeReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review = serializer.save(
            recipe=recipe,
            reviewer=request.user,
            review_round=recipe.review_round,
        )
        dispatch_notifications("review_received", recipe, actor=request.user)
        if check_threshold(recipe, round=recipe.review_round):
            recipe.status = "mod_queue"
            recipe.save()
            dispatch_notifications("recipe_in_mod_queue", recipe, actor=request.user)
        return Response(RecipeReviewSerializer(review).data, status=201)

    @action(detail=True, methods=["get"], url_path="reviews")
    def get_reviews(self, request, slug=None):
        """
        Returns reviews for the current round.
        Before the caller has voted: count + threshold status only.
        After voting: all reviews with comments revealed.
        """
        recipe = self.get_object()
        round_reviews = RecipeReview.objects.filter(
            recipe=recipe, review_round=recipe.review_round
        )
        total = round_reviews.count()
        positive = round_reviews.filter(is_positive=True).count()
        has_voted = round_reviews.filter(reviewer=request.user).exists()

        if not has_voted:
            return Response({
                "has_voted": False,
                "total_votes": total,
                "positive_votes": positive,
                "reviews": [],
            })
        return Response({
            "has_voted": True,
            "total_votes": total,
            "positive_votes": positive,
            "reviews": RecipeReviewSerializer(round_reviews, many=True).data,
        })
```

- [ ] **Step 4: Register new URL patterns**

In `backend/spoonfury/apps/recipes/urls.py`, the DRF router auto-registers `@action` methods from `RecipeViewSet` — no changes needed for those. Verify by running tests.

- [ ] **Step 5: Run tests — expect pass**

```bash
../.venv/Scripts/python -m pytest spoonfury/apps/recipes/tests/test_review_pipeline.py -v
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/spoonfury/apps/recipes/views.py
git commit -m "feat: add submit-for-review, withdraw-review, force-publish, review endpoints"
```

---

### Task 5: Moderation queue API

**Files:**
- Create: `backend/spoonfury/apps/recipes/views_moderation.py`
- Modify: `backend/spoonfury/apps/recipes/urls.py`
- Test: `backend/spoonfury/apps/recipes/tests/test_review_pipeline.py`

- [ ] **Step 1: Write failing tests**

Add to `backend/spoonfury/apps/recipes/tests/test_review_pipeline.py`:

```python
from django.contrib.auth import get_user_model


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        username="moderator", email="mod@test.com", password="pass", is_staff=True
    )


@pytest.fixture
def staff_client(staff_user):
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def queued_recipe(author):
    return Recipe.objects.create(
        title="Queued Soup",
        description="A recipe in moderation.",
        serves="4",
        ingredients=SAMPLE_INGREDIENTS,
        instructions="Step 1: boil. Step 2: serve.",
        category="soup",
        author=author,
        status="mod_queue",
        review_round=1,
    )


@pytest.mark.django_db
def test_mod_queue_only_accessible_by_staff(author_client, queued_recipe):
    url = reverse("moderation-queue")
    response = author_client.get(url)
    assert response.status_code == 403


@pytest.mark.django_db
def test_mod_queue_lists_queued_recipes(staff_client, queued_recipe):
    url = reverse("moderation-queue")
    response = staff_client.get(url)
    assert response.status_code == 200
    assert any(r["slug"] == queued_recipe.slug for r in response.data["results"])


@pytest.mark.django_db
def test_moderator_can_approve(staff_client, queued_recipe):
    url = reverse("moderation-approve", kwargs={"slug": queued_recipe.slug})
    response = staff_client.post(url)
    assert response.status_code == 200
    queued_recipe.refresh_from_db()
    assert queued_recipe.status == "published"
    assert queued_recipe.published_at is not None


@pytest.mark.django_db
def test_moderator_request_revision_requires_feedback(staff_client, queued_recipe):
    url = reverse("moderation-request-revision", kwargs={"slug": queued_recipe.slug})
    response = staff_client.post(url, {}, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_moderator_request_revision_creates_strike(staff_client, queued_recipe):
    from spoonfury.apps.recipes.models import AuthorStrike
    url = reverse("moderation-request-revision", kwargs={"slug": queued_recipe.slug})
    response = staff_client.post(url, {"feedback": "Needs better instructions."}, format="json")
    assert response.status_code == 200
    queued_recipe.refresh_from_db()
    assert queued_recipe.status == "revision_requested"
    assert AuthorStrike.objects.filter(recipe=queued_recipe).count() == 1
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
../.venv/Scripts/python -m pytest spoonfury/apps/recipes/tests/test_review_pipeline.py -k "mod_queue or moderator" -v
```

Expected: All FAIL — URLs don't exist yet.

- [ ] **Step 3: Create views_moderation.py**

Create `backend/spoonfury/apps/recipes/views_moderation.py`:

```python
"""
Moderation queue views — staff-only endpoints for reviewing recipes
that have passed invitee voting and are awaiting final approval.
"""

from django.utils import timezone
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Recipe, ModerationAction, AuthorStrike
from .serializers import RecipeSerializer
from .review_helpers import dispatch_notifications


class IsStaff(permissions.BasePermission):
    """Grants access only to users with is_staff=True."""

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class ModerationViewSet(viewsets.ViewSet):
    """
    Staff-only viewset for the moderation queue.
    Provides list, approve, and request-revision operations.
    """

    permission_classes = [IsStaff]

    def list(self, request):
        """GET /moderation/queue/ — list all recipes awaiting moderation."""
        recipes = (
            Recipe.objects
            .filter(status="mod_queue")
            .select_related("author")
            .prefetch_related("strikes")
            .order_by("updated_at")
        )
        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(recipes, request)
        serializer = RecipeSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @action(detail=True, methods=["post"], url_path="approve", lookup_field="slug")
    def approve(self, request, slug=None):
        """POST /moderation/{slug}/approve/ — approve recipe for publication."""
        try:
            recipe = Recipe.objects.get(slug=slug)
        except Recipe.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        if recipe.status != "mod_queue":
            return Response({"detail": "Recipe is not in moderation queue."}, status=400)
        ModerationAction.objects.create(
            recipe=recipe,
            moderator=request.user,
            action="approved",
            review_round=recipe.review_round,
        )
        recipe.status = "published"
        recipe.published_at = timezone.now()
        recipe.save()
        dispatch_notifications("recipe_approved", recipe, actor=request.user)
        return Response(RecipeSerializer(recipe).data)

    @action(detail=True, methods=["post"], url_path="request-revision", lookup_field="slug")
    def request_revision(self, request, slug=None):
        """POST /moderation/{slug}/request-revision/ — send back with feedback. Creates AuthorStrike."""
        try:
            recipe = Recipe.objects.get(slug=slug)
        except Recipe.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)
        if recipe.status != "mod_queue":
            return Response({"detail": "Recipe is not in moderation queue."}, status=400)
        feedback = request.data.get("feedback", "").strip()
        if not feedback:
            return Response({"detail": "Feedback is required when requesting revision."}, status=400)
        mod_action = ModerationAction.objects.create(
            recipe=recipe,
            moderator=request.user,
            action="revision_requested",
            feedback=feedback,
            review_round=recipe.review_round,
        )
        AuthorStrike.objects.create(
            author=recipe.author,
            recipe=recipe,
            moderation_action=mod_action,
        )
        recipe.status = "revision_requested"
        recipe.save()
        dispatch_notifications("revision_requested", recipe, actor=request.user)
        return Response(RecipeSerializer(recipe).data)
```

- [ ] **Step 4: Register moderation URLs**

In `backend/spoonfury/apps/recipes/urls.py`, add:

```python
from .views_moderation import ModerationViewSet

mod_viewset = ModerationViewSet.as_view({
    "get": "list",
})

urlpatterns = [
    # ... existing entries ...
    path("moderation/queue/", mod_viewset, name="moderation-queue"),
    path("moderation/<slug:slug>/approve/", ModerationViewSet.as_view({"post": "approve"}), name="moderation-approve"),
    path("moderation/<slug:slug>/request-revision/", ModerationViewSet.as_view({"post": "request_revision"}), name="moderation-request-revision"),
] + router.urls + [...]
```

- [ ] **Step 5: Run tests — expect pass**

```bash
../.venv/Scripts/python -m pytest spoonfury/apps/recipes/tests/test_review_pipeline.py -v
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/spoonfury/apps/recipes/views_moderation.py \
        backend/spoonfury/apps/recipes/urls.py
git commit -m "feat: add moderation queue endpoints (approve, request-revision)"
```

---

### Task 6: Notification API

**Files:**
- Create: `backend/spoonfury/apps/recipes/views_notifications.py`
- Modify: `backend/spoonfury/apps/recipes/urls.py`
- Create: `backend/spoonfury/apps/recipes/tests/test_notifications.py`

- [ ] **Step 1: Write failing tests**

Create `backend/spoonfury/apps/recipes/tests/test_notifications.py`:

```python
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from spoonfury.apps.recipes.models import Recipe, Notification
from django.contrib.auth import get_user_model

User = get_user_model()

SAMPLE_INGREDIENTS = [
    {"quantity": "1", "unit": "cup", "name": "flour", "note": ""},
    {"quantity": "2", "unit": "Tbsp", "name": "butter", "note": ""},
]


@pytest.fixture
def notif_user(db):
    return User.objects.create_user(username="notifu", email="n@t.com", password="pass")


@pytest.fixture
def notif_recipe(notif_user):
    return Recipe.objects.create(
        title="Notif Soup", description="A soup.", serves="2",
        ingredients=SAMPLE_INGREDIENTS,
        instructions="Boil water. Add stuff.",
        category="soup", author=notif_user,
    )


@pytest.fixture
def notif_client(notif_user):
    client = APIClient()
    client.force_authenticate(user=notif_user)
    return client


@pytest.fixture
def notification(notif_user, notif_recipe):
    return Notification.objects.create(
        recipient=notif_user,
        notification_type="review_received",
        recipe=notif_recipe,
        actor=notif_user,
        message="You got a new review on Notif Soup",
    )


@pytest.mark.django_db
def test_notification_list_returns_own_notifications(notif_client, notification):
    url = reverse("notification-list")
    response = notif_client.get(url)
    assert response.status_code == 200
    assert response.data["count"] == 1


@pytest.mark.django_db
def test_unread_count_returns_correct_number(notif_client, notification):
    url = reverse("notification-unread-count")
    response = notif_client.get(url)
    assert response.status_code == 200
    assert response.data["count"] == 1


@pytest.mark.django_db
def test_mark_read_updates_is_read(notif_client, notification):
    url = reverse("notification-mark-read")
    response = notif_client.post(url, {"ids": [notification.id]}, format="json")
    assert response.status_code == 200
    notification.refresh_from_db()
    assert notification.is_read is True


@pytest.mark.django_db
def test_mark_all_read(notif_client, notif_user, notif_recipe):
    for i in range(3):
        Notification.objects.create(
            recipient=notif_user,
            notification_type="review_received",
            recipe=notif_recipe,
            actor=notif_user,
            message=f"Review {i}",
        )
    url = reverse("notification-mark-all-read")
    response = notif_client.post(url)
    assert response.status_code == 200
    assert Notification.objects.filter(recipient=notif_user, is_read=False).count() == 0
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
../.venv/Scripts/python -m pytest spoonfury/apps/recipes/tests/test_notifications.py -v
```

Expected: All FAIL.

- [ ] **Step 3: Create views_notifications.py**

Create `backend/spoonfury/apps/recipes/views_notifications.py`:

```python
"""
Notification API views.
All endpoints require authentication and operate only on the requesting user's notifications.
"""

from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from .models import Notification
from .serializers import NotificationSerializer


class NotificationListView(APIView):
    """GET /notifications/ — list the authenticated user's notifications, newest first."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(recipient=request.user)
        if request.query_params.get("unread") == "true":
            qs = qs.filter(is_read=False)
        paginator = PageNumberPagination()
        paginator.page_size = 20
        page = paginator.paginate_queryset(qs, request)
        serializer = NotificationSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class NotificationMarkReadView(APIView):
    """POST /notifications/mark-read/ — mark specific notifications as read."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ids = request.data.get("ids", [])
        Notification.objects.filter(recipient=request.user, id__in=ids).update(is_read=True)
        return Response({"marked": len(ids)})


class NotificationMarkAllReadView(APIView):
    """POST /notifications/mark-all-read/ — mark all of the user's notifications as read."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        return Response({"marked": count})


class NotificationUnreadCountView(APIView):
    """GET /notifications/unread-count/ — lightweight unread badge count."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(recipient=request.user, is_read=False).count()
        return Response({"count": count})
```

- [ ] **Step 4: Register notification URLs**

Add to `backend/spoonfury/apps/recipes/urls.py`:

```python
from .views_notifications import (
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    NotificationUnreadCountView,
)

# Add before router.urls:
path("notifications/", NotificationListView.as_view(), name="notification-list"),
path("notifications/mark-read/", NotificationMarkReadView.as_view(), name="notification-mark-read"),
path("notifications/mark-all-read/", NotificationMarkAllReadView.as_view(), name="notification-mark-all-read"),
path("notifications/unread-count/", NotificationUnreadCountView.as_view(), name="notification-unread-count"),
```

- [ ] **Step 5: Run all backend tests**

```bash
../.venv/Scripts/python -m pytest spoonfury/ -v
```

Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/spoonfury/apps/recipes/views_notifications.py \
        backend/spoonfury/apps/recipes/urls.py \
        backend/spoonfury/apps/recipes/tests/test_notifications.py
git commit -m "feat: add notification API (list, mark-read, mark-all-read, unread-count)"
```

---

### Task 7: Frontend types + API helpers

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Update types.ts**

Add to `frontend/src/types.ts`:

```typescript
export type RecipeStatus =
  | "draft"
  | "in_review"
  | "mod_queue"
  | "revision_requested"
  | "published";

export interface RecipeReview {
  id: number;
  reviewer_username: string;
  review_round: number;
  is_positive: boolean;
  comment: string;
  created_at: string;
}

export interface ReviewsResponse {
  has_voted: boolean;
  total_votes: number;
  positive_votes: number;
  reviews: RecipeReview[];
}

export interface Notification {
  id: number;
  notification_type: string;
  message: string;
  is_read: boolean;
  created_at: string;
  recipe_id: number;
}

export interface NotificationPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}
```

Update the `Recipe` interface to include new fields:

```typescript
export interface Recipe {
  // ... existing fields ...
  status: RecipeStatus;
  review_round: number;
  published_at: string | null;
}
```

- [ ] **Step 2: Add API helpers**

Read `frontend/src/lib/api.ts` first, then add the following functions to the existing `api` object:

```typescript
// Notification endpoints
notificationList: (token: string, unreadOnly = false): Promise<NotificationPage> =>
  api.get(`/notifications/${unreadOnly ? "?unread=true" : ""}`, token),

notificationUnreadCount: (token: string): Promise<{ count: number }> =>
  api.get("/notifications/unread-count/", token),

notificationMarkRead: (token: string, ids: number[]): Promise<{ marked: number }> =>
  api.post("/notifications/mark-read/", { ids }, token),

notificationMarkAllRead: (token: string): Promise<{ marked: number }> =>
  api.post("/notifications/mark-all-read/", {}, token),

// Review pipeline endpoints
submitForReview: (token: string, slug: string) =>
  api.post(`/recipes/${slug}/submit-for-review/`, {}, token),

withdrawReview: (token: string, slug: string) =>
  api.post(`/recipes/${slug}/withdraw-review/`, {}, token),

submitReview: (token: string, slug: string, data: { is_positive: boolean; comment?: string }) =>
  api.post(`/recipes/${slug}/review/`, data, token),

getReviews: (token: string, slug: string): Promise<ReviewsResponse> =>
  api.get(`/recipes/${slug}/reviews/`, token),

// Moderation endpoints (staff only)
moderationQueue: (token: string) =>
  api.get("/moderation/queue/", token),

moderationApprove: (token: string, slug: string) =>
  api.post(`/moderation/${slug}/approve/`, {}, token),

moderationRequestRevision: (token: string, slug: string, feedback: string) =>
  api.post(`/moderation/${slug}/request-revision/`, { feedback }, token),
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types.ts frontend/src/lib/api.ts
git commit -m "feat: add frontend types and API helpers for review pipeline + notifications"
```

---

### Task 8: NotificationContext + NotificationBell component

**Files:**
- Create: `frontend/src/contexts/NotificationContext.tsx`
- Create: `frontend/src/components/NotificationBell.tsx`

- [ ] **Step 1: Create NotificationContext.tsx**

Create `frontend/src/contexts/NotificationContext.tsx`:

```tsx
/**
 * NotificationContext
 *
 * Polls /notifications/unread-count/ every 60 seconds for authenticated users.
 * Provides unread count, full notification list, and mark-read actions.
 */

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import type { Notification } from "@/types";

interface NotificationContextValue {
  unreadCount: number;
  notifications: Notification[];
  isLoading: boolean;
  markRead: (ids: number[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

const POLL_INTERVAL_MS = 60_000;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCount = useCallback(async () => {
    if (!token) return;
    try {
      const data = await api.notificationUnreadCount(token);
      setUnreadCount(data.count);
    } catch {
      // silently fail — badge disappears rather than breaking the app
    }
  }, [token]);

  const refresh = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const data = await api.notificationList(token);
      setNotifications(data.results);
      setUnreadCount(data.results.filter((n) => !n.is_read).length);
    } catch {
      // silently fail
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const markRead = useCallback(async (ids: number[]) => {
    if (!token) return;
    await api.notificationMarkRead(token, ids);
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - ids.length));
  }, [token]);

  const markAllRead = useCallback(async () => {
    if (!token) return;
    await api.notificationMarkAllRead(token);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [token]);

  // Poll unread count every 60s
  useEffect(() => {
    if (!token) return;
    fetchCount();
    const interval = setInterval(fetchCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchCount, token]);

  return (
    <NotificationContext.Provider
      value={{ unreadCount, notifications, isLoading, markRead, markAllRead, refresh }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/** @throws if used outside NotificationProvider */
export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
```

- [ ] **Step 2: Create NotificationBell.tsx**

Create `frontend/src/components/NotificationBell.tsx`:

```tsx
/**
 * NotificationBell
 *
 * Navbar bell icon with unread count badge and dropdown list.
 * Clicking a notification marks it as read and navigates to the recipe.
 */

import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Notification } from "@/types";

export function NotificationBell() {
  const { unreadCount, notifications, isLoading, markRead, markAllRead, refresh } =
    useNotifications();
  const navigate = useNavigate();

  const handleOpen = () => {
    refresh();
  };

  const handleClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markRead([notification.id]);
    }
    // Navigate to the recipe — requires slug, but we only have recipe_id.
    // Use the recipe detail route with the id for now; update if slug becomes available.
    navigate(`/recipes/${notification.recipe_id}`);
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && handleOpen()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {isLoading && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">Loading…</div>
        )}
        {!isLoading && notifications.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        )}
        {!isLoading &&
          notifications.slice(0, 10).map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => handleClick(n)}
              className={`flex flex-col items-start gap-0.5 cursor-pointer ${
                !n.is_read ? "font-medium bg-muted/50" : ""
              }`}
            >
              <span className="text-sm">{n.message}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(n.created_at).toLocaleDateString()}
              </span>
            </DropdownMenuItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/contexts/NotificationContext.tsx \
        frontend/src/components/NotificationBell.tsx
git commit -m "feat: add NotificationContext (60s polling) and NotificationBell dropdown"
```

---

### Task 9: Wire NotificationBell into NavBar + App

**Files:**
- Modify: `frontend/src/components/NavBar.tsx`
- Modify: `frontend/src/App.tsx` (or wherever providers are set up)

- [ ] **Step 1: Read App.tsx to find provider structure**

```bash
cat frontend/src/App.tsx
```

- [ ] **Step 2: Add NotificationProvider to App.tsx**

Wrap the app content with `<NotificationProvider>` inside the existing `<AuthProvider>` (notifications depend on auth):

```tsx
import { NotificationProvider } from "@/contexts/NotificationContext";

// Inside JSX, inside AuthProvider:
<NotificationProvider>
  {/* existing router/layout */}
</NotificationProvider>
```

- [ ] **Step 3: Add NotificationBell to NavBar.tsx**

In `frontend/src/components/NavBar.tsx`, import and place `NotificationBell` next to the CartCapsule. Find the spot where the cart icon renders (search for `ShoppingCart`) and add the bell before or after it:

```tsx
import { NotificationBell } from "@/components/NotificationBell";
import { useAuth } from "@/contexts/AuthContext";

// Inside the nav JSX, where authenticated controls render:
{token && <NotificationBell />}
```

- [ ] **Step 4: Add My Kitchen sticker to NavBar**

In the `STICKERS` array in `NavBar.tsx`, add:

```typescript
{ label: "My Kitchen", to: "/kitchen", color: "bg-[#C7F2A4]", authRequired: true },
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/NavBar.tsx frontend/src/App.tsx
git commit -m "feat: add NotificationBell and My Kitchen nav sticker to NavBar"
```

---

### Task 10: ReviewPanel component

**Files:**
- Create: `frontend/src/components/ReviewPanel.tsx`
- Modify: `frontend/src/pages/RecipePage.tsx`

- [ ] **Step 1: Create ReviewPanel.tsx**

Create `frontend/src/components/ReviewPanel.tsx`:

```tsx
/**
 * ReviewPanel
 *
 * Shown on a recipe page when the viewer is a kitchen invitee and the recipe
 * is in_review. Allows submitting a thumbs up/down vote + optional comment.
 * After voting, reveals all reviews for the current round (blind → open transition).
 */

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import type { ReviewsResponse } from "@/types";

interface ReviewPanelProps {
  /** Recipe slug */
  slug: string;
  token: string;
  /** Pre-fetched reviews state (pass null to trigger fetch on mount) */
  initialReviews?: ReviewsResponse | null;
}

export function ReviewPanel({ slug, token, initialReviews = null }: ReviewPanelProps) {
  const [reviews, setReviews] = useState<ReviewsResponse | null>(initialReviews);
  const [vote, setVote] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (vote === null) {
      setError("Please select thumbs up or thumbs down.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await api.submitReview(token, slug, { is_positive: vote, comment });
      const updated = await api.getReviews(token, slug);
      setReviews(updated);
    } catch {
      setError("Failed to submit review. You may have already voted this round.");
    } finally {
      setSubmitting(false);
    }
  };

  if (reviews?.has_voted) {
    return (
      <div className="mt-8 space-y-4">
        <Separator />
        <h3 className="text-lg font-semibold">Community Reviews</h3>
        <p className="text-sm text-muted-foreground">
          {reviews.positive_votes} of {reviews.total_votes} reviewers gave a thumbs up.
        </p>
        <div className="space-y-3">
          {reviews.reviews.map((r) => (
            <div key={r.id} className="rounded-md border p-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                {r.is_positive ? (
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                ) : (
                  <ThumbsDown className="h-4 w-4 text-red-500" />
                )}
                {r.reviewer_username}
              </div>
              {r.comment && <p className="mt-1 text-muted-foreground">{r.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <Separator />
      <h3 className="text-lg font-semibold">Leave a Review</h3>
      <p className="text-sm text-muted-foreground">
        {reviews
          ? `${reviews.total_votes} vote${reviews.total_votes !== 1 ? "s" : ""} so far.`
          : "Be the first to vote on this recipe."}
      </p>
      <div className="flex gap-3">
        <Button
          variant={vote === true ? "default" : "outline"}
          size="sm"
          onClick={() => setVote(true)}
          aria-pressed={vote === true}
        >
          <ThumbsUp className="mr-1.5 h-4 w-4" /> Thumbs Up
        </Button>
        <Button
          variant={vote === false ? "destructive" : "outline"}
          size="sm"
          onClick={() => setVote(false)}
          aria-pressed={vote === false}
        >
          <ThumbsDown className="mr-1.5 h-4 w-4" /> Thumbs Down
        </Button>
      </div>
      <Textarea
        placeholder="Optional feedback for the author…"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button onClick={handleSubmit} disabled={submitting}>
        {submitting ? "Submitting…" : "Submit Review"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 2: Add ReviewPanel to RecipePage**

In `frontend/src/pages/RecipePage.tsx`, import ReviewPanel and show it when the recipe is `in_review` and the viewer is not the author:

```tsx
import { ReviewPanel } from "@/components/ReviewPanel";

// Inside the render, after the main recipe content, before the closing tag:
{recipe.status === "in_review" && recipe.author_username !== username && token && (
  <ReviewPanel slug={recipe.slug} token={token} />
)}
```

Also add a status badge visible to the author near the title:

```tsx
{recipe.author_username === username && recipe.status !== "published" && (
  <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
    {recipe.status === "draft" && "Draft"}
    {recipe.status === "in_review" && "In Review"}
    {recipe.status === "mod_queue" && "In Moderation"}
    {recipe.status === "revision_requested" && "Revision Requested"}
  </span>
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ReviewPanel.tsx frontend/src/pages/RecipePage.tsx
git commit -m "feat: add ReviewPanel component and status badge to RecipePage"
```

---

### Task 11: MyKitchenPage

**Files:**
- Create: `frontend/src/pages/MyKitchenPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create MyKitchenPage.tsx**

Create `frontend/src/pages/MyKitchenPage.tsx`:

```tsx
/**
 * MyKitchenPage
 *
 * Shows the authenticated user's recipes in two sections:
 * - Test Kitchen: draft + in_review + mod_queue + revision_requested
 * - Published: status=published
 *
 * Each card shows status badge, checklist progress (for drafts), and available actions.
 * Authors can see their own strike count.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { Recipe } from "@/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  mod_queue: "In Moderation",
  revision_requested: "Revision Requested",
  published: "Published",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  in_review: "bg-blue-100 text-blue-700",
  mod_queue: "bg-yellow-100 text-yellow-700",
  revision_requested: "bg-red-100 text-red-700",
  published: "bg-green-100 text-green-700",
};

function checklist(recipe: Recipe): { label: string; met: boolean }[] {
  const validIngredients = recipe.ingredients.filter((i) => i.name.trim());
  return [
    { label: "At least 2 ingredients", met: validIngredients.length >= 2 },
    { label: "Instructions (20+ chars)", met: recipe.instructions.length >= 20 },
    { label: "Description", met: !!recipe.description.trim() },
    { label: "Category set", met: !!recipe.category },
  ];
}

interface RecipeCardProps {
  recipe: Recipe;
  onSubmit: (slug: string) => void;
  onWithdraw: (slug: string) => void;
}

function KitchenRecipeCard({ recipe, onSubmit, onWithdraw }: RecipeCardProps) {
  const checks = checklist(recipe);
  const allMet = checks.every((c) => c.met);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/recipes/${recipe.slug}`} className="font-semibold hover:underline">
          {recipe.title}
        </Link>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[recipe.status]}`}
        >
          {STATUS_LABELS[recipe.status]}
        </span>
      </div>

      {recipe.status === "draft" && (
        <ul className="space-y-1">
          {checks.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-sm">
              <span className={c.met ? "text-green-500" : "text-muted-foreground"}>
                {c.met ? "✓" : "○"}
              </span>
              <span className={c.met ? "" : "text-muted-foreground"}>{c.label}</span>
            </li>
          ))}
        </ul>
      )}

      {recipe.status === "draft" && allMet && (
        <Button size="sm" onClick={() => onSubmit(recipe.slug)}>
          Submit for Review
        </Button>
      )}

      {recipe.status === "in_review" && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Waiting for invitee votes…</span>
          <button
            onClick={() => onWithdraw(recipe.slug)}
            className="text-xs text-red-500 hover:underline"
          >
            Withdraw
          </button>
        </div>
      )}

      {recipe.status === "revision_requested" && (
        <div className="space-y-2">
          <p className="text-sm text-red-600 font-medium">Revision requested by moderator.</p>
          <Button size="sm" variant="outline" onClick={() => onSubmit(recipe.slug)}>
            Resubmit for Review
          </Button>
        </div>
      )}
    </div>
  );
}

export function MyKitchenPage() {
  const { token, username } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [strikeCount, setStrikeCount] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get("/recipes/?author=me", token)
      .then((data: any) => setRecipes(data.results ?? data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async (slug: string) => {
    if (!token) return;
    try {
      await api.submitForReview(token, slug);
      setRecipes((prev) =>
        prev.map((r) => (r.slug === slug ? { ...r, status: "in_review" as const } : r))
      );
    } catch {
      alert("Could not submit for review. Check the recipe is complete.");
    }
  };

  const handleWithdraw = async (slug: string) => {
    if (!token) return;
    try {
      await api.withdrawReview(token, slug);
      setRecipes((prev) =>
        prev.map((r) => (r.slug === slug ? { ...r, status: "draft" as const } : r))
      );
    } catch {
      alert("Could not withdraw recipe.");
    }
  };

  const kitchenRecipes = recipes.filter((r) => r.status !== "published");
  const publishedRecipes = recipes.filter((r) => r.status === "published");

  if (loading) return <div className="p-8 text-center">Loading your kitchen…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">My Kitchen 🧪</h1>
        {strikeCount !== null && strikeCount > 0 && (
          <p className="text-sm text-red-500">{strikeCount} revision strike{strikeCount > 1 ? "s" : ""} on your account.</p>
        )}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Test Kitchen</h2>
        {kitchenRecipes.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No recipes in your kitchen yet.{" "}
            <Link to="/recipes/new" className="underline">Create one</Link>.
          </p>
        )}
        {kitchenRecipes.map((r) => (
          <KitchenRecipeCard
            key={r.id}
            recipe={r}
            onSubmit={handleSubmit}
            onWithdraw={handleWithdraw}
          />
        ))}
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Published ✅</h2>
        {publishedRecipes.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing published yet.</p>
        )}
        {publishedRecipes.map((r) => (
          <div key={r.id} className="rounded-lg border p-4 flex items-center justify-between">
            <Link to={`/recipes/${r.slug}`} className="font-medium hover:underline">
              {r.title}
            </Link>
            <span className="text-xs text-muted-foreground">
              {r.published_at ? new Date(r.published_at).toLocaleDateString() : ""}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

```tsx
import { MyKitchenPage } from "@/pages/MyKitchenPage";

// Inside the router:
<Route path="/kitchen" element={<ProtectedRoute><MyKitchenPage /></ProtectedRoute>} />
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/MyKitchenPage.tsx frontend/src/App.tsx
git commit -m "feat: add MyKitchenPage with recipe status cards and review actions"
```

---

### Task 12: ModerationQueuePage

**Files:**
- Create: `frontend/src/pages/ModerationQueuePage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create ModerationQueuePage.tsx**

Create `frontend/src/pages/ModerationQueuePage.tsx`:

```tsx
/**
 * ModerationQueuePage
 *
 * Staff-only page. Lists recipes in mod_queue status.
 * Each card shows author, vote summary, and strike warning (2+ strikes).
 * Actions: Approve (confirm modal) or Request Revision (feedback textarea).
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Recipe } from "@/types";

function StrikeWarning({ count }: { count: number }) {
  if (count < 2) return null;
  return (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
      ⚠ {count} strikes
    </span>
  );
}

export function ModerationQueuePage() {
  const { token } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [approveTarget, setApproveTarget] = useState<Recipe | null>(null);
  const [revisionTarget, setRevisionTarget] = useState<Recipe | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    api.moderationQueue(token)
      .then((data: any) => setRecipes(data.results ?? data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleApprove = async () => {
    if (!approveTarget || !token) return;
    setSubmitting(true);
    try {
      await api.moderationApprove(token, approveTarget.slug);
      setRecipes((prev) => prev.filter((r) => r.slug !== approveTarget.slug));
      setApproveTarget(null);
    } catch {
      alert("Failed to approve recipe.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionTarget || !token) return;
    if (!feedback.trim()) {
      setFeedbackError("Feedback is required.");
      return;
    }
    setSubmitting(true);
    try {
      await api.moderationRequestRevision(token, revisionTarget.slug, feedback);
      setRecipes((prev) => prev.filter((r) => r.slug !== revisionTarget.slug));
      setRevisionTarget(null);
      setFeedback("");
      setFeedbackError("");
    } catch {
      alert("Failed to request revision.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading queue…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Moderation Queue</h1>
      {recipes.length === 0 && (
        <p className="text-muted-foreground">Queue is empty. Nice work!</p>
      )}
      {recipes.map((recipe) => (
        <div key={recipe.id} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link to={`/recipes/${recipe.slug}`} className="font-semibold hover:underline">
                {recipe.title}
              </Link>
              <p className="text-sm text-muted-foreground">by {recipe.author_username}</p>
            </div>
            {/* strike count requires API extension — render if available */}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setApproveTarget(recipe)}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setRevisionTarget(recipe); setFeedback(""); setFeedbackError(""); }}
            >
              Request Revision
            </Button>
          </div>
        </div>
      ))}

      {/* Approve confirm dialog */}
      <Dialog open={!!approveTarget} onOpenChange={() => setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Recipe</DialogTitle>
            <DialogDescription>
              This will publish "{approveTarget?.title}" to the public feed immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={submitting}>
              {submitting ? "Publishing…" : "Publish Recipe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revision request dialog */}
      <Dialog open={!!revisionTarget} onOpenChange={() => setRevisionTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Revision</DialogTitle>
            <DialogDescription>
              Leave feedback for "{revisionTarget?.title}". This will add a strike to the author's account.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Describe what needs to be improved…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
          />
          {feedbackError && <p className="text-sm text-destructive">{feedbackError}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleRequestRevision} disabled={submitting}>
              {submitting ? "Sending…" : "Request Revision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Add route in App.tsx**

```tsx
import { ModerationQueuePage } from "@/pages/ModerationQueuePage";

// Staff-only route (enforce at the API layer; frontend just renders it):
<Route path="/moderation" element={<ProtectedRoute><ModerationQueuePage /></ProtectedRoute>} />
```

- [ ] **Step 3: Add Moderation link in NavBar for staff users**

In `frontend/src/components/NavBar.tsx`, after the existing sticker list, show a moderation link when the user is staff. You'll need to expose `is_staff` from the auth context or user profile endpoint:

```tsx
// After STICKERS array, conditionally render a mod sticker or badge
{isStaff && (
  <Link to="/moderation" className="text-xs text-muted-foreground hover:underline">
    Mod Queue
  </Link>
)}
```

Note: `isStaff` requires the `/auth/user/` endpoint to return `is_staff`. Check the user serializer and add it if missing.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ModerationQueuePage.tsx frontend/src/App.tsx \
        frontend/src/components/NavBar.tsx
git commit -m "feat: add ModerationQueuePage with approve/revision dialogs"
```

---

### Task 13: Expose is_staff from auth + backend queryset visibility

**Files:**
- Modify: `backend/spoonfury/apps/users/serializers.py` (or wherever user profile is serialized)
- Modify: `backend/spoonfury/apps/recipes/views.py` (queryset filtering by status)

- [ ] **Step 1: Expose is_staff on user profile**

Find the user detail serializer (check `users/serializers.py` or `dj_rest_auth` settings). Add `is_staff` as a read-only field:

```python
is_staff = serializers.BooleanField(read_only=True)
```

Make sure `is_staff` is in the `fields` list.

- [ ] **Step 2: Filter recipe queryset by status**

The `RecipeViewSet.get_queryset` (or a new `get_queryset` override) must enforce visibility rules:

```python
def get_queryset(self):
    """
    Visibility rules:
    - Unauthenticated: published only
    - Authenticated, not owner: published only
    - Owner: all their own recipes
    - TestKitchenInvite: owner's drafts + all published
    """
    from .models import TestKitchenInvite
    from django.db.models import Q

    user = self.request.user
    base_qs = (
        Recipe.objects
        .select_related("author", "parent_recipe__author")
        .prefetch_related("tags")
    )

    if not user.is_authenticated:
        return base_qs.filter(status="published")

    # Recipes the user owns (all statuses)
    own = Q(author=user)

    # Recipes they've been invited to see (draft recipes from kitchens they have access to)
    invited_owners = TestKitchenInvite.objects.filter(invitee=user).values_list("owner_id", flat=True)
    invited_drafts = Q(author_id__in=invited_owners, status__in=("draft", "in_review", "mod_queue", "revision_requested"))

    # Everyone else sees only published
    public = Q(status="published")

    return base_qs.filter(own | invited_drafts | public).distinct()
```

- [ ] **Step 3: Write visibility tests**

Add to `backend/spoonfury/apps/recipes/tests/test_review_pipeline.py`:

```python
@pytest.mark.django_db
def test_unauthenticated_sees_only_published(api_client, full_recipe):
    full_recipe.status = "published"
    full_recipe.save()
    draft = Recipe.objects.create(
        title="Hidden Draft", description="secret", serves="1",
        ingredients=SAMPLE_INGREDIENTS, instructions="secret steps.",
        category="other", author=full_recipe.author, status="draft",
    )
    url = reverse("recipe-list")
    response = api_client.get(url)
    slugs = [r["slug"] for r in response.data["results"]]
    assert full_recipe.slug in slugs
    assert draft.slug not in slugs


@pytest.mark.django_db
def test_owner_sees_own_drafts(author_client, full_recipe):
    url = reverse("recipe-list")
    response = author_client.get(url)
    slugs = [r["slug"] for r in response.data["results"]]
    assert full_recipe.slug in slugs
```

- [ ] **Step 4: Run all backend tests**

```bash
cd backend && ../.venv/Scripts/python -m pytest spoonfury/ -v
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/spoonfury/apps/recipes/views.py \
        backend/spoonfury/apps/users/
git commit -m "feat: enforce recipe queryset visibility rules and expose is_staff on user profile"
```

---

### Task 14: Final integration check + CLAUDE.md update

- [ ] **Step 1: Run full backend test suite**

```bash
cd backend && ../.venv/Scripts/python -m pytest spoonfury/ -v --tb=short
```

Expected: All tests PASS, no warnings about missing migrations.

- [ ] **Step 2: Start dev servers and smoke test manually**

```bash
# Terminal 1 — backend
cd backend && ../.venv/Scripts/python manage.py runserver

# Terminal 2 — frontend
cd frontend && npm run dev
```

Manually verify:
- [ ] Bell icon visible in navbar when logged in
- [ ] `/kitchen` route loads and shows recipes by status
- [ ] A recipe can be submitted for review (meets checklist)
- [ ] Reviewing as an invitee submits correctly
- [ ] `/moderation` route accessible to staff, 403 to regular users

- [ ] **Step 3: Move spec to completed and update CLAUDE.md**

```bash
mv docs/plans/active/2026-04-03-community-review-gate.spec.md docs/plans/completed/
# Update docs/plans/active → completed table in CLAUDE.md
```

- [ ] **Step 4: Final commit**

```bash
git add docs/ CLAUDE.md
git commit -m "docs: move community review gate spec to completed"
```

---

## Implementation Notes

- **max_length migration**: The Test Kitchen feature sets `status` with `max_length=10`. This plan extends it to `max_length=20`. The migration will ALTER the column — this is safe but worth noting when applying to production.
- **`revision_requested` withdraw**: No explicit withdraw action from `revision_requested` state. Authors in this state edit freely and use `submit-for-review` to resubmit. If needed later, `withdraw-review` can be extended to accept `revision_requested` as a valid source state.
- **Notification pagination**: `GET /notifications/` uses `PageNumberPagination` with `page_size=20` — matches the project's existing pagination setup.
- **Strike count on ModerationQueuePage**: The current `RecipeSerializer` doesn't include strike count. Task 12's strike warning comment notes this. To show it, add `strike_count = serializers.IntegerField(source='author.strikes.count', read_only=True)` to `RecipeSerializer`, or add an `author_strike_count` via `SerializerMethodField`.
