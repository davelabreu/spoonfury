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
    """Anyone can list published recipes without auth."""
    recipe.status = "published"
    recipe.save()
    url = reverse("recipe-list")
    response = api_client.get(url)
    assert response.status_code == 200
    assert len(response.data["results"]) == 1


@pytest.mark.django_db
def test_get_recipe_by_slug(api_client, recipe):
    recipe.status = "published"
    recipe.save()
    url = reverse("recipe-detail", kwargs={"slug": recipe.slug})
    response = api_client.get(url)
    assert response.status_code == 200
    assert response.data["title"] == "Test Soup"
    assert "author_username" in response.data


@pytest.mark.django_db
def test_draft_recipes_hidden_from_public_list(api_client, recipe):
    """Draft recipes should not appear in the public recipe list."""
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


@pytest.mark.django_db
def test_update_recipe_forbidden_for_non_owner(other_auth_client, recipe):
    """A user who didn't create a recipe cannot update it."""
    recipe.status = "published"
    recipe.save()
    url = reverse("recipe-detail", kwargs={"slug": recipe.slug})
    response = other_auth_client.patch(url, {"title": "Hijacked"}, format="json")
    assert response.status_code == 403


@pytest.mark.django_db
def test_delete_recipe_forbidden_for_non_owner(other_auth_client, recipe):
    """A user who didn't create a recipe cannot delete it."""
    recipe.status = "published"
    recipe.save()
    url = reverse("recipe-detail", kwargs={"slug": recipe.slug})
    response = other_auth_client.delete(url)
    assert response.status_code == 403
