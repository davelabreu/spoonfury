from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import RecipeViewSet
from .views_fork import fork_recipe
from .views_upload import upload_recipe_image

router = DefaultRouter()
router.register(r"recipes", RecipeViewSet, basename="recipe")

urlpatterns = router.urls + [
    path("recipes/<slug:slug>/fork/", fork_recipe, name="recipe-fork"),
    path("recipes/upload-image/", upload_recipe_image, name="recipe-upload-image"),
]
