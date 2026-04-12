import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe, WeeklyPlan, WeeklyPlanItem

@pytest.fixture
def recipe(user):
    """
    Fixture to create a sample recipe for testing.
    """
    return Recipe.objects.create(
        title="Test Recipe",
        description="Test Description",
        serves="4",
        ingredients=[],
        instructions="Test Instructions at least 20 characters long for validation",
        category="other",
        author=user,
        status="published"
    )

@pytest.mark.django_db
def test_get_weekly_plan(auth_client, user):
    """
    Ensure the weekly plan is automatically created for a user
    and returned correctly via the list action.
    """
    url = reverse("weekly-plan-list")
    response = auth_client.get(url)
    assert response.status_code == 200
    assert response.data["owner"] == user.username
    assert "items" in response.data
    assert len(response.data["items"]) == 0

@pytest.mark.django_db
def test_add_recipe_to_plan(auth_client, recipe):
    """
    Test adding a recipe to the user's weekly plan.
    """
    url = reverse("weekly-plan-add-recipe")
    data = {"recipe_slug": recipe.slug, "day": 1}
    response = auth_client.post(url, data, format="json")
    assert response.status_code == 201
    assert response.data["day"] == 1
    assert response.data["recipe"]["slug"] == recipe.slug
    assert WeeklyPlanItem.objects.count() == 1

@pytest.mark.django_db
def test_remove_item_from_plan(auth_client, recipe, user):
    """
    Test removing an item from the user's weekly plan.
    """
    plan, _ = WeeklyPlan.objects.get_or_create(owner=user)
    item = WeeklyPlanItem.objects.create(plan=plan, recipe=recipe, day=1, order=0)
    
    url = reverse("weekly-plan-remove-item")
    data = {"item_id": item.id}
    response = auth_client.post(url, data, format="json")
    assert response.status_code == 204
    assert WeeklyPlanItem.objects.count() == 0

@pytest.mark.django_db
def test_clear_plan(auth_client, recipe, user):
    """
    Test clearing all items in the user's weekly plan.
    """
    plan, _ = WeeklyPlan.objects.get_or_create(owner=user)
    WeeklyPlanItem.objects.create(plan=plan, recipe=recipe, day=1, order=0)
    WeeklyPlanItem.objects.create(plan=plan, recipe=recipe, day=2, order=0)
    
    url = reverse("weekly-plan-clear")
    response = auth_client.post(url)
    assert response.status_code == 204
    assert WeeklyPlanItem.objects.filter(plan=plan).count() == 0
