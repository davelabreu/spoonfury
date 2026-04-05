from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import RecipeViewSet, TagListView, force_publish, hot_recipes
from .views_fork import fork_recipe
from .views_upload import upload_recipe_image
from .views_kitchen import kitchen_detail, kitchen_invite, kitchen_revoke
from .views_review import submit_for_review, withdraw_review, review_vote, review_list
from .views_moderation import moderation_queue, moderation_approve, moderation_request_revision

router = DefaultRouter()
router.register(r"recipes", RecipeViewSet, basename="recipe")

urlpatterns = [
    # Fixed paths must come before the router's <slug> catch-all
    path("recipes/upload-image/", upload_recipe_image, name="recipe-upload-image"),
    path("recipes/hot/", hot_recipes, name="recipe-hot"),
    path("tags/", TagListView.as_view(), name="tag-list"),
] + router.urls + [
    path("recipes/<slug:slug>/fork/", fork_recipe, name="recipe-fork"),
    path("recipes/<slug:slug>/submit-for-review/", submit_for_review, name="recipe-submit-review"),
    path("recipes/<slug:slug>/withdraw-review/", withdraw_review, name="recipe-withdraw-review"),
    path("users/<str:username>/kitchen/", kitchen_detail, name="kitchen-detail"),
    path("users/<str:username>/kitchen/invite/", kitchen_invite, name="kitchen-invite"),
    path("users/<str:username>/kitchen/invite/<str:invitee_username>/", kitchen_revoke, name="kitchen-revoke"),
    path("recipes/<slug:slug>/review/", review_vote, name="recipe-review-vote"),
    path("recipes/<slug:slug>/reviews/", review_list, name="recipe-reviews-list"),
    path("moderation/queue/", moderation_queue, name="moderation-queue"),
    path("moderation/<slug:slug>/approve/", moderation_approve, name="moderation-approve"),
    path("moderation/<slug:slug>/request-revision/", moderation_request_revision, name="moderation-request-revision"),
    path("recipes/<slug:slug>/force-publish/", force_publish, name="recipe-force-publish"),
]
