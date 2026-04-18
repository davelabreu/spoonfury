from rest_framework import serializers
from .models import RecipeBook, BookRecipe
from spoonfury.apps.recipes.serializers import RecipeSerializer


class RecipeBookSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    recipe_count = serializers.SerializerMethodField()
    share_url = serializers.SerializerMethodField()

    class Meta:
        model = RecipeBook
        fields = [
            "id", "title", "cover_image", "owner_username",
            "is_public", "default_role", "share_token", "share_url",
            "recipe_count", "created_at",
        ]
        read_only_fields = ["share_token", "owner_username", "default_role", "created_at"]

    def get_recipe_count(self, obj):
        return obj.recipes.count()

    def get_share_url(self, obj):
        return f"/collections/share/{obj.share_token}"

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)


class RecipeBookDetailSerializer(RecipeBookSerializer):
    recipes = RecipeSerializer(many=True, read_only=True)

    class Meta(RecipeBookSerializer.Meta):
        fields = RecipeBookSerializer.Meta.fields + ["recipes"]
