"""Views for the moderation pipeline. All endpoints are staff-only."""
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Recipe, RecipeReview, ModerationAction, AuthorStrike
from .serializers import RecipeSerializer
from spoonfury.apps.notifications.helpers import notify


class IsStaff(permissions.BasePermission):
    """Allow only staff users (is_staff=True)."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_staff)


@api_view(["GET"])
@permission_classes([IsStaff])
def moderation_queue(request):
    """List all recipes in mod_queue, with vote summary and author strike count. Ordered by updated_at."""
    recipes = (
        Recipe.objects.filter(status="mod_queue")
        .select_related("author")
        .order_by("updated_at")
    )
    results = []
    for recipe in recipes:
        reviews = RecipeReview.objects.filter(recipe=recipe, review_round=recipe.review_round)
        entry = RecipeSerializer(recipe, context={"request": request}).data
        entry["total_votes"] = reviews.count()
        entry["positive_votes"] = reviews.filter(is_positive=True).count()
        entry["author_strike_count"] = AuthorStrike.objects.filter(author=recipe.author).count()
        results.append(entry)
    return Response(results)


@api_view(["POST"])
@permission_classes([IsStaff])
def moderation_approve(request, slug):
    """Approve a recipe from mod_queue → published. Creates ModerationAction, notifies author."""
    recipe = Recipe.objects.select_related("author").get(slug=slug)
    if recipe.status != "mod_queue":
        return Response({"detail": "Recipe must be in mod_queue to approve."}, status=status.HTTP_400_BAD_REQUEST)

    recipe.status = "published"
    recipe.published_at = timezone.now()
    recipe.save(update_fields=["status", "published_at"])

    ModerationAction.objects.create(
        recipe=recipe, moderator=request.user, action="approved", review_round=recipe.review_round,
    )
    notify(
        recipient=recipe.author, notification_type="recipe_approved",
        recipe=recipe, actor=request.user,
        message=f"Your recipe {recipe.title} has been published!",
    )
    return Response(RecipeSerializer(recipe, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([IsStaff])
def moderation_request_revision(request, slug):
    """Send recipe back for revision. Requires feedback. Creates ModerationAction + AuthorStrike, notifies author."""
    recipe = Recipe.objects.select_related("author").get(slug=slug)
    if recipe.status != "mod_queue":
        return Response({"detail": "Recipe must be in mod_queue."}, status=status.HTTP_400_BAD_REQUEST)

    feedback = request.data.get("feedback", "").strip()
    if not feedback:
        return Response({"detail": "Feedback is required when requesting revision."}, status=status.HTTP_400_BAD_REQUEST)

    recipe.status = "revision_requested"
    recipe.save(update_fields=["status"])

    mod_action = ModerationAction.objects.create(
        recipe=recipe, moderator=request.user, action="revision_requested",
        feedback=feedback, review_round=recipe.review_round,
    )
    AuthorStrike.objects.create(author=recipe.author, recipe=recipe, moderation_action=mod_action)
    notify(
        recipient=recipe.author, notification_type="revision_requested",
        recipe=recipe, actor=request.user,
        message=f"Feedback on {recipe.title} — revision needed",
    )
    return Response(RecipeSerializer(recipe, context={"request": request}).data)
