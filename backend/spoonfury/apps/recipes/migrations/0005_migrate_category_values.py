from django.db import migrations


CATEGORY_MAP = {
    "soup": "soup",
    "pasta": "pasta_noodles",
    "bake": "casserole_bake",
    "salad": "salad",
    "grill": "meat_seafood",
    "breakfast": "breakfast_bakery",
    "dessert": "dessert",
    "drink": "drink",
    "snack": "snack_app",
    "other": "other",
}


def migrate_categories_forward(apps, schema_editor):
    Recipe = apps.get_model("recipes", "Recipe")
    for old_val, new_val in CATEGORY_MAP.items():
        Recipe.objects.filter(category=old_val).update(category=new_val)


def migrate_categories_reverse(apps, schema_editor):
    REVERSE_MAP = {v: k for k, v in CATEGORY_MAP.items()}
    Recipe = apps.get_model("recipes", "Recipe")
    for new_val, old_val in REVERSE_MAP.items():
        Recipe.objects.filter(category=new_val).update(category=old_val)


class Migration(migrations.Migration):
    dependencies = [
        ("recipes", "0004_tag_recipe_tags"),
    ]

    operations = [
        migrations.RunPython(
            migrate_categories_forward,
            migrate_categories_reverse,
        ),
    ]
