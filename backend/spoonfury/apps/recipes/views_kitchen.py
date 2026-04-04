"""
API views for the Test Kitchen feature.

Provides endpoints for:
  - Viewing a user's test kitchen (draft recipes)
  - Inviting a user to view your test kitchen
  - Revoking a user's test kitchen access
"""
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from .models import Recipe, TestKitchenInvite
from .serializers import RecipeSerializer

User = get_user_model()


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def kitchen_detail(request, username):
    """
    View a user's test kitchen (their draft recipes).

    Access rules:
      - The owner can always see their own kitchen
      - Users with a TestKitchenInvite from the owner can see it
      - Everyone else gets 403
    """
    owner = get_object_or_404(User, username=username)

    is_owner = request.user == owner
    is_invitee = TestKitchenInvite.objects.filter(
        owner=owner, invitee=request.user
    ).exists()

    if not is_owner and not is_invitee:
        raise PermissionDenied("You don't have access to this test kitchen.")

    drafts = Recipe.objects.filter(
        author=owner, status="draft"
    ).select_related("author").order_by("-updated_at")

    serializer = RecipeSerializer(drafts, many=True, context={"request": request})
    return Response({
        "owner": owner.username,
        "count": drafts.count(),
        "recipes": serializer.data,
    })


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def kitchen_invite(request, username):
    """
    Invite a user to view your test kitchen.

    Request body: { "invitee_username": "..." }
    Only the kitchen owner can send invites.
    """
    owner = get_object_or_404(User, username=username)

    if request.user != owner:
        raise PermissionDenied("You can only invite to your own test kitchen.")

    invitee_username = request.data.get("invitee_username")
    if not invitee_username:
        return Response(
            {"detail": "invitee_username is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    invitee = get_object_or_404(User, username=invitee_username)

    if invitee == owner:
        return Response(
            {"detail": "You can't invite yourself."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    invite, created = TestKitchenInvite.objects.get_or_create(
        owner=owner, invitee=invitee
    )

    if not created:
        return Response(
            {"detail": "User already invited."},
            status=status.HTTP_200_OK,
        )

    return Response(
        {"detail": f"Invited {invitee.username} to your test kitchen."},
        status=status.HTTP_201_CREATED,
    )


@api_view(["DELETE"])
@permission_classes([permissions.IsAuthenticated])
def kitchen_revoke(request, username, invitee_username):
    """
    Revoke a user's access to your test kitchen.

    Only the kitchen owner can revoke invites.
    """
    owner = get_object_or_404(User, username=username)

    if request.user != owner:
        raise PermissionDenied("You can only manage your own test kitchen.")

    invitee = get_object_or_404(User, username=invitee_username)
    invite = get_object_or_404(TestKitchenInvite, owner=owner, invitee=invitee)
    invite.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)
