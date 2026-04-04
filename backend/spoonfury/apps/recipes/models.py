from django.db import models
from django.conf import settings
from django.utils.text import slugify


STATUS_CHOICES = [
    ("draft", "Draft"),
    ("published", "Published"),
]


CATEGORY_CHOICES = [
    ("sandwich_burger", "Sandwiches & Burgers"),
    ("pizza", "Pizza & Flatbreads"),
    ("soup", "Soup & Stews"),
    ("salad", "Salads"),
    ("pasta_noodles", "Pasta & Noodles"),
    ("meat_seafood", "Meat & Seafood"),
    ("bowl", "Bowls"),
    ("casserole_bake", "Casseroles & Bakes"),
    ("side_dish", "Side Dishes"),
    ("sauce_condiment", "Sauces & Condiments"),
    ("breakfast_bakery", "Breakfast & Bakery"),
    ("dessert", "Desserts"),
    ("drink", "Drinks"),
    ("snack_app", "Snacks & Appetizers"),
    ("other", "Other"),
]


TAG_KIND_CHOICES = [
    ("cuisine", "Cuisine"),
    ("dietary", "Dietary"),
    ("ingredient", "Ingredient"),
    ("vibe", "Vibe"),
]


class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    kind = models.CharField(max_length=20, choices=TAG_KIND_CHOICES, default="vibe")

    class Meta:
        ordering = ["kind", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.name = self.name.lower().strip()
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


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
    image_url = models.URLField(blank=True, default="")
    tags = models.ManyToManyField("Tag", blank=True, related_name="recipes")
    slug = models.SlugField(unique=True, max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # --- Privacy / publish flow ---
    # Recipes start as "draft" (private, in the author's test kitchen).
    # When the author "perfects" a recipe, status flips to "published"
    # and published_at is set by the publish endpoint.
    status = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default="draft",
        db_index=True,
    )
    published_at = models.DateTimeField(null=True, blank=True)

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
