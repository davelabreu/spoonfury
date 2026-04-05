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
    from django.contrib.auth import get_user_model
    User = get_user_model()
    for i in range(3):
        voter = User.objects.create_user(username=f"voter{i}", password="pass")
        RecipeReview.objects.create(
            recipe=r, reviewer=voter, review_round=0, is_positive=True, comment=""
        )
    return r


@pytest.fixture
def cold_recipe(user):
    """A published recipe with no votes."""
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
        assert "cold-salad" not in slugs

    def test_excludes_old_recipes(self, api_client, hot_recipe, old_recipe):
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
