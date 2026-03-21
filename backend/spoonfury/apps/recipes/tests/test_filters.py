import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe, Tag


def make_recipe(user, title, category="other", ingredients=None, **kwargs):
    """Helper to create recipes with unique slugs."""
    return Recipe.objects.create(
        title=title,
        description=f"Desc for {title}",
        serves="4",
        category=category,
        ingredients=ingredients or [],
        instructions="Do the thing.",
        author=user,
        **kwargs,
    )


@pytest.mark.django_db
class TestRecipeFilters:
    @pytest.fixture
    def recipes(self, user):
        t_vegan = Tag.objects.create(name="test-vegan", kind="dietary")
        t_mexican = Tag.objects.create(name="test-mexican", kind="cuisine")
        t_italian = Tag.objects.create(name="test-italian", kind="cuisine")

        r1 = make_recipe(user, "Vegan Tacos", "snack_app",
                         ingredients=[{"name": "tortilla", "quantity": "4", "unit": "pcs", "note": ""}])
        r1.tags.set([t_vegan, t_mexican])

        r2 = make_recipe(user, "Vegan Pasta", "pasta_noodles",
                         ingredients=[{"name": "pasta", "quantity": "1", "unit": "lb", "note": ""},
                                      {"name": "tomato", "quantity": "2", "unit": "pcs", "note": ""}])
        r2.tags.set([t_vegan, t_italian])

        r3 = make_recipe(user, "Steak Dinner", "meat_seafood",
                         ingredients=[{"name": "ribeye steak", "quantity": "1", "unit": "lb", "note": ""}])
        r3.tags.set([])

        return r1, r2, r3

    def test_filter_by_category(self, api_client, recipes):
        url = reverse("recipe-list") + "?category=pasta_noodles"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles == ["Vegan Pasta"]

    def test_filter_by_single_tag(self, api_client, recipes):
        url = reverse("recipe-list") + "?tags=test-vegan"
        resp = api_client.get(url)
        titles = sorted([r["title"] for r in resp.data["results"]])
        assert titles == ["Vegan Pasta", "Vegan Tacos"]

    def test_filter_by_multiple_tags_and_logic(self, api_client, recipes):
        url = reverse("recipe-list") + "?tags=test-vegan&tags=test-mexican"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles == ["Vegan Tacos"]

    def test_filter_by_ingredient(self, api_client, recipes):
        url = reverse("recipe-list") + "?ingredient=steak"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles == ["Steak Dinner"]

    def test_ingredient_search_case_insensitive(self, api_client, recipes):
        url = reverse("recipe-list") + "?ingredient=TORTILLA"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles == ["Vegan Tacos"]

    def test_search_by_title(self, api_client, recipes):
        url = reverse("recipe-list") + "?search=Tacos"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles == ["Vegan Tacos"]

    def test_ordering_by_fork_count(self, api_client, recipes):
        r1, r2, r3 = recipes
        r3.fork_count = 10
        r3.save()
        url = reverse("recipe-list") + "?ordering=-fork_count"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles[0] == "Steak Dinner"

    def test_ordering_by_title(self, api_client, recipes):
        url = reverse("recipe-list") + "?ordering=title"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles == sorted(titles)

    def test_combined_category_and_tag_filter(self, api_client, recipes):
        url = reverse("recipe-list") + "?category=pasta_noodles&tags=test-vegan"
        resp = api_client.get(url)
        titles = [r["title"] for r in resp.data["results"]]
        assert titles == ["Vegan Pasta"]

    def test_no_results_for_nonexistent_tag(self, api_client, recipes):
        url = reverse("recipe-list") + "?tags=nonexistent-tag-xyz"
        resp = api_client.get(url)
        assert resp.status_code == 200
        assert resp.data["results"] == []
