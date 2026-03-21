# Test Kitchen & Recipe Privacy — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make recipes private by default (the "test kitchen"), with a quality-gated "Perfect It" publish flow, a My Kitchen page, profile visibility rules, and test kitchen sharing.

**Architecture:** Add `status`/`published_at` fields to Recipe, create a `TestKitchenInvite` model for kitchen sharing. Filter API querysets by status + viewer. Frontend gets a My Kitchen page (two sections), publish flow with checklist gate + confetti, and profile-aware visibility. All new code gets docstrings/JSDoc.

**Tech Stack:** Django 5 / DRF (backend), React 19 / Vite / Tailwind 4 / Shadcn / Framer Motion (frontend), `canvas-confetti` (publish celebration)

---

### Task 1: Add `status` and `published_at` fields to Recipe model

**Files:**
- Modify: `backend/spoonfury/apps/recipes/models.py`
- Test: `backend/spoonfury/apps/recipes/tests/test_models.py`

**Step 1: Write the failing test**

Add to `backend/spoonfury/apps/recipes/tests/test_models.py`:

```python
import pytest
from spoonfury.apps.recipes.models import Recipe


SAMPLE_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
    {"quantity": "1", "unit": "cup", "name": "flour", "note": ""},
]


@pytest.mark.django_db
def test_recipe_defaults_to_draft(user):
    """New recipes should default to 'draft' status with no published_at."""
    recipe = Recipe.objects.create(
        title="Draft Soup",
        description="A soup in progress.",
        serves="4",
        ingredients=SAMPLE_INGREDIENTS,
        instructions="Step 1: boil water. Step 2: add stuff.",
        category="soup",
        author=user,
    )
    assert recipe.status == "draft"
    assert recipe.published_at is None


@pytest.mark.django_db
def test_published_at_not_set_automatically(user):
    """published_at should remain None until explicitly set."""
    recipe = Recipe.objects.create(
        title="Another Draft",
        description="Testing.",
        serves="2",
        ingredients=SAMPLE_INGREDIENTS,
        instructions="Mix things together nicely.",
        category="other",
        author=user,
    )
    recipe.status = "published"
    recipe.save()
    # published_at is NOT auto-set by the model — the publish endpoint handles it
    assert recipe.published_at is None
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest spoonfury/apps/recipes/tests/test_models.py -v`
Expected: FAIL — `Recipe` has no `status` field

**Step 3: Write minimal implementation**

In `backend/spoonfury/apps/recipes/models.py`, add after `CATEGORY_CHOICES`:

```python
STATUS_CHOICES = [
    ("draft", "Draft"),
    ("published", "Published"),
]
```

Add these fields to the `Recipe` model (after `updated_at`):

```python
    # --- Privacy / publish flow ---
    # Recipes start as "draft" (private, in the author's test kitchen).
    # When the author "perfects" a recipe, status flips to "published"
    # and published_at is set by the publish endpoint.
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="draft",
        db_index=True,
    )
    published_at = models.DateTimeField(null=True, blank=True)
```

**Step 4: Create and run migration**

Run:
```bash
cd backend && python manage.py makemigrations recipes --name add_status_and_published_at
cd backend && python manage.py migrate
```

**Step 5: Run test to verify it passes**

Run: `cd backend && python -m pytest spoonfury/apps/recipes/tests/test_models.py -v`
Expected: PASS

**Step 6: Update admin**

In `backend/spoonfury/apps/recipes/admin.py`, add `status` to `list_display` and `list_filter`, and `published_at` to `readonly_fields`:

```python
@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    """Admin view for recipes with status filtering and read-only audit fields."""
    list_display = ["title", "author", "category", "status", "fork_count", "created_at"]
    list_filter = ["category", "status"]
    search_fields = ["title", "author__username"]
    readonly_fields = ["slug", "fork_count", "created_at", "updated_at", "published_at"]
```

**Step 7: Commit**

```bash
git add backend/spoonfury/apps/recipes/
git commit -m "feat(recipes): add status and published_at fields to Recipe model

Recipes now default to 'draft' status. The published_at timestamp
is set explicitly by the publish endpoint (Task 3)."
```

---

### Task 2: Update RecipeSerializer and queryset filtering

**Files:**
- Modify: `backend/spoonfury/apps/recipes/serializers.py`
- Modify: `backend/spoonfury/apps/recipes/views.py`
- Modify: `backend/spoonfury/apps/recipes/tests/test_api.py`

**Step 1: Write failing tests**

Add to `backend/spoonfury/apps/recipes/tests/test_api.py`:

```python
@pytest.mark.django_db
def test_draft_recipes_hidden_from_public_list(api_client, recipe):
    """Draft recipes should not appear in the public recipe list."""
    # recipe fixture creates a draft by default now
    url = reverse("recipe-list")
    response = api_client.get(url)
    assert response.status_code == 200
    assert len(response.data["results"]) == 0


@pytest.mark.django_db
def test_published_recipes_visible_in_public_list(api_client, recipe):
    """Published recipes should appear in the public list."""
    recipe.status = "published"
    recipe.save()
    url = reverse("recipe-list")
    response = api_client.get(url)
    assert response.status_code == 200
    assert len(response.data["results"]) == 1


@pytest.mark.django_db
def test_owner_sees_own_draft_recipes(auth_client, recipe):
    """Owners should see their own draft recipes in the list."""
    url = reverse("recipe-list")
    response = auth_client.get(url)
    assert response.status_code == 200
    assert len(response.data["results"]) == 1
    assert response.data["results"][0]["status"] == "draft"


@pytest.mark.django_db
def test_other_user_cannot_see_draft_recipe_detail(other_auth_client, recipe):
    """Non-owners should get 404 when trying to view a draft recipe."""
    url = reverse("recipe-detail", kwargs={"slug": recipe.slug})
    response = other_auth_client.get(url)
    assert response.status_code == 404


@pytest.mark.django_db
def test_serializer_includes_status_and_published_at(api_client, recipe):
    """The recipe serializer should expose status and published_at."""
    recipe.status = "published"
    recipe.save()
    url = reverse("recipe-detail", kwargs={"slug": recipe.slug})
    response = api_client.get(url)
    assert response.status_code == 200
    assert response.data["status"] == "published"
    assert "published_at" in response.data
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest spoonfury/apps/recipes/tests/test_api.py -v`
Expected: FAIL — existing `test_list_recipes_is_public` also breaks (drafts now hidden)

**Step 3: Fix existing test + implement serializer changes**

Update the existing `test_list_recipes_is_public` test to publish the recipe first:

```python
@pytest.mark.django_db
def test_list_recipes_is_public(api_client, recipe):
    """Anyone can list published recipes without auth."""
    recipe.status = "published"
    recipe.save()
    url = reverse("recipe-list")
    response = api_client.get(url)
    assert response.status_code == 200
    assert len(response.data["results"]) == 1
```

Also update `test_get_recipe_by_slug` to publish first:

```python
@pytest.mark.django_db
def test_get_recipe_by_slug(api_client, recipe):
    recipe.status = "published"
    recipe.save()
    url = reverse("recipe-detail", kwargs={"slug": recipe.slug})
    response = api_client.get(url)
    assert response.status_code == 200
    assert response.data["title"] == "Test Soup"
    assert "author_username" in response.data
```

**Step 4: Update serializer**

In `backend/spoonfury/apps/recipes/serializers.py`:

```python
class RecipeSerializer(serializers.ModelSerializer):
    """
    Serializes Recipe instances for the API.

    Read-only computed fields:
      - author_username, author_display_name: from the related User
      - parent_recipe_*: fork lineage info
      - status, published_at: privacy/publish state
    """
    # ... existing fields unchanged ...

    class Meta:
        model = Recipe
        fields = [
            "id", "slug", "title", "description", "serves",
            "ingredients", "instructions", "notes", "category",
            "author_username", "author_display_name",
            "parent_recipe_slug", "parent_recipe_title", "parent_recipe_author",
            "fork_count", "created_at", "status", "published_at",
        ]
        read_only_fields = ["slug", "fork_count", "created_at", "author_username", "status", "published_at"]
```

Note: `status` and `published_at` are read-only on the serializer — they can only be changed via the dedicated publish/unpublish endpoints (Task 3).

**Step 5: Update views with queryset filtering**

Replace `backend/spoonfury/apps/recipes/views.py`:

```python
from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from django.db.models import Q
from .models import Recipe
from .serializers import RecipeSerializer


class RecipeViewSet(viewsets.ModelViewSet):
    """
    CRUD viewset for recipes with privacy-aware queryset filtering.

    Visibility rules:
      - Unauthenticated: only published recipes
      - Authenticated (non-owner): only published recipes
      - Owner: all their own recipes (draft + published)

    Write/delete operations are restricted to the recipe's author.
    """
    serializer_class = RecipeSerializer
    lookup_field = "slug"

    def get_queryset(self):
        """
        Return recipes filtered by the viewer's access level.

        Owners see all their own recipes. Everyone else sees only published.
        """
        base = Recipe.objects.select_related("author", "parent_recipe__author")
        user = self.request.user

        if user.is_authenticated:
            # Owner sees their own drafts + all published recipes
            return base.filter(
                Q(status="published") | Q(author=user)
            )
        # Anonymous: published only
        return base.filter(status="published")

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

**Step 6: Run all tests**

Run: `cd backend && python -m pytest spoonfury/apps/recipes/tests/ -v`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add backend/spoonfury/apps/recipes/
git commit -m "feat(recipes): filter queryset by status, expose in serializer

Draft recipes are hidden from non-owners. Owners see all their own
recipes. Serializer now includes status and published_at fields."
```

---

### Task 3: Publish and unpublish endpoints

**Files:**
- Modify: `backend/spoonfury/apps/recipes/views.py`
- Modify: `backend/spoonfury/apps/recipes/urls.py`
- Create: `backend/spoonfury/apps/recipes/tests/test_publish.py`

**Step 1: Write failing tests**

Create `backend/spoonfury/apps/recipes/tests/test_publish.py`:

```python
"""Tests for the publish/unpublish endpoints and checklist gate."""
import pytest
from django.urls import reverse
from django.utils import timezone
from spoonfury.apps.recipes.models import Recipe


VALID_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
    {"quantity": "1", "unit": "cup", "name": "flour", "note": ""},
]


@pytest.fixture
def publishable_recipe(user):
    """A recipe that meets all checklist gate criteria."""
    return Recipe.objects.create(
        title="Publishable Soup",
        description="A soup ready for the world.",
        serves="4",
        ingredients=VALID_INGREDIENTS,
        instructions="Step 1: boil water. Step 2: add all ingredients and simmer for 20 minutes.",
        category="soup",
        author=user,
    )


@pytest.fixture
def incomplete_recipe(user):
    """A recipe missing checklist gate criteria (only 1 ingredient, short instructions)."""
    return Recipe.objects.create(
        title="Incomplete Soup",
        description="",  # missing description
        serves="4",
        ingredients=[{"quantity": "1", "unit": "cup", "name": "water", "note": ""}],
        instructions="Boil.",
        category="soup",
        author=user,
    )


@pytest.mark.django_db
def test_publish_recipe_success(auth_client, publishable_recipe):
    """Owner can publish a recipe that meets all gate criteria."""
    url = reverse("recipe-publish", kwargs={"slug": publishable_recipe.slug})
    response = auth_client.post(url)
    assert response.status_code == 200
    assert response.data["status"] == "published"
    assert response.data["published_at"] is not None


@pytest.mark.django_db
def test_publish_recipe_fails_gate(auth_client, incomplete_recipe):
    """Publishing a recipe that fails the checklist gate returns 400 with details."""
    url = reverse("recipe-publish", kwargs={"slug": incomplete_recipe.slug})
    response = auth_client.post(url)
    assert response.status_code == 400
    assert "errors" in response.data
    errors = response.data["errors"]
    # Should flag: missing description, < 2 ingredients, instructions too short
    assert any("description" in e.lower() for e in errors)
    assert any("ingredient" in e.lower() for e in errors)
    assert any("instruction" in e.lower() for e in errors)


@pytest.mark.django_db
def test_publish_requires_auth(api_client, publishable_recipe):
    """Unauthenticated users cannot publish."""
    url = reverse("recipe-publish", kwargs={"slug": publishable_recipe.slug})
    response = api_client.post(url)
    assert response.status_code == 401


@pytest.mark.django_db
def test_publish_forbidden_for_non_owner(other_auth_client, publishable_recipe):
    """Non-owners cannot publish someone else's recipe."""
    url = reverse("recipe-publish", kwargs={"slug": publishable_recipe.slug})
    response = other_auth_client.post(url)
    assert response.status_code == 403


@pytest.mark.django_db
def test_unpublish_recipe(auth_client, publishable_recipe):
    """Owner can unpublish a published recipe, reverting to draft."""
    # First publish it
    publishable_recipe.status = "published"
    publishable_recipe.published_at = timezone.now()
    publishable_recipe.save()

    url = reverse("recipe-unpublish", kwargs={"slug": publishable_recipe.slug})
    response = auth_client.post(url)
    assert response.status_code == 200
    assert response.data["status"] == "draft"
    assert response.data["published_at"] is None


@pytest.mark.django_db
def test_unpublish_forbidden_for_non_owner(other_auth_client, publishable_recipe):
    """Non-owners cannot unpublish someone else's recipe."""
    publishable_recipe.status = "published"
    publishable_recipe.published_at = timezone.now()
    publishable_recipe.save()

    url = reverse("recipe-unpublish", kwargs={"slug": publishable_recipe.slug})
    response = other_auth_client.post(url)
    assert response.status_code == 403
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest spoonfury/apps/recipes/tests/test_publish.py -v`
Expected: FAIL — no `recipe-publish` URL

**Step 3: Implement publish/unpublish actions**

Add to `backend/spoonfury/apps/recipes/views.py` (new imports + actions on the ViewSet):

```python
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status as http_status

# Add these methods inside RecipeViewSet:

    @action(detail=True, methods=["post"], url_path="publish", url_name="publish")
    def publish(self, request, slug=None):
        """
        Publish a draft recipe after validating the checklist gate.

        Gate criteria (all must pass):
          - At least 2 ingredients with non-empty names
          - Instructions at least 20 characters long
          - Description is non-empty
          - Category is set to a valid choice

        Returns 200 with updated recipe on success, 400 with error list on failure.
        """
        recipe = self.get_object()
        if recipe.author != request.user:
            raise PermissionDenied("You can only publish your own recipes.")

        # Checklist gate validation
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

        serializer = self.get_serializer(recipe)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="unpublish", url_name="unpublish")
    def unpublish(self, request, slug=None):
        """
        Revert a published recipe back to draft status.

        Clears published_at and sets status to 'draft'.
        Only the recipe's author can unpublish.
        """
        recipe = self.get_object()
        if recipe.author != request.user:
            raise PermissionDenied("You can only unpublish your own recipes.")

        recipe.status = "draft"
        recipe.published_at = None
        recipe.save(update_fields=["status", "published_at"])

        serializer = self.get_serializer(recipe)
        return Response(serializer.data)
```

Note: The router auto-generates URLs for ViewSet actions, so no changes needed to `urls.py`. The URL names will be `recipe-publish` and `recipe-unpublish` automatically.

**Step 4: Run tests**

Run: `cd backend && python -m pytest spoonfury/apps/recipes/tests/test_publish.py -v`
Expected: ALL PASS

**Step 5: Run full test suite**

Run: `cd backend && python -m pytest -v`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add backend/spoonfury/apps/recipes/
git commit -m "feat(recipes): add publish/unpublish endpoints with checklist gate

Publish validates: >=2 ingredients, >=20 char instructions,
non-empty description, category set. Returns 400 with error
list if gate fails."
```

---

### Task 4: Create TestKitchenInvite model

**Files:**
- Create: `backend/spoonfury/apps/recipes/models_kitchen.py` — **NO**, keep in existing models.py to avoid import complexity
- Modify: `backend/spoonfury/apps/recipes/models.py`
- Modify: `backend/spoonfury/apps/recipes/admin.py`
- Create: `backend/spoonfury/apps/recipes/tests/test_kitchen.py`

**Step 1: Write failing test**

Create `backend/spoonfury/apps/recipes/tests/test_kitchen.py`:

```python
"""Tests for the TestKitchenInvite model and kitchen sharing."""
import pytest
from django.contrib.auth import get_user_model
from spoonfury.apps.recipes.models import TestKitchenInvite

User = get_user_model()


@pytest.fixture
def other_user(db):
    """A second user for kitchen sharing tests."""
    return User.objects.create_user(
        username="friendchef", email="friend@test.com", password="testpass123"
    )


@pytest.mark.django_db
def test_create_kitchen_invite(user, other_user):
    """An owner can invite another user to view their test kitchen."""
    invite = TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    assert invite.owner == user
    assert invite.invitee == other_user
    assert invite.created_at is not None


@pytest.mark.django_db
def test_kitchen_invite_unique_constraint(user, other_user):
    """Cannot invite the same user twice."""
    TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    with pytest.raises(Exception):  # IntegrityError
        TestKitchenInvite.objects.create(owner=user, invitee=other_user)


@pytest.mark.django_db
def test_kitchen_invite_str(user, other_user):
    """String representation shows owner → invitee."""
    invite = TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    assert str(invite) == f"{user.username} → {other_user.username}"
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest spoonfury/apps/recipes/tests/test_kitchen.py -v`
Expected: FAIL — `TestKitchenInvite` doesn't exist

**Step 3: Implement the model**

Add to `backend/spoonfury/apps/recipes/models.py` after the `Recipe` class:

```python
class TestKitchenInvite(models.Model):
    """
    Grants a specific user (invitee) read access to another user's (owner)
    test kitchen — all of the owner's draft recipes become visible to the
    invitee. Access is all-or-nothing; no per-recipe granularity.

    The unique constraint on (owner, invitee) prevents duplicate invites.
    """
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="kitchen_invites_sent",
        help_text="The user whose test kitchen is being shared.",
    )
    invitee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="kitchen_invites_received",
        help_text="The user who gains read access to the owner's drafts.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("owner", "invitee")]

    def __str__(self):
        return f"{self.owner.username} → {self.invitee.username}"
```

**Step 4: Create and run migration**

Run:
```bash
cd backend && python manage.py makemigrations recipes --name add_test_kitchen_invite
cd backend && python manage.py migrate
```

**Step 5: Add to admin**

In `backend/spoonfury/apps/recipes/admin.py`:

```python
from .models import Recipe, TestKitchenInvite

@admin.register(TestKitchenInvite)
class TestKitchenInviteAdmin(admin.ModelAdmin):
    """Admin view for test kitchen sharing invitations."""
    list_display = ["owner", "invitee", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["owner__username", "invitee__username"]
```

**Step 6: Run tests**

Run: `cd backend && python -m pytest spoonfury/apps/recipes/tests/test_kitchen.py -v`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add backend/spoonfury/apps/recipes/
git commit -m "feat(recipes): add TestKitchenInvite model for kitchen sharing

Owners can grant other users read access to all their draft
recipes via a unique (owner, invitee) pair."
```

---

### Task 5: Kitchen API endpoints (view, invite, revoke)

**Files:**
- Create: `backend/spoonfury/apps/recipes/views_kitchen.py`
- Create: `backend/spoonfury/apps/recipes/serializers_kitchen.py`
- Modify: `backend/spoonfury/apps/recipes/urls.py`
- Modify: `backend/config/urls.py`
- Add tests to: `backend/spoonfury/apps/recipes/tests/test_kitchen.py`

**Step 1: Write failing tests**

Add to `backend/spoonfury/apps/recipes/tests/test_kitchen.py`:

```python
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe, TestKitchenInvite


SAMPLE_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
]


@pytest.fixture
def draft_recipe(user):
    """A draft recipe in the user's test kitchen."""
    return Recipe.objects.create(
        title="Secret Sauce",
        description="My work in progress.",
        serves="4",
        ingredients=SAMPLE_INGREDIENTS,
        instructions="Still figuring it out...",
        category="other",
        author=user,
    )


@pytest.fixture
def other_auth_client(other_user):
    """Authenticated client for the other_user."""
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=other_user)
    return client


# --- View kitchen ---

@pytest.mark.django_db
def test_owner_sees_own_kitchen(auth_client, user, draft_recipe):
    """Owner can view their own test kitchen."""
    url = reverse("kitchen-detail", kwargs={"username": user.username})
    response = auth_client.get(url)
    assert response.status_code == 200
    assert len(response.data["recipes"]) == 1
    assert response.data["recipes"][0]["title"] == "Secret Sauce"


@pytest.mark.django_db
def test_invitee_sees_kitchen(auth_client, user, other_user, other_auth_client, draft_recipe):
    """An invited user can view the owner's test kitchen."""
    TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    url = reverse("kitchen-detail", kwargs={"username": user.username})
    response = other_auth_client.get(url)
    assert response.status_code == 200
    assert len(response.data["recipes"]) == 1


@pytest.mark.django_db
def test_stranger_cannot_see_kitchen(other_auth_client, user, draft_recipe):
    """A non-invited user gets 403 when viewing someone's kitchen."""
    url = reverse("kitchen-detail", kwargs={"username": user.username})
    response = other_auth_client.get(url)
    assert response.status_code == 403


@pytest.mark.django_db
def test_unauthenticated_cannot_see_kitchen(api_client, user, draft_recipe):
    """Unauthenticated users get 401."""
    url = reverse("kitchen-detail", kwargs={"username": user.username})
    response = api_client.get(url)
    assert response.status_code == 401


# --- Invite ---

@pytest.mark.django_db
def test_invite_user_to_kitchen(auth_client, user, other_user):
    """Owner can invite another user to their kitchen."""
    url = reverse("kitchen-invite", kwargs={"username": user.username})
    response = auth_client.post(url, {"invitee_username": other_user.username}, format="json")
    assert response.status_code == 201
    assert TestKitchenInvite.objects.filter(owner=user, invitee=other_user).exists()


@pytest.mark.django_db
def test_cannot_invite_to_others_kitchen(other_auth_client, user, other_user):
    """You can only invite to your own kitchen."""
    url = reverse("kitchen-invite", kwargs={"username": user.username})
    response = other_auth_client.post(url, {"invitee_username": "someone"}, format="json")
    assert response.status_code == 403


# --- Revoke ---

@pytest.mark.django_db
def test_revoke_kitchen_access(auth_client, user, other_user):
    """Owner can revoke an invitee's access."""
    TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    url = reverse("kitchen-revoke", kwargs={"username": user.username, "invitee_username": other_user.username})
    response = auth_client.delete(url)
    assert response.status_code == 204
    assert not TestKitchenInvite.objects.filter(owner=user, invitee=other_user).exists()
```

**Step 2: Run tests to verify they fail**

Run: `cd backend && python -m pytest spoonfury/apps/recipes/tests/test_kitchen.py -v`
Expected: FAIL — URLs don't exist

**Step 3: Implement the views**

Create `backend/spoonfury/apps/recipes/views_kitchen.py`:

```python
"""
API views for the Test Kitchen feature.

Provides endpoints for:
  - Viewing a user's test kitchen (draft recipes)
  - Inviting a user to view your test kitchen
  - Revoking a user's test kitchen access
"""
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Recipe, TestKitchenInvite
from .serializers import RecipeSerializer

User = get_user_model()


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def kitchen_detail(request, username):
    """
    View a user's test kitchen (their draft recipes).

    Access rules:
      - The owner can always see their own kitchen
      - Users with a TestKitchenInvite from the owner can see it
      - Everyone else gets 403
    """
    owner = get_object_or_404(User, username=username)

    is_owner = request.user == owner
    is_invitee = TestKitchenInvite.objects.filter(
        owner=owner, invitee=request.user
    ).exists()

    if not is_owner and not is_invitee:
        raise PermissionDenied("You don't have access to this test kitchen.")

    drafts = Recipe.objects.filter(
        author=owner, status="draft"
    ).select_related("author").order_by("-updated_at")

    serializer = RecipeSerializer(drafts, many=True, context={"request": request})
    return Response({
        "owner": owner.username,
        "count": drafts.count(),
        "recipes": serializer.data,
    })


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def kitchen_invite(request, username):
    """
    Invite a user to view your test kitchen.

    Request body: { "invitee_username": "..." }
    Only the kitchen owner can send invites.
    """
    owner = get_object_or_404(User, username=username)

    if request.user != owner:
        raise PermissionDenied("You can only invite to your own test kitchen.")

    invitee_username = request.data.get("invitee_username")
    if not invitee_username:
        return Response(
            {"detail": "invitee_username is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    invitee = get_object_or_404(User, username=invitee_username)

    if invitee == owner:
        return Response(
            {"detail": "You can't invite yourself."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    invite, created = TestKitchenInvite.objects.get_or_create(
        owner=owner, invitee=invitee
    )

    if not created:
        return Response(
            {"detail": "User already invited."},
            status=status.HTTP_200_OK,
        )

    return Response(
        {"detail": f"Invited {invitee.username} to your test kitchen."},
        status=status.HTTP_201_CREATED,
    )


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def kitchen_revoke(request, username, invitee_username):
    """
    Revoke a user's access to your test kitchen.

    Only the kitchen owner can revoke invites.
    """
    owner = get_object_or_404(User, username=username)

    if request.user != owner:
        raise PermissionDenied("You can only manage your own test kitchen.")

    invitee = get_object_or_404(User, username=invitee_username)
    invite = get_object_or_404(TestKitchenInvite, owner=owner, invitee=invitee)
    invite.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)
```

**Step 4: Wire up URLs**

Add to `backend/spoonfury/apps/recipes/urls.py`:

```python
from .views_kitchen import kitchen_detail, kitchen_invite, kitchen_revoke

# Add to urlpatterns:
urlpatterns = router.urls + [
    path("recipes/<slug:slug>/fork/", fork_recipe, name="recipe-fork"),
    path("users/<str:username>/kitchen/", kitchen_detail, name="kitchen-detail"),
    path("users/<str:username>/kitchen/invite/", kitchen_invite, name="kitchen-invite"),
    path("users/<str:username>/kitchen/invite/<str:invitee_username>/", kitchen_revoke, name="kitchen-revoke"),
]
```

**Step 5: Run tests**

Run: `cd backend && python -m pytest spoonfury/apps/recipes/tests/test_kitchen.py -v`
Expected: ALL PASS

**Step 6: Run full test suite**

Run: `cd backend && python -m pytest -v`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add backend/spoonfury/apps/recipes/
git commit -m "feat(recipes): add kitchen API endpoints (view, invite, revoke)

Kitchen access is granted via TestKitchenInvite. Owners and
invitees can view drafts; strangers get 403."
```

---

### Task 6: Update fork to default to draft

**Files:**
- Modify: `backend/spoonfury/apps/recipes/views_fork.py`
- Modify: `backend/spoonfury/apps/recipes/tests/test_fork.py`

**Step 1: Write failing test**

Add to `backend/spoonfury/apps/recipes/tests/test_fork.py` (or create if empty):

```python
import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe


SAMPLE_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
]


@pytest.fixture
def published_recipe(user):
    """A published recipe that can be forked."""
    return Recipe.objects.create(
        title="Public Pasta",
        description="A great pasta dish.",
        serves="4",
        ingredients=SAMPLE_INGREDIENTS,
        instructions="Cook the pasta al dente.",
        category="pasta",
        author=user,
        status="published",
    )


@pytest.mark.django_db
def test_fork_creates_draft(other_auth_client, published_recipe):
    """Forking a recipe should create a draft (test kitchen) copy."""
    url = reverse("recipe-fork", kwargs={"slug": published_recipe.slug})
    response = other_auth_client.post(url, {}, format="json")
    assert response.status_code == 201
    assert response.data["status"] == "draft"
    assert response.data["published_at"] is None
```

Where `other_auth_client` fixture needs to be available — if it's not in conftest, add it. Check existing test_fork.py first.

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest spoonfury/apps/recipes/tests/test_fork.py -v -k test_fork_creates_draft`
Expected: FAIL (or PASS if model default already handles it — verify `status` appears in response)

**Step 3: Update fork view**

The model default (`status="draft"`) already handles the fork landing in draft. The key change is ensuring the fork view's docstring is clear and the serializer response includes `status`. Since we already added `status` to the serializer in Task 2, this may already work.

Add a docstring to `fork_recipe` in `backend/spoonfury/apps/recipes/views_fork.py`:

```python
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def fork_recipe(request, slug):
    """
    Fork (copy) a recipe into the current user's test kitchen.

    The forked recipe:
      - Defaults to 'draft' status (private, in the forker's test kitchen)
      - Preserves the parent_recipe reference for fork lineage
      - Allows up to 3 ingredient name changes from the original

    Request body (all optional, defaults to parent's values):
      - title: str
      - description: str
      - serves: str
      - ingredients: list[Ingredient]
      - instructions: str
      - notes: str
    """
    # ... existing implementation unchanged ...
```

**Step 4: Run tests**

Run: `cd backend && python -m pytest spoonfury/apps/recipes/tests/test_fork.py -v`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add backend/spoonfury/apps/recipes/
git commit -m "feat(recipes): verify forks land in test kitchen as drafts

Forks use the model default status='draft'. Added test to
confirm and docstring to fork_recipe view."
```

---

### Task 7: Update queryset to support test kitchen invitees

**Files:**
- Modify: `backend/spoonfury/apps/recipes/views.py`
- Add test to: `backend/spoonfury/apps/recipes/tests/test_kitchen.py`

**Step 1: Write failing test**

Add to `backend/spoonfury/apps/recipes/tests/test_kitchen.py`:

```python
@pytest.mark.django_db
def test_invitee_can_view_draft_recipe_detail(auth_client, user, other_user, other_auth_client, draft_recipe):
    """An invited user can view a draft recipe's detail page."""
    TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    url = reverse("recipe-detail", kwargs={"slug": draft_recipe.slug})
    response = other_auth_client.get(url)
    assert response.status_code == 200
    assert response.data["title"] == "Secret Sauce"
```

**Step 2: Run test to verify it fails**

Run: `cd backend && python -m pytest spoonfury/apps/recipes/tests/test_kitchen.py::test_invitee_can_view_draft_recipe_detail -v`
Expected: FAIL — invitee gets 404 because queryset only shows own drafts + published

**Step 3: Update queryset filtering**

In `backend/spoonfury/apps/recipes/views.py`, update `get_queryset`:

```python
    def get_queryset(self):
        """
        Return recipes filtered by the viewer's access level.

        Visibility rules:
          - Owner: sees all their own recipes (draft + published)
          - Test kitchen invitee: sees the inviter's drafts
          - Everyone else: published only
        """
        base = Recipe.objects.select_related("author", "parent_recipe__author")
        user = self.request.user

        if user.is_authenticated:
            # Users whose kitchens this user has been invited to
            invited_owner_ids = TestKitchenInvite.objects.filter(
                invitee=user
            ).values_list("owner_id", flat=True)

            return base.filter(
                Q(status="published")
                | Q(author=user)  # own drafts
                | Q(author_id__in=invited_owner_ids, status="draft")  # invited kitchens
            ).distinct()

        return base.filter(status="published")
```

Add the import at the top of the file:

```python
from .models import Recipe, TestKitchenInvite
```

**Step 4: Run tests**

Run: `cd backend && python -m pytest spoonfury/apps/recipes/tests/ -v`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add backend/spoonfury/apps/recipes/views.py backend/spoonfury/apps/recipes/tests/test_kitchen.py
git commit -m "feat(recipes): allow kitchen invitees to view draft recipe detail

Queryset now includes drafts from users who have invited the
current user to their test kitchen."
```

---

### Task 8: Frontend types and API helpers

**Files:**
- Modify: `frontend/src/types.ts`
- Modify: `frontend/src/lib/api.ts`

**Step 1: Update shared types**

Add to `frontend/src/types.ts`:

```typescript
/** Possible recipe statuses in the privacy/publish flow. */
export type RecipeStatus = "draft" | "published";

/** Full recipe object returned by the API. */
export interface Recipe {
  id: number;
  slug: string;
  title: string;
  description: string;
  serves: string;
  ingredients: Ingredient[];
  instructions: string;
  notes: string;
  category: string;
  author_username: string;
  author_display_name: string;
  parent_recipe_slug: string | null;
  parent_recipe_title: string | null;
  parent_recipe_author: string | null;
  fork_count: number;
  created_at: string;
  status: RecipeStatus;
  published_at: string | null;
}

/** Checklist gate criteria for publishing a recipe. */
export interface PublishGate {
  hasEnoughIngredients: boolean;
  hasInstructions: boolean;
  hasDescription: boolean;
  hasCategory: boolean;
}

/** Response from the kitchen endpoint. */
export interface KitchenResponse {
  owner: string;
  count: number;
  recipes: Recipe[];
}
```

**Step 2: No test needed for types (TypeScript compiler is the test)**

**Step 3: Commit**

```bash
git add frontend/src/types.ts
git commit -m "feat(frontend): add Recipe, PublishGate, and KitchenResponse types

Replaces ad-hoc 'any' typing with proper interfaces for the
test kitchen feature."
```

---

### Task 9: My Kitchen page

**Files:**
- Create: `frontend/src/pages/MyKitchenPage.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/NavBar.tsx`

**Step 1: Create the My Kitchen page**

Create `frontend/src/pages/MyKitchenPage.tsx`:

```tsx
/**
 * MyKitchenPage — The user's personal recipe dashboard.
 *
 * Two sections:
 *   1. Test Kitchen 🧪 — draft recipes with publish readiness indicators
 *   2. Published ✅ — recipes visible to the public
 *
 * Also includes test kitchen sharing controls.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Recipe, PublishGate } from "@/types";

/** Check which publish gate criteria a recipe meets. */
function getPublishGate(recipe: Recipe): PublishGate {
  const validIngredients = recipe.ingredients.filter(i => i.name.trim() !== "");
  return {
    hasEnoughIngredients: validIngredients.length >= 2,
    hasInstructions: recipe.instructions.trim().length >= 20,
    hasDescription: recipe.description.trim().length > 0,
    hasCategory: recipe.category.trim().length > 0,
  };
}

/** Whether all gate criteria are met. */
function isPublishReady(gate: PublishGate): boolean {
  return Object.values(gate).every(Boolean);
}

/** Visual checklist indicator for a single recipe's publish readiness. */
function GateChecklist({ gate }: { gate: PublishGate }) {
  const items = [
    { label: "2+ ingredients", met: gate.hasEnoughIngredients },
    { label: "Instructions (20+ chars)", met: gate.hasInstructions },
    { label: "Description", met: gate.hasDescription },
    { label: "Category", met: gate.hasCategory },
  ];

  const metCount = items.filter(i => i.met).length;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map(item => (
        <span
          key={item.label}
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            item.met
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-400"
          }`}
        >
          {item.met ? "✓" : "○"} {item.label}
        </span>
      ))}
      <span className="text-[10px] font-bold text-muted-foreground ml-auto">
        {metCount}/4
      </span>
    </div>
  );
}

/** Card for a single recipe in the kitchen or published section. */
function RecipeCard({ recipe, showGate }: { recipe: Recipe; showGate?: boolean }) {
  const gate = getPublishGate(recipe);

  return (
    <Link
      to={`/recipes/${recipe.slug}`}
      className="block border rounded-lg p-4 hover:bg-accent transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h3 className="font-semibold">{recipe.title}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {recipe.description || "No description yet…"}
          </p>
          {recipe.published_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Published {new Date(recipe.published_at).toLocaleDateString()}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge variant="secondary">{recipe.category}</Badge>
          {recipe.fork_count > 0 && (
            <span className="text-xs text-muted-foreground">🍴 {recipe.fork_count}</span>
          )}
        </div>
      </div>
      {showGate && <GateChecklist gate={gate} />}
    </Link>
  );
}

export function MyKitchenPage() {
  const { token, username } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");

  useEffect(() => {
    if (!token) return;
    api.get("/recipes/", token)
      .then((data: { results?: Recipe[] }) => setRecipes(data.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) {
    return (
      <p className="text-muted-foreground">
        Please <Link to="/login" className="underline">sign in</Link> to view your kitchen.
      </p>
    );
  }

  const myRecipes = recipes.filter(r => r.author_username === username);
  const drafts = myRecipes.filter(r => r.status === "draft");
  const published = myRecipes.filter(r => r.status === "published");

  const handleInvite = async () => {
    if (!inviteUsername.trim() || !username) return;
    try {
      await api.post(
        `/users/${username}/kitchen/invite/`,
        { invitee_username: inviteUsername.trim() },
        token
      );
      setInviteMsg(`Invited @${inviteUsername.trim()}!`);
      setInviteUsername("");
      setTimeout(() => setInviteMsg(""), 3000);
    } catch {
      setInviteMsg("Failed to invite. Check the username.");
      setTimeout(() => setInviteMsg(""), 3000);
    }
  };

  if (loading) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">My Kitchen</h1>

      {/* Test Kitchen Section */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold">🧪 Test Kitchen</h2>
          <Badge variant="outline">{drafts.length} draft{drafts.length !== 1 ? "s" : ""}</Badge>
        </div>

        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No recipes in the test kitchen.{" "}
            <Link to="/recipes/new" className="underline">Create one</Link> to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {drafts.map(r => (
              <RecipeCard key={r.slug} recipe={r} showGate />
            ))}
          </div>
        )}

        {/* Kitchen sharing */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            Share your test kitchen with a friend
          </p>
          <div className="flex gap-2">
            <input
              className="border rounded px-3 py-1.5 text-sm flex-1"
              placeholder="Username"
              value={inviteUsername}
              onChange={e => setInviteUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleInvite()}
            />
            <Button size="sm" onClick={handleInvite} disabled={!inviteUsername.trim()}>
              Invite
            </Button>
          </div>
          {inviteMsg && (
            <p className="text-xs font-medium text-indigo-600 mt-1.5 animate-in fade-in">
              {inviteMsg}
            </p>
          )}
        </div>
      </section>

      <Separator />

      {/* Published Section */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-semibold">✅ Published</h2>
          <Badge variant="outline">{published.length} recipe{published.length !== 1 ? "s" : ""}</Badge>
        </div>

        {published.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No published recipes yet. Perfect a recipe in your test kitchen to publish it!
          </p>
        ) : (
          <div className="space-y-3">
            {published.map(r => (
              <RecipeCard key={r.slug} recipe={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
```

**Step 2: Add route to App.tsx**

In `frontend/src/App.tsx`, add the import and route:

```tsx
import { MyKitchenPage } from "@/pages/MyKitchenPage";

// Add inside <Routes>:
<Route path="/kitchen" element={<MyKitchenPage />} />
```

**Step 3: Add "My Kitchen" to NavBar**

In `frontend/src/components/NavBar.tsx`, add to the `STICKERS` array (after "Stir the Pot"):

```typescript
{ label: "My Kitchen", to: "/kitchen", color: "bg-[#FFB347]", authRequired: true },
```

**Step 4: Manual test**

Run both frontend and backend dev servers. Sign in. Verify:
- "My Kitchen" nav link appears when authenticated
- Page loads with two sections (Test Kitchen / Published)
- Creating a new recipe lands it in Test Kitchen section
- Gate checklist shows correctly

**Step 5: Commit**

```bash
git add frontend/src/pages/MyKitchenPage.tsx frontend/src/App.tsx frontend/src/components/NavBar.tsx
git commit -m "feat(frontend): add My Kitchen page with test kitchen and published sections

Shows draft recipes with publish gate checklist and published
recipes with date. Includes kitchen sharing invite UI."
```

---

### Task 10: "Perfect It" publish flow with confetti

**Files:**
- Install: `canvas-confetti` package
- Create: `frontend/src/components/PublishModal.tsx`
- Modify: `frontend/src/pages/RecipePage.tsx`

**Step 1: Install canvas-confetti**

Run: `cd frontend && npm install canvas-confetti && npm install -D @types/canvas-confetti`

**Step 2: Create PublishModal component**

Create `frontend/src/components/PublishModal.tsx`:

```tsx
/**
 * PublishModal — Confirmation modal for the "Perfect It" publish flow.
 *
 * Shows a full recipe preview (exactly what the public will see),
 * then fires confetti on confirmation. The recipe is published via
 * POST /recipes/{slug}/publish/.
 */
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import confetti from "canvas-confetti";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Recipe } from "@/types";

interface PublishModalProps {
  recipe: Recipe;
  token: string;
  onClose: () => void;
  onPublished: (updated: Recipe) => void;
}

/** Fire a celebratory confetti burst from the center of the screen. */
function fireConfetti() {
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#FF6B6B", "#4ECDC4", "#FFE66D", "#A29BFE", "#FF8E53"],
  });
}

export function PublishModal({ recipe, token, onClose, onPublished }: PublishModalProps) {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const handlePublish = async () => {
    setPublishing(true);
    setError("");
    try {
      const updated = await api.post(`/recipes/${recipe.slug}/publish/`, {}, token);
      fireConfetti();
      // Small delay so the user sees the confetti before the modal closes
      setTimeout(() => onPublished(updated), 800);
    } catch (err: unknown) {
      const e = err as { data?: { errors?: string[] } };
      setError(e.data?.errors?.join(" ") || "Failed to publish. Try again.");
      setPublishing(false);
    }
  };

  const validIngredients = recipe.ingredients.filter(i => i.name.trim() !== "");

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl bg-white animate-in zoom-in-95 duration-200 border-none">
        <CardHeader className="pb-2">
          <p className="text-sm font-medium text-amber-600 mb-1">
            🎉 Ready to share this with the world?
          </p>
          <CardTitle className="text-black text-xl">Recipe Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preview: mirrors RecipePage layout */}
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-2xl font-bold leading-tight">{recipe.title}</h2>
              <Badge variant="secondary" className="shrink-0 mt-1">{recipe.category}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">by @{recipe.author_username}</p>
          </div>

          <p className="text-base leading-relaxed">{recipe.description}</p>
          <p className="text-sm text-muted-foreground">Serves: {recipe.serves}</p>

          <Separator />

          <div>
            <h3 className="font-semibold text-sm mb-2">Ingredients ({validIngredients.length})</h3>
            <ul className="space-y-1">
              {validIngredients.map((ing, i) => (
                <li key={i} className="text-sm">
                  {ing.quantity} {ing.unit} {ing.name}
                  {ing.note && <span className="text-muted-foreground"> — {ing.note}</span>}
                </li>
              ))}
            </ul>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold text-sm mb-2">Instructions</h3>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{recipe.instructions}</ReactMarkdown>
            </div>
          </div>

          {recipe.notes && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-sm mb-2">Notes</h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{recipe.notes}</ReactMarkdown>
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}

          <Separator />

          <div className="flex gap-3 pt-2">
            <Button
              onClick={handlePublish}
              disabled={publishing}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
            >
              {publishing ? "Publishing…" : "🎉 Perfect It — Publish!"}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={publishing}
              className="text-black border-slate-200 hover:bg-slate-50"
            >
              Not yet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Add publish/unpublish controls to RecipePage**

In `frontend/src/pages/RecipePage.tsx`, add these changes:

1. Import the `PublishModal` and types:
```tsx
import { PublishModal } from "@/components/PublishModal";
import type { Recipe as RecipeType, PublishGate } from "@/types";
```

2. Add state for the publish modal:
```tsx
const [publishModalOpen, setPublishModalOpen] = useState(false);
```

3. Add a publish gate helper (inside the component or as a module-level function):
```tsx
function getPublishGate(recipe: RecipeType): PublishGate {
  const validIngredients = recipe.ingredients.filter((i: any) => i.name.trim() !== "");
  return {
    hasEnoughIngredients: validIngredients.length >= 2,
    hasInstructions: recipe.instructions.trim().length >= 20,
    hasDescription: recipe.description.trim().length > 0,
    hasCategory: recipe.category.trim().length > 0,
  };
}
```

4. In the **owner action bar**, add a "Perfect It" button (when draft) or "Unpublish" (when published):

```tsx
{/* Show draft status badge and publish/unpublish controls */}
{recipe.status === "draft" && (
  <>
    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
      🧪 Test Kitchen
    </Badge>
    <Button
      variant="outline"
      size="sm"
      onClick={() => setPublishModalOpen(true)}
      disabled={!Object.values(getPublishGate(recipe)).every(Boolean)}
      className="bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 gap-1.5"
    >
      🎉 Perfect It
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

5. Add the PublishModal rendering (alongside ForkModal/ShareModal):

```tsx
{publishModalOpen && recipe && (
  <PublishModal
    recipe={recipe}
    token={token!}
    onClose={() => setPublishModalOpen(false)}
    onPublished={(updated) => {
      setRecipe(updated);
      setPublishModalOpen(false);
    }}
  />
)}
```

**Step 4: Manual test**

- Create a recipe → appears as draft with 🧪 badge
- Fill out enough to pass the gate → "Perfect It" button activates
- Click "Perfect It" → preview modal opens
- Click "Publish" → confetti fires, recipe updates to published
- "Unpublish" button appears for published recipes

**Step 5: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): add Perfect It publish flow with confetti

PublishModal shows a full recipe preview. Confetti fires on
publish. Draft recipes show a 🧪 Test Kitchen badge with
gate-gated Perfect It button. Published recipes can be unpublished."
```

---

### Task 11: Update CreateRecipePage and ForkModal copy

**Files:**
- Modify: `frontend/src/pages/CreateRecipePage.tsx`
- Modify: `frontend/src/components/ForkModal.tsx`

**Step 1: Update CreateRecipePage**

Change the submit button text from "Publish Recipe" to "Save to Test Kitchen":

```tsx
<Button type="submit" className="w-full">Save to Test Kitchen 🧪</Button>
```

After successful creation, navigate to the kitchen page instead:

```tsx
navigate("/kitchen");
```

**Step 2: Update ForkModal copy**

Change the description text in `ForkModal`:

```tsx
<p className="text-sm text-muted-foreground">
  This will go to your test kitchen — you can perfect and publish it later.
</p>
```

After fork success, navigate to kitchen:

```tsx
onSuccess={(bookId: number) => navigate("/kitchen")}
```

Wait — actually the fork flow also adds to a book. Keep the book selection but update the description. The navigation after forking should go to the kitchen, not the book. Update the `onSuccess` callback in `RecipePage.tsx` where `ForkModal` is rendered:

```tsx
onSuccess={() => navigate("/kitchen")}
```

**Step 3: Manual test**

- Create recipe → button says "Save to Test Kitchen 🧪"
- After creation → redirects to /kitchen
- Fork modal → description mentions test kitchen
- After fork → redirects to /kitchen

**Step 4: Commit**

```bash
git add frontend/src/pages/CreateRecipePage.tsx frontend/src/components/ForkModal.tsx frontend/src/pages/RecipePage.tsx
git commit -m "feat(frontend): update create/fork flows for test kitchen

New recipes save to test kitchen. Fork modal copy explains the
recipe will land in the test kitchen for perfecting."
```

---

### Task 12: Update HomePage to show only published recipes

**Files:**
- Modify: `frontend/src/pages/HomePage.tsx`

**Step 1: Verify behavior**

The backend queryset already filters to published-only for non-owners. The HomePage currently calls `api.get("/recipes/")` without a token, so it already only gets published recipes. However, if a logged-in user visits home, the API would include their own drafts.

Fix: Either always call without token (so homepage is purely public), or filter client-side.

The simplest approach: call without token so the homepage is always the public view.

**Step 2: Update HomePage**

Ensure the homepage call doesn't pass the auth token:

```tsx
useEffect(() => {
  api.get("/recipes/")  // No token — always shows public view
    .then(data => setRecipes(data.results || []))
    .catch(() => setError("Failed to load recipes. Try refreshing."));
}, []);
```

This is already the case in the current code — no change needed.

However, add a JSDoc comment and update the heading:

```tsx
/**
 * HomePage — The public "Stir the Pot" feed.
 *
 * Shows only published recipes. Does NOT send an auth token,
 * ensuring the view is always the public experience.
 */
export function HomePage() {
```

Update the heading text and add a subtitle:

```tsx
<h1 className="text-2xl font-bold mb-1">Stir the Pot</h1>
<p className="text-sm text-muted-foreground mb-6">Perfected recipes from the community</p>
```

**Step 3: Commit**

```bash
git add frontend/src/pages/HomePage.tsx
git commit -m "feat(frontend): update homepage to clarify it shows published recipes only

Added JSDoc, subtitle clarifying 'perfected recipes from the
community'. Feed already excludes drafts via unauthenticated API call."
```

---

### Task 13: Data migration — publish all existing recipes

**Files:**
- Create: a data migration in `backend/spoonfury/apps/recipes/migrations/`

**Step 1: Create the data migration**

Run: `cd backend && python manage.py makemigrations recipes --empty --name publish_existing_recipes`

**Step 2: Write the migration**

Edit the generated migration file:

```python
"""
Data migration: publish all existing recipes.

Before the test kitchen feature, all recipes were implicitly public.
This migration sets them to 'published' with published_at = created_at
to preserve their public visibility.
"""
from django.db import migrations
from django.utils import timezone


def publish_existing(apps, schema_editor):
    Recipe = apps.get_model("recipes", "Recipe")
    for recipe in Recipe.objects.all():
        recipe.status = "published"
        recipe.published_at = recipe.created_at
        recipe.save(update_fields=["status", "published_at"])


def unpublish_all(apps, schema_editor):
    Recipe = apps.get_model("recipes", "Recipe")
    Recipe.objects.all().update(status="draft", published_at=None)


class Migration(migrations.Migration):
    dependencies = [
        ("recipes", "PREVIOUS_MIGRATION_NAME"),  # replace with actual name
    ]

    operations = [
        migrations.RunPython(publish_existing, unpublish_all),
    ]
```

**Step 3: Run migration**

Run: `cd backend && python manage.py migrate`

**Step 4: Verify**

Run: `cd backend && python manage.py shell -c "from spoonfury.apps.recipes.models import Recipe; print(Recipe.objects.filter(status='draft').count(), 'draft,', Recipe.objects.filter(status='published').count(), 'published')"`
Expected: `0 draft, N published` (where N = total recipes)

**Step 5: Commit**

```bash
git add backend/spoonfury/apps/recipes/migrations/
git commit -m "data(recipes): publish all existing recipes

Existing recipes predated the test kitchen feature and were
implicitly public. This migration sets them to 'published'
with published_at = created_at."
```

---

### Task 14: Final integration test and cleanup

**Files:**
- Run: full test suite
- Verify: manual end-to-end flow

**Step 1: Run full backend test suite**

Run: `cd backend && python -m pytest -v`
Expected: ALL PASS

**Step 2: Manual end-to-end test**

1. Start both frontend and backend dev servers
2. Sign in as an existing user → existing recipes show as published
3. Create a new recipe → lands in test kitchen as draft
4. Visit homepage → new draft NOT visible
5. Go to My Kitchen → draft visible with gate checklist
6. Fill out recipe fully → "Perfect It" button activates
7. Click "Perfect It" → preview modal → confirm → confetti → published
8. Visit homepage → recipe now visible
9. Fork someone's recipe → lands in your test kitchen
10. Invite a friend to your kitchen → they can see your drafts
11. Revoke → they can't see them anymore

**Step 3: TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors (or only pre-existing ones)

**Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final cleanup for test kitchen feature"
```

---

## Summary of all tasks

| # | Task | Type |
|---|------|------|
| 1 | Add `status` and `published_at` to Recipe model | Backend model |
| 2 | Update serializer and queryset filtering | Backend API |
| 3 | Publish/unpublish endpoints with checklist gate | Backend API |
| 4 | TestKitchenInvite model | Backend model |
| 5 | Kitchen API endpoints (view, invite, revoke) | Backend API |
| 6 | Verify forks default to draft | Backend API |
| 7 | Update queryset for kitchen invitees | Backend API |
| 8 | Frontend types and API helpers | Frontend |
| 9 | My Kitchen page | Frontend |
| 10 | "Perfect It" publish flow with confetti | Frontend |
| 11 | Update create/fork flows | Frontend |
| 12 | Update homepage for published-only | Frontend |
| 13 | Data migration for existing recipes | Backend migration |
| 14 | Final integration test and cleanup | Testing |
