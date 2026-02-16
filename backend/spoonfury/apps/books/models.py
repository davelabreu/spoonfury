import uuid
from django.db import models
from django.conf import settings
from spoonfury.apps.recipes.models import Recipe


class RecipeBook(models.Model):
    title = models.CharField(max_length=100)
    cover_image = models.ImageField(upload_to="book_covers/", blank=True, null=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recipe_books",
    )
    recipes = models.ManyToManyField(Recipe, through="BookRecipe", blank=True)
    is_public = models.BooleanField(default=False)
    share_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} by {self.owner.username}"


class BookRecipe(models.Model):
    """Ordered join table for recipes in a book."""
    book = models.ForeignKey(RecipeBook, on_delete=models.CASCADE)
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        unique_together = [["book", "recipe"]]
