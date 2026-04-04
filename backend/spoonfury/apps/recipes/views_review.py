"""Views for the recipe review pipeline (submit and withdraw)."""
from django.db.models import F
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Recipe, TestKitchenInvite
from .serializers import RecipeSerializer
from spoonfury.apps.notifications.helpers import notify


def _validate_gate(recipe):
    """Run the 4-point publish gate. Returns list of error strings."""
    errors = []
    valid_ingredients = [i for i in recipe.ingredients if i.get("name", "").strip()]
    if len(valid_ingredients) < 2:
        errors.append("At least 2 ingredients required (found %d)." % len(valid_ingredients))
    if len(recipe.instructions.strip()) < 20:
        errors.append("Instructions must be at least 20 characters long.")
    if not recipe.description.strip():
        errors.append("Description is required.")
    if not recipe.category:
        errors.append("Category must be set.")
    return errors


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def submit_for_review(request, slug):
    """Submit a draft/revision_requested recipe for community review."""
    recipe = Recipe.objects.select_related("author").get(slug=slug)

    if recipe.author != request.user:
        raise PermissionDenied("You can only submit your own recipes.")

    if recipe.status not in ("draft", "revision_requested"):
        return Response(
            {"detail": "Recipe must be in draft or revision_requested state."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    errors = _validate_gate(recipe)
    if errors:
        return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

    recipe.status = "in_review"
    recipe.review_round = F("review_round") + 1
    recipe.save(update_fields=["status", "review_round"])
    recipe.refresh_from_db()

    # Notify all kitchen invitees
    for invite in TestKitchenInvite.objects.filter(owner=recipe.author).select_related("invitee"):
        notify(
            recipient=invite.invitee,
            notification_type="review_requested",
            recipe=recipe,
            actor=recipe.author,
            message=f"{recipe.author.username} wants your feedback on {recipe.title}",
        )

    return Response(RecipeSerializer(recipe, context={"request": request}).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def withdraw_review(request, slug):
    """Withdraw a recipe from in_review back to draft."""
    recipe = Recipe.objects.select_related("author").get(slug=slug)

    if recipe.author != request.user:
        raise PermissionDenied("You can only withdraw your own recipes.")

    if recipe.status != "in_review":
        return Response(
            {"detail": "Recipe must be in_review to withdraw."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    recipe.status = "draft"
    recipe.save(update_fields=["status"])

    return Response(RecipeSerializer(recipe, context={"request": request}).data)
