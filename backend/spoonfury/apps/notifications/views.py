"""API views for in-app notifications. All require auth, scoped to current user."""
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def notification_list(request):
    """List current user's notifications (newest first, max 50). Supports ?unread=true."""
    qs = Notification.objects.filter(recipient=request.user).select_related("actor", "recipe")
    if request.query_params.get("unread") == "true":
        qs = qs.filter(is_read=False)
    return Response(NotificationSerializer(qs[:50], many=True).data)


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_read(request):
    """Mark specific notifications as read. Body: {"ids": [1,2,3]}"""
    ids = request.data.get("ids", [])
    if not ids:
        return Response({"detail": "ids is required."}, status=status.HTTP_400_BAD_REQUEST)
    updated = Notification.objects.filter(recipient=request.user, pk__in=ids).update(is_read=True)
    return Response({"updated": updated})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def mark_all_read(request):
    """Mark all of the current user's notifications as read."""
    updated = Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
    return Response({"updated": updated})


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def unread_count(request):
    """Lightweight polling endpoint. Returns {"count": N}."""
    count = Notification.objects.filter(recipient=request.user, is_read=False).count()
    return Response({"count": count})
