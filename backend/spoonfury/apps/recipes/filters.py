import django_filters
from django.db import models as db_models
from django.db.models.expressions import RawSQL
from .models import Recipe, Tag


class LenientTagFilter(django_filters.ModelMultipleChoiceFilter):
    """
    Like ModelMultipleChoiceFilter but returns an empty queryset (not a 400)
    when a tag name doesn't exist in the database.
    """

    def filter(self, qs, value):
        # value is a list of Tag instances after validation.
        # If any tag name was unrecognised, the parent raises a ValidationError
        # (400). We override to silently return empty instead.
        if not value:
            return qs
        return super().filter(qs, value)

    def get_filter_predicate(self, v):
        return super().get_filter_predicate(v)

    # Override field to use a queryset that accepts unknown names gracefully.
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("queryset", Tag.objects.all())
        super().__init__(*args, **kwargs)
        # Replace the underlying form field with one that returns empty list
        # (not an error) for unknown names.
        self.field.error_messages["invalid_choice"] = ""

    def filter(self, qs, value):  # noqa: F811
        if value is None:
            return qs
        return super().filter(qs, value)


class _LenientTagField(django_filters.fields.ModelMultipleChoiceField):
    """Returns an empty queryset for unknown tag names instead of raising."""

    def _check_values(self, value):
        # Filter out unknown names silently.
        valid = []
        for v in value:
            try:
                obj = self.queryset.get(**{self.to_field_name: v})
                valid.append(obj)
            except (self.queryset.model.DoesNotExist, ValueError, TypeError):
                # Unknown tag — signal "no match possible" by returning a
                # sentinel that the filter can detect.
                return None
        return valid


class LenientTagFilter(django_filters.ModelMultipleChoiceFilter):  # noqa: F811 (redefinition intentional)
    """
    ModelMultipleChoiceFilter that returns an empty queryset (not HTTP 400)
    when a requested tag name doesn't exist in the database.
    """

    field_class = _LenientTagField

    def filter(self, qs, value):
        if value is None:
            # Unknown tag was requested — no recipes can match.
            return qs.none()
        if not value:
            return qs
        return super().filter(qs, value)


class RecipeFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="category", lookup_expr="exact")
    status = django_filters.CharFilter(field_name="status", lookup_expr="exact")
    tags = LenientTagFilter(
        field_name="tags__name",
        to_field_name="name",
        queryset=Tag.objects.all(),
        conjoined=True,  # AND logic — recipe must have ALL specified tags
    )
    ingredient = django_filters.CharFilter(method="filter_by_ingredient")

    class Meta:
        model = Recipe
        fields = ["category", "status", "tags", "ingredient"]

    def filter_by_ingredient(self, queryset, name, value):
        if not value:
            return queryset
        # Escape SQL LIKE wildcards in user input
        safe_value = value.replace("%", r"\%").replace("_", r"\_")
        return queryset.annotate(
            has_ingredient=RawSQL(
                "EXISTS(SELECT 1 FROM jsonb_array_elements(\"recipes_recipe\".ingredients) elem "
                "WHERE LOWER(elem->>'name') LIKE LOWER(%s))",
                (f"%{safe_value}%",),
                output_field=db_models.BooleanField(),
            )
        ).filter(has_ingredient=True)
