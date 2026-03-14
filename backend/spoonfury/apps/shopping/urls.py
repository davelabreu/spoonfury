from django.urls import path
from .views import (
    ShoppingListView,
    ShoppingListAddView,
    ShoppingListStatusView,
    ShoppingListRemoveRecipeView,
    RecipeMultiplierView,
    ShoppingListClearView,
    ShoppingListItemView,
)

urlpatterns = [
    path("shopping-list/", ShoppingListView.as_view(), name="shopping-list"),
    path("shopping-list/add/", ShoppingListAddView.as_view(), name="shopping-list-add"),
    path("shopping-list/status/", ShoppingListStatusView.as_view(), name="shopping-list-status"),
    path("shopping-list/remove-recipe/", ShoppingListRemoveRecipeView.as_view(), name="shopping-list-remove-recipe"),
    path("shopping-list/multiplier/", RecipeMultiplierView.as_view(), name="shopping-list-multiplier"),
    path("shopping-list/clear/", ShoppingListClearView.as_view(), name="shopping-list-clear"),
    path("shopping-list/items/<int:pk>/", ShoppingListItemView.as_view(), name="shopping-item-detail"),
]
