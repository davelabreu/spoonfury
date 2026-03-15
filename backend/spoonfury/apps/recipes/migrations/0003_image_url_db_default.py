from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('recipes', '0002_add_image_url'),
    ]

    operations = [
        migrations.RunSQL(
            sql="ALTER TABLE recipes_recipe ALTER COLUMN image_url SET DEFAULT '';",
            reverse_sql="ALTER TABLE recipes_recipe ALTER COLUMN image_url DROP DEFAULT;",
        ),
    ]
