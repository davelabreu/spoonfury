import pytest
from spoonfury.apps.recipes.models import Recipe


SAMPLE_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
    {"quantity": "1", "unit": "cup", "name": "flour", "note": ""},
]


@pytest.mark.django_db
def test_recipe_defaults_to_draft(user):
    """New recipes should default to 'draft' status with no published_at."""
    recipe = Recipe.objects.create(
        title="Draft Soup",
        description="A soup in progress.",
        serves="4",
        ingredients=SAMPLE_INGREDIENTS,
        instructions="Step 1: boil water. Step 2: add stuff.",
        category="soup",
        author=user,
    )
    assert recipe.status == "draft"
    assert recipe.published_at is None


@pytest.mark.django_db
def test_published_at_not_set_automatically(user):
    """published_at should remain None until explicitly set."""
    recipe = Recipe.objects.create(
        title="Another Draft",
        description="Testing.",
        serves="2",
        ingredients=SAMPLE_INGREDIENTS,
        instructions="Mix things together nicely.",
        category="other",
        author=user,
    )
    recipe.status = "published"
    recipe.save()
    # published_at is NOT auto-set by the model — the publish endpoint handles it
    assert recipe.published_at is None


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
