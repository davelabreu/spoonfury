from django.db import migrations


def create_defaults(apps, schema_editor):
    User = apps.get_model("users", "User")
    RecipeBook = apps.get_model("books", "RecipeBook")
    for user in User.objects.all():
        RecipeBook.objects.get_or_create(
            owner=user,
            is_default=True,
            defaults={"title": "Forked Recipes"},
        )


def remove_defaults(apps, schema_editor):
    RecipeBook = apps.get_model("books", "RecipeBook")
    RecipeBook.objects.filter(is_default=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("books", "0002_recipebook_is_default"),
        ("users", "0002_user_avatar_user_bio_user_display_name"),
    ]

    operations = [
        migrations.RunPython(create_defaults, remove_defaults),
    ]
