import pytest
from spoonfury.apps.recipes.models import Recipe


@pytest.mark.django_db
def test_recipe_creation(user):
    recipe = Recipe.objects.create(
        title="Caldo Verde",
        description="A hearty Portuguese green soup.",
        serves="6 (about 2 cups each)",
        ingredients=[
            {"quantity": "2", "unit": "Tbsp", "name": "extra-virgin olive oil", "note": ""},
            {"quantity": "0.6", "unit": "lb", "name": "Portuguese chouriço", "note": "sliced into coins"},
        ],
        instructions="# Instructions\n\n1. Render the sausage.",
        category="soup",
        author=user,
    )
    assert recipe.slug == "caldo-verde"
    assert recipe.fork_count == 0
    assert recipe.parent_recipe is None


@pytest.mark.django_db
def test_recipe_str(user):
    recipe = Recipe.objects.create(
        title="Caldo Verde",
        description="A hearty Portuguese green soup.",
        serves="6",
        ingredients=[],
        instructions="Steps here.",
        category="soup",
        author=user,
    )
    assert str(recipe) == "Caldo Verde"


@pytest.mark.django_db
def test_fork_count_starts_at_zero(user):
    recipe = Recipe.objects.create(
        title="My Soup",
        description="desc",
        serves="4",
        ingredients=[],
        instructions="steps",
        category="soup",
        author=user,
    )
    assert recipe.fork_count == 0
