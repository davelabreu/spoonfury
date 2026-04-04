"""Tests for the Notification model and notify helper."""
import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta
from spoonfury.apps.recipes.models import Recipe
from spoonfury.apps.notifications.models import Notification
from spoonfury.apps.notifications.helpers import notify

User = get_user_model()


@pytest.fixture
def recipe(user):
    return Recipe.objects.create(
        title="Notify Test", description="Desc", serves="4",
        ingredients=[], instructions="Cook it", category="soup", author=user,
    )


@pytest.mark.django_db
def test_create_notification(user, other_user, recipe):
    """A notification can be created with all fields."""
    n = Notification.objects.create(
        recipient=other_user,
        notification_type="review_requested",
        recipe=recipe,
        actor=user,
        message=f"{user.username} wants your feedback on {recipe.title}",
    )
    assert n.is_read is False
    assert n.recipient == other_user
    assert n.notification_type == "review_requested"


@pytest.mark.django_db
def test_notify_helper_creates_notification(user, other_user, recipe):
    """The notify() helper creates a notification."""
    notify(
        recipient=other_user,
        notification_type="review_requested",
        recipe=recipe,
        actor=user,
        message="Test notification",
    )
    assert Notification.objects.filter(recipient=other_user).count() == 1


@pytest.mark.django_db
def test_notifications_ordered_newest_first(user, other_user, recipe):
    """Notifications are ordered by -created_at."""
    now = timezone.now()
    n1 = Notification.objects.create(
        recipient=other_user, notification_type="review_requested",
        recipe=recipe, actor=user, message="First",
    )
    # Force n1 to be older so ordering is deterministic
    Notification.objects.filter(pk=n1.pk).update(created_at=now - timedelta(seconds=10))
    n2 = Notification.objects.create(
        recipient=other_user, notification_type="review_received",
        recipe=recipe, actor=user, message="Second",
    )
    notifications = list(Notification.objects.filter(recipient=other_user))
    assert notifications[0].pk == n2.pk  # newest first


@pytest.mark.django_db
def test_list_notifications(auth_client, user, other_user, recipe):
    """User can list their notifications."""
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="Test notification",
    )
    url = reverse("notification-list")
    response = auth_client.get(url)
    assert response.status_code == 200
    assert len(response.data) == 1


@pytest.mark.django_db
def test_list_notifications_unread_filter(auth_client, user, other_user, recipe):
    """Can filter to unread notifications only."""
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="Unread",
    )
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="Read", is_read=True,
    )
    url = reverse("notification-list") + "?unread=true"
    response = auth_client.get(url)
    assert len(response.data) == 1
    assert response.data[0]["message"] == "Unread"


@pytest.mark.django_db
def test_unread_count(auth_client, user, other_user, recipe):
    """Unread count endpoint returns correct count."""
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="N1",
    )
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="N2",
    )
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="N3", is_read=True,
    )
    url = reverse("notification-unread-count")
    response = auth_client.get(url)
    assert response.data["count"] == 2


@pytest.mark.django_db
def test_mark_read(auth_client, user, other_user, recipe):
    """Can mark specific notifications as read."""
    n1 = Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="N1",
    )
    n2 = Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="N2",
    )
    url = reverse("notification-mark-read")
    response = auth_client.post(url, {"ids": [n1.pk]}, format="json")
    assert response.status_code == 200
    n1.refresh_from_db()
    n2.refresh_from_db()
    assert n1.is_read is True
    assert n2.is_read is False


@pytest.mark.django_db
def test_mark_all_read(auth_client, user, other_user, recipe):
    """Can mark all notifications as read."""
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="N1",
    )
    Notification.objects.create(
        recipient=user, notification_type="review_received",
        recipe=recipe, actor=other_user, message="N2",
    )
    url = reverse("notification-mark-all-read")
    response = auth_client.post(url)
    assert response.status_code == 200
    assert Notification.objects.filter(recipient=user, is_read=False).count() == 0
