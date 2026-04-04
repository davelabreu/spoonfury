from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework import status as http_status
from django.db.models import Q
from .models import Recipe, Tag, TestKitchenInvite, ModerationAction
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

        Visibility rules:
          - Owner: sees all their own recipes (draft + published)
          - Test kitchen invitee: sees the inviter's drafts
          - Everyone else: published only
        """
        base = (
            Recipe.objects
            .select_related("author", "parent_recipe__author")
            .prefetch_related("tags")
        )
        user = self.request.user

        if user.is_authenticated:
            # Users whose kitchens this user has been invited to
            invited_owner_ids = TestKitchenInvite.objects.filter(
                invitee=user
            ).values_list("owner_id", flat=True)

            return base.filter(
                Q(status="published")
                | Q(author=user)  # own drafts
                | Q(author_id__in=invited_owner_ids, status="draft")  # invited kitchens
            ).distinct()

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

    @action(detail=True, methods=["post"], url_path="publish", url_name="publish")
    def publish(self, request, slug=None):
        """
        Publish a draft recipe after validating the checklist gate.

        Gate criteria (all must pass):
          - At least 2 ingredients with non-empty names
          - Instructions at least 20 characters long
          - Description is non-empty
          - Category is set to a valid choice

        Returns 200 with updated recipe on success, 400 with error list on failure.
        """
        recipe = self.get_object()
        if recipe.author != request.user:
            raise PermissionDenied("You can only publish your own recipes.")

        errors = []
        valid_ingredients = [i for i in recipe.ingredients if i.get("name", "").strip()]
        if len(valid_ingredients) < 2:
            errors.append("At least 2 ingredients required (found %d)." % len(valid_ingredients))
        if len(recipe.instructions.strip()) < 20:
            errors.append("Instructions must be at least 20 characters long.")
        if not recipe.description.strip():
            errors.append("Description is required.")
        if not recipe.category:
            errors.append("Category must be set.")

        if errors:
            return Response({"errors": errors}, status=http_status.HTTP_400_BAD_REQUEST)

        recipe.status = "published"
        recipe.published_at = timezone.now()
        recipe.save(update_fields=["status", "published_at"])

        serializer = self.get_serializer(recipe)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="unpublish", url_name="unpublish")
    def unpublish(self, request, slug=None):
        """
        Revert a published recipe back to draft status.

        Clears published_at and sets status to 'draft'.
        Only the recipe's author can unpublish.
        """
        recipe = self.get_object()
        if recipe.author != request.user:
            raise PermissionDenied("You can only unpublish your own recipes.")

        recipe.status = "draft"
        recipe.published_at = None
        recipe.save(update_fields=["status", "published_at"])

        serializer = self.get_serializer(recipe)
        return Response(serializer.data)


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


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def force_publish(request, slug):
    """
    Superuser force-publish. Transitions from any state to published.
    The 4-point gate checklist is still enforced.
    Creates a ModerationAction audit entry with action='force_published'.
    """
    if not request.user.is_superuser:
        raise PermissionDenied("Only superusers can force-publish.")

    recipe = Recipe.objects.select_related("author").get(slug=slug)

    errors = []
    valid_ingredients = [i for i in recipe.ingredients if i.get("name", "").strip()]
    if len(valid_ingredients) < 2:
        errors.append("At least 2 ingredients required (found %d)." % len(valid_ingredients))
    if len(recipe.instructions.strip()) < 20:
        errors.append("Instructions must be at least 20 characters long.")
    if not recipe.description.strip():
        errors.append("Description is required.")
    if not recipe.category:
        errors.append("Category must be set.")
    if errors:
        return Response({"errors": errors}, status=http_status.HTTP_400_BAD_REQUEST)

    recipe.status = "published"
    recipe.published_at = timezone.now()
    recipe.save(update_fields=["status", "published_at"])

    ModerationAction.objects.create(
        recipe=recipe, moderator=request.user, action="force_published",
        review_round=recipe.review_round,
    )

    return Response(RecipeSerializer(recipe, context={"request": request}).data)
