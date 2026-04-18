from math import ceil

from django.db import IntegrityError, transaction
from rest_framework import serializers
from .models import Recipe, Tag, RecipeReview


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

    vouch_count = serializers.SerializerMethodField()

    class Meta:
        model = Recipe
        fields = [
            "id", "slug", "title", "description", "serves",
            "ingredients", "instructions", "notes", "category",
            "image_url", "tags", "vouch_count",
            "author_username", "author_display_name",
            "parent_recipe_slug", "parent_recipe_title", "parent_recipe_author",
            "fork_count", "created_at", "updated_at", "status", "published_at", "review_round",
        ]
        read_only_fields = [
            "slug", "fork_count", "created_at", "updated_at", "author_username",
            "status", "published_at", "review_round", "vouch_count",
        ]

    def get_vouch_count(self, obj):
        """Cumulative count of positive reviews — always present, regardless of recipe status.

        Uses the queryset annotation (_vouch_count_ann) when available to avoid
        N+1 queries in list views; falls back to a single COUNT(*) otherwise.
        """
        ann = getattr(obj, "_vouch_count_ann", None)
        if ann is not None:
            return ann
        return obj.reviews.filter(is_positive=True).count()

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

        # Attach live vote tally for recipes currently under review.
        # Cumulative across all review rounds (matches the new gate math).
        if instance.status in ("in_review", "mod_queue"):
            reviews = RecipeReview.objects.filter(recipe=instance)
            ret["total_votes"] = reviews.count()
            ret["positive_votes"] = reviews.filter(is_positive=True).count()
        else:
            ret["total_votes"] = None
            ret["positive_votes"] = None

        # Owner/staff-only structured progression indicator.
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        is_owner_or_staff = (
            user is not None
            and user.is_authenticated
            and (user == instance.author or user.is_staff)
        )
        if is_owner_or_staff:
            ret["review_progress"] = self._compute_review_progress(instance)
        else:
            ret["review_progress"] = None

        return ret

    def _compute_review_progress(self, instance):
        """Compute the structured progression indicator for owner/staff view.

        Shape: {positive, total, needed_for_threshold, threshold_met}
        - needed_for_threshold: minimum additional positive votes required to hit
          80% / ≥3. When total < 3, this is (3 - total). When total >= 3, this is
          max(0, ceil(0.8 * total) - positive).
        """
        reviews = RecipeReview.objects.filter(recipe=instance)
        total = reviews.count()
        positive = reviews.filter(is_positive=True).count()
        if total < 3:
            needed = max(0, 3 - total)
            threshold_met = False
        else:
            required_positive = ceil(0.8 * total)
            needed = max(0, required_positive - positive)
            threshold_met = positive >= required_positive
        return {
            "positive": positive,
            "total": total,
            "needed_for_threshold": needed,
            "threshold_met": threshold_met,
        }

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
