from rest_framework import serializers
from .models import WeeklyPlan, WeeklyPlanItem
from .serializers import RecipeSerializer

class WeeklyPlanItemSerializer(serializers.ModelSerializer):
    """
    Serializer for individual items (recipes) in a weekly plan.
    Includes the full recipe details via RecipeSerializer.
    """
    recipe = RecipeSerializer(read_only=True)

    class Meta:
        model = WeeklyPlanItem
        fields = ["id", "day", "order", "recipe"]


class WeeklyPlanSerializer(serializers.ModelSerializer):
    """
    Serializer for the entire weekly plan.
    Includes all scheduled items for the week.
    """
    owner = serializers.CharField(source="owner.username", read_only=True)
    items = WeeklyPlanItemSerializer(many=True, read_only=True)

    class Meta:
        model = WeeklyPlan
        fields = ["id", "owner", "updated_at", "items"]
