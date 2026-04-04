from django.conf import settings
from django.db import models


class Notification(models.Model):
    """
    In-app notification for recipe pipeline events.
    The message field is pre-rendered at creation time so the frontend
    doesn't need to assemble display text from actor/recipe/type.
    """
    TYPE_CHOICES = [
        ("review_requested", "Review Requested"),
        ("review_received", "Review Received"),
        ("recipe_in_mod_queue", "Recipe In Moderation Queue"),
        ("recipe_approved", "Recipe Approved"),
        ("revision_requested", "Revision Requested"),
    ]

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications",
    )
    notification_type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    recipe = models.ForeignKey("recipes.Recipe", on_delete=models.CASCADE)
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL,
    )
    message = models.CharField(max_length=255)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.notification_type}] {self.message}"
