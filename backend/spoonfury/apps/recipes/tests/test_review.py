"""Tests for the review pipeline: submit, withdraw."""
import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe, TestKitchenInvite

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
        title="Bad Recipe", description="", serves="4",
        ingredients=[], instructions="Short", category="soup", author=user,
    )
    url = reverse("recipe-submit-review", kwargs={"slug": recipe.slug})
    response = auth_client.post(url)
    assert response.status_code == 400
    assert "errors" in response.data


@pytest.mark.django_db
def test_submit_for_review_not_owner(other_auth_client, reviewable_recipe):
    """Non-owners cannot submit someone else's recipe."""
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
