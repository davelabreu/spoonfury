import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe
from spoonfury.apps.shopping.models import ShoppingList, ShoppingListItem


@pytest.fixture
def recipe(user):
    return Recipe.objects.create(
        title="Pasta Bolognese",
        description="A classic.",
        serves="4",
        ingredients=[],
        instructions="Cook it.",
        category="pasta",
        author=user,
    )


@pytest.fixture
def ingredients():
    return [
        {"name": "pasta", "quantity": "500", "unit": "g", "note": ""},
        {"name": "garlic", "quantity": "2", "unit": "cloves", "note": ""},
    ]


@pytest.mark.django_db
def test_get_empty_shopping_list(auth_client):
    """GET creates and returns an empty list."""
    response = auth_client.get(reverse("shopping-list"))
    assert response.status_code == 200
    assert response.data["total_items"] == 0
    assert response.data["items_by_recipe"] == []


@pytest.mark.django_db
def test_add_items(auth_client, recipe, ingredients):
    """POST to add/ creates items tagged with the source recipe."""
    url = reverse("shopping-list-add")
    response = auth_client.post(url, {
        "recipe_slug": recipe.slug,
        "recipe_title": recipe.title,
        "ingredients": ingredients,
    }, format="json")
    assert response.status_code == 201
    assert response.data["added"] == 2

    list_response = auth_client.get(reverse("shopping-list"))
    assert list_response.data["total_items"] == 2
    group = list_response.data["items_by_recipe"][0]
    assert group["recipe_slug"] == recipe.slug
    assert group["recipe_title"] == recipe.title


@pytest.mark.django_db
def test_add_skips_duplicates(auth_client, recipe, ingredients):
    """Adding the same recipe twice does not create duplicate items."""
    url = reverse("shopping-list-add")
    payload = {"recipe_slug": recipe.slug, "recipe_title": recipe.title, "ingredients": ingredients}
    auth_client.post(url, payload, format="json")
    response = auth_client.post(url, payload, format="json")
    assert response.data["added"] == 0

    list_response = auth_client.get(reverse("shopping-list"))
    assert list_response.data["total_items"] == 2


@pytest.mark.django_db
def test_add_requires_recipe_slug(auth_client, ingredients):
    """Missing recipe_slug returns 400."""
    url = reverse("shopping-list-add")
    response = auth_client.post(url, {
        "recipe_slug": "",
        "recipe_title": "Whatever",
        "ingredients": ingredients,
    }, format="json")
    assert response.status_code == 400


@pytest.mark.django_db
def test_toggle_item(auth_client, recipe, ingredients):
    """PATCH an item toggles is_checked."""
    auth_client.post(reverse("shopping-list-add"), {
        "recipe_slug": recipe.slug,
        "recipe_title": recipe.title,
        "ingredients": ingredients,
    }, format="json")

    item = ShoppingListItem.objects.first()
    url = reverse("shopping-item-detail", kwargs={"pk": item.pk})

    response = auth_client.patch(url, {"is_checked": True}, format="json")
    assert response.status_code == 200
    assert response.data["is_checked"] is True


@pytest.mark.django_db
def test_delete_item(auth_client, recipe, ingredients):
    """DELETE removes a single item."""
    auth_client.post(reverse("shopping-list-add"), {
        "recipe_slug": recipe.slug,
        "recipe_title": recipe.title,
        "ingredients": ingredients,
    }, format="json")

    item = ShoppingListItem.objects.first()
    url = reverse("shopping-item-detail", kwargs={"pk": item.pk})

    response = auth_client.delete(url)
    assert response.status_code == 204
    assert ShoppingListItem.objects.count() == 1


@pytest.mark.django_db
def test_clear_list(auth_client, recipe, ingredients):
    """POST to clear/ removes all items."""
    auth_client.post(reverse("shopping-list-add"), {
        "recipe_slug": recipe.slug,
        "recipe_title": recipe.title,
        "ingredients": ingredients,
    }, format="json")

    response = auth_client.post(reverse("shopping-list-clear"))
    assert response.status_code == 204

    list_response = auth_client.get(reverse("shopping-list"))
    assert list_response.data["total_items"] == 0


@pytest.mark.django_db
def test_unauthenticated_cannot_access(api_client):
    """Unauthenticated requests are rejected."""
    assert api_client.get(reverse("shopping-list")).status_code in [401, 403]
    assert api_client.post(reverse("shopping-list-add"), {}, format="json").status_code in [401, 403]


@pytest.mark.django_db
def test_cannot_modify_another_users_item(auth_client, recipe, ingredients):
    """A user cannot PATCH or DELETE another user's items."""
    from django.contrib.auth import get_user_model
    from rest_framework.test import APIClient

    User = get_user_model()
    other_user = User.objects.create_user(username="other", email="o@test.com", password="pass")
    other_client = APIClient()
    other_client.force_authenticate(user=other_user)

    auth_client.post(reverse("shopping-list-add"), {
        "recipe_slug": recipe.slug,
        "recipe_title": recipe.title,
        "ingredients": ingredients,
    }, format="json")

    item = ShoppingListItem.objects.first()
    url = reverse("shopping-item-detail", kwargs={"pk": item.pk})

    assert other_client.patch(url, {"is_checked": True}, format="json").status_code == 404
    assert other_client.delete(url).status_code == 404


@pytest.mark.django_db
def test_add_returns_already_in_list_flag(auth_client, recipe, ingredients):
    """Add response includes already_in_list boolean."""
    url = reverse("shopping-list-add")
    payload = {"recipe_slug": recipe.slug, "recipe_title": recipe.title, "ingredients": ingredients}

    # First add — items added, now in list
    r1 = auth_client.post(url, payload, format="json")
    assert r1.data["added"] == 2
    assert r1.data["already_in_list"] is True

    # Second add — nothing new, but still in list
    r2 = auth_client.post(url, payload, format="json")
    assert r2.data["added"] == 0
    assert r2.data["already_in_list"] is True
