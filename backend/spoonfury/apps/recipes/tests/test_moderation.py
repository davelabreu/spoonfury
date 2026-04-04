"""Tests for the moderation queue, approve, and request-revision endpoints."""
import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe, ModerationAction, AuthorStrike
from spoonfury.apps.notifications.models import Notification

VALID_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
    {"quantity": "1", "unit": "cup", "name": "flour", "note": ""},
]


@pytest.fixture
def mod_queue_recipe(user):
    return Recipe.objects.create(
        title="Moderation Soup", description="A soup awaiting moderation.", serves="4",
        ingredients=VALID_INGREDIENTS,
        instructions="Step 1: boil water. Step 2: add all ingredients and simmer for 20 minutes.",
        category="soup", author=user, status="mod_queue", review_round=1,
    )


@pytest.mark.django_db
def test_mod_queue_staff_only(auth_client, mod_queue_recipe):
    url = reverse("moderation-queue")
    response = auth_client.get(url)
    assert response.status_code == 403


@pytest.mark.django_db
def test_mod_queue_lists_recipes(staff_client, mod_queue_recipe):
    url = reverse("moderation-queue")
    response = staff_client.get(url)
    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["slug"] == mod_queue_recipe.slug


@pytest.mark.django_db
def test_mod_queue_includes_vote_summary(staff_client, user, other_user, mod_queue_recipe):
    from spoonfury.apps.recipes.models import RecipeReview, TestKitchenInvite
    TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    RecipeReview.objects.create(
        recipe=mod_queue_recipe, reviewer=other_user, review_round=1, is_positive=True,
    )
    url = reverse("moderation-queue")
    response = staff_client.get(url)
    assert response.data[0]["positive_votes"] == 1
    assert response.data[0]["total_votes"] == 1


@pytest.mark.django_db
def test_mod_queue_includes_strike_count(staff_client, mod_queue_recipe):
    url = reverse("moderation-queue")
    response = staff_client.get(url)
    assert response.data[0]["author_strike_count"] == 0


@pytest.mark.django_db
def test_approve_recipe(staff_client, user, mod_queue_recipe):
    url = reverse("moderation-approve", kwargs={"slug": mod_queue_recipe.slug})
    response = staff_client.post(url)
    assert response.status_code == 200
    mod_queue_recipe.refresh_from_db()
    assert mod_queue_recipe.status == "published"
    assert mod_queue_recipe.published_at is not None
    assert ModerationAction.objects.filter(action="approved").count() == 1


@pytest.mark.django_db
def test_approve_notifies_author(staff_client, user, mod_queue_recipe):
    url = reverse("moderation-approve", kwargs={"slug": mod_queue_recipe.slug})
    staff_client.post(url)
    assert Notification.objects.filter(
        recipient=user, notification_type="recipe_approved",
    ).count() == 1


@pytest.mark.django_db
def test_approve_non_staff_forbidden(auth_client, mod_queue_recipe):
    url = reverse("moderation-approve", kwargs={"slug": mod_queue_recipe.slug})
    response = auth_client.post(url)
    assert response.status_code == 403


@pytest.mark.django_db
def test_request_revision(staff_client, user, mod_queue_recipe):
    url = reverse("moderation-request-revision", kwargs={"slug": mod_queue_recipe.slug})
    response = staff_client.post(url, {"feedback": "Needs more detail in instructions."}, format="json")
    assert response.status_code == 200
    mod_queue_recipe.refresh_from_db()
    assert mod_queue_recipe.status == "revision_requested"
    assert ModerationAction.objects.filter(action="revision_requested").count() == 1
    assert AuthorStrike.objects.filter(author=user).count() == 1


@pytest.mark.django_db
def test_request_revision_requires_feedback(staff_client, mod_queue_recipe):
    url = reverse("moderation-request-revision", kwargs={"slug": mod_queue_recipe.slug})
    response = staff_client.post(url, {}, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_request_revision_notifies_author(staff_client, user, mod_queue_recipe):
    url = reverse("moderation-request-revision", kwargs={"slug": mod_queue_recipe.slug})
    staff_client.post(url, {"feedback": "Needs work"}, format="json")
    assert Notification.objects.filter(
        recipient=user, notification_type="revision_requested",
    ).count() == 1
