from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import F
from django.shortcuts import get_object_or_404
from .models import Recipe
from .serializers import RecipeSerializer


def _count_ingredient_changes(original: list, forked: list) -> int:
    """Count how many ingredient *names* differ between original and fork."""
    original_names = {i["name"].strip().lower() for i in original}
    forked_names = {i["name"].strip().lower() for i in forked}
    added = forked_names - original_names
    removed = original_names - forked_names
    # Each swap = 1 remove + 1 add, count as 1 change
    changes = max(len(added), len(removed))
    return changes


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def fork_recipe(request, slug):
    """
    Fork (copy) a recipe into the current user's test kitchen.

    The forked recipe:
      - Defaults to 'draft' status (private, in the forker's test kitchen)
      - Preserves the parent_recipe reference for fork lineage
      - Allows up to 3 ingredient name changes from the original

    Request body (all optional, defaults to parent's values):
      - title: str
      - description: str
      - serves: str
      - ingredients: list[Ingredient]
      - instructions: str
      - notes: str
    """
    parent = get_object_or_404(Recipe, slug=slug)

    new_ingredients = request.data.get("ingredients", parent.ingredients)
    changes = _count_ingredient_changes(parent.ingredients, new_ingredients)

    if changes > 3:
        return Response(
            {"detail": f"Too many ingredient changes ({changes}). Maximum is 3."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    fork_data = {
        "title": request.data.get("title", f"{parent.title} (my version)"),
        "description": request.data.get("description", parent.description),
        "serves": request.data.get("serves", parent.serves),
        "ingredients": new_ingredients,
        "instructions": request.data.get("instructions", parent.instructions),
        "notes": request.data.get("notes", ""),
        "category": parent.category,  # Always locked
    }

    recipe = Recipe.objects.create(
        author=request.user,
        parent_recipe=parent,
        **fork_data,
    )

    # Auto-add to user's forked recipes collection
    from spoonfury.apps.books.models import RecipeBook, BookRecipe
    default_book, _ = RecipeBook.objects.get_or_create(
        owner=request.user,
        default_role="forked",
        defaults={"title": "Forked Recipes"},
    )
    order = default_book.bookrecipe_set.count()
    BookRecipe.objects.get_or_create(
        book=default_book, recipe=recipe, defaults={"order": order}
    )

    # Increment parent fork count (atomic to avoid race conditions)
    Recipe.objects.filter(pk=parent.pk).update(fork_count=F("fork_count") + 1)

    serializer = RecipeSerializer(recipe, context={"request": request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)
