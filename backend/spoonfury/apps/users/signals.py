from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_default_collections(sender, instance, created, **kwargs):
    if created:
        from spoonfury.apps.books.models import RecipeBook
        RecipeBook.objects.get_or_create(
            owner=instance,
            default_role="forked",
            defaults={"title": "Forked Recipes"},
        )
        RecipeBook.objects.get_or_create(
            owner=instance,
            default_role="kitchen_sink",
            defaults={"title": f"@{instance.username}'s Kitchen Sink"},
        )
