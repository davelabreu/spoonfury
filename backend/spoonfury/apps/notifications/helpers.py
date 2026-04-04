from .models import Notification


def notify(recipient, notification_type, recipe, actor, message):
    """Create a single notification. Used as a side effect of state transitions."""
    return Notification.objects.create(
        recipient=recipient, notification_type=notification_type,
        recipe=recipe, actor=actor, message=message,
    )
