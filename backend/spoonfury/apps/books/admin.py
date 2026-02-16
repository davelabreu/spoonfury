from django.contrib import admin
from .models import RecipeBook, BookRecipe


class BookRecipeInline(admin.TabularInline):
    model = BookRecipe
    extra = 0


@admin.register(RecipeBook)
class RecipeBookAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "is_public", "created_at"]
    inlines = [BookRecipeInline]
