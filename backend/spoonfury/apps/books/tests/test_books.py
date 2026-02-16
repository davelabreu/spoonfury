import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe
from spoonfury.apps.books.models import RecipeBook


@pytest.fixture
def recipe(user):
    return Recipe.objects.create(
        title="Caldo Verde", description="desc", serves="4",
        ingredients=[], instructions="cook", category="soup", author=user,
    )


@pytest.mark.django_db
def test_create_book(auth_client):
    url = reverse("book-list")
    response = auth_client.post(url, {"title": "Holiday Meals"}, format="json")
    assert response.status_code == 201
    assert "share_token" in response.data


@pytest.mark.django_db
def test_share_link_is_public(api_client, auth_client, recipe):
    """Anyone with the share link can view a public book."""
    book_resp = auth_client.post(reverse("book-list"), {"title": "My Book"}, format="json")
    book_token = book_resp.data["share_token"]
    book_id = book_resp.data["id"]

    # Add recipe and make public
    auth_client.post(reverse("book-add-recipe", kwargs={"pk": book_id}), {"recipe_slug": recipe.slug}, format="json")
    auth_client.patch(reverse("book-detail", kwargs={"pk": book_id}), {"is_public": True}, format="json")

    # Unauthenticated access via share token
    url = reverse("book-share", kwargs={"share_token": book_token})
    response = api_client.get(url)
    assert response.status_code == 200
    assert response.data["title"] == "My Book"


@pytest.mark.django_db
def test_private_book_not_accessible_without_token(api_client, auth_client):
    book_resp = auth_client.post(reverse("book-list"), {"title": "Secret Book"}, format="json")
    book_id = book_resp.data["id"]

    response = api_client.get(reverse("book-detail", kwargs={"pk": book_id}))
    assert response.status_code in [401, 403]
