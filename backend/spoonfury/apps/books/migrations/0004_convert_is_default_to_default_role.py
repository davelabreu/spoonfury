# Step 1: Add default_role field alongside is_default
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("books", "0003_create_default_collections"),
    ]

    operations = [
        migrations.AddField(
            model_name="recipebook",
            name="default_role",
            field=models.CharField(
                blank=True,
                choices=[("", "None"), ("forked", "Forked Recipes"), ("kitchen_sink", "Kitchen Sink")],
                default="",
                max_length=20,
            ),
        ),
    ]
