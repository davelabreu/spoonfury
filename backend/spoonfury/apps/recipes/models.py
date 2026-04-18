from django.db import models
from django.conf import settings
from django.utils.text import slugify


STATUS_CHOICES = [
    ("draft", "Draft"),
    ("in_review", "In Review"),
    ("mod_queue", "Moderation Queue"),
    ("revision_requested", "Revision Requested"),
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
        max_length=20,
        choices=STATUS_CHOICES,
        default="draft",
        db_index=True,
    )
    published_at = models.DateTimeField(null=True, blank=True)
    review_round = models.PositiveIntegerField(
        default=0,
        help_text="0 = never submitted. Incremented on each submit-for-review.",
    )

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


class TestKitchenInvite(models.Model):
    """
    Grants a specific user (invitee) read access to another user's (owner)
    test kitchen — all of the owner's draft recipes become visible to the
    invitee. Access is all-or-nothing; no per-recipe granularity.

    The unique constraint on (owner, invitee) prevents duplicate invites.
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="kitchen_invites_sent",
        help_text="The user whose test kitchen is being shared.",
    )
    invitee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="kitchen_invites_received",
        help_text="The user who gains read access to the owner's drafts.",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("owner", "invitee")]

    def __str__(self):
        return f"{self.owner.username} → {self.invitee.username}"


class RecipeReview(models.Model):
    """
    Records a community member's vote on a recipe.
    One vote per reviewer per recipe, forever — review_round is retained
    as a historical timestamp but does not partition uniqueness. The gate
    math in views_review.py counts positive reviews across the recipe's
    entire lifetime (see _check_threshold).
    """

    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name="reviews",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    review_round = models.PositiveIntegerField()
    is_positive = models.BooleanField()
    rating = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        help_text="1-5 spoon rating. Only used for published recipes.",
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["recipe", "reviewer"],
                name="one_vote_per_reviewer_per_recipe",
            ),
        ]

    def __str__(self):
        verdict = "+" if self.is_positive else "-"
        return f"{verdict} {self.reviewer.username} → {self.recipe.title} (round {self.review_round})"


MODERATION_ACTION_CHOICES = [
    ("approved", "Approved"),
    ("revision_requested", "Revision Requested"),
    ("force_published", "Force Published"),
]


class ModerationAction(models.Model):
    """
    Immutable audit log entry recording a moderator's decision on a recipe.
    Each action is tied to a specific review_round so the full history of
    moderation decisions is preserved even across multiple revision cycles.
    """

    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name="moderation_actions",
    )
    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
    )
    action = models.CharField(
        max_length=20,
        choices=MODERATION_ACTION_CHOICES,
    )
    feedback = models.TextField(blank=True)
    review_round = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.moderator.username} {self.action} → {self.recipe.title} (round {self.review_round})"


class AuthorStrike(models.Model):
    """
    Issued to a recipe author when a moderator sends their recipe back for
    revision. Strikes accumulate on the author's profile and can be used to
    gate publishing privileges. One strike per ModerationAction (OneToOne).
    """

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="strikes",
    )
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
    )
    moderation_action = models.OneToOneField(
        ModerationAction,
        on_delete=models.CASCADE,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Strike: {self.author.username} ← {self.recipe.title}"


DAY_CHOICES = [
    (0, "Monday"),
    (1, "Tuesday"),
    (2, "Wednesday"),
    (3, "Thursday"),
    (4, "Friday"),
    (5, "Saturday"),
    (6, "Sunday"),
]


class WeeklyPlan(models.Model):
    """
    A user's weekly meal plan. Each user has exactly one plan,
    which serves as a container for their scheduled recipes.
    """

    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="weekly_plan",
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Weekly Plan for {self.owner.username}"


class WeeklyPlanItem(models.Model):
    """
    A single recipe scheduled within a user's WeeklyPlan.
    Each item is assigned to a specific day of the week and an ordering.
    """

    plan = models.ForeignKey(
        WeeklyPlan,
        on_delete=models.CASCADE,
        related_name="items",
    )
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
    )
    day = models.IntegerField(choices=DAY_CHOICES)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["day", "order"]

    def __str__(self):
        day_name = dict(DAY_CHOICES).get(self.day, "Unknown Day")
        return f"{day_name}: {self.recipe.title} (Plan: {self.plan.owner.username})"
