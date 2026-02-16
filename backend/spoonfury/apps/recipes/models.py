from django.db import models
from django.conf import settings
from django.utils.text import slugify


CATEGORY_CHOICES = [
    ("soup", "Soup"),
    ("pasta", "Pasta"),
    ("bake", "Bake"),
    ("salad", "Salad"),
    ("grill", "Grill"),
    ("breakfast", "Breakfast"),
    ("dessert", "Dessert"),
    ("drink", "Drink"),
    ("snack", "Snack"),
    ("other", "Other"),
]


class Recipe(models.Model):
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=280)
    serves = models.CharField(max_length=50)
    ingredients = models.JSONField(default=list)
    instructions = models.TextField()
    notes = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recipes",
    )
    parent_recipe = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="forks",
    )
    fork_count = models.PositiveIntegerField(default=0)
    slug = models.SlugField(unique=True, max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            n = 1
            while Recipe.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)
