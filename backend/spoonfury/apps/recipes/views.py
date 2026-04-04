from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.generics import ListAPIView
from django.db.models import Q
from .models import Recipe, Tag
from .serializers import RecipeSerializer, TagSerializer
from .filters import RecipeFilter


class RecipeViewSet(viewsets.ModelViewSet):
    """
    CRUD viewset for recipes with privacy-aware queryset filtering.

    Visibility rules:
      - Unauthenticated: only published recipes
      - Authenticated (non-owner): only published recipes
      - Owner: all their own recipes (draft + published)

    Write/delete operations are restricted to the recipe's author.
    """

    serializer_class = RecipeSerializer
    lookup_field = "slug"
    # Filter backends set per-ViewSet (not globally) to avoid side effects on other apps
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = RecipeFilter
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "fork_count", "title"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """
        Return recipes filtered by the viewer's access level.

        Owners see all their own recipes. Everyone else sees only published.
        """
        base = (
            Recipe.objects
            .select_related("author", "parent_recipe__author")
            .prefetch_related("tags")
        )
        user = self.request.user

        if user.is_authenticated:
            return base.filter(Q(status="published") | Q(author=user))
        return base.filter(status="published")

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_update(self, serializer):
        if serializer.instance.author != self.request.user:
            raise PermissionDenied("You can only edit your own recipes.")
        serializer.save()

    def perform_destroy(self, instance):
        if instance.author != self.request.user:
            raise PermissionDenied("You can only delete your own recipes.")
        instance.delete()


class TagListView(ListAPIView):
    serializer_class = TagSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        qs = Tag.objects.all()
        kind = self.request.query_params.get("kind")
        if kind:
            qs = qs.filter(kind=kind)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs
