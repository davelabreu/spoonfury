from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "spoonfury.apps.users"
    label = "users"

    def ready(self):
        import spoonfury.apps.users.signals  # noqa: F401
