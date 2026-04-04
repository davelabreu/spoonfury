"""Views for the recipe review pipeline (submit, withdraw, vote, list)."""
from math import ceil

from django.contrib.auth import get_user_model
from django.db.models import F
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Recipe, RecipeReview, TestKitchenInvite
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
    """
    Submit a draft/revision_requested recipe for review.

    - From draft: enters community in_review, review_round increments, invitees notified.
    - From revision_requested: skips community voting entirely and goes straight back to
      mod_queue. The recipe already cleared the threshold; the moderator just needs to
      approve the revision. review_round is NOT incremented — previous votes still count.
    """
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

    if recipe.status == "revision_requested":
        # Already cleared community voting — send straight back to moderator queue.
        recipe.status = "mod_queue"
        recipe.save(update_fields=["status"])
        User = get_user_model()
        for staff in User.objects.filter(is_staff=True):
            notify(
                recipient=staff,
                notification_type="recipe_in_mod_queue",
                recipe=recipe,
                actor=recipe.author,
                message=f"{recipe.author.username} revised and resubmitted: {recipe.title}",
            )
    else:
        # First submission from draft — enter community review.
        recipe.status = "in_review"
        recipe.review_round = F("review_round") + 1
        recipe.save(update_fields=["status", "review_round"])
        recipe.refresh_from_db()
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


def _check_threshold(recipe):
    """Check if review threshold is met and auto-promote to mod_queue."""
    reviews = RecipeReview.objects.filter(recipe=recipe, review_round=recipe.review_round)
    total = reviews.count()
    if total < 3:
        return False
    positive = reviews.filter(is_positive=True).count()
    if positive >= ceil(0.8 * total):
        recipe.status = "mod_queue"
        recipe.save(update_fields=["status"])
        User = get_user_model()
        for staff in User.objects.filter(is_staff=True):
            notify(
                recipient=staff,
                notification_type="recipe_in_mod_queue",
                recipe=recipe,
                actor=recipe.author,
                message=f"New recipe awaiting moderation: {recipe.title} by {recipe.author.username}",
            )
        return True
    return False


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def review_vote(request, slug):
    """Submit a vote on a recipe under review. Any logged-in user except the author can vote."""
    recipe = Recipe.objects.select_related("author").get(slug=slug)

    if recipe.status != "in_review":
        return Response({"detail": "Recipe is not in review."}, status=status.HTTP_400_BAD_REQUEST)

    if request.user == recipe.author:
        raise PermissionDenied("You cannot review your own recipe.")

    if RecipeReview.objects.filter(
        recipe=recipe, reviewer=request.user, review_round=recipe.review_round
    ).exists():
        return Response({"detail": "You already voted in this round."}, status=status.HTTP_400_BAD_REQUEST)

    is_positive = request.data.get("is_positive")
    if is_positive is None:
        return Response({"detail": "is_positive is required."}, status=status.HTTP_400_BAD_REQUEST)

    review = RecipeReview.objects.create(
        recipe=recipe,
        reviewer=request.user,
        review_round=recipe.review_round,
        is_positive=bool(is_positive),
        comment=request.data.get("comment", ""),
    )

    notify(
        recipient=recipe.author,
        notification_type="review_received",
        recipe=recipe,
        actor=request.user,
        message=f"You got a new review on {recipe.title}",
    )

    _check_threshold(recipe)

    return Response({"id": review.pk, "is_positive": review.is_positive}, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def review_list(request, slug):
    """
    List reviews for the current round. Blind until viewer has voted.
    Also returns:
      - all_rounds: historical reviews grouped by round (always visible to owner)
      - moderation_feedback: all moderator revision-request notes (always visible to owner)
    """
    from .models import ModerationAction
    recipe = Recipe.objects.select_related("author").get(slug=slug)
    current_reviews = RecipeReview.objects.filter(recipe=recipe, review_round=recipe.review_round)
    total = current_reviews.count()
    positive = current_reviews.filter(is_positive=True).count()
    has_voted = current_reviews.filter(reviewer=request.user).exists()

    data = {
        "review_round": recipe.review_round,
        "total_votes": total,
        "positive_votes": positive,
        "threshold_met": total >= 3 and positive >= ceil(0.8 * total),
        "has_voted": has_voted,
    }

    # Current round reviews revealed after voting
    if has_voted:
        data["reviews"] = [
            {
                "reviewer": r.reviewer.username,
                "is_positive": r.is_positive,
                "comment": r.comment,
                "round": r.review_round,
                "created_at": r.created_at.isoformat(),
            }
            for r in current_reviews.select_related("reviewer")
        ]

    # Owner sees full history across all rounds
    if request.user == recipe.author:
        all_reviews = RecipeReview.objects.filter(recipe=recipe).select_related("reviewer").order_by("review_round", "created_at")
        data["all_rounds"] = [
            {
                "reviewer": r.reviewer.username,
                "is_positive": r.is_positive,
                "comment": r.comment,
                "round": r.review_round,
                "created_at": r.created_at.isoformat(),
            }
            for r in all_reviews
        ]
        mod_actions = ModerationAction.objects.filter(
            recipe=recipe, action="revision_requested"
        ).select_related("moderator").order_by("-created_at")
        data["moderation_feedback"] = [
            {
                "moderator": m.moderator.username,
                "feedback": m.feedback,
                "round": m.review_round,
                "created_at": m.created_at.isoformat(),
            }
            for m in mod_actions
        ]

    return Response(data)
