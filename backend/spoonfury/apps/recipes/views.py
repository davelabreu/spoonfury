from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.generics import ListAPIView
from .models import Recipe, Tag
from .serializers import RecipeSerializer, TagSerializer
from .filters import RecipeFilter


class RecipeViewSet(viewsets.ModelViewSet):
    queryset = (
        Recipe.objects
        .select_related("author", "parent_recipe__author")
        .prefetch_related("tags")
        .all()
    )
    lookup_field = "slug"
    serializer_class = RecipeSerializer
    # Filter backends set per-ViewSet (not globally) to avoid side effects on other apps
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = RecipeFilter
    search_fields = ["title", "description"]
    ordering_fields = ["created_at", "fork_count", "title"]
    ordering = ["-created_at"]

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
