"""
Data migration: publish all existing recipes.

Before the test kitchen feature, all recipes were implicitly public.
This migration sets them to 'published' with published_at = created_at
to preserve their public visibility.
"""
from django.db import migrations


def publish_existing(apps, schema_editor):
    Recipe = apps.get_model("recipes", "Recipe")
    for recipe in Recipe.objects.all():
        recipe.status = "published"
        recipe.published_at = recipe.created_at
        recipe.save(update_fields=["status", "published_at"])


def unpublish_all(apps, schema_editor):
    Recipe = apps.get_model("recipes", "Recipe")
    Recipe.objects.all().update(status="draft", published_at=None)


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0003_add_test_kitchen_invite'),
    ]

    operations = [
        migrations.RunPython(publish_existing, unpublish_all),
    ]
