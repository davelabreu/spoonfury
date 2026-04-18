# Step 2: Copy is_default data to default_role, create kitchen sink collections
from django.db import migrations


def populate_default_role(apps, schema_editor):
    RecipeBook = apps.get_model("books", "RecipeBook")
    User = apps.get_model("users", "User")

    # Convert existing is_default=True to default_role="forked"
    RecipeBook.objects.filter(is_default=True).update(default_role="forked")

    # Create kitchen sink collection for every user who doesn't have one
    for user in User.objects.all():
        RecipeBook.objects.get_or_create(
            owner=user,
            default_role="kitchen_sink",
            defaults={"title": f"@{user.username}'s Kitchen Sink"},
        )


class Migration(migrations.Migration):

    dependencies = [
        ("books", "0004_convert_is_default_to_default_role"),
    ]

    operations = [
        migrations.RunPython(populate_default_role, migrations.RunPython.noop),
    ]
