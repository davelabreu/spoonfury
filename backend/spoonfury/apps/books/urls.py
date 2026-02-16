from rest_framework.routers import DefaultRouter
from .views import RecipeBookViewSet

router = DefaultRouter()
router.register(r"books", RecipeBookViewSet, basename="book")

urlpatterns = router.urls
