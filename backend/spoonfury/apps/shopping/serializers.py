from collections import defaultdict
from rest_framework import serializers
from .models import ShoppingList, ShoppingListItem, RecipeMultiplier


class ShoppingListItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShoppingListItem
        fields = [
            "id", "recipe_title", "recipe_slug",
            "name", "quantity", "unit", "note",
            "is_checked", "added_at",
        ]
        read_only_fields = [
            "id", "recipe_title", "recipe_slug",
            "name", "quantity", "unit", "note", "added_at",
        ]


class ShoppingListSerializer(serializers.ModelSerializer):
    items_by_recipe = serializers.SerializerMethodField()
    total_items = serializers.SerializerMethodField()

    class Meta:
        model = ShoppingList
        fields = ["updated_at", "total_items", "items_by_recipe"]

    def get_total_items(self, obj):
        return len(obj.items.all())  # Uses prefetch cache if prefetch_related("items") was called

    def get_items_by_recipe(self, obj):
        groups: dict[str, list] = defaultdict(list)
        for item in obj.items.all():
            groups[item.recipe_slug].append(item)

        multipliers = {
            m.recipe_slug: m.multiplier
            for m in RecipeMultiplier.objects.filter(shopping_list=obj)
        }

        return [
            {
                "recipe_slug": slug,
                "recipe_title": items[0].recipe_title,
                "multiplier": multipliers.get(slug, 1),
                "items": ShoppingListItemSerializer(items, many=True).data,
            }
            for slug, items in groups.items()
        ]
