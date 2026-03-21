import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe

BASE_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
    {"quantity": "1", "unit": "lb", "name": "pasta", "note": ""},
    {"quantity": "3", "unit": "", "name": "eggs", "note": ""},
    {"quantity": "100", "unit": "g", "name": "pecorino", "note": ""},
]


@pytest.fixture
def parent_recipe(user):
    return Recipe.objects.create(
        title="Carbonara",
        description="Classic Roman.",
        serves="2",
        ingredients=BASE_INGREDIENTS,
        instructions="Cook.",
        category="pasta_noodles",
        author=user,
    )


@pytest.mark.django_db
def test_fork_creates_new_recipe(auth_client, parent_recipe, user):
    """Forking creates a new recipe with parent set."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    forker = User.objects.create_user(username="forker", email="f@f.com", password="pass")
    auth_client.force_authenticate(user=forker)

    url = reverse("recipe-fork", kwargs={"slug": parent_recipe.slug})
    new_ingredients = BASE_INGREDIENTS.copy()
    new_ingredients[1] = {"quantity": "1", "unit": "lb", "name": "rigatoni", "note": ""}  # 1 change

    response = auth_client.post(url, {
        "title": "Carbonara (rigatoni)",
        "description": "With rigatoni instead.",
        "serves": "2",
        "ingredients": new_ingredients,
        "instructions": "Cook.",
        "notes": "",
    }, format="json")

    assert response.status_code == 201
    assert response.data["parent_recipe_slug"] == parent_recipe.slug


@pytest.mark.django_db
def test_fork_increments_parent_fork_count(auth_client, parent_recipe):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    forker = User.objects.create_user(username="forker2", email="f2@f.com", password="pass")
    auth_client.force_authenticate(user=forker)

    url = reverse("recipe-fork", kwargs={"slug": parent_recipe.slug})
    auth_client.post(url, {
        "title": "Carbonara (rigatoni)",
        "description": "desc",
        "serves": "2",
        "ingredients": BASE_INGREDIENTS,
        "instructions": "cook",
        "notes": "",
    }, format="json")

    parent_recipe.refresh_from_db()
    assert parent_recipe.fork_count == 1


@pytest.mark.django_db
def test_fork_rejects_too_many_ingredient_changes(auth_client, parent_recipe):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    forker = User.objects.create_user(username="forker3", email="f3@f.com", password="pass")
    auth_client.force_authenticate(user=forker)

    url = reverse("recipe-fork", kwargs={"slug": parent_recipe.slug})
    # Change 4 ingredients — exceeds limit of 3
    bad_ingredients = [
        {"quantity": "2", "unit": "Tbsp", "name": "butter", "note": ""},      # changed
        {"quantity": "1", "unit": "lb", "name": "rigatoni", "note": ""},      # changed
        {"quantity": "3", "unit": "", "name": "egg yolks", "note": ""},       # changed
        {"quantity": "100", "unit": "g", "name": "parmesan", "note": ""},     # changed
    ]
    response = auth_client.post(url, {
        "title": "Carbonara (rigatoni)",
        "description": "desc",
        "serves": "2",
        "ingredients": bad_ingredients,
        "instructions": "cook",
        "notes": "",
    }, format="json")
    assert response.status_code == 400
    assert "ingredient" in str(response.data).lower()


@pytest.mark.django_db
def test_fork_locks_category(auth_client, parent_recipe):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    forker = User.objects.create_user(username="forker4", email="f4@f.com", password="pass")
    auth_client.force_authenticate(user=forker)

    url = reverse("recipe-fork", kwargs={"slug": parent_recipe.slug})
    response = auth_client.post(url, {
        "title": "Carbonara (rigatoni)",
        "description": "desc",
        "serves": "2",
        "ingredients": BASE_INGREDIENTS,
        "instructions": "cook",
        "notes": "",
        "category": "soup",  # Trying to change category
    }, format="json")
    assert response.status_code == 201
    # Category must match parent regardless of what was sent
    fork = Recipe.objects.get(slug=response.data["slug"])
    assert fork.category == parent_recipe.category
