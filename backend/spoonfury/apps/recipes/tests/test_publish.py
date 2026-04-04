"""Tests for the publish/unpublish endpoints and checklist gate."""
import pytest
from django.urls import reverse
from django.utils import timezone
from spoonfury.apps.recipes.models import Recipe, ModerationAction


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
    # Make it published so the non-owner can see it (drafts are hidden to non-owners)
    publishable_recipe.status = "published"
    publishable_recipe.save()
    url = reverse("recipe-publish", kwargs={"slug": publishable_recipe.slug})
    response = other_auth_client.post(url)
    assert response.status_code == 403


@pytest.mark.django_db
def test_unpublish_recipe(auth_client, publishable_recipe):
    """Owner can unpublish a published recipe, reverting to draft."""
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


@pytest.mark.django_db
def test_force_publish_superuser(publishable_recipe):
    """Superuser can force-publish from any state; gate still enforced."""
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
    """Non-superusers cannot force-publish (even staff)."""
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
