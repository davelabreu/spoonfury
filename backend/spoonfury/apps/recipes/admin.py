from django.contrib import admin
from .models import Recipe, Tag


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "kind", "slug"]
    list_filter = ["kind"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "category", "fork_count", "created_at"]
    list_filter = ["category", "tags"]
    search_fields = ["title", "author__username"]
    readonly_fields = ["slug", "fork_count", "created_at", "updated_at"]
    filter_horizontal = ["tags"]
