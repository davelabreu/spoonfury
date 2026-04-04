from django.db import IntegrityError, transaction
from rest_framework import serializers
from .models import Recipe, Tag


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["name", "slug", "kind"]
        read_only_fields = ["slug", "kind"]


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

    # Tags: accept list of strings on write, return full objects on read
    tags = serializers.ListField(
        child=serializers.CharField(max_length=50),
        required=False,
        default=list,
    )

    class Meta:
        model = Recipe
        fields = [
            "id", "slug", "title", "description", "serves",
            "ingredients", "instructions", "notes", "category",
            "image_url", "tags",
            "author_username", "author_display_name",
            "parent_recipe_slug", "parent_recipe_title", "parent_recipe_author",
            "fork_count", "created_at", "status", "published_at", "review_round",
        ]
        read_only_fields = ["slug", "fork_count", "created_at", "author_username", "status", "published_at", "review_round"]

    def to_representation(self, instance):
        # Build representation field-by-field, skipping the write-only tags ListField
        # then inject the M2M tags as full objects via TagSerializer.
        ret = {}
        for field_name, field in self.fields.items():
            if field_name == "tags":
                continue
            try:
                attribute = field.get_attribute(instance)
            except serializers.SkipField:
                continue
            ret[field_name] = field.to_representation(attribute) if attribute is not None else None
        ret["tags"] = TagSerializer(instance.tags.all(), many=True).data
        return ret

    def _resolve_tags(self, tag_names):
        """Get-or-create tags with race condition safety.
        Each get_or_create runs in its own savepoint so that an IntegrityError
        on one tag does not abort the outer transaction.
        """
        tags = []
        for name in tag_names:
            name = name.lower().strip()
            if not name:
                continue
            try:
                with transaction.atomic():
                    tag, _ = Tag.objects.get_or_create(name=name)
            except IntegrityError:
                tag = Tag.objects.get(name=name)
            tags.append(tag)
        return tags

    def create(self, validated_data):
        tag_names = validated_data.pop("tags", [])
        validated_data["author"] = self.context["request"].user
        recipe = super().create(validated_data)
        if tag_names:
            recipe.tags.set(self._resolve_tags(tag_names))
        return recipe

    def update(self, instance, validated_data):
        tag_names = validated_data.pop("tags", None)
        recipe = super().update(instance, validated_data)
        if tag_names is not None:
            recipe.tags.set(self._resolve_tags(tag_names))
        return recipe
