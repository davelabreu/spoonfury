from django.contrib import admin
from .models import Recipe, Tag, TestKitchenInvite, RecipeReview, ModerationAction, AuthorStrike


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "kind", "slug"]
    list_filter = ["kind"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    """Admin view for recipes with status filtering and read-only audit fields."""
    list_display = ["title", "author", "category", "status", "fork_count", "created_at"]
    list_filter = ["category", "status", "tags"]
    search_fields = ["title", "author__username"]
    readonly_fields = ["slug", "fork_count", "created_at", "updated_at", "published_at"]
    filter_horizontal = ["tags"]


@admin.register(TestKitchenInvite)
class TestKitchenInviteAdmin(admin.ModelAdmin):
    """Admin view for test kitchen sharing invitations."""
    list_display = ["owner", "invitee", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["owner__username", "invitee__username"]


@admin.register(RecipeReview)
class RecipeReviewAdmin(admin.ModelAdmin):
    """Admin view for community recipe votes."""
    list_display = ["recipe", "reviewer", "review_round", "is_positive", "created_at"]
    list_filter = ["is_positive", "review_round"]
    search_fields = ["recipe__title", "reviewer__username"]


@admin.register(ModerationAction)
class ModerationActionAdmin(admin.ModelAdmin):
    """Admin view for moderator decisions on recipes."""
    list_display = ["recipe", "moderator", "action", "review_round", "created_at"]
    list_filter = ["action"]
    search_fields = ["recipe__title", "moderator__username"]


@admin.register(AuthorStrike)
class AuthorStrikeAdmin(admin.ModelAdmin):
    """Admin view for author strikes issued during moderation."""
    list_display = ["author", "recipe", "created_at"]
    search_fields = ["author__username", "recipe__title"]
