from datetime import timedelta

from django.db.models import Count, F, FloatField, Q, Value
from django.db.models.functions import Cast, Coalesce, NullIf
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import viewsets, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework import status as http_status
from .models import Recipe, Tag, TestKitchenInvite, ModerationAction, WeeklyPlan, WeeklyPlanItem
from spoonfury.apps.shopping.models import ShoppingList, ShoppingListItem
from .serializers import RecipeSerializer, TagSerializer
from .serializers_planner import WeeklyPlanSerializer, WeeklyPlanItemSerializer
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
          - Owner: sees all their own recipes (all statuses)
          - Any logged-in user: sees in_review recipes (so shared links work for reviewers)
          - Test kitchen invitee: also sees the inviter's drafts
          - Everyone else: published only
        """
        base = (
            Recipe.objects
            .select_related("author", "parent_recipe__author")
            .prefetch_related("tags")
            .annotate(
                _vouch_count_ann=Count("reviews", filter=Q(reviews__is_positive=True))
            )
        )
        user = self.request.user

        if user.is_authenticated:
            # Users whose kitchens this user has been invited to
            invited_owner_ids = TestKitchenInvite.objects.filter(
                invitee=user
            ).values_list("owner_id", flat=True)

            visibility = (
                Q(status="published")
                | Q(status="in_review")   # any logged-in user can reach via shared link
                | Q(author=user)          # own recipes (all statuses)
                | Q(author_id__in=invited_owner_ids, status="draft")  # invited kitchen drafts
            )
            if user.is_staff:
                visibility |= Q(status="mod_queue")  # staff see all recipes awaiting moderation
            return base.filter(visibility).distinct()

        return base.filter(status="published")

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        recipe = serializer.save()
        # Auto-add new original recipes to the user's kitchen sink collection
        from spoonfury.apps.books.models import RecipeBook, BookRecipe
        sink, _ = RecipeBook.objects.get_or_create(
            owner=self.request.user,
            default_role="kitchen_sink",
            defaults={"title": f"@{self.request.user.username}'s Kitchen Sink"},
        )
        order = sink.bookrecipe_set.count()
        BookRecipe.objects.get_or_create(
            book=sink, recipe=recipe, defaults={"order": order}
        )

    def perform_update(self, serializer):
        if serializer.instance.author != self.request.user:
            raise PermissionDenied("You can only edit your own recipes.")
        if serializer.instance.status in ("in_review", "mod_queue"):
            raise PermissionDenied("Recipe is locked during review/moderation. Withdraw or wait for a decision.")
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

    @action(detail=False, methods=["get"], url_path="planner-library", url_name="planner-library")
    def planner_library(self, request):
        """
        Return a list of recipes suitable for the Weekly Planner.
        Includes own recipes and recipes from invited kitchens.
        Limited to 'published' and 'draft' statuses.
        """
        user = request.user
        if not user.is_authenticated:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=http_status.HTTP_401_UNAUTHORIZED
            )

        invited_owner_ids = TestKitchenInvite.objects.filter(
            invitee=user
        ).values_list("owner_id", flat=True)

        queryset = Recipe.objects.filter(
            Q(author=user) | Q(author_id__in=invited_owner_ids)
        ).filter(
            status__in=["published", "draft"]
        ).select_related("author").prefetch_related("tags").distinct()

        serializer = self.get_serializer(queryset, many=True)
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


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def hot_recipes(request):
    """
    Return the top 2 'hot' published recipes from the last 30 days.

    Hotness score = (fork_count * 0.4) + (positive_vote_rate * 10 * 0.6)
    Only recipes with at least 1 review vote are eligible.
    """
    cutoff = timezone.now() - timedelta(days=30)
    qs = (
        Recipe.objects
        .filter(status="published", published_at__gte=cutoff)
        .select_related("author", "parent_recipe__author")
        .prefetch_related("tags")
        .annotate(
            total_votes=Count("reviews"),
            positive_votes=Count("reviews", filter=Q(reviews__is_positive=True)),
        )
        .filter(total_votes__gte=1)
        .annotate(
            vote_rate=Cast(F("positive_votes"), FloatField())
            / Cast(NullIf(F("total_votes"), Value(0)), FloatField()),
            hot_score=F("fork_count") * Value(0.4)
            + (
                Cast(F("positive_votes"), FloatField())
                / Coalesce(
                    Cast(NullIf(F("total_votes"), Value(0)), FloatField()),
                    Value(1.0),
                )
                * Value(10.0)
                * Value(0.6)
            ),
        )
        .order_by("-hot_score")[:2]
    )
    serializer = RecipeSerializer(qs, many=True, context={"request": request})
    return Response(serializer.data)


class WeeklyPlanViewSet(viewsets.ViewSet):
    """
    ViewSet for managing the user's weekly plan.
    Each user has exactly one plan.
    """
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """
        Return the current user's WeeklyPlan.
        Creates one if it doesn't exist.
        """
        plan, created = WeeklyPlan.objects.get_or_create(owner=request.user)
        # Prefetch items and recipes for efficiency
        plan = WeeklyPlan.objects.prefetch_related(
            "items__recipe__author",
            "items__recipe__tags"
        ).get(id=plan.id)
        
        serializer = WeeklyPlanSerializer(plan)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="add-recipe")
    def add_recipe(self, request):
        """
        Add a recipe to the user's weekly plan.
        Body: { "recipe_slug": "...", "day": 0 }
        """
        recipe_slug = request.data.get("recipe_slug")
        day = request.data.get("day")

        if recipe_slug is None or day is None:
            return Response(
                {"error": "recipe_slug and day are required."},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        try:
            recipe = Recipe.objects.get(slug=recipe_slug)
        except Recipe.DoesNotExist:
            return Response(
                {"error": "Recipe not found."},
                status=http_status.HTTP_404_NOT_FOUND
            )

        plan, _ = WeeklyPlan.objects.get_or_create(owner=request.user)
        
        # Simple ordering: append to the end of the day
        last_item = WeeklyPlanItem.objects.filter(plan=plan, day=day).order_by("-order").first()
        order = (last_item.order + 1) if last_item else 0

        item = WeeklyPlanItem.objects.create(
            plan=plan,
            recipe=recipe,
            day=day,
            order=order
        )

        return Response(WeeklyPlanItemSerializer(item).data, status=http_status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="remove-item")
    def remove_item(self, request):
        """
        Remove an item from the user's weekly plan.
        Body: { "item_id": 123 }
        """
        item_id = request.data.get("item_id")
        if not item_id:
            return Response(
                {"error": "item_id is required."},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        try:
            item = WeeklyPlanItem.objects.get(id=item_id, plan__owner=request.user)
            item.delete()
            return Response(status=http_status.HTTP_204_NO_CONTENT)
        except WeeklyPlanItem.DoesNotExist:
            return Response(
                {"error": "Item not found in your plan."},
                status=http_status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=["post"], url_path="clear")
    def clear(self, request):
        """
        Delete all items in the user's weekly plan.
        """
        plan, _ = WeeklyPlan.objects.get_or_create(owner=request.user)
        plan.items.all().delete()
        return Response(status=http_status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"], url_path="sync-to-cart")
    def sync_to_cart(self, request):
        """
        Sync all ingredients from the weekly plan to the shopping list.
        Iterates through all recipes in the plan and adds their ingredients.
        Also updates multipliers based on recipe frequency in the plan.
        """
        from spoonfury.apps.shopping.models import RecipeMultiplier

        plan, _ = WeeklyPlan.objects.get_or_create(owner=request.user)
        shopping_list, _ = ShoppingList.objects.get_or_create(owner=request.user)
        
        # 1. Count recipe frequencies in the plan
        recipe_counts = {}
        items = plan.items.select_related("recipe").all()
        for item in items:
            slug = item.recipe.slug
            recipe_counts[slug] = recipe_counts.get(slug, 0) + 1
            
        # 2. Add ingredients for each recipe in the plan
        added_count = 0
        for slug, count in recipe_counts.items():
            # Get the recipe (all items for the same slug have same recipe content)
            # Find the first item with this slug to get the recipe object
            recipe_item = next(i for i in items if i.recipe.slug == slug)
            recipe = recipe_item.recipe
            
            # Update multiplier for this recipe in shopping list
            RecipeMultiplier.objects.update_or_create(
                shopping_list=shopping_list,
                recipe_slug=slug,
                defaults={"multiplier": count}
            )
            
            # Pre-fetch existing names for this recipe to avoid duplicates
            existing_names = set(
                shopping_list.items.filter(recipe_slug=slug)
                .values_list("name", flat=True)
            )
            
            # Add ingredients
            ingredients = recipe.ingredients # it's a JSONField (list)
            for ing in ingredients:
                name = ing.get("name", "").strip()
                if not name or name in existing_names:
                    continue
                
                ShoppingListItem.objects.create(
                    shopping_list=shopping_list,
                    recipe=recipe,
                    recipe_title=recipe.title,
                    recipe_slug=recipe.slug,
                    name=name,
                    quantity=ing.get("quantity", ""),
                    unit=ing.get("unit", ""),
                    note=ing.get("note", ""),
                )
                existing_names.add(name)
                added_count += 1
                
        shopping_list.save(update_fields=["updated_at"])
        return Response({"added": added_count}, status=http_status.HTTP_200_OK)
