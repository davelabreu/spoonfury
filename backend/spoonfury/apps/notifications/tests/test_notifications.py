"""Tests for the Notification model and notify helper."""
import pytest
from django.contrib.auth import get_user_model
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
