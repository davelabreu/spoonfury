from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True, default=None)
    recipe_slug = serializers.SlugRelatedField(source="recipe", slug_field="slug", read_only=True)
    recipe_title = serializers.CharField(source="recipe.title", read_only=True)

    class Meta:
        model = Notification
        fields = [
            "id", "notification_type", "message", "is_read",
            "actor_username", "recipe_slug", "recipe_title", "created_at",
        ]
        read_only_fields = fields
