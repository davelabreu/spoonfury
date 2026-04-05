from django.db import migrations


FILTER_TAGS = {
    "cuisine": [
        "european-iberian",
        "latin-american",
    ],
    "dietary": [
        "vegetarian-vegan",
        "gluten-free-dairy-free",
        "high-protein-keto",
    ],
    "vibe": [
        "quick-easy",
        "health-fitness",
        "weeknight-staples",
        "meal-prep-freezer",
    ],
}

# Display names for tags (what the user sees)
DISPLAY_NAMES = {
    "european-iberian": "european & iberian",
    "latin-american": "latin american",
    "vegetarian-vegan": "vegetarian / vegan",
    "gluten-free-dairy-free": "gluten-free / dairy-free",
    "high-protein-keto": "high protein / keto",
    "quick-easy": "quick & easy",
    "health-fitness": "health & fitness",
    "weeknight-staples": "weeknight staples",
    "meal-prep-freezer": "meal prep / freezer",
}


def seed_filter_tags_forward(apps, schema_editor):
    Tag = apps.get_model("recipes", "Tag")
    for kind, slugs in FILTER_TAGS.items():
        for tag_slug in slugs:
            name = DISPLAY_NAMES.get(tag_slug, tag_slug)
            Tag.objects.get_or_create(
                slug=tag_slug,
                defaults={"name": name, "kind": kind},
            )


def seed_filter_tags_reverse(apps, schema_editor):
    Tag = apps.get_model("recipes", "Tag")
    all_slugs = [s for slugs in FILTER_TAGS.values() for s in slugs]
    Tag.objects.filter(slug__in=all_slugs).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("recipes", "0010_moderationaction_authorstrike_recipereview"),
    ]

    operations = [
        migrations.RunPython(seed_filter_tags_forward, seed_filter_tags_reverse),
    ]
