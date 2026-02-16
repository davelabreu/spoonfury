from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import RecipeBook, BookRecipe
from .serializers import RecipeBookSerializer, RecipeBookDetailSerializer
from spoonfury.apps.recipes.models import Recipe


class RecipeBookViewSet(viewsets.ModelViewSet):
    serializer_class = RecipeBookSerializer

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return RecipeBook.objects.filter(owner=self.request.user)
        return RecipeBook.objects.none()

    def get_permissions(self):
        if self.action == "share":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = RecipeBookDetailSerializer(instance, context={"request": request})
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="share/(?P<share_token>[^/.]+)")
    def share(self, request, share_token=None):
        book = get_object_or_404(RecipeBook, share_token=share_token, is_public=True)
        serializer = RecipeBookDetailSerializer(book, context={"request": request})
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="add-recipe")
    def add_recipe(self, request, pk=None):
        book = self.get_object()
        recipe_slug = request.data.get("recipe_slug")
        recipe = get_object_or_404(Recipe, slug=recipe_slug)
        order = book.bookrecipe_set.count()
        BookRecipe.objects.get_or_create(book=book, recipe=recipe, defaults={"order": order})
        return Response({"status": "added"}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["delete"], url_path="remove-recipe")
    def remove_recipe(self, request, pk=None):
        book = self.get_object()
        recipe_slug = request.data.get("recipe_slug")
        recipe = get_object_or_404(Recipe, slug=recipe_slug)
        BookRecipe.objects.filter(book=book, recipe=recipe).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
