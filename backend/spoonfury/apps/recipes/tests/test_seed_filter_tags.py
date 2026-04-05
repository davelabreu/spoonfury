import pytest
from spoonfury.apps.recipes.models import Tag


@pytest.mark.django_db
class TestFilterTagSeeds:
    """Verify the seeded cuisine/lifestyle tags exist after migration."""

    EXPECTED_CUISINE = [
        ("american", "cuisine"),
        ("italian", "cuisine"),
        ("mexican", "cuisine"),
        ("asian", "cuisine"),
        ("european-iberian", "cuisine"),
        ("mediterranean", "cuisine"),
        ("latin-american", "cuisine"),
    ]

    EXPECTED_LIFESTYLE = [
        ("quick-easy", "vibe"),
        ("vegetarian-vegan", "dietary"),
        ("health-fitness", "vibe"),
        ("weeknight-staples", "vibe"),
        ("gluten-free-dairy-free", "dietary"),
        ("high-protein-keto", "dietary"),
        ("meal-prep-freezer", "vibe"),
    ]

    def test_cuisine_tags_exist(self):
        for slug, kind in self.EXPECTED_CUISINE:
            tag = Tag.objects.get(slug=slug)
            assert tag.kind == kind, f"{slug} should be kind={kind}, got {tag.kind}"

    def test_lifestyle_tags_exist(self):
        for slug, kind in self.EXPECTED_LIFESTYLE:
            tag = Tag.objects.get(slug=slug)
            assert tag.kind == kind, f"{slug} should be kind={kind}, got {tag.kind}"

    def test_no_duplicates(self):
        all_slugs = [s for s, _ in self.EXPECTED_CUISINE + self.EXPECTED_LIFESTYLE]
        for slug in all_slugs:
            assert Tag.objects.filter(slug=slug).count() == 1
