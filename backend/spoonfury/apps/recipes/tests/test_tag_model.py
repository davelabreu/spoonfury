import pytest
from django.db import IntegrityError
from spoonfury.apps.recipes.models import Tag


@pytest.mark.django_db
class TestTagModel:
    def test_create_tag(self):
        tag = Tag.objects.create(name="Mexican", kind="cuisine")
        assert tag.name == "mexican"  # lowercase enforced
        assert tag.slug == "mexican"  # auto-generated
        assert tag.kind == "cuisine"

    def test_slug_auto_generated(self):
        tag = Tag.objects.create(name="Gluten Free", kind="dietary")
        assert tag.slug == "gluten-free"

    def test_name_unique(self):
        Tag.objects.create(name="vegan", kind="dietary")
        with pytest.raises(IntegrityError):
            Tag.objects.create(name="vegan", kind="vibe")

    def test_name_stripped_and_lowered(self):
        tag = Tag.objects.create(name="  Italian  ", kind="cuisine")
        assert tag.name == "italian"

    def test_default_kind_is_vibe(self):
        tag = Tag.objects.create(name="girldinner")
        assert tag.kind == "vibe"

    def test_ordering(self):
        Tag.objects.create(name="zebra", kind="cuisine")
        Tag.objects.create(name="alpha", kind="cuisine")
        Tag.objects.create(name="beta", kind="dietary")
        names = list(Tag.objects.values_list("name", flat=True))
        assert names == ["alpha", "zebra", "beta"]

    def test_str(self):
        tag = Tag.objects.create(name="vegan", kind="dietary")
        assert str(tag) == "vegan"
