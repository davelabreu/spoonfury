"""Views for the recipe review pipeline (submit, withdraw, vote, list)."""
from math import ceil

from django.contrib.auth import get_user_model
from django.db.models import Avg, Count
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
    """Check if the cumulative review threshold is met and auto-promote to mod_queue.

    Spoon Gate formula:
      - Volume gate: >= 5 reviews
      - Launch threshold: average rating >= 4.0 (out of 5 spoons)

    Lifetime-cumulative: counts ALL reviews on the recipe, not just the current round.
    Once the gate is hit, the recipe is promoted; subsequent state transitions
    (e.g. revision_requested → mod_queue) preserve the same vote pool.
    """
    reviews = RecipeReview.objects.filter(recipe=recipe)
    total = reviews.count()
    if total < 5:
        return False
    avg = reviews.aggregate(avg=Avg("rating"))["avg"]
    if avg is not None and avg >= 4.0:
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

    if recipe.status not in ("in_review", "published"):
        return Response({"detail": "Recipe is not available for review."}, status=status.HTTP_400_BAD_REQUEST)

    if request.user == recipe.author:
        raise PermissionDenied("You cannot review your own recipe.")

    if RecipeReview.objects.filter(
        recipe=recipe, reviewer=request.user
    ).exists():
        return Response(
            {"detail": "You already voted on this recipe."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Both in_review and published use 1-5 spoon rating
    rating = request.data.get("rating")
    if rating is None:
        return Response({"detail": "rating (1-5) is required."}, status=status.HTTP_400_BAD_REQUEST)
    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return Response({"detail": "rating must be an integer."}, status=status.HTTP_400_BAD_REQUEST)
    if not (1 <= rating <= 5):
        return Response({"detail": "rating must be between 1 and 5."}, status=status.HTTP_400_BAD_REQUEST)
    is_positive = rating >= 3

    review = RecipeReview.objects.create(
        recipe=recipe,
        reviewer=request.user,
        review_round=recipe.review_round,
        is_positive=is_positive,
        rating=rating,
        comment=request.data.get("comment", ""),
    )

    notify(
        recipient=recipe.author,
        notification_type="review_received",
        recipe=recipe,
        actor=request.user,
        message=f"You got a new review on {recipe.title}",
    )

    # Only check threshold promotion for in_review recipes (published already passed)
    if recipe.status == "in_review":
        _check_threshold(recipe)

    resp = {"id": review.pk, "is_positive": review.is_positive}
    if review.rating is not None:
        resp["rating"] = review.rating
    return Response(resp, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def review_list(request, slug):
    """
    List reviews for the recipe.

    - Published recipes: fully public. Anyone (even anonymous) reads all reviews.
    - In-review recipes: blind until viewer has voted (unchanged behavior).
    - Owner and staff always see full history + moderator feedback.
    """
    from .models import ModerationAction
    recipe = Recipe.objects.select_related("author").get(slug=slug)
    all_reviews_qs = RecipeReview.objects.filter(recipe=recipe)
    total = all_reviews_qs.count()
    positive = all_reviews_qs.filter(is_positive=True).count()

    is_authed = request.user.is_authenticated
    has_voted = is_authed and all_reviews_qs.filter(reviewer=request.user).exists()
    is_owner_or_staff = is_authed and (
        request.user == recipe.author or request.user.is_staff
    )
    is_published = recipe.status == "published"

    # Average spoon rating (only from reviews that have a rating)
    rated_qs = all_reviews_qs.filter(rating__isnull=False)
    avg_rating = rated_qs.aggregate(avg=Avg("rating"))["avg"]

    # Rating distribution: {1: count, 2: count, ..., 5: count}
    dist_rows = rated_qs.values("rating").annotate(count=Count("id")).order_by("rating")
    rating_distribution = {i: 0 for i in range(1, 6)}
    for row in dist_rows:
        rating_distribution[row["rating"]] = row["count"]

    data = {
        "review_round": recipe.review_round,
        "total_votes": total,
        "positive_votes": positive,
        "threshold_met": total >= 5 and avg_rating is not None and avg_rating >= 4.0,
        "has_voted": has_voted,
        "average_rating": round(avg_rating, 1) if avg_rating is not None else None,
        "rating_distribution": rating_distribution,
        "rated_count": sum(rating_distribution.values()),
    }

    reveal_reviews = is_published or has_voted or is_owner_or_staff
    if reveal_reviews:
        data["reviews"] = [
            {
                "reviewer": r.reviewer.username,
                "is_positive": r.is_positive,
                "rating": r.rating,
                "comment": r.comment,
                "round": r.review_round,
                "created_at": r.created_at.isoformat(),
            }
            for r in all_reviews_qs.select_related("reviewer").order_by("review_round", "created_at")
        ]

    # Owner and staff see full history across all rounds + moderation feedback
    if is_owner_or_staff:
        all_reviews = all_reviews_qs.select_related("reviewer").order_by("review_round", "created_at")
        data["all_rounds"] = [
            {
                "reviewer": r.reviewer.username,
                "is_positive": r.is_positive,
                "rating": r.rating,
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
