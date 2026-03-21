import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Tag


@pytest.mark.django_db
class TestTagListEndpoint:
    @pytest.fixture(autouse=True)
    def seed_tags(self):
        Tag.objects.create(name="tf-mexican", kind="cuisine")
        Tag.objects.create(name="tf-italian", kind="cuisine")
        Tag.objects.create(name="tf-vegan", kind="dietary")
        Tag.objects.create(name="tf-healthy", kind="vibe")

    def test_list_all_tags(self, api_client):
        resp = api_client.get(reverse("tag-list"))
        assert resp.status_code == 200
        names = [t["name"] for t in resp.data]
        # At least our 4 test tags are present
        assert "tf-mexican" in names
        assert "tf-italian" in names
        assert "tf-vegan" in names
        assert "tf-healthy" in names

    def test_filter_by_kind(self, api_client):
        resp = api_client.get(reverse("tag-list") + "?kind=cuisine")
        names = [t["name"] for t in resp.data]
        assert "tf-mexican" in names
        assert "tf-italian" in names
        assert "tf-vegan" not in names
        assert "tf-healthy" not in names

    def test_search_by_name(self, api_client):
        resp = api_client.get(reverse("tag-list") + "?search=tf-veg")
        names = [t["name"] for t in resp.data]
        assert "tf-vegan" in names
        assert len(names) == 1

    def test_search_case_insensitive(self, api_client):
        resp = api_client.get(reverse("tag-list") + "?search=TF-MEXICAN")
        names = [t["name"] for t in resp.data]
        assert len(names) == 1
        assert names[0] == "tf-mexican"

    def test_tag_response_shape(self, api_client):
        resp = api_client.get(reverse("tag-list") + "?kind=dietary")
        tag = next(t for t in resp.data if t["name"] == "tf-vegan")
        assert set(tag.keys()) == {"name", "slug", "kind"}

    def test_endpoint_is_public(self, api_client):
        # api_client is unauthenticated
        resp = api_client.get(reverse("tag-list"))
        assert resp.status_code == 200
