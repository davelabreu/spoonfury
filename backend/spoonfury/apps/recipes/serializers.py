from rest_framework import serializers
from .models import Recipe


class RecipeSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    author_display_name = serializers.CharField(source="author.display_name", read_only=True)
    parent_recipe_slug = serializers.SlugRelatedField(
        source="parent_recipe", slug_field="slug", read_only=True
    )
    parent_recipe_title = serializers.CharField(
        source="parent_recipe.title", read_only=True
    )
    parent_recipe_author = serializers.CharField(
        source="parent_recipe.author.username", read_only=True
    )

    # CharField instead of URLField — accepts both relative paths (/media/...)
    # from the file upload endpoint and full URLs pasted by the user.
    image_url = serializers.CharField(allow_blank=True, required=False, default="")

    class Meta:
        model = Recipe
        fields = [
            "id", "slug", "title", "description", "serves",
            "ingredients", "instructions", "notes", "category",
            "image_url",
            "author_username", "author_display_name",
            "parent_recipe_slug", "parent_recipe_title", "parent_recipe_author",
            "fork_count", "created_at",
        ]
        read_only_fields = ["slug", "fork_count", "created_at", "author_username"]

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)
