from django.urls import path
from .views import notification_list, mark_read, mark_all_read, unread_count

urlpatterns = [
    path("notifications/", notification_list, name="notification-list"),
    path("notifications/mark-read/", mark_read, name="notification-mark-read"),
    path("notifications/mark-all-read/", mark_all_read, name="notification-mark-all-read"),
    path("notifications/unread-count/", unread_count, name="notification-unread-count"),
]
