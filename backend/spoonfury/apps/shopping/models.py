from django.db import models
from django.conf import settings


class ShoppingList(models.Model):
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shopping_list",
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Shopping list for {self.owner.username}"


class ShoppingListItem(models.Model):
    shopping_list = models.ForeignKey(
        ShoppingList, on_delete=models.CASCADE, related_name="items"
    )
    recipe = models.ForeignKey(
        "recipes.Recipe",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="+",
    )
    # Denormalized: survives recipe deletion, used for display and linking
    recipe_title = models.CharField(max_length=100)
    recipe_slug = models.SlugField(max_length=120)

    # Copied from recipe ingredient at add time
    name = models.CharField(max_length=200)
    quantity = models.CharField(max_length=50, blank=True)
    unit = models.CharField(max_length=50, blank=True)
    note = models.CharField(max_length=200, blank=True)

    # "Picked up at store" — separate from recipe-page "I have it" checkbox
    is_checked = models.BooleanField(default=False)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["added_at"]

    def __str__(self):
        return f"{self.name} ({self.recipe_title})"


class RecipeMultiplier(models.Model):
    """Tracks how many servings of a recipe the user wants to buy."""
    shopping_list = models.ForeignKey(
        ShoppingList, on_delete=models.CASCADE, related_name="multipliers"
    )
    recipe_slug = models.SlugField(max_length=120)
    multiplier = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ("shopping_list", "recipe_slug")

    def __str__(self):
        return f"{self.recipe_slug} x{self.multiplier}"
