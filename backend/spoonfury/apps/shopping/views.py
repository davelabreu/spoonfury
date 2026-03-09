from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from spoonfury.apps.recipes.models import Recipe
from .models import ShoppingList, ShoppingListItem
from .serializers import ShoppingListSerializer, ShoppingListItemSerializer


class ShoppingListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        shopping_list, _ = ShoppingList.objects.prefetch_related("items").get_or_create(owner=request.user)
        return Response(ShoppingListSerializer(shopping_list).data)


class ShoppingListAddView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        shopping_list, _ = ShoppingList.objects.get_or_create(owner=request.user)
        recipe_slug = request.data.get("recipe_slug", "")
        recipe_title = request.data.get("recipe_title", "")
        ingredients = request.data.get("ingredients", [])

        if not recipe_slug:
            return Response({"error": "recipe_slug is required"}, status=status.HTTP_400_BAD_REQUEST)

        recipe = Recipe.objects.filter(slug=recipe_slug).first()

        # Pre-fetch existing names for this recipe to avoid N+1 EXISTS queries
        existing_names = set(
            shopping_list.items.filter(recipe_slug=recipe_slug)
            .values_list("name", flat=True)
        )

        added = 0
        for ing in ingredients:
            name = ing.get("name", "").strip()
            if not name or name in existing_names:
                continue
            ShoppingListItem.objects.create(
                shopping_list=shopping_list,
                recipe=recipe,
                recipe_title=recipe_title,
                recipe_slug=recipe_slug,
                name=name,
                quantity=ing.get("quantity", ""),
                unit=ing.get("unit", ""),
                note=ing.get("note", ""),
            )
            existing_names.add(name)
            added += 1

        in_list = shopping_list.items.filter(recipe_slug=recipe_slug).exists()
        return Response({"added": added, "already_in_list": in_list}, status=status.HTTP_201_CREATED)


class ShoppingListStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recipe_slug = request.query_params.get("recipe_slug", "")
        if not recipe_slug:
            return Response({"error": "recipe_slug is required"}, status=status.HTTP_400_BAD_REQUEST)
        shopping_list, _ = ShoppingList.objects.get_or_create(owner=request.user)
        in_list = shopping_list.items.filter(recipe_slug=recipe_slug).exists()
        return Response({"in_list": in_list})


class ShoppingListRemoveRecipeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        recipe_slug = request.data.get("recipe_slug", "")
        if not recipe_slug:
            return Response({"error": "recipe_slug is required"}, status=status.HTTP_400_BAD_REQUEST)
        shopping_list, _ = ShoppingList.objects.get_or_create(owner=request.user)
        deleted, _ = shopping_list.items.filter(recipe_slug=recipe_slug).delete()
        shopping_list.save(update_fields=["updated_at"])
        return Response({"removed": deleted})


class ShoppingListClearView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        shopping_list, _ = ShoppingList.objects.get_or_create(owner=request.user)
        shopping_list.items.all().delete()
        shopping_list.save(update_fields=["updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class ShoppingListItemView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_item(self, pk, user):
        return get_object_or_404(ShoppingListItem, pk=pk, shopping_list__owner=user)

    def patch(self, request, pk):
        item = self._get_item(pk, request.user)
        item.is_checked = request.data.get("is_checked", item.is_checked)
        item.save(update_fields=["is_checked"])
        item.shopping_list.save(update_fields=["updated_at"])
        return Response(ShoppingListItemSerializer(item).data)

    def delete(self, request, pk):
        item = self._get_item(pk, request.user)
        shopping_list = item.shopping_list
        item.delete()
        shopping_list.save(update_fields=["updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)
