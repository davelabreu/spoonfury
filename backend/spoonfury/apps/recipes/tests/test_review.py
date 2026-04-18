"""Tests for the review pipeline: submit, withdraw, vote, and list."""
import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe, TestKitchenInvite
from math import ceil
from spoonfury.apps.recipes.models import RecipeReview
from spoonfury.apps.notifications.models import Notification
from django.contrib.auth import get_user_model

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
    assert response.data["status"] == "mod_queue"


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

# ---------------------------------------------------------------------------
# Task 6: Vote endpoint + threshold auto-promotion
# ---------------------------------------------------------------------------

@pytest.fixture
def in_review_recipe(user):
    """A recipe in the in_review state with round 1."""
    return Recipe.objects.create(
        title="Voting Soup", description="A soup ready for votes.", serves="4",
        ingredients=[
            {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
            {"quantity": "1", "unit": "cup", "name": "flour", "note": ""},
        ],
        instructions="Step 1: boil water. Step 2: add all ingredients and simmer for 20 minutes.",
        category="soup", author=user, status="in_review", review_round=1,
    )


@pytest.fixture
def invited_setup(user, other_user, invitee_user, in_review_recipe):
    """Set up kitchen invites for other_user and invitee_user."""
    TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    TestKitchenInvite.objects.create(owner=user, invitee=invitee_user)
    return in_review_recipe


@pytest.mark.django_db
def test_vote_positive(other_auth_client, invited_setup):
    """An invitee can submit a spoon rating vote."""
    url = reverse("recipe-review-vote", kwargs={"slug": invited_setup.slug})
    response = other_auth_client.post(url, {"rating": 5}, format="json")
    assert response.status_code == 201
    assert RecipeReview.objects.count() == 1
    review = RecipeReview.objects.first()
    assert review.rating == 5
    assert review.is_positive is True


@pytest.mark.django_db
def test_vote_not_invitee(auth_client, user, in_review_recipe):
    """The recipe author cannot vote on their own recipe."""
    url = reverse("recipe-review-vote", kwargs={"slug": in_review_recipe.slug})
    response = auth_client.post(url, {"rating": 5}, format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_vote_creates_notification(other_auth_client, user, invited_setup):
    """Voting sends a notification to the recipe author."""
    url = reverse("recipe-review-vote", kwargs={"slug": invited_setup.slug})
    other_auth_client.post(url, {"rating": 4}, format="json")
    assert Notification.objects.filter(
        recipient=user, notification_type="review_received",
    ).count() == 1


@pytest.mark.django_db
def test_vote_duplicate_blocked(other_auth_client, invited_setup):
    """Same reviewer cannot vote twice."""
    url = reverse("recipe-review-vote", kwargs={"slug": invited_setup.slug})
    other_auth_client.post(url, {"rating": 5}, format="json")
    response = other_auth_client.post(url, {"rating": 3}, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_threshold_auto_promotion(other_auth_client, invitee_client, invited_setup, invitee_user, staff_user):
    """Recipe auto-transitions to mod_queue when 5+ reviews with avg >= 4.0."""
    from rest_framework.test import APIClient

    extra_users = []
    for i in range(3):
        u = User.objects.create_user(username=f"voter{i}", email=f"v{i}@t.com", password="testpass123")
        TestKitchenInvite.objects.create(owner=invited_setup.author, invitee=u)
        extra_users.append(u)

    url = reverse("recipe-review-vote", kwargs={"slug": invited_setup.slug})
    other_auth_client.post(url, {"rating": 5}, format="json")
    invitee_client.post(url, {"rating": 4}, format="json")
    for u in extra_users:
        c = APIClient()
        c.force_authenticate(user=u)
        c.post(url, {"rating": 4}, format="json")

    invited_setup.refresh_from_db()
    assert invited_setup.status == "mod_queue"


@pytest.mark.django_db
def test_threshold_not_met_below_5(other_auth_client, invitee_client, invited_setup):
    """Recipe stays in_review with only 2 reviews even with perfect 5.0 avg."""
    url = reverse("recipe-review-vote", kwargs={"slug": invited_setup.slug})
    other_auth_client.post(url, {"rating": 5}, format="json")
    invitee_client.post(url, {"rating": 5}, format="json")

    invited_setup.refresh_from_db()
    assert invited_setup.status == "in_review"


@pytest.mark.django_db
def test_list_reviews_before_voting(other_auth_client, invited_setup):
    """Before voting, invitee sees aggregate only (no individual reviews)."""
    url = reverse("recipe-reviews-list", kwargs={"slug": invited_setup.slug})
    response = other_auth_client.get(url)
    assert response.status_code == 200
    assert "total_votes" in response.data
    assert "reviews" not in response.data


@pytest.mark.django_db
def test_list_reviews_after_voting(other_auth_client, invited_setup):
    """After voting, invitee sees all reviews with comments."""
    vote_url = reverse("recipe-review-vote", kwargs={"slug": invited_setup.slug})
    other_auth_client.post(vote_url, {"rating": 4, "comment": "Nice!"}, format="json")
    list_url = reverse("recipe-reviews-list", kwargs={"slug": invited_setup.slug})
    response = other_auth_client.get(list_url)
    assert response.status_code == 200
    assert "reviews" in response.data


@pytest.mark.django_db
def test_unique_constraint_rejects_duplicate_reviewer(db):
    """After migration 0013, a reviewer can only vote once per recipe, ever."""
    from django.db import IntegrityError
    author = User.objects.create_user(username="vr_author", password="x")
    reviewer = User.objects.create_user(username="vr_reviewer", password="x")
    recipe = Recipe.objects.create(
        title="Vouch Retention Test",
        description="desc",
        serves="2",
        category="pasta_noodles",
        ingredients=VALID_INGREDIENTS,
        instructions="boil water then wait twenty seconds and stir it",
        author=author,
        status="in_review",
        review_round=1,
    )
    RecipeReview.objects.create(recipe=recipe, reviewer=reviewer, review_round=1, is_positive=True)
    with pytest.raises(IntegrityError):
        RecipeReview.objects.create(recipe=recipe, reviewer=reviewer, review_round=2, is_positive=False)


@pytest.mark.django_db
def test_check_threshold_is_cumulative_across_rounds():
    """After the cumulative gate, votes from all rounds count toward the threshold."""
    from spoonfury.apps.recipes.views_review import _check_threshold

    author = User.objects.create_user(username="cum_author", password="x")
    recipe = Recipe.objects.create(
        title="Cumulative R", description="d", serves="2", category="pasta_noodles",
        ingredients=VALID_INGREDIENTS,
        instructions="stir vigorously for a full minute and taste carefully",
        author=author, status="in_review", review_round=2,
    )
    # Five 4+ spoon votes cast in an earlier round (round=1), recipe is now in round=2.
    for i in range(5):
        r = User.objects.create_user(username=f"cum_r{i}", password="x")
        RecipeReview.objects.create(recipe=recipe, reviewer=r, review_round=1, is_positive=True, rating=4)

    assert _check_threshold(recipe) is True
    recipe.refresh_from_db()
    assert recipe.status == "mod_queue"


@pytest.mark.django_db
def test_review_vote_rejects_duplicate_reviewer_any_round():
    """A reviewer who already voted (any round) cannot vote again on the same recipe."""
    from rest_framework.test import APIClient

    author = User.objects.create_user(username="dup_author", password="x")
    reviewer = User.objects.create_user(username="dup_reviewer", password="x")
    recipe = Recipe.objects.create(
        title="Dup R", description="d", serves="2", category="pasta_noodles",
        ingredients=VALID_INGREDIENTS,
        instructions="stir and wait a full twenty seconds before tasting",
        author=author, status="in_review", review_round=2,
    )
    # Prior vote from round 1
    RecipeReview.objects.create(recipe=recipe, reviewer=reviewer, review_round=1, is_positive=True, rating=5)

    c = APIClient()
    c.force_authenticate(reviewer)
    url = reverse("recipe-review-vote", kwargs={"slug": recipe.slug})
    resp = c.post(url, {"rating": 2}, format="json")
    assert resp.status_code == 400
    assert "already voted on this recipe" in resp.data["detail"].lower()


@pytest.mark.django_db
def test_review_list_public_for_published_recipe():
    """Published recipes return the full reviews array to anonymous viewers."""
    from rest_framework.test import APIClient

    author = User.objects.create_user(username="pub_author", password="x")
    voter = User.objects.create_user(username="pub_voter", password="x")
    recipe = Recipe.objects.create(
        title="Pub R", description="d", serves="2", category="pasta_noodles",
        ingredients=VALID_INGREDIENTS,
        instructions="bake for thirty minutes at three fifty degrees",
        author=author, status="published", review_round=1,
    )
    RecipeReview.objects.create(
        recipe=recipe, reviewer=voter, review_round=1, is_positive=True, comment="Loved it"
    )

    c = APIClient()  # anonymous
    url = reverse("recipe-reviews-list", kwargs={"slug": recipe.slug})
    resp = c.get(url)
    assert resp.status_code == 200
    data = resp.data
    assert data["total_votes"] == 1
    assert data["positive_votes"] == 1
    assert len(data["reviews"]) == 1
    assert data["reviews"][0]["comment"] == "Loved it"
