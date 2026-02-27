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
        shopping_list, _ = ShoppingList.objects.get_or_create(owner=request.user)
        return Response(ShoppingListSerializer(shopping_list).data)


class ShoppingListAddView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        shopping_list, _ = ShoppingList.objects.get_or_create(owner=request.user)
        recipe_slug = request.data.get("recipe_slug", "")
        recipe_title = request.data.get("recipe_title", "")
        ingredients = request.data.get("ingredients", [])

        recipe = Recipe.objects.filter(slug=recipe_slug).first()
        added = 0

        for ing in ingredients:
            name = ing.get("name", "").strip()
            if not name:
                continue
            # Skip duplicates within the same recipe
            if not shopping_list.items.filter(recipe_slug=recipe_slug, name=name).exists():
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
                added += 1

        return Response({"added": added}, status=status.HTTP_200_OK)


class ShoppingListClearView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        shopping_list, _ = ShoppingList.objects.get_or_create(owner=request.user)
        shopping_list.items.all().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ShoppingListItemView(APIView):
    permission_classes = [IsAuthenticated]

    def _get_item(self, pk, user):
        return get_object_or_404(ShoppingListItem, pk=pk, shopping_list__owner=user)

    def patch(self, request, pk):
        item = self._get_item(pk, request.user)
        item.is_checked = request.data.get("is_checked", item.is_checked)
        item.save(update_fields=["is_checked"])
        return Response(ShoppingListItemSerializer(item).data)

    def delete(self, request, pk):
        item = self._get_item(pk, request.user)
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
