"""Tests for vouch_count and review_progress serializer fields."""
import pytest
from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from rest_framework.test import APIRequestFactory

from spoonfury.apps.recipes.models import Recipe, RecipeReview
from spoonfury.apps.recipes.serializers import RecipeSerializer

User = get_user_model()

VALID_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
    {"quantity": "1", "unit": "cup", "name": "flour", "note": ""},
]


def _make_recipe(author, status="published"):
    return Recipe.objects.create(
        title="Soup", description="d", serves="2", category="soup",
        ingredients=VALID_INGREDIENTS,
        instructions="simmer for a long long while and stir occasionally",
        author=author, status=status, review_round=1,
    )


def _request(user):
    factory = APIRequestFactory()
    req = factory.get("/")
    req.user = user
    return req


@pytest.mark.django_db
def test_vouch_count_present_on_published():
    author = User.objects.create_user(username="vca", password="x")
    recipe = _make_recipe(author)
    for i in range(3):
        r = User.objects.create_user(username=f"vcv{i}", password="x")
        RecipeReview.objects.create(recipe=recipe, reviewer=r, review_round=1, is_positive=True)
    neg = User.objects.create_user(username="vcneg", password="x")
    RecipeReview.objects.create(recipe=recipe, reviewer=neg, review_round=1, is_positive=False)

    data = RecipeSerializer(recipe, context={"request": _request(author)}).data
    assert data["vouch_count"] == 3


@pytest.mark.django_db
def test_vouch_count_zero_when_no_reviews():
    author = User.objects.create_user(username="vcz", password="x")
    recipe = _make_recipe(author)
    data = RecipeSerializer(recipe, context={"request": _request(author)}).data
    assert data["vouch_count"] == 0


@pytest.mark.django_db
def test_review_progress_present_for_author():
    author = User.objects.create_user(username="rpa", password="x")
    recipe = _make_recipe(author, status="in_review")
    for i in range(2):
        r = User.objects.create_user(username=f"rpp{i}", password="x")
        RecipeReview.objects.create(recipe=recipe, reviewer=r, review_round=1, is_positive=True)
    neg = User.objects.create_user(username="rpn", password="x")
    RecipeReview.objects.create(recipe=recipe, reviewer=neg, review_round=1, is_positive=False)

    data = RecipeSerializer(recipe, context={"request": _request(author)}).data
    rp = data["review_progress"]
    assert rp is not None
    assert rp["positive"] == 2
    assert rp["total"] == 3
    assert rp["threshold_met"] is False
    # ceil(0.8 * 3) = 3 positives needed, has 2, so needs 1 more.
    assert rp["needed_for_threshold"] == 1


@pytest.mark.django_db
def test_review_progress_null_for_other_viewer():
    author = User.objects.create_user(username="rpa2", password="x")
    other = User.objects.create_user(username="rpo", password="x")
    recipe = _make_recipe(author, status="in_review")
    data = RecipeSerializer(recipe, context={"request": _request(other)}).data
    assert data["review_progress"] is None


@pytest.mark.django_db
def test_review_progress_present_for_staff():
    author = User.objects.create_user(username="rpa3", password="x")
    staff = User.objects.create_user(username="rpmod", password="x", is_staff=True)
    recipe = _make_recipe(author, status="in_review")
    data = RecipeSerializer(recipe, context={"request": _request(staff)}).data
    assert data["review_progress"] is not None


@pytest.mark.django_db
def test_review_progress_needed_math_below_minimum():
    author = User.objects.create_user(username="rpa4", password="x")
    recipe = _make_recipe(author, status="in_review")
    r = User.objects.create_user(username="rpv1", password="x")
    RecipeReview.objects.create(recipe=recipe, reviewer=r, review_round=1, is_positive=True)

    data = RecipeSerializer(recipe, context={"request": _request(author)}).data
    rp = data["review_progress"]
    assert rp["total"] == 1
    assert rp["needed_for_threshold"] == 2  # 3 - 1 more needed to reach minimum


@pytest.mark.django_db
def test_review_progress_threshold_met():
    author = User.objects.create_user(username="rpa5", password="x")
    recipe = _make_recipe(author, status="in_review")
    for i in range(4):
        r = User.objects.create_user(username=f"rpm{i}", password="x")
        RecipeReview.objects.create(recipe=recipe, reviewer=r, review_round=1, is_positive=True)

    data = RecipeSerializer(recipe, context={"request": _request(author)}).data
    rp = data["review_progress"]
    assert rp["threshold_met"] is True
    assert rp["needed_for_threshold"] == 0


@pytest.mark.django_db
def test_vouch_count_uses_annotation_in_list_view():
    """When the queryset is annotated, vouch_count reads from the annotation."""
    author = User.objects.create_user(username="ann_a", password="x")
    recipe = _make_recipe(author)
    for i in range(2):
        r = User.objects.create_user(username=f"annv{i}", password="x")
        RecipeReview.objects.create(recipe=recipe, reviewer=r, review_round=1, is_positive=True)

    annotated = Recipe.objects.filter(pk=recipe.pk).annotate(
        _vouch_count_ann=Count("reviews", filter=Q(reviews__is_positive=True))
    ).first()
    assert annotated._vouch_count_ann == 2

    data = RecipeSerializer(annotated, context={"request": _request(author)}).data
    assert data["vouch_count"] == 2
