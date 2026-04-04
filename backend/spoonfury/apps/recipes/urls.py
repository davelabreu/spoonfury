from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import RecipeViewSet, TagListView
from .views_fork import fork_recipe
from .views_upload import upload_recipe_image
from .views_kitchen import kitchen_detail, kitchen_invite, kitchen_revoke

router = DefaultRouter()
router.register(r"recipes", RecipeViewSet, basename="recipe")

urlpatterns = [
    # Fixed paths must come before the router's <slug> catch-all
    path("recipes/upload-image/", upload_recipe_image, name="recipe-upload-image"),
    path("tags/", TagListView.as_view(), name="tag-list"),
] + router.urls + [
    path("recipes/<slug:slug>/fork/", fork_recipe, name="recipe-fork"),
    path("users/<str:username>/kitchen/", kitchen_detail, name="kitchen-detail"),
    path("users/<str:username>/kitchen/invite/", kitchen_invite, name="kitchen-invite"),
    path("users/<str:username>/kitchen/invite/<str:invitee_username>/", kitchen_revoke, name="kitchen-revoke"),
]
