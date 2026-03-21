import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe

SAMPLE_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
]


@pytest.fixture
def recipe(user):
    return Recipe.objects.create(
        title="Test Soup",
        description="A test soup.",
        serves="4",
        ingredients=SAMPLE_INGREDIENTS,
        instructions="Cook it.",
        category="soup",
        author=user,
    )


@pytest.mark.django_db
def test_list_recipes_is_public(api_client, recipe):
    """Anyone can list recipes without auth."""
    url = reverse("recipe-list")
    response = api_client.get(url)
    assert response.status_code == 200
    assert len(response.data["results"]) == 1


@pytest.mark.django_db
def test_get_recipe_by_slug(api_client, recipe):
    url = reverse("recipe-detail", kwargs={"slug": recipe.slug})
    response = api_client.get(url)
    assert response.status_code == 200
    assert response.data["title"] == "Test Soup"
    assert "author_username" in response.data


@pytest.mark.django_db
def test_create_recipe_requires_auth(api_client):
    url = reverse("recipe-list")
    data = {
        "title": "New Recipe",
        "description": "desc",
        "serves": "2",
        "ingredients": SAMPLE_INGREDIENTS,
        "instructions": "steps",
        "category": "soup",
    }
    response = api_client.post(url, data, format="json")
    assert response.status_code == 401


@pytest.mark.django_db
def test_create_recipe_authenticated(auth_client):
    url = reverse("recipe-list")
    data = {
        "title": "My Carbonara",
        "description": "Classic Roman pasta.",
        "serves": "2",
        "ingredients": SAMPLE_INGREDIENTS,
        "instructions": "Cook pasta. Add eggs.",
        "category": "pasta_noodles",
    }
    response = auth_client.post(url, data, format="json")
    assert response.status_code == 201
    assert response.data["slug"] == "my-carbonara"
    assert response.data["fork_count"] == 0


@pytest.fixture
def other_auth_client(db):
    from rest_framework.test import APIClient
    from django.contrib.auth import get_user_model
    User = get_user_model()
    other = User.objects.create_user(
        username="otherchef", email="other@test.com", password="testpass123"
    )
    client = APIClient()
    client.force_authenticate(user=other)
    return client


@pytest.mark.django_db
def test_update_recipe_forbidden_for_non_owner(other_auth_client, recipe):
    """A user who didn't create a recipe cannot update it."""
    url = reverse("recipe-detail", kwargs={"slug": recipe.slug})
    response = other_auth_client.patch(url, {"title": "Hijacked"}, format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_delete_recipe_forbidden_for_non_owner(other_auth_client, recipe):
    """A user who didn't create a recipe cannot delete it."""
    url = reverse("recipe-detail", kwargs={"slug": recipe.slug})
    response = other_auth_client.delete(url)
    assert response.status_code == 403
