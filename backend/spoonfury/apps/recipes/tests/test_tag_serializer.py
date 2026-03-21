import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory
from spoonfury.apps.recipes.models import Tag, Recipe
from spoonfury.apps.recipes.serializers import RecipeSerializer, TagSerializer

User = get_user_model()


@pytest.mark.django_db
class TestTagSerializer:
    def test_serialize_tag(self):
        tag, _ = Tag.objects.get_or_create(name="vegan", defaults={"kind": "dietary"})
        data = TagSerializer(tag).data
        assert data == {"name": "vegan", "slug": "vegan", "kind": "dietary"}


@pytest.mark.django_db
class TestRecipeSerializerTags:
    @pytest.fixture
    def user(self):
        return User.objects.create_user(username="chef", password="pass123")

    @pytest.fixture
    def request_context(self, user):
        factory = APIRequestFactory()
        request = factory.post("/api/recipes/")
        request.user = user
        return {"request": request}

    def test_create_recipe_with_existing_tags(self, request_context):
        Tag.objects.get_or_create(name="vegan", defaults={"kind": "dietary"})
        Tag.objects.get_or_create(name="mexican", defaults={"kind": "cuisine"})
        data = {
            "title": "Vegan Tacos",
            "description": "Tasty plant tacos",
            "serves": "4",
            "category": "snack_app",
            "ingredients": [{"name": "tortilla", "quantity": "4", "unit": "pcs", "note": ""}],
            "instructions": "Fill and fold.",
            "tags": ["vegan", "mexican"],
        }
        serializer = RecipeSerializer(data=data, context=request_context)
        assert serializer.is_valid(), serializer.errors
        recipe = serializer.save()
        assert set(recipe.tags.values_list("name", flat=True)) == {"vegan", "mexican"}

    def test_create_recipe_with_new_tag_defaults_to_vibe(self, request_context):
        data = {
            "title": "Mystery Bowl",
            "description": "A surprise",
            "serves": "2",
            "category": "bowl",
            "ingredients": [{"name": "rice", "quantity": "1", "unit": "cup", "note": ""}],
            "instructions": "Cook it.",
            "tags": ["girldinner"],
        }
        serializer = RecipeSerializer(data=data, context=request_context)
        assert serializer.is_valid(), serializer.errors
        recipe = serializer.save()
        tag = Tag.objects.get(name="girldinner")
        assert tag.kind == "vibe"
        assert tag in recipe.tags.all()

    def test_read_recipe_includes_tag_objects(self, request_context, user):
        tag, _ = Tag.objects.get_or_create(name="italian", defaults={"kind": "cuisine"})
        recipe = Recipe.objects.create(
            title="Pasta", description="Yum", serves="2",
            category="pasta_noodles", ingredients=[], instructions="Boil",
            author=user,
        )
        recipe.tags.add(tag)
        data = RecipeSerializer(recipe, context=request_context).data
        assert data["tags"] == [{"name": "italian", "slug": "italian", "kind": "cuisine"}]

    def test_update_recipe_tags(self, request_context, user):
        tag_v, _ = Tag.objects.get_or_create(name="vegan", defaults={"kind": "dietary"})
        tag_m, _ = Tag.objects.get_or_create(name="mexican", defaults={"kind": "cuisine"})
        recipe = Recipe.objects.create(
            title="Tacos", description="Good", serves="4",
            category="snack_app", ingredients=[], instructions="Cook",
            author=user,
        )
        recipe.tags.add(tag_v)
        # Update to different tags
        serializer = RecipeSerializer(
            recipe, data={"tags": ["mexican"]}, partial=True, context=request_context
        )
        assert serializer.is_valid(), serializer.errors
        updated = serializer.save()
        assert list(updated.tags.values_list("name", flat=True)) == ["mexican"]

    def test_update_without_tags_field_preserves_existing(self, request_context, user):
        tag, _ = Tag.objects.get_or_create(name="italian", defaults={"kind": "cuisine"})
        recipe = Recipe.objects.create(
            title="Pasta", description="Yum", serves="2",
            category="pasta_noodles", ingredients=[], instructions="Boil",
            author=user,
        )
        recipe.tags.add(tag)
        # PATCH without tags field — should not clear existing tags
        serializer = RecipeSerializer(
            recipe, data={"title": "Better Pasta"}, partial=True, context=request_context
        )
        assert serializer.is_valid(), serializer.errors
        updated = serializer.save()
        assert updated.tags.count() == 1

    def test_create_recipe_without_tags(self, request_context):
        data = {
            "title": "Plain Rice",
            "description": "Just rice",
            "serves": "1",
            "category": "side_dish",
            "ingredients": [{"name": "rice", "quantity": "1", "unit": "cup", "note": ""}],
            "instructions": "Cook.",
        }
        serializer = RecipeSerializer(data=data, context=request_context)
        assert serializer.is_valid(), serializer.errors
        recipe = serializer.save()
        assert recipe.tags.count() == 0
