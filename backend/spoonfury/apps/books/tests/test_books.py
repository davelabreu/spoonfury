import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe
from spoonfury.apps.books.models import RecipeBook

User = get_user_model()


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


@pytest.mark.django_db
def test_recipebook_has_is_default_field(user):
    book = RecipeBook.objects.create(title="Forked Recipes", owner=user)
    assert book.is_default is False


@pytest.mark.django_db
def test_default_collection_created_on_registration():
    new_user = User.objects.create_user(username="newchef", password="testpass123")
    default = RecipeBook.objects.filter(owner=new_user, is_default=True)
    assert default.count() == 1
    assert default.first().title == "Forked Recipes"


@pytest.mark.django_db
def test_cannot_delete_default_collection(auth_client, user):
    default_book = RecipeBook.objects.get(owner=user, is_default=True)
    url = reverse("book-detail", kwargs={"pk": default_book.pk})
    response = auth_client.delete(url)
    assert response.status_code == 400
    assert "cannot delete" in response.data["detail"].lower()


@pytest.mark.django_db
def test_serializer_includes_is_default(auth_client, user):
    url = reverse("book-list")
    response = auth_client.get(url)
    assert response.status_code == 200
    results = response.data if isinstance(response.data, list) else response.data.get("results", response.data)
    default_books = [b for b in results if b["is_default"]]
    assert len(default_books) == 1


@pytest.mark.django_db
def test_fork_auto_adds_to_default_collection(auth_client, user):
    other = User.objects.create_user(username="forkauthor", password="testpass123")
    parent = Recipe.objects.create(
        title="Original Pasta", description="desc", serves="4",
        ingredients=[{"name": "pasta", "quantity": "1", "unit": "lb", "note": ""}],
        instructions="cook it", category="pasta_noodles", author=other,
    )
    url = reverse("recipe-fork", kwargs={"slug": parent.slug})
    response = auth_client.post(url, {
        "title": "Original Pasta (my version)",
        "description": "desc",
        "serves": "4",
        "ingredients": [{"name": "pasta", "quantity": "1", "unit": "lb", "note": ""}],
        "instructions": "cook it",
        "notes": "",
    }, format="json")
    assert response.status_code == 201
    forked_slug = response.data["slug"]
    default_book = RecipeBook.objects.get(owner=user, is_default=True)
    assert default_book.recipes.filter(slug=forked_slug).exists()
