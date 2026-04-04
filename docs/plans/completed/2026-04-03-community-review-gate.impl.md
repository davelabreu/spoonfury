# Community Review & Moderation Gate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the Test Kitchen publish flow with a two-stage community review pipeline — invitee voting with threshold auto-promotion, moderator approval/rejection, in-app notifications, and frontend UI for all three roles (author, reviewer, moderator).

**Architecture:** The recipe status field expands from 2 states (`draft`/`published`) to 5 (`draft`/`in_review`/`mod_queue`/`revision_requested`/`published`). Three new models (`RecipeReview`, `ModerationAction`, `AuthorStrike`) live in the existing `recipes` app. One new Django app (`notifications`) handles the notification model and API. The frontend adds a notification bell to the NavBar, a review panel on RecipePage, a moderator queue page, and status-aware updates to MyKitchenPage.

**Tech Stack:** Django 5, DRF, PostgreSQL, pytest-django (backend); React 19, TypeScript, Tailwind 4, Shadcn UI (frontend)

---

## File Structure

### Backend — Existing files to modify

| File | Change |
|------|--------|
| `backend/spoonfury/apps/recipes/models.py` | Expand `STATUS_CHOICES` to 5 states, add `review_round` field to Recipe, add `RecipeReview`, `ModerationAction`, `AuthorStrike` models |
| `backend/spoonfury/apps/recipes/serializers.py` | Add `review_round` to `RecipeSerializer` fields + read_only |
| `backend/spoonfury/apps/recipes/views.py` | Update `get_queryset()` to handle `in_review`/`mod_queue`/`revision_requested` visibility; modify `publish` action for force-publish; add `submit_for_review`, `withdraw_review` actions; add edit-locking check to `perform_update` |
| `backend/spoonfury/apps/recipes/urls.py` | Register new review/moderation URL patterns |
| `backend/spoonfury/apps/recipes/admin.py` | Register new models |
| `backend/config/settings.py` | Add `spoonfury.apps.notifications` to `INSTALLED_APPS` |
| `backend/config/urls.py` | Include notifications URL patterns |
| `backend/conftest.py` | Add `staff_user`, `staff_client`, `invitee_user`, `invitee_client` fixtures |

### Backend — New files to create

| File | Purpose |
|------|---------|
| `backend/spoonfury/apps/recipes/views_review.py` | Review submission + listing views |
| `backend/spoonfury/apps/recipes/views_moderation.py` | Moderator queue, approve, request-revision views |
| `backend/spoonfury/apps/recipes/tests/test_review.py` | Tests for review pipeline (submit, vote, threshold, withdraw) |
| `backend/spoonfury/apps/recipes/tests/test_moderation.py` | Tests for mod queue, approve, request-revision, strikes |
| `backend/spoonfury/apps/notifications/__init__.py` | App package |
| `backend/spoonfury/apps/notifications/apps.py` | Django app config |
| `backend/spoonfury/apps/notifications/models.py` | Notification model |
| `backend/spoonfury/apps/notifications/serializers.py` | Notification serializer |
| `backend/spoonfury/apps/notifications/views.py` | Notification list, mark-read, unread-count views |
| `backend/spoonfury/apps/notifications/urls.py` | Notification URL patterns |
| `backend/spoonfury/apps/notifications/admin.py` | Notification admin |
| `backend/spoonfury/apps/notifications/tests/__init__.py` | Test package |
| `backend/spoonfury/apps/notifications/tests/test_notifications.py` | Tests for notification CRUD |
| `backend/spoonfury/apps/notifications/helpers.py` | `notify()` helper function used by review/moderation views |

### Frontend — Existing files to modify

| File | Change |
|------|--------|
| `frontend/src/types.ts` | Expand `RecipeStatus`, add `RecipeReview`, `Notification`, `ModerationRecipe` interfaces |
| `frontend/src/App.tsx` | Add `/moderation` route |
| `frontend/src/components/NavBar.tsx` | Add `NotificationBell` next to CartButton |
| `frontend/src/pages/RecipePage.tsx` | Add review panel for invitees, update status badge for all 5 states |
| `frontend/src/pages/MyKitchenPage.tsx` | Add "Submit for Review" button, show review progress, show revision feedback |

### Frontend — New files to create

| File | Purpose |
|------|---------|
| `frontend/src/components/NotificationBell.tsx` | Bell icon with unread badge, dropdown list of notifications |
| `frontend/src/components/ReviewPanel.tsx` | Thumbs up/down + comment for invitee reviewers |
| `frontend/src/pages/ModerationPage.tsx` | Staff-only mod queue with approve/reject actions |

---

## Task 1: Expand Recipe status field and add review_round

**Files:**
- Modify: `backend/spoonfury/apps/recipes/models.py:6-9,87-93`
- Test: `backend/spoonfury/apps/recipes/tests/test_models.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/spoonfury/apps/recipes/tests/test_models.py`:

```python
@pytest.mark.django_db
def test_recipe_default_review_round(user):
    """New recipes have review_round=0 (never submitted)."""
    recipe = Recipe.objects.create(
        title="Test Soup",
        description="Desc",
        serves="4",
        ingredients=[{"quantity": "1", "unit": "cup", "name": "water", "note": ""}],
        instructions="Cook it",
        category="soup",
        author=user,
    )
    assert recipe.review_round == 0


@pytest.mark.django_db
def test_recipe_status_choices_include_review_states(user):
    """Recipe status field accepts all 5 pipeline states."""
    recipe = Recipe.objects.create(
        title="Status Test",
        description="Desc",
        serves="4",
        ingredients=[],
        instructions="Cook it",
        category="soup",
        author=user,
    )
    for status_val in ["draft", "in_review", "mod_queue", "revision_requested", "published"]:
        recipe.status = status_val
        recipe.full_clean()  # validates against choices
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_models.py -v -k "review_round or status_choices"`

Expected: FAIL — `review_round` field does not exist, `in_review`/`mod_queue`/`revision_requested` not in choices

- [ ] **Step 3: Implement the model changes**

In `backend/spoonfury/apps/recipes/models.py`, replace the `STATUS_CHOICES` constant:

```python
STATUS_CHOICES = [
    ("draft", "Draft"),
    ("in_review", "In Review"),
    ("mod_queue", "In Moderation"),
    ("revision_requested", "Revision Requested"),
    ("published", "Published"),
]
```

On the `Recipe` model, update the `status` field's `max_length` and add `review_round`:

```python
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft",
        db_index=True,
    )
    published_at = models.DateTimeField(null=True, blank=True)
    review_round = models.PositiveIntegerField(
        default=0,
        help_text="0 = never submitted. Incremented on each submit-for-review.",
    )
```

- [ ] **Step 4: Create and apply migration**

Run: `cd backend && ../.venv/Scripts/python manage.py makemigrations recipes && ../.venv/Scripts/python manage.py migrate`

Expected: Migration created for status choices expansion + review_round field. Existing recipes keep `status="draft"` or `"published"` (both still in choices). `review_round` defaults to 0.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_models.py -v -k "review_round or status_choices"`

Expected: PASS

- [ ] **Step 6: Run full test suite to check for regressions**

Run: `cd backend && ../.venv/Scripts/pytest -v`

Expected: All existing tests pass. The `test_publish.py` tests still work because `"published"` is still a valid choice. The `test_kitchen.py` tests still work because they filter on `status="draft"` which is unchanged.

- [ ] **Step 7: Update RecipeSerializer to expose review_round**

In `backend/spoonfury/apps/recipes/serializers.py`, add `"review_round"` to the `fields` list and `read_only_fields` list:

```python
    class Meta:
        model = Recipe
        fields = [
            "id", "slug", "title", "description", "serves",
            "ingredients", "instructions", "notes", "category",
            "image_url", "tags",
            "author_username", "author_display_name",
            "parent_recipe_slug", "parent_recipe_title", "parent_recipe_author",
            "fork_count", "created_at", "status", "published_at", "review_round",
        ]
        read_only_fields = ["slug", "fork_count", "created_at", "author_username", "status", "published_at", "review_round"]
```

- [ ] **Step 8: Commit**

```bash
git add backend/spoonfury/apps/recipes/models.py backend/spoonfury/apps/recipes/serializers.py backend/spoonfury/apps/recipes/migrations/ backend/spoonfury/apps/recipes/tests/test_models.py
git commit -m "feat(recipes): expand status to 5-state pipeline, add review_round"
```

---

## Task 2: Add RecipeReview, ModerationAction, AuthorStrike models

**Files:**
- Modify: `backend/spoonfury/apps/recipes/models.py`
- Modify: `backend/spoonfury/apps/recipes/admin.py`
- Test: `backend/spoonfury/apps/recipes/tests/test_models.py`

- [ ] **Step 1: Write the failing tests**

Add to `backend/spoonfury/apps/recipes/tests/test_models.py`:

```python
from spoonfury.apps.recipes.models import RecipeReview, ModerationAction, AuthorStrike


@pytest.mark.django_db
def test_create_recipe_review(user, other_user):
    """A reviewer can submit a review for a recipe."""
    recipe = Recipe.objects.create(
        title="Review Me",
        description="Desc",
        serves="4",
        ingredients=[],
        instructions="Cook it",
        category="soup",
        author=user,
        status="in_review",
        review_round=1,
    )
    review = RecipeReview.objects.create(
        recipe=recipe,
        reviewer=other_user,
        review_round=1,
        is_positive=True,
        comment="Looks great!",
    )
    assert review.is_positive is True
    assert review.review_round == 1
    assert review.recipe == recipe


@pytest.mark.django_db
def test_recipe_review_unique_per_round(user, other_user):
    """Same reviewer cannot vote twice in the same round."""
    recipe = Recipe.objects.create(
        title="Dupe Test",
        description="Desc",
        serves="4",
        ingredients=[],
        instructions="Cook it",
        category="soup",
        author=user,
        status="in_review",
        review_round=1,
    )
    RecipeReview.objects.create(
        recipe=recipe, reviewer=other_user, review_round=1, is_positive=True,
    )
    with pytest.raises(Exception):  # IntegrityError
        RecipeReview.objects.create(
            recipe=recipe, reviewer=other_user, review_round=1, is_positive=False,
        )


@pytest.mark.django_db
def test_create_moderation_action(user, other_user):
    """A moderator can record an action on a recipe."""
    recipe = Recipe.objects.create(
        title="Mod Test",
        description="Desc",
        serves="4",
        ingredients=[],
        instructions="Cook it",
        category="soup",
        author=user,
        status="mod_queue",
        review_round=1,
    )
    action = ModerationAction.objects.create(
        recipe=recipe,
        moderator=other_user,
        action="approved",
        review_round=1,
    )
    assert action.action == "approved"
    assert action.moderator == other_user


@pytest.mark.django_db
def test_create_author_strike(user, other_user):
    """A strike is created when a mod sends back a recipe."""
    recipe = Recipe.objects.create(
        title="Strike Test",
        description="Desc",
        serves="4",
        ingredients=[],
        instructions="Cook it",
        category="soup",
        author=user,
        status="mod_queue",
        review_round=1,
    )
    mod_action = ModerationAction.objects.create(
        recipe=recipe,
        moderator=other_user,
        action="revision_requested",
        feedback="Needs work",
        review_round=1,
    )
    strike = AuthorStrike.objects.create(
        author=user,
        recipe=recipe,
        moderation_action=mod_action,
    )
    assert strike.author == user
    assert user.strikes.count() == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_models.py -v -k "recipe_review or moderation_action or author_strike"`

Expected: FAIL — `RecipeReview`, `ModerationAction`, `AuthorStrike` do not exist

- [ ] **Step 3: Add the three models**

Append to `backend/spoonfury/apps/recipes/models.py`:

```python
class RecipeReview(models.Model):
    """
    A single vote from a test kitchen invitee on a recipe under review.

    One vote per reviewer per review round. The reviewer must be an invitee
    of the recipe author's kitchen (enforced at the view level, not the model).
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
        unique_together = [("recipe", "reviewer", "review_round")]

    def __str__(self):
        vote = "+" if self.is_positive else "-"
        return f"{self.reviewer.username} [{vote}] on {self.recipe.title} (round {self.review_round})"


class ModerationAction(models.Model):
    """
    Audit log entry for a moderator decision on a recipe.

    Every approval, revision request, or force-publish is recorded.
    Feedback is required when action is 'revision_requested'.
    """

    ACTION_CHOICES = [
        ("approved", "Approved"),
        ("revision_requested", "Revision Requested"),
        ("force_published", "Force Published"),
    ]

    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name="moderation_actions",
    )
    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    feedback = models.TextField(blank=True)
    review_round = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.moderator.username}: {self.action} on {self.recipe.title}"


class AuthorStrike(models.Model):
    """
    Accumulated when a moderator sends a recipe back for revision.

    One strike per revision request. Visible to author (own count)
    and moderators (in the queue). No hard rejection threshold — just
    advisory visibility.
    """

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="strikes",
    )
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
    )
    moderation_action = models.OneToOneField(
        ModerationAction,
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Strike: {self.author.username} on {self.recipe.title}"
```

- [ ] **Step 4: Register models in admin**

In `backend/spoonfury/apps/recipes/admin.py`, add imports and registrations:

```python
from .models import Recipe, Tag, TestKitchenInvite, RecipeReview, ModerationAction, AuthorStrike


@admin.register(RecipeReview)
class RecipeReviewAdmin(admin.ModelAdmin):
    list_display = ["recipe", "reviewer", "review_round", "is_positive", "created_at"]
    list_filter = ["is_positive", "review_round"]
    search_fields = ["recipe__title", "reviewer__username"]


@admin.register(ModerationAction)
class ModerationActionAdmin(admin.ModelAdmin):
    list_display = ["recipe", "moderator", "action", "review_round", "created_at"]
    list_filter = ["action"]
    search_fields = ["recipe__title", "moderator__username"]


@admin.register(AuthorStrike)
class AuthorStrikeAdmin(admin.ModelAdmin):
    list_display = ["author", "recipe", "created_at"]
    search_fields = ["author__username", "recipe__title"]
```

- [ ] **Step 5: Create and apply migration**

Run: `cd backend && ../.venv/Scripts/python manage.py makemigrations recipes && ../.venv/Scripts/python manage.py migrate`

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_models.py -v`

Expected: All model tests PASS

- [ ] **Step 7: Commit**

```bash
git add backend/spoonfury/apps/recipes/models.py backend/spoonfury/apps/recipes/admin.py backend/spoonfury/apps/recipes/migrations/ backend/spoonfury/apps/recipes/tests/test_models.py
git commit -m "feat(recipes): add RecipeReview, ModerationAction, AuthorStrike models"
```

---

## Task 3: Notifications app — model + helpers

**Files:**
- Create: `backend/spoonfury/apps/notifications/__init__.py`
- Create: `backend/spoonfury/apps/notifications/apps.py`
- Create: `backend/spoonfury/apps/notifications/models.py`
- Create: `backend/spoonfury/apps/notifications/admin.py`
- Create: `backend/spoonfury/apps/notifications/helpers.py`
- Create: `backend/spoonfury/apps/notifications/tests/__init__.py`
- Create: `backend/spoonfury/apps/notifications/tests/test_notifications.py`
- Modify: `backend/config/settings.py:28-51`

- [ ] **Step 1: Create the notifications app directory**

```bash
mkdir -p backend/spoonfury/apps/notifications/tests
touch backend/spoonfury/apps/notifications/__init__.py
touch backend/spoonfury/apps/notifications/tests/__init__.py
```

- [ ] **Step 2: Write the failing test**

Create `backend/spoonfury/apps/notifications/tests/test_notifications.py`:

```python
"""Tests for the Notification model and notify helper."""
import pytest
from django.contrib.auth import get_user_model
from spoonfury.apps.recipes.models import Recipe
from spoonfury.apps.notifications.models import Notification
from spoonfury.apps.notifications.helpers import notify

User = get_user_model()


@pytest.fixture
def recipe(user):
    return Recipe.objects.create(
        title="Notify Test",
        description="Desc",
        serves="4",
        ingredients=[],
        instructions="Cook it",
        category="soup",
        author=user,
    )


@pytest.mark.django_db
def test_create_notification(user, other_user, recipe):
    """A notification can be created with all fields."""
    n = Notification.objects.create(
        recipient=other_user,
        notification_type="review_requested",
        recipe=recipe,
        actor=user,
        message=f"{user.username} wants your feedback on {recipe.title}",
    )
    assert n.is_read is False
    assert n.recipient == other_user
    assert n.notification_type == "review_requested"


@pytest.mark.django_db
def test_notify_helper_creates_notification(user, other_user, recipe):
    """The notify() helper creates a notification."""
    notify(
        recipient=other_user,
        notification_type="review_requested",
        recipe=recipe,
        actor=user,
        message="Test notification",
    )
    assert Notification.objects.filter(recipient=other_user).count() == 1


@pytest.mark.django_db
def test_notifications_ordered_newest_first(user, other_user, recipe):
    """Notifications are ordered by -created_at."""
    n1 = Notification.objects.create(
        recipient=other_user,
        notification_type="review_requested",
        recipe=recipe,
        actor=user,
        message="First",
    )
    n2 = Notification.objects.create(
        recipient=other_user,
        notification_type="review_received",
        recipe=recipe,
        actor=user,
        message="Second",
    )
    notifications = list(Notification.objects.filter(recipient=other_user))
    assert notifications[0].pk == n2.pk  # newest first
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/notifications/tests/test_notifications.py -v`

Expected: FAIL — module not found

- [ ] **Step 4: Create the app config**

Create `backend/spoonfury/apps/notifications/apps.py`:

```python
from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "spoonfury.apps.notifications"
    label = "notifications"
```

- [ ] **Step 5: Create the Notification model**

Create `backend/spoonfury/apps/notifications/models.py`:

```python
from django.conf import settings
from django.db import models


class Notification(models.Model):
    """
    In-app notification for recipe pipeline events.

    The message field is pre-rendered at creation time so the frontend
    doesn't need to assemble display text from actor/recipe/type.
    """

    TYPE_CHOICES = [
        ("review_requested", "Review Requested"),
        ("review_received", "Review Received"),
        ("recipe_in_mod_queue", "Recipe In Moderation Queue"),
        ("recipe_approved", "Recipe Approved"),
        ("revision_requested", "Revision Requested"),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    recipe = models.ForeignKey(
        "recipes.Recipe",
        on_delete=models.CASCADE,
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
    )
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.notification_type}] {self.message}"
```

- [ ] **Step 6: Create the notify helper**

Create `backend/spoonfury/apps/notifications/helpers.py`:

```python
from .models import Notification


def notify(recipient, notification_type, recipe, actor, message):
    """Create a single notification. Used as a side effect of state transitions."""
    return Notification.objects.create(
        recipient=recipient,
        notification_type=notification_type,
        recipe=recipe,
        actor=actor,
        message=message,
    )
```

- [ ] **Step 7: Create admin registration**

Create `backend/spoonfury/apps/notifications/admin.py`:

```python
from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["recipient", "notification_type", "message", "is_read", "created_at"]
    list_filter = ["notification_type", "is_read"]
    search_fields = ["recipient__username", "message"]
```

- [ ] **Step 8: Register app in settings and create migration**

In `backend/config/settings.py`, add `"spoonfury.apps.notifications"` to `INSTALLED_APPS` after the existing local apps:

```python
    # Local
    "spoonfury.apps.users",
    "spoonfury.apps.recipes",
    "spoonfury.apps.books",
    "spoonfury.apps.shopping",
    "spoonfury.apps.notifications",
```

Run: `cd backend && ../.venv/Scripts/python manage.py makemigrations notifications && ../.venv/Scripts/python manage.py migrate`

- [ ] **Step 9: Run tests to verify they pass**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/notifications/tests/test_notifications.py -v`

Expected: All 3 tests PASS

- [ ] **Step 10: Commit**

```bash
git add backend/spoonfury/apps/notifications/ backend/config/settings.py
git commit -m "feat(notifications): add Notification model, notify helper, admin"
```

---

## Task 4: Add shared test fixtures

**Files:**
- Modify: `backend/conftest.py`

- [ ] **Step 1: Add fixtures for staff user, invitee user, and a publishable recipe with invitee**

In `backend/conftest.py`, add these fixtures after the existing ones:

```python
@pytest.fixture
def staff_user(db):
    """A moderator (staff) user."""
    return User.objects.create_user(
        username="modchef",
        email="mod@test.com",
        password="testpass123",
        is_staff=True,
    )


@pytest.fixture
def staff_client(staff_user):
    """Authenticated client for the staff/moderator user."""
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def invitee_user(db):
    """A third user who will be invited to kitchens for review."""
    return User.objects.create_user(
        username="inviteechef",
        email="invitee@test.com",
        password="testpass123",
    )


@pytest.fixture
def invitee_client(invitee_user):
    """Authenticated client for the invitee user."""
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=invitee_user)
    return client
```

- [ ] **Step 2: Run existing tests to ensure no regressions**

Run: `cd backend && ../.venv/Scripts/pytest -v`

Expected: All tests PASS (new fixtures are additive)

- [ ] **Step 3: Commit**

```bash
git add backend/conftest.py
git commit -m "test: add staff_user, staff_client, invitee_user, invitee_client fixtures"
```

---

## Task 5: Submit-for-review and withdraw-review endpoints

**Files:**
- Create: `backend/spoonfury/apps/recipes/views_review.py`
- Modify: `backend/spoonfury/apps/recipes/urls.py`
- Create: `backend/spoonfury/apps/recipes/tests/test_review.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/spoonfury/apps/recipes/tests/test_review.py`:

```python
"""Tests for the review pipeline: submit, withdraw, vote, threshold."""
import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe, TestKitchenInvite

User = get_user_model()

VALID_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
    {"quantity": "1", "unit": "cup", "name": "flour", "note": ""},
]


@pytest.fixture
def reviewable_recipe(user):
    """A draft recipe that meets all gate criteria."""
    return Recipe.objects.create(
        title="Review Me Soup",
        description="A soup ready for review.",
        serves="4",
        ingredients=VALID_INGREDIENTS,
        instructions="Step 1: boil water. Step 2: add all ingredients and simmer for 20 minutes.",
        category="soup",
        author=user,
    )


# --- Submit for review ---

@pytest.mark.django_db
def test_submit_for_review_success(auth_client, reviewable_recipe):
    """Owner can submit a gate-passing recipe for review."""
    url = reverse("recipe-submit-review", kwargs={"slug": reviewable_recipe.slug})
    response = auth_client.post(url)
    assert response.status_code == 200
    assert response.data["status"] == "in_review"
    assert response.data["review_round"] == 1


@pytest.mark.django_db
def test_submit_for_review_fails_gate(auth_client, user):
    """Submitting a recipe that fails the gate returns 400."""
    recipe = Recipe.objects.create(
        title="Bad Recipe",
        description="",
        serves="4",
        ingredients=[],
        instructions="Short",
        category="soup",
        author=user,
    )
    url = reverse("recipe-submit-review", kwargs={"slug": recipe.slug})
    response = auth_client.post(url)
    assert response.status_code == 400
    assert "errors" in response.data


@pytest.mark.django_db
def test_submit_for_review_not_owner(other_auth_client, reviewable_recipe):
    """Non-owners cannot submit someone else's recipe."""
    # Must be visible to other_user first
    reviewable_recipe.status = "published"
    reviewable_recipe.save()
    url = reverse("recipe-submit-review", kwargs={"slug": reviewable_recipe.slug})
    response = other_auth_client.post(url)
    assert response.status_code == 403


@pytest.mark.django_db
def test_submit_increments_review_round(auth_client, reviewable_recipe):
    """Each submission increments review_round."""
    url = reverse("recipe-submit-review", kwargs={"slug": reviewable_recipe.slug})
    auth_client.post(url)  # round 1
    # Withdraw and resubmit
    withdraw_url = reverse("recipe-withdraw-review", kwargs={"slug": reviewable_recipe.slug})
    auth_client.post(withdraw_url)
    response = auth_client.post(url)
    assert response.data["review_round"] == 2


@pytest.mark.django_db
def test_submit_from_revision_requested(auth_client, reviewable_recipe):
    """Can resubmit from revision_requested state."""
    reviewable_recipe.status = "revision_requested"
    reviewable_recipe.review_round = 1
    reviewable_recipe.save()
    url = reverse("recipe-submit-review", kwargs={"slug": reviewable_recipe.slug})
    response = auth_client.post(url)
    assert response.status_code == 200
    assert response.data["status"] == "in_review"
    assert response.data["review_round"] == 2


# --- Withdraw review ---

@pytest.mark.django_db
def test_withdraw_review(auth_client, reviewable_recipe):
    """Owner can withdraw a recipe from review back to draft."""
    reviewable_recipe.status = "in_review"
    reviewable_recipe.review_round = 1
    reviewable_recipe.save()
    url = reverse("recipe-withdraw-review", kwargs={"slug": reviewable_recipe.slug})
    response = auth_client.post(url)
    assert response.status_code == 200
    assert response.data["status"] == "draft"


@pytest.mark.django_db
def test_withdraw_only_from_in_review(auth_client, reviewable_recipe):
    """Can only withdraw from in_review state."""
    reviewable_recipe.status = "mod_queue"
    reviewable_recipe.review_round = 1
    reviewable_recipe.save()
    url = reverse("recipe-withdraw-review", kwargs={"slug": reviewable_recipe.slug})
    response = auth_client.post(url)
    assert response.status_code == 400
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_review.py -v`

Expected: FAIL — URL names don't exist

- [ ] **Step 3: Implement the views**

Create `backend/spoonfury/apps/recipes/views_review.py`:

```python
"""
Views for the recipe review pipeline.

Provides endpoints for:
  - Submitting a recipe for community review (author)
  - Withdrawing a recipe from review (author)
  - Submitting a vote on a recipe (invitee)
  - Viewing reviews for a recipe (invitee)
"""
from django.db.models import F
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Recipe, TestKitchenInvite, RecipeReview
from .serializers import RecipeSerializer
from spoonfury.apps.notifications.helpers import notify


def _validate_gate(recipe):
    """Run the 4-point publish gate checklist. Returns list of error strings."""
    errors = []
    valid_ingredients = [i for i in recipe.ingredients if i.get("name", "").strip()]
    if len(valid_ingredients) < 2:
        errors.append("At least 2 ingredients required (found %d)." % len(valid_ingredients))
    if len(recipe.instructions.strip()) < 20:
        errors.append("Instructions must be at least 20 characters long.")
    if not recipe.description.strip():
        errors.append("Description is required.")
    if not recipe.category:
        errors.append("Category must be set.")
    return errors


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def submit_for_review(request, slug):
    """
    Submit a recipe for community review.

    Transitions: draft -> in_review, revision_requested -> in_review.
    Validates the 4-point gate checklist. Increments review_round.
    Notifies all kitchen invitees.
    """
    recipe = Recipe.objects.select_related("author").get(slug=slug)

    if recipe.author != request.user:
        raise PermissionDenied("You can only submit your own recipes.")

    if recipe.status not in ("draft", "revision_requested"):
        return Response(
            {"detail": "Recipe must be in draft or revision_requested state."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    errors = _validate_gate(recipe)
    if errors:
        return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

    recipe.status = "in_review"
    recipe.review_round = F("review_round") + 1
    recipe.save(update_fields=["status", "review_round"])
    recipe.refresh_from_db()

    # Notify all kitchen invitees
    invitees = TestKitchenInvite.objects.filter(
        owner=recipe.author
    ).select_related("invitee")
    for invite in invitees:
        notify(
            recipient=invite.invitee,
            notification_type="review_requested",
            recipe=recipe,
            actor=recipe.author,
            message=f"{recipe.author.username} wants your feedback on {recipe.title}",
        )

    serializer = RecipeSerializer(recipe, context={"request": request})
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def withdraw_review(request, slug):
    """
    Withdraw a recipe from review, returning it to draft.

    Only allowed from in_review state. Current round votes are preserved
    in the database but won't count toward a future round.
    """
    recipe = Recipe.objects.select_related("author").get(slug=slug)

    if recipe.author != request.user:
        raise PermissionDenied("You can only withdraw your own recipes.")

    if recipe.status != "in_review":
        return Response(
            {"detail": "Recipe must be in_review to withdraw."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    recipe.status = "draft"
    recipe.save(update_fields=["status"])

    serializer = RecipeSerializer(recipe, context={"request": request})
    return Response(serializer.data)
```

- [ ] **Step 4: Register URL patterns**

In `backend/spoonfury/apps/recipes/urls.py`, add imports and paths:

```python
from .views_review import submit_for_review, withdraw_review
```

Add to `urlpatterns` (after the fork path):

```python
    path("recipes/<slug:slug>/submit-for-review/", submit_for_review, name="recipe-submit-review"),
    path("recipes/<slug:slug>/withdraw-review/", withdraw_review, name="recipe-withdraw-review"),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_review.py -v`

Expected: All 7 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/spoonfury/apps/recipes/views_review.py backend/spoonfury/apps/recipes/urls.py backend/spoonfury/apps/recipes/tests/test_review.py
git commit -m "feat(recipes): submit-for-review and withdraw-review endpoints"
```

---

## Task 6: Vote endpoint with threshold auto-promotion

**Files:**
- Modify: `backend/spoonfury/apps/recipes/views_review.py`
- Modify: `backend/spoonfury/apps/recipes/urls.py`
- Modify: `backend/spoonfury/apps/recipes/tests/test_review.py`

- [ ] **Step 1: Write the failing tests**

Add to `backend/spoonfury/apps/recipes/tests/test_review.py`:

```python
from spoonfury.apps.recipes.models import RecipeReview
from spoonfury.apps.notifications.models import Notification


@pytest.fixture
def in_review_recipe(user):
    """A recipe in the in_review state with round 1."""
    return Recipe.objects.create(
        title="Voting Soup",
        description="A soup ready for votes.",
        serves="4",
        ingredients=VALID_INGREDIENTS,
        instructions="Step 1: boil water. Step 2: add ingredients and simmer for 20 minutes.",
        category="soup",
        author=user,
        status="in_review",
        review_round=1,
    )


@pytest.fixture
def invited_setup(user, other_user, invitee_user, in_review_recipe):
    """Set up kitchen invites for other_user and invitee_user."""
    TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    TestKitchenInvite.objects.create(owner=user, invitee=invitee_user)
    return in_review_recipe


# --- Vote ---

@pytest.mark.django_db
def test_vote_positive(other_auth_client, invited_setup):
    """An invitee can submit a positive vote."""
    url = reverse("recipe-review-vote", kwargs={"slug": invited_setup.slug})
    response = other_auth_client.post(url, {"is_positive": True}, format="json")
    assert response.status_code == 201
    assert RecipeReview.objects.count() == 1


@pytest.mark.django_db
def test_vote_not_invitee(auth_client, user, in_review_recipe):
    """The recipe author cannot vote on their own recipe."""
    url = reverse("recipe-review-vote", kwargs={"slug": in_review_recipe.slug})
    response = auth_client.post(url, {"is_positive": True}, format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_vote_creates_notification(other_auth_client, user, invited_setup):
    """Voting sends a notification to the recipe author."""
    url = reverse("recipe-review-vote", kwargs={"slug": invited_setup.slug})
    other_auth_client.post(url, {"is_positive": True}, format="json")
    assert Notification.objects.filter(
        recipient=user,
        notification_type="review_received",
    ).count() == 1


@pytest.mark.django_db
def test_vote_duplicate_blocked(other_auth_client, invited_setup):
    """Same reviewer cannot vote twice in the same round."""
    url = reverse("recipe-review-vote", kwargs={"slug": invited_setup.slug})
    other_auth_client.post(url, {"is_positive": True}, format="json")
    response = other_auth_client.post(url, {"is_positive": False}, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_threshold_auto_promotion(other_auth_client, invitee_client, invited_setup, invitee_user):
    """Recipe auto-transitions to mod_queue when 3+ votes at 80%+ positive."""
    # Need a third invitee
    third = User.objects.create_user(username="third", email="t@t.com", password="testpass123")
    TestKitchenInvite.objects.create(owner=invited_setup.author, invitee=third)
    from rest_framework.test import APIClient
    third_client = APIClient()
    third_client.force_authenticate(user=third)

    url = reverse("recipe-review-vote", kwargs={"slug": invited_setup.slug})
    other_auth_client.post(url, {"is_positive": True}, format="json")
    invitee_client.post(url, {"is_positive": True}, format="json")
    third_client.post(url, {"is_positive": True}, format="json")

    invited_setup.refresh_from_db()
    assert invited_setup.status == "mod_queue"


@pytest.mark.django_db
def test_threshold_not_met_below_3(other_auth_client, invitee_client, invited_setup):
    """Recipe stays in_review with only 2 votes even at 100% positive."""
    url = reverse("recipe-review-vote", kwargs={"slug": invited_setup.slug})
    other_auth_client.post(url, {"is_positive": True}, format="json")
    invitee_client.post(url, {"is_positive": True}, format="json")

    invited_setup.refresh_from_db()
    assert invited_setup.status == "in_review"


# --- List reviews ---

@pytest.mark.django_db
def test_list_reviews_before_voting(other_auth_client, invited_setup):
    """Before voting, invitee sees aggregate only (no individual reviews)."""
    url = reverse("recipe-reviews-list", kwargs={"slug": invited_setup.slug})
    response = other_auth_client.get(url)
    assert response.status_code == 200
    assert "total_votes" in response.data
    assert "reviews" not in response.data  # blind before voting


@pytest.mark.django_db
def test_list_reviews_after_voting(other_auth_client, invited_setup):
    """After voting, invitee sees all reviews with comments."""
    vote_url = reverse("recipe-review-vote", kwargs={"slug": invited_setup.slug})
    other_auth_client.post(vote_url, {"is_positive": True, "comment": "Nice!"}, format="json")
    list_url = reverse("recipe-reviews-list", kwargs={"slug": invited_setup.slug})
    response = other_auth_client.get(list_url)
    assert response.status_code == 200
    assert "reviews" in response.data  # visible after voting
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_review.py -v -k "vote or threshold or list_reviews"`

Expected: FAIL — URL names don't exist

- [ ] **Step 3: Implement vote and review list views**

Append to `backend/spoonfury/apps/recipes/views_review.py`:

```python
from math import ceil
from django.contrib.auth import get_user_model

User = get_user_model()


def _check_threshold(recipe):
    """
    Check if the review threshold is met and auto-promote to mod_queue.

    Rules: 3+ votes in current round, 80%+ positive.
    Formula: required_positive = ceil(0.8 * total_votes).
    """
    reviews = RecipeReview.objects.filter(
        recipe=recipe, review_round=recipe.review_round
    )
    total = reviews.count()
    if total < 3:
        return False

    positive = reviews.filter(is_positive=True).count()
    required = ceil(0.8 * total)

    if positive >= required:
        recipe.status = "mod_queue"
        recipe.save(update_fields=["status"])

        # Notify all staff users
        staff_users = User.objects.filter(is_staff=True)
        for staff in staff_users:
            notify(
                recipient=staff,
                notification_type="recipe_in_mod_queue",
                recipe=recipe,
                actor=recipe.author,
                message=f"New recipe awaiting moderation: {recipe.title} by {recipe.author.username}",
            )
        return True
    return False


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def review_vote(request, slug):
    """
    Submit a vote on a recipe under review.

    Only kitchen invitees of the recipe author can vote.
    One vote per reviewer per round. After each vote, checks
    the threshold and auto-promotes to mod_queue if met.
    """
    recipe = Recipe.objects.select_related("author").get(slug=slug)

    if recipe.status != "in_review":
        return Response(
            {"detail": "Recipe is not in review."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Must be an invitee of the recipe author
    is_invitee = TestKitchenInvite.objects.filter(
        owner=recipe.author, invitee=request.user
    ).exists()

    if not is_invitee or request.user == recipe.author:
        raise PermissionDenied("You must be an invited kitchen member to review.")

    # Check for duplicate vote
    if RecipeReview.objects.filter(
        recipe=recipe, reviewer=request.user, review_round=recipe.review_round
    ).exists():
        return Response(
            {"detail": "You already voted in this round."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    is_positive = request.data.get("is_positive")
    if is_positive is None:
        return Response(
            {"detail": "is_positive is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    review = RecipeReview.objects.create(
        recipe=recipe,
        reviewer=request.user,
        review_round=recipe.review_round,
        is_positive=bool(is_positive),
        comment=request.data.get("comment", ""),
    )

    # Notify the recipe author
    notify(
        recipient=recipe.author,
        notification_type="review_received",
        recipe=recipe,
        actor=request.user,
        message=f"You got a new review on {recipe.title}",
    )

    # Check threshold
    _check_threshold(recipe)

    return Response(
        {"id": review.pk, "is_positive": review.is_positive},
        status=status.HTTP_201_CREATED,
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def review_list(request, slug):
    """
    List reviews for a recipe's current round.

    Blind voting: before the viewer has voted, only aggregate stats are shown.
    After voting, all reviews with comments are revealed.
    """
    recipe = Recipe.objects.select_related("author").get(slug=slug)

    reviews = RecipeReview.objects.filter(
        recipe=recipe, review_round=recipe.review_round
    )
    total = reviews.count()
    positive = reviews.filter(is_positive=True).count()

    has_voted = reviews.filter(reviewer=request.user).exists()

    data = {
        "review_round": recipe.review_round,
        "total_votes": total,
        "positive_votes": positive,
        "threshold_met": total >= 3 and positive >= ceil(0.8 * total) if total >= 3 else False,
        "has_voted": has_voted,
    }

    if has_voted:
        # Reveal all reviews after the viewer has voted
        data["reviews"] = [
            {
                "reviewer": r.reviewer.username,
                "is_positive": r.is_positive,
                "comment": r.comment,
                "created_at": r.created_at.isoformat(),
            }
            for r in reviews.select_related("reviewer")
        ]

    return Response(data)
```

- [ ] **Step 4: Register URL patterns**

In `backend/spoonfury/apps/recipes/urls.py`, add import:

```python
from .views_review import submit_for_review, withdraw_review, review_vote, review_list
```

Add to the urlpatterns (after the existing review paths):

```python
    path("recipes/<slug:slug>/review/", review_vote, name="recipe-review-vote"),
    path("recipes/<slug:slug>/reviews/", review_list, name="recipe-reviews-list"),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_review.py -v`

Expected: All 15 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/spoonfury/apps/recipes/views_review.py backend/spoonfury/apps/recipes/urls.py backend/spoonfury/apps/recipes/tests/test_review.py
git commit -m "feat(recipes): vote endpoint with threshold auto-promotion to mod_queue"
```

---

## Task 7: Moderation endpoints (approve, request-revision, queue)

**Files:**
- Create: `backend/spoonfury/apps/recipes/views_moderation.py`
- Modify: `backend/spoonfury/apps/recipes/urls.py`
- Create: `backend/spoonfury/apps/recipes/tests/test_moderation.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/spoonfury/apps/recipes/tests/test_moderation.py`:

```python
"""Tests for the moderation queue, approve, and request-revision endpoints."""
import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe, ModerationAction, AuthorStrike
from spoonfury.apps.notifications.models import Notification

User = get_user_model()

VALID_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
    {"quantity": "1", "unit": "cup", "name": "flour", "note": ""},
]


@pytest.fixture
def mod_queue_recipe(user):
    """A recipe in the mod_queue state."""
    return Recipe.objects.create(
        title="Moderation Soup",
        description="A soup awaiting moderation.",
        serves="4",
        ingredients=VALID_INGREDIENTS,
        instructions="Step 1: boil water. Step 2: add all ingredients and simmer for 20 minutes.",
        category="soup",
        author=user,
        status="mod_queue",
        review_round=1,
    )


# --- Queue ---

@pytest.mark.django_db
def test_mod_queue_staff_only(auth_client, mod_queue_recipe):
    """Non-staff users cannot access the mod queue."""
    url = reverse("moderation-queue")
    response = auth_client.get(url)
    assert response.status_code == 403


@pytest.mark.django_db
def test_mod_queue_lists_recipes(staff_client, mod_queue_recipe):
    """Staff can see recipes in the mod queue."""
    url = reverse("moderation-queue")
    response = staff_client.get(url)
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["slug"] == mod_queue_recipe.slug


@pytest.mark.django_db
def test_mod_queue_includes_vote_summary(staff_client, user, other_user, mod_queue_recipe):
    """Queue entries include vote count summary."""
    from spoonfury.apps.recipes.models import RecipeReview, TestKitchenInvite
    TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    RecipeReview.objects.create(
        recipe=mod_queue_recipe, reviewer=other_user,
        review_round=1, is_positive=True,
    )
    url = reverse("moderation-queue")
    response = staff_client.get(url)
    assert response.data[0]["positive_votes"] == 1
    assert response.data[0]["total_votes"] == 1


@pytest.mark.django_db
def test_mod_queue_includes_strike_count(staff_client, user, mod_queue_recipe):
    """Queue entries include the author's strike count."""
    url = reverse("moderation-queue")
    response = staff_client.get(url)
    assert response.data[0]["author_strike_count"] == 0


# --- Approve ---

@pytest.mark.django_db
def test_approve_recipe(staff_client, user, mod_queue_recipe):
    """Staff can approve a recipe, transitioning to published."""
    url = reverse("moderation-approve", kwargs={"slug": mod_queue_recipe.slug})
    response = staff_client.post(url)
    assert response.status_code == 200
    mod_queue_recipe.refresh_from_db()
    assert mod_queue_recipe.status == "published"
    assert mod_queue_recipe.published_at is not None
    assert ModerationAction.objects.filter(action="approved").count() == 1


@pytest.mark.django_db
def test_approve_notifies_author(staff_client, user, mod_queue_recipe):
    """Approval sends a notification to the recipe author."""
    url = reverse("moderation-approve", kwargs={"slug": mod_queue_recipe.slug})
    staff_client.post(url)
    assert Notification.objects.filter(
        recipient=user,
        notification_type="recipe_approved",
    ).count() == 1


@pytest.mark.django_db
def test_approve_non_staff_forbidden(auth_client, mod_queue_recipe):
    """Non-staff users cannot approve recipes."""
    url = reverse("moderation-approve", kwargs={"slug": mod_queue_recipe.slug})
    response = auth_client.post(url)
    assert response.status_code == 403


# --- Request revision ---

@pytest.mark.django_db
def test_request_revision(staff_client, user, mod_queue_recipe):
    """Staff can request revision, transitioning to revision_requested."""
    url = reverse("moderation-request-revision", kwargs={"slug": mod_queue_recipe.slug})
    response = staff_client.post(url, {"feedback": "Needs more detail in instructions."}, format="json")
    assert response.status_code == 200
    mod_queue_recipe.refresh_from_db()
    assert mod_queue_recipe.status == "revision_requested"
    assert ModerationAction.objects.filter(action="revision_requested").count() == 1
    assert AuthorStrike.objects.filter(author=user).count() == 1


@pytest.mark.django_db
def test_request_revision_requires_feedback(staff_client, mod_queue_recipe):
    """Revision request without feedback is rejected."""
    url = reverse("moderation-request-revision", kwargs={"slug": mod_queue_recipe.slug})
    response = staff_client.post(url, {}, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_request_revision_notifies_author(staff_client, user, mod_queue_recipe):
    """Revision request sends a notification to the recipe author."""
    url = reverse("moderation-request-revision", kwargs={"slug": mod_queue_recipe.slug})
    staff_client.post(url, {"feedback": "Needs work"}, format="json")
    assert Notification.objects.filter(
        recipient=user,
        notification_type="revision_requested",
    ).count() == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_moderation.py -v`

Expected: FAIL — URL names don't exist

- [ ] **Step 3: Implement the moderation views**

Create `backend/spoonfury/apps/recipes/views_moderation.py`:

```python
"""
Views for the moderation pipeline.

Provides endpoints for:
  - Listing the moderation queue (staff only)
  - Approving a recipe (staff only)
  - Requesting revision on a recipe (staff only)
"""
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Recipe, RecipeReview, ModerationAction, AuthorStrike
from .serializers import RecipeSerializer
from spoonfury.apps.notifications.helpers import notify


class IsStaff(permissions.BasePermission):
    """Only allow staff users."""
    def has_permission(self, request, view):
        return request.user and request.user.is_staff


@api_view(["GET"])
@permission_classes([IsStaff])
def moderation_queue(request):
    """
    List all recipes awaiting moderation (status=mod_queue).

    Each entry includes the recipe data plus vote summary and author strike count.
    Ordered by time entered the queue (oldest first).
    """
    recipes = (
        Recipe.objects
        .filter(status="mod_queue")
        .select_related("author")
        .order_by("updated_at")
    )

    results = []
    for recipe in recipes:
        reviews = RecipeReview.objects.filter(
            recipe=recipe, review_round=recipe.review_round
        )
        total = reviews.count()
        positive = reviews.filter(is_positive=True).count()
        strike_count = AuthorStrike.objects.filter(author=recipe.author).count()

        serializer = RecipeSerializer(recipe, context={"request": request})
        entry = serializer.data
        entry["total_votes"] = total
        entry["positive_votes"] = positive
        entry["author_strike_count"] = strike_count
        results.append(entry)

    return Response(results)


@api_view(["POST"])
@permission_classes([IsStaff])
def moderation_approve(request, slug):
    """
    Approve a recipe from the mod queue, publishing it.

    Sets status to 'published' and published_at to now.
    Creates a ModerationAction audit entry.
    Notifies the recipe author.
    """
    recipe = Recipe.objects.select_related("author").get(slug=slug)

    if recipe.status != "mod_queue":
        return Response(
            {"detail": "Recipe must be in mod_queue to approve."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    recipe.status = "published"
    recipe.published_at = timezone.now()
    recipe.save(update_fields=["status", "published_at"])

    ModerationAction.objects.create(
        recipe=recipe,
        moderator=request.user,
        action="approved",
        review_round=recipe.review_round,
    )

    notify(
        recipient=recipe.author,
        notification_type="recipe_approved",
        recipe=recipe,
        actor=request.user,
        message=f"Your recipe {recipe.title} has been published!",
    )

    serializer = RecipeSerializer(recipe, context={"request": request})
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsStaff])
def moderation_request_revision(request, slug):
    """
    Send a recipe back for revision.

    Requires feedback text. Creates ModerationAction + AuthorStrike.
    Notifies the recipe author.
    """
    recipe = Recipe.objects.select_related("author").get(slug=slug)

    if recipe.status != "mod_queue":
        return Response(
            {"detail": "Recipe must be in mod_queue."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    feedback = request.data.get("feedback", "").strip()
    if not feedback:
        return Response(
            {"detail": "Feedback is required when requesting revision."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    recipe.status = "revision_requested"
    recipe.save(update_fields=["status"])

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

    notify(
        recipient=recipe.author,
        notification_type="revision_requested",
        recipe=recipe,
        actor=request.user,
        message=f"Feedback on {recipe.title} — revision needed",
    )

    serializer = RecipeSerializer(recipe, context={"request": request})
    return Response(serializer.data)
```

- [ ] **Step 4: Register URL patterns**

In `backend/spoonfury/apps/recipes/urls.py`, add import:

```python
from .views_moderation import moderation_queue, moderation_approve, moderation_request_revision
```

Add to urlpatterns:

```python
    path("moderation/queue/", moderation_queue, name="moderation-queue"),
    path("moderation/<slug:slug>/approve/", moderation_approve, name="moderation-approve"),
    path("moderation/<slug:slug>/request-revision/", moderation_request_revision, name="moderation-request-revision"),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_moderation.py -v`

Expected: All 10 tests PASS

- [ ] **Step 6: Commit**

```bash
git add backend/spoonfury/apps/recipes/views_moderation.py backend/spoonfury/apps/recipes/urls.py backend/spoonfury/apps/recipes/tests/test_moderation.py
git commit -m "feat(recipes): moderation queue, approve, and request-revision endpoints"
```

---

## Task 8: Force-publish endpoint (superuser)

**Files:**
- Modify: `backend/spoonfury/apps/recipes/views.py:82-118`
- Modify: `backend/spoonfury/apps/recipes/tests/test_publish.py`

- [ ] **Step 1: Write the failing test**

Add to `backend/spoonfury/apps/recipes/tests/test_publish.py`:

```python
from spoonfury.apps.recipes.models import ModerationAction


@pytest.mark.django_db
def test_force_publish_superuser(publishable_recipe):
    """Superuser can force-publish from any state, gate still enforced."""
    from django.contrib.auth import get_user_model
    from rest_framework.test import APIClient
    User = get_user_model()
    superuser = User.objects.create_superuser(
        username="admin", email="admin@test.com", password="testpass123"
    )
    client = APIClient()
    client.force_authenticate(user=superuser)

    publishable_recipe.status = "in_review"
    publishable_recipe.review_round = 1
    publishable_recipe.save()

    url = reverse("recipe-force-publish", kwargs={"slug": publishable_recipe.slug})
    response = client.post(url)
    assert response.status_code == 200
    assert response.data["status"] == "published"
    assert ModerationAction.objects.filter(action="force_published").count() == 1


@pytest.mark.django_db
def test_force_publish_non_superuser_forbidden(auth_client, publishable_recipe):
    """Non-superusers cannot force-publish."""
    url = reverse("recipe-force-publish", kwargs={"slug": publishable_recipe.slug})
    response = auth_client.post(url)
    assert response.status_code == 403


@pytest.mark.django_db
def test_force_publish_gate_still_enforced(incomplete_recipe):
    """Force-publish still enforces the 4-point checklist."""
    from django.contrib.auth import get_user_model
    from rest_framework.test import APIClient
    User = get_user_model()
    superuser = User.objects.create_superuser(
        username="admin2", email="admin2@test.com", password="testpass123"
    )
    client = APIClient()
    client.force_authenticate(user=superuser)

    url = reverse("recipe-force-publish", kwargs={"slug": incomplete_recipe.slug})
    response = client.post(url)
    assert response.status_code == 400
    assert "errors" in response.data
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_publish.py -v -k "force_publish"`

Expected: FAIL — URL name doesn't exist

- [ ] **Step 3: Add force-publish view**

In `backend/spoonfury/apps/recipes/views.py`, add a new action to `RecipeViewSet` or create a standalone view. Simpler as a standalone `@api_view` since it needs `IsSuperUser`:

Add to `backend/spoonfury/apps/recipes/views.py` after the existing imports:

```python
from .models import ModerationAction
```

Add a new standalone view after `TagListView`:

```python
@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def force_publish(request, slug):
    """
    Superuser force-publish. Any state -> published.
    The 4-point gate checklist is still enforced.
    Logged as ModerationAction for audit.
    """
    if not request.user.is_superuser:
        raise PermissionDenied("Only superusers can force-publish.")

    recipe = Recipe.objects.select_related("author").get(slug=slug)

    errors = []
    valid_ingredients = [i for i in recipe.ingredients if i.get("name", "").strip()]
    if len(valid_ingredients) < 2:
        errors.append("At least 2 ingredients required (found %d)." % len(valid_ingredients))
    if len(recipe.instructions.strip()) < 20:
        errors.append("Instructions must be at least 20 characters long.")
    if not recipe.description.strip():
        errors.append("Description is required.")
    if not recipe.category:
        errors.append("Category must be set.")
    if errors:
        return Response({"errors": errors}, status=http_status.HTTP_400_BAD_REQUEST)

    recipe.status = "published"
    recipe.published_at = timezone.now()
    recipe.save(update_fields=["status", "published_at"])

    ModerationAction.objects.create(
        recipe=recipe,
        moderator=request.user,
        action="force_published",
        review_round=recipe.review_round,
    )

    serializer = RecipeSerializer(recipe, context={"request": request})
    return Response(serializer.data)
```

Add the necessary imports at the top of the file:

```python
from rest_framework.decorators import api_view, permission_classes
```

- [ ] **Step 4: Register URL**

In `backend/spoonfury/apps/recipes/urls.py`, add import:

```python
from .views import force_publish
```

Add path:

```python
    path("recipes/<slug:slug>/force-publish/", force_publish, name="recipe-force-publish"),
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_publish.py -v`

Expected: All tests PASS (including existing ones + 3 new)

- [ ] **Step 6: Commit**

```bash
git add backend/spoonfury/apps/recipes/views.py backend/spoonfury/apps/recipes/urls.py backend/spoonfury/apps/recipes/tests/test_publish.py
git commit -m "feat(recipes): superuser force-publish endpoint with audit trail"
```

---

## Task 9: Edit-locking during review and moderation

**Files:**
- Modify: `backend/spoonfury/apps/recipes/views.py:72-75`
- Modify: `backend/spoonfury/apps/recipes/views.py:37-65` (get_queryset)
- Modify: `backend/spoonfury/apps/recipes/tests/test_api.py`

- [ ] **Step 1: Write the failing tests**

Add to `backend/spoonfury/apps/recipes/tests/test_api.py`:

```python
@pytest.mark.django_db
def test_cannot_edit_recipe_in_review(auth_client, user):
    """Recipes in in_review state are locked for editing."""
    recipe = Recipe.objects.create(
        title="Locked Recipe",
        description="Locked",
        serves="4",
        ingredients=[],
        instructions="Cook it well enough to pass the gate and more",
        category="soup",
        author=user,
        status="in_review",
        review_round=1,
    )
    url = reverse("recipe-detail", kwargs={"slug": recipe.slug})
    response = auth_client.patch(url, {"title": "New Title"}, format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_cannot_edit_recipe_in_mod_queue(auth_client, user):
    """Recipes in mod_queue state are locked for editing."""
    recipe = Recipe.objects.create(
        title="Mod Queue Recipe",
        description="Queued",
        serves="4",
        ingredients=[],
        instructions="Cook it well enough to pass the gate and more",
        category="soup",
        author=user,
        status="mod_queue",
        review_round=1,
    )
    url = reverse("recipe-detail", kwargs={"slug": recipe.slug})
    response = auth_client.patch(url, {"title": "New Title"}, format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_can_edit_recipe_in_revision_requested(auth_client, user):
    """Recipes in revision_requested state are editable."""
    recipe = Recipe.objects.create(
        title="Revision Recipe",
        description="Needs revision",
        serves="4",
        ingredients=[],
        instructions="Cook it well enough to pass the gate and more",
        category="soup",
        author=user,
        status="revision_requested",
        review_round=1,
    )
    url = reverse("recipe-detail", kwargs={"slug": recipe.slug})
    response = auth_client.patch(url, {"title": "Revised Title"}, format="json")
    assert response.status_code == 200
    assert response.data["title"] == "Revised Title"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_api.py -v -k "edit_recipe_in"`

Expected: FAIL — edits currently succeed on in_review/mod_queue

- [ ] **Step 3: Add edit-locking to perform_update**

In `backend/spoonfury/apps/recipes/views.py`, modify `perform_update`:

```python
    def perform_update(self, serializer):
        if serializer.instance.author != self.request.user:
            raise PermissionDenied("You can only edit your own recipes.")
        if serializer.instance.status in ("in_review", "mod_queue"):
            raise PermissionDenied("Recipe is locked during review/moderation. Withdraw or wait for a decision.")
        serializer.save()
```

- [ ] **Step 4: Update get_queryset for new statuses**

In `backend/spoonfury/apps/recipes/views.py`, the `get_queryset` method currently handles `draft` and `published`. Update it to also surface `in_review`, `mod_queue`, and `revision_requested` properly:

```python
    def get_queryset(self):
        base = (
            Recipe.objects
            .select_related("author", "parent_recipe__author")
            .prefetch_related("tags")
        )
        user = self.request.user

        if user.is_authenticated:
            invited_owner_ids = TestKitchenInvite.objects.filter(
                invitee=user
            ).values_list("owner_id", flat=True)

            return base.filter(
                Q(status="published")
                | Q(author=user)  # own recipes in any state
                | Q(author_id__in=invited_owner_ids, status__in=["draft", "in_review"])  # invited kitchens
            ).distinct()

        return base.filter(status="published")
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/recipes/tests/test_api.py -v`

Expected: All tests PASS

- [ ] **Step 6: Run full test suite**

Run: `cd backend && ../.venv/Scripts/pytest -v`

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add backend/spoonfury/apps/recipes/views.py backend/spoonfury/apps/recipes/tests/test_api.py
git commit -m "feat(recipes): edit-locking during review/moderation, queryset visibility update"
```

---

## Task 10: Notification API endpoints

**Files:**
- Create: `backend/spoonfury/apps/notifications/serializers.py`
- Create: `backend/spoonfury/apps/notifications/views.py`
- Create: `backend/spoonfury/apps/notifications/urls.py`
- Modify: `backend/config/urls.py`
- Modify: `backend/spoonfury/apps/notifications/tests/test_notifications.py`

- [ ] **Step 1: Write the failing tests**

Add to `backend/spoonfury/apps/notifications/tests/test_notifications.py`:

```python
from django.urls import reverse


@pytest.mark.django_db
def test_list_notifications(auth_client, user, other_user, recipe):
    """User can list their notifications."""
    Notification.objects.create(
        recipient=user,
        notification_type="review_received",
        recipe=recipe,
        actor=other_user,
        message="Test notification",
    )
    url = reverse("notification-list")
    response = auth_client.get(url)
    assert response.status_code == 200
    assert len(response.data) == 1


@pytest.mark.django_db
def test_list_notifications_unread_filter(auth_client, user, other_user, recipe):
    """Can filter to unread notifications only."""
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="Unread",
    )
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="Read", is_read=True,
    )
    url = reverse("notification-list") + "?unread=true"
    response = auth_client.get(url)
    assert len(response.data) == 1
    assert response.data[0]["message"] == "Unread"


@pytest.mark.django_db
def test_unread_count(auth_client, user, other_user, recipe):
    """Unread count endpoint returns correct count."""
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="N1",
    )
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="N2",
    )
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="N3", is_read=True,
    )
    url = reverse("notification-unread-count")
    response = auth_client.get(url)
    assert response.data["count"] == 2


@pytest.mark.django_db
def test_mark_read(auth_client, user, other_user, recipe):
    """Can mark specific notifications as read."""
    n1 = Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="N1",
    )
    n2 = Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="N2",
    )
    url = reverse("notification-mark-read")
    response = auth_client.post(url, {"ids": [n1.pk]}, format="json")
    assert response.status_code == 200
    n1.refresh_from_db()
    n2.refresh_from_db()
    assert n1.is_read is True
    assert n2.is_read is False


@pytest.mark.django_db
def test_mark_all_read(auth_client, user, other_user, recipe):
    """Can mark all notifications as read."""
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="N1",
    )
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="N2",
    )
    url = reverse("notification-mark-all-read")
    response = auth_client.post(url)
    assert response.status_code == 200
    assert Notification.objects.filter(recipient=user, is_read=False).count() == 0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/notifications/tests/test_notifications.py -v -k "list_notifications or unread_count or mark_read or mark_all"`

Expected: FAIL — URL names don't exist

- [ ] **Step 3: Create the serializer**

Create `backend/spoonfury/apps/notifications/serializers.py`:

```python
from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True, default=None)
    recipe_slug = serializers.SlugRelatedField(source="recipe", slug_field="slug", read_only=True)
    recipe_title = serializers.CharField(source="recipe.title", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id", "notification_type", "message", "is_read",
            "actor_username", "recipe_slug", "recipe_title",
            "created_at",
        ]
        read_only_fields = fields
```

- [ ] **Step 4: Create the views**

Create `backend/spoonfury/apps/notifications/views.py`:

```python
"""
API views for in-app notifications.

All endpoints require authentication and are scoped to the current user's
notifications only.
"""
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def notification_list(request):
    """
    List current user's notifications, newest first.

    Supports ?unread=true to filter to unread only.
    """
    qs = Notification.objects.filter(
        recipient=request.user
    ).select_related("actor", "recipe")

    if request.query_params.get("unread") == "true":
        qs = qs.filter(is_read=False)

    serializer = NotificationSerializer(qs[:50], many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_read(request):
    """
    Mark specific notifications as read.

    Body: { "ids": [1, 2, 3] }
    Only marks notifications belonging to the current user.
    """
    ids = request.data.get("ids", [])
    if not ids:
        return Response(
            {"detail": "ids is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    updated = Notification.objects.filter(
        recipient=request.user, pk__in=ids
    ).update(is_read=True)
    return Response({"updated": updated})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_all_read(request):
    """Mark all of the current user's notifications as read."""
    updated = Notification.objects.filter(
        recipient=request.user, is_read=False
    ).update(is_read=True)
    return Response({"updated": updated})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def unread_count(request):
    """
    Lightweight endpoint for badge polling.

    Returns { "count": N }.
    """
    count = Notification.objects.filter(
        recipient=request.user, is_read=False
    ).count()
    return Response({"count": count})
```

- [ ] **Step 5: Create URL patterns**

Create `backend/spoonfury/apps/notifications/urls.py`:

```python
from django.urls import path
from .views import notification_list, mark_read, mark_all_read, unread_count

urlpatterns = [
    path("notifications/", notification_list, name="notification-list"),
    path("notifications/mark-read/", mark_read, name="notification-mark-read"),
    path("notifications/mark-all-read/", mark_all_read, name="notification-mark-all-read"),
    path("notifications/unread-count/", unread_count, name="notification-unread-count"),
]
```

- [ ] **Step 6: Include in root URL config**

In `backend/config/urls.py`, add:

```python
    path("api/", include("spoonfury.apps.notifications.urls")),
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/notifications/tests/test_notifications.py -v`

Expected: All 8 tests PASS

- [ ] **Step 8: Run full test suite**

Run: `cd backend && ../.venv/Scripts/pytest -v`

Expected: All tests PASS

- [ ] **Step 9: Commit**

```bash
git add backend/spoonfury/apps/notifications/serializers.py backend/spoonfury/apps/notifications/views.py backend/spoonfury/apps/notifications/urls.py backend/config/urls.py
git commit -m "feat(notifications): list, mark-read, mark-all-read, unread-count endpoints"
```

---

## Task 11: Frontend types and API layer updates

**Files:**
- Modify: `frontend/src/types.ts`

- [ ] **Step 1: Update TypeScript types**

In `frontend/src/types.ts`, expand `RecipeStatus` and add new interfaces:

```typescript
/** Possible recipe statuses in the review/publish pipeline. */
export type RecipeStatus = "draft" | "in_review" | "mod_queue" | "revision_requested" | "published";
```

Add `review_round` to the `Recipe` interface:

```typescript
  review_round: number;
```

Add new interfaces at the end of the file:

```typescript
/** A single review vote on a recipe. */
export interface RecipeReviewItem {
  reviewer: string;
  is_positive: boolean;
  comment: string;
  created_at: string;
}

/** Response from GET /recipes/:slug/reviews/ */
export interface ReviewsResponse {
  review_round: number;
  total_votes: number;
  positive_votes: number;
  threshold_met: boolean;
  has_voted: boolean;
  reviews?: RecipeReviewItem[];
}

/** An in-app notification. */
export interface AppNotification {
  id: number;
  notification_type: string;
  message: string;
  is_read: boolean;
  actor_username: string | null;
  recipe_slug: string;
  recipe_title: string;
  created_at: string;
}

/** A recipe in the moderation queue with extra metadata. */
export interface ModerationQueueEntry extends Recipe {
  total_votes: number;
  positive_votes: number;
  author_strike_count: number;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`

Expected: No type errors (may have pre-existing ones — focus on types.ts being clean)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types.ts
git commit -m "feat(frontend): expand types for review pipeline, notifications, moderation"
```

---

## Task 12: NotificationBell component

**Files:**
- Create: `frontend/src/components/NotificationBell.tsx`
- Modify: `frontend/src/components/NavBar.tsx`

- [ ] **Step 1: Create the NotificationBell component**

Create `frontend/src/components/NotificationBell.tsx`:

```tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { api } from "@/lib/api";
import type { AppNotification } from "@/types";

interface NotificationBellProps {
  token: string;
}

export function NotificationBell({ token }: NotificationBellProps) {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Poll unread count on mount and every 60 seconds
  useEffect(() => {
    const fetchCount = () => {
      api.get("/notifications/unread-count/", token)
        .then((data: { count: number }) => setUnreadCount(data.count))
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60_000);
    return () => clearInterval(interval);
  }, [token]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const toggleDropdown = async () => {
    if (!open) {
      setLoading(true);
      try {
        const data = await api.get("/notifications/", token) as AppNotification[];
        setNotifications(data);
      } catch { /* ignore */ }
      setLoading(false);
    }
    setOpen(!open);
  };

  const handleNotificationClick = async (n: AppNotification) => {
    if (!n.is_read) {
      try {
        await api.post("/notifications/mark-read/", { ids: [n.id] }, token);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev =>
          prev.map(notif => notif.id === n.id ? { ...notif, is_read: true } : notif)
        );
      } catch { /* ignore */ }
    }
    setOpen(false);
    navigate(`/recipes/${n.recipe_slug}`);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post("/notifications/mark-all-read/", {}, token);
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch { /* ignore */ }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggleDropdown}
        className="relative flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-black leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-800"
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground p-4">Loading...</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No notifications yet.</p>
          ) : (
            <ul>
              {notifications.map(n => (
                <li key={n.id}>
                  <button
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0 ${
                      !n.is_read ? "bg-indigo-50/50" : ""
                    }`}
                  >
                    <p className="text-sm">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(n.created_at).toLocaleDateString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add NotificationBell to NavBar**

In `frontend/src/components/NavBar.tsx`, add the import at the top:

```typescript
import { NotificationBell } from "@/components/NotificationBell";
```

Find the area in the NavBar where `CartButton` is rendered (in the right side of the nav). Add `NotificationBell` before `CartButton` in both mobile and desktop variants. The exact location varies by the nav theme, but the pattern is:

Look for `<CartButton count={count}` and place `{token && <NotificationBell token={token} />}` before it. This should be done in both the sticker theme layout and the minimal theme layout.

- [ ] **Step 3: Verify it renders**

Start the frontend dev server and verify the bell icon appears next to the cart icon when logged in. It should not appear when logged out.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/NotificationBell.tsx frontend/src/components/NavBar.tsx
git commit -m "feat(frontend): notification bell with dropdown in NavBar"
```

---

## Task 13: ReviewPanel component on RecipePage

**Files:**
- Create: `frontend/src/components/ReviewPanel.tsx`
- Modify: `frontend/src/pages/RecipePage.tsx`

- [ ] **Step 1: Create the ReviewPanel component**

Create `frontend/src/components/ReviewPanel.tsx`:

```tsx
import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReviewsResponse } from "@/types";

interface ReviewPanelProps {
  recipeSlug: string;
  token: string;
}

export function ReviewPanel({ recipeSlug, token }: ReviewPanelProps) {
  const [reviewData, setReviewData] = useState<ReviewsResponse | null>(null);
  const [vote, setVote] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/recipes/${recipeSlug}/reviews/`, token)
      .then((data: ReviewsResponse) => setReviewData(data))
      .catch(() => {});
  }, [recipeSlug, token]);

  const handleSubmit = async () => {
    if (vote === null) return;
    setSubmitting(true);
    setError("");
    try {
      await api.post(
        `/recipes/${recipeSlug}/review/`,
        { is_positive: vote, comment },
        token
      );
      // Refresh review data to show results
      const updated = await api.get(`/recipes/${recipeSlug}/reviews/`, token) as ReviewsResponse;
      setReviewData(updated);
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      setError(e.data?.detail || "Failed to submit review.");
    }
    setSubmitting(false);
  };

  if (!reviewData) return null;

  return (
    <Card className="border-indigo-200 bg-indigo-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          Community Review
          <Badge variant="outline" className="text-[10px]">
            Round {reviewData.review_round}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vote summary */}
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {reviewData.total_votes} vote{reviewData.total_votes !== 1 ? "s" : ""}
          </span>
          {reviewData.total_votes > 0 && (
            <span className="text-muted-foreground">
              ({reviewData.positive_votes} positive)
            </span>
          )}
          {reviewData.threshold_met && (
            <Badge className="bg-green-100 text-green-700 border-green-200">Threshold met</Badge>
          )}
        </div>

        {/* Vote form — only if user hasn't voted yet */}
        {!reviewData.has_voted ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                variant={vote === true ? "default" : "outline"}
                size="sm"
                onClick={() => setVote(true)}
                className={vote === true ? "bg-green-600 hover:bg-green-700" : ""}
              >
                <ThumbsUp className="w-4 h-4 mr-1" /> Approve
              </Button>
              <Button
                variant={vote === false ? "default" : "outline"}
                size="sm"
                onClick={() => setVote(false)}
                className={vote === false ? "bg-red-600 hover:bg-red-700" : ""}
              >
                <ThumbsDown className="w-4 h-4 mr-1" /> Needs work
              </Button>
            </div>
            <Textarea
              placeholder="Optional comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
            <Button
              onClick={handleSubmit}
              disabled={vote === null || submitting}
              size="sm"
            >
              {submitting ? "Submitting..." : "Submit Review"}
            </Button>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">You've submitted your review.</p>
        )}

        {/* Revealed reviews (after voting) */}
        {reviewData.reviews && reviewData.reviews.length > 0 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All reviews</p>
            {reviewData.reviews.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <span>{r.is_positive ? "👍" : "👎"}</span>
                <div>
                  <span className="font-medium">@{r.reviewer}</span>
                  {r.comment && (
                    <p className="text-muted-foreground mt-0.5">{r.comment}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Add ReviewPanel and status-aware UI to RecipePage**

In `frontend/src/pages/RecipePage.tsx`:

Import the new component:

```typescript
import { ReviewPanel } from "@/components/ReviewPanel";
```

In the owner action strip section where `recipe.status === "draft"` is checked (around lines 222-236), expand to handle all 5 states. Replace the existing draft/published status blocks with:

```tsx
{recipe.status === "draft" && (
  <>
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
      🧪 Draft
    </Badge>
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          const updated = await api.post(`/recipes/${slug}/submit-for-review/`, {}, token!);
          setRecipe(updated);
        } catch { /* ignore */ }
      }}
      disabled={!Object.values(getPublishGate(recipe)).every(Boolean)}
      className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 gap-1.5"
    >
      Submit for Review
    </Button>
  </>
)}
{recipe.status === "in_review" && (
  <>
    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
      🔍 In Review
    </Badge>
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          const updated = await api.post(`/recipes/${slug}/withdraw-review/`, {}, token!);
          setRecipe(updated);
        } catch { /* ignore */ }
      }}
      className="bg-white/50 border-gray-200 text-gray-500 hover:bg-gray-50"
    >
      Withdraw
    </Button>
  </>
)}
{recipe.status === "mod_queue" && (
  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
    ⏳ Awaiting Moderation
  </Badge>
)}
{recipe.status === "revision_requested" && (
  <>
    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
      📝 Revision Requested
    </Badge>
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          const updated = await api.post(`/recipes/${slug}/submit-for-review/`, {}, token!);
          setRecipe(updated);
        } catch { /* ignore */ }
      }}
      disabled={!Object.values(getPublishGate(recipe)).every(Boolean)}
      className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 gap-1.5"
    >
      Resubmit for Review
    </Button>
  </>
)}
{recipe.status === "published" && (
  <Button
    variant="outline"
    size="sm"
    onClick={async () => {
      try {
        const updated = await api.post(`/recipes/${slug}/unpublish/`, {}, token!);
        setRecipe(updated);
      } catch { /* ignore */ }
    }}
    className="bg-white/50 border-gray-200 text-gray-500 hover:bg-gray-50"
  >
    Unpublish
  </Button>
)}
```

Also, add the ReviewPanel for invitees after the ingredient section (below `<Separator />`), before the instructions:

```tsx
{!isOwner && recipe.status === "in_review" && token && (
  <ReviewPanel recipeSlug={recipe.slug} token={token} />
)}
```

- [ ] **Step 3: Remove the old PublishModal trigger for draft status**

The "Perfect It" button and `PublishModal` are no longer the primary publish path for drafts — the new flow is submit-for-review. Keep the `PublishModal` for now (it can be used by superusers or removed later), but remove the "Perfect It" button from the draft status block.

- [ ] **Step 4: Verify it renders**

Start frontend dev server. Navigate to a recipe in different states and verify the correct badges/buttons appear.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ReviewPanel.tsx frontend/src/pages/RecipePage.tsx
git commit -m "feat(frontend): ReviewPanel for invitees, status-aware RecipePage actions"
```

---

## Task 14: ModerationPage

**Files:**
- Create: `frontend/src/pages/ModerationPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Create the ModerationPage**

Create `frontend/src/pages/ModerationPage.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { ModerationQueueEntry } from "@/types";

export function ModerationPage() {
  const { token } = useAuth();
  const [recipes, setRecipes] = useState<ModerationQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api.get("/moderation/queue/", token)
      .then((data: ModerationQueueEntry[]) => setRecipes(data))
      .catch((err: { status?: number }) => {
        if (err.status === 403) setError("You don't have moderator access.");
        else setError("Failed to load queue.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleApprove = async (slug: string) => {
    if (!token || !window.confirm("Approve this recipe for publishing?")) return;
    setActionInProgress(slug);
    try {
      await api.post(`/moderation/${slug}/approve/`, {}, token);
      setRecipes(prev => prev.filter(r => r.slug !== slug));
    } catch { setError("Failed to approve."); }
    setActionInProgress(null);
  };

  const handleRequestRevision = async (slug: string) => {
    if (!token) return;
    const feedback = feedbackMap[slug]?.trim();
    if (!feedback) return;
    setActionInProgress(slug);
    try {
      await api.post(`/moderation/${slug}/request-revision/`, { feedback }, token);
      setRecipes(prev => prev.filter(r => r.slug !== slug));
    } catch { setError("Failed to request revision."); }
    setActionInProgress(null);
  };

  if (!token) return <p className="text-muted-foreground">Please sign in.</p>;
  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (error) return <p className="text-destructive font-medium">{error}</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Moderation Queue</h1>
        <Badge variant="outline">{recipes.length} pending</Badge>
      </div>

      {recipes.length === 0 ? (
        <p className="text-muted-foreground">No recipes awaiting moderation.</p>
      ) : (
        <div className="space-y-4">
          {recipes.map(recipe => (
            <Card key={recipe.slug}>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <Link to={`/recipes/${recipe.slug}`} className="text-lg font-semibold hover:underline">
                      {recipe.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      by @{recipe.author_username}
                      {recipe.author_strike_count > 0 && (
                        <Badge variant="destructive" className="ml-2 text-[10px]">
                          {recipe.author_strike_count} strike{recipe.author_strike_count !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </p>
                  </div>
                  <Badge variant="secondary">{recipe.category}</Badge>
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    👍 {recipe.positive_votes}/{recipe.total_votes} votes
                  </span>
                  <span>Round {recipe.review_round}</span>
                </div>

                <p className="text-sm">{recipe.description}</p>

                <div className="flex items-start gap-3 pt-2 border-t">
                  <Button
                    size="sm"
                    onClick={() => handleApprove(recipe.slug)}
                    disabled={actionInProgress === recipe.slug}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                  <div className="flex-1 space-y-2">
                    <Textarea
                      placeholder="Feedback (required for revision request)..."
                      rows={2}
                      value={feedbackMap[recipe.slug] || ""}
                      onChange={e => setFeedbackMap(prev => ({ ...prev, [recipe.slug]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestRevision(recipe.slug)}
                      disabled={
                        actionInProgress === recipe.slug ||
                        !feedbackMap[recipe.slug]?.trim()
                      }
                      className="border-orange-200 text-orange-700 hover:bg-orange-50"
                    >
                      Request Revision
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add route to App.tsx**

In `frontend/src/App.tsx`, add the import:

```typescript
import { ModerationPage } from "@/pages/ModerationPage";
```

Add the route inside `<Routes>`:

```tsx
<Route path="/moderation" element={<ModerationPage />} />
```

- [ ] **Step 3: Verify it renders**

Start frontend dev server. Navigate to `/moderation` as a staff user. If there are no `mod_queue` recipes, you should see "No recipes awaiting moderation."

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/ModerationPage.tsx frontend/src/App.tsx
git commit -m "feat(frontend): moderation queue page with approve and request-revision"
```

---

## Task 15: Update MyKitchenPage for review pipeline states

**Files:**
- Modify: `frontend/src/pages/MyKitchenPage.tsx`

- [ ] **Step 1: Update status grouping and badges**

In `frontend/src/pages/MyKitchenPage.tsx`, update the `RecipeCard` component to show status-specific badges and actions. Update the section filtering:

Replace the `drafts` and `published` filters:

```typescript
const drafts = myRecipes.filter(r => r.status === "draft" || r.status === "revision_requested");
const inReview = myRecipes.filter(r => r.status === "in_review");
const inModeration = myRecipes.filter(r => r.status === "mod_queue");
const published = myRecipes.filter(r => r.status === "published");
```

Add a status badge to `RecipeCard`:

```tsx
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
    in_review: { label: "In Review", className: "bg-blue-100 text-blue-700" },
    mod_queue: { label: "In Moderation", className: "bg-purple-100 text-purple-700" },
    revision_requested: { label: "Revision Needed", className: "bg-orange-100 text-orange-700" },
    published: { label: "Published", className: "bg-green-100 text-green-700" },
  };
  const c = config[status] || config.draft;
  return <Badge variant="outline" className={`text-[10px] ${c.className}`}>{c.label}</Badge>;
}
```

Add a new "In Review" section and "In Moderation" section between Test Kitchen and Published:

```tsx
{/* In Review Section */}
{inReview.length > 0 && (
  <section>
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-lg font-semibold">🔍 In Review</h2>
      <Badge variant="outline">{inReview.length}</Badge>
    </div>
    <div className="space-y-3">
      {inReview.map(r => (
        <RecipeCard key={r.slug} recipe={r} />
      ))}
    </div>
  </section>
)}

{/* In Moderation Section */}
{inModeration.length > 0 && (
  <section>
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-lg font-semibold">⏳ In Moderation</h2>
      <Badge variant="outline">{inModeration.length}</Badge>
    </div>
    <div className="space-y-3">
      {inModeration.map(r => (
        <RecipeCard key={r.slug} recipe={r} />
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 2: Show revision feedback inline on revision_requested cards**

When a recipe is in `revision_requested`, fetch the latest moderation feedback and display it. This can be done by adding a new API call or by reading from the recipe's reviews endpoint. For simplicity, add the feedback display as a static badge — the full feedback will be visible on the recipe page:

```tsx
{recipe.status === "revision_requested" && (
  <p className="text-xs text-orange-600 mt-1">
    Moderator requested changes — view recipe for details
  </p>
)}
```

- [ ] **Step 3: Verify it renders**

Start frontend dev server. Check `/kitchen` with recipes in various states.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/MyKitchenPage.tsx
git commit -m "feat(frontend): MyKitchenPage updated with review pipeline status sections"
```

---

## Task 16: Final integration test and full suite run

**Files:**
- No new files

- [ ] **Step 1: Run full backend test suite**

Run: `cd backend && ../.venv/Scripts/pytest -v`

Expected: All tests PASS (existing + new review + moderation + notification tests)

- [ ] **Step 2: Run frontend TypeScript check**

Run: `cd frontend && npx tsc --noEmit`

Expected: No type errors

- [ ] **Step 3: Run frontend build**

Run: `cd frontend && npm run build`

Expected: Build succeeds

- [ ] **Step 4: Final commit with any remaining fixes**

Only if there were fixes needed from the integration test.

- [ ] **Step 5: Update HEARTBEAT.md**

Update `HEARTBEAT.md` with current session state.

---

## Summary

| Task | What | Tests |
|------|------|-------|
| 1 | Expand Recipe status to 5 states + review_round | 2 |
| 2 | RecipeReview, ModerationAction, AuthorStrike models | 4 |
| 3 | Notifications app (model, helper, admin) | 3 |
| 4 | Shared test fixtures (staff, invitee) | 0 (additive) |
| 5 | Submit-for-review + withdraw endpoints | 7 |
| 6 | Vote endpoint + threshold auto-promotion | 8 |
| 7 | Moderation endpoints (queue, approve, reject) | 10 |
| 8 | Force-publish (superuser) | 3 |
| 9 | Edit-locking during review/moderation | 3 |
| 10 | Notification API (list, mark-read, unread-count) | 5 |
| 11 | Frontend types update | 0 (type check) |
| 12 | NotificationBell component | 0 (visual) |
| 13 | ReviewPanel + RecipePage status UI | 0 (visual) |
| 14 | ModerationPage | 0 (visual) |
| 15 | MyKitchenPage status sections | 0 (visual) |
| 16 | Integration test + build verification | 0 (suite run) |

**Total new backend tests: ~45**
