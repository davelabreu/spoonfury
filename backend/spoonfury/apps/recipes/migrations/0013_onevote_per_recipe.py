from django.db import migrations, models


def dedupe_reviews(apps, schema_editor):
    """Keep only the most-recent (recipe, reviewer) row before the unique constraint lands."""
    RecipeReview = apps.get_model("recipes", "RecipeReview")
    seen = {}
    # Order by -created_at so the first row we see for each (recipe, reviewer) is the newest.
    for review in RecipeReview.objects.order_by("-created_at"):
        key = (review.recipe_id, review.reviewer_id)
        if key in seen:
            review.delete()
        else:
            seen[key] = review.pk


def noop_reverse(apps, schema_editor):
    # Dedup is destructive — deleted rows cannot be reconstructed on reverse.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("recipes", "0012_weeklyplan_weeklyplanitem"),
    ]

    operations = [
        migrations.RunPython(dedupe_reviews, noop_reverse),
        migrations.AlterUniqueTogether(
            name="recipereview",
            unique_together=set(),
        ),
        migrations.AddConstraint(
            model_name="recipereview",
            constraint=models.UniqueConstraint(
                fields=["recipe", "reviewer"],
                name="one_vote_per_reviewer_per_recipe",
            ),
        ),
    ]
