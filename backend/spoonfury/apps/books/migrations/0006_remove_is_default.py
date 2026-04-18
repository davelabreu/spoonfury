# Step 3: Remove the old is_default field
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("books", "0005_populate_default_role"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="recipebook",
            name="is_default",
        ),
    ]
