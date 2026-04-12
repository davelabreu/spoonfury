# Weekly Planner — Design Doc

**Date:** 2026-04-11
**Status:** Active
**Feature:** Weekly meal planning, drag-and-drop recipe organization, bulk add-to-cart

---

## Overview

The Weekly Planner allows users to organize their cooking schedule by assigning recipes to specific days of the week (Monday–Sunday). Users can pick recipes from their "Library" (personal drafts, published recipes, and recipes shared by friends) and drag them into a weekly grid.

The goal is to provide a "command center" for the user's kitchen that bridges the gap between discovering/creating recipes and the actual shopping/cooking process.

---

## Data Model

### WeeklyPlan — new model

Tracks a user's plan for a specific week. For v1, we will support a single "current" plan per user for simplicity.

```python
class WeeklyPlan(models.Model):
    owner = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="weekly_plan"
    )
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Plan for {self.owner.username}"
```

### WeeklyPlanItem — new model

A single recipe assigned to a day in the weekly plan.

```python
DAY_CHOICES = [
    (0, "Monday"),
    (1, "Tuesday"),
    (2, "Wednesday"),
    (3, "Thursday"),
    (4, "Friday"),
    (5, "Saturday"),
    (6, "Sunday"),
]

class WeeklyPlanItem(models.Model):
    plan = models.ForeignKey(WeeklyPlan, on_delete=models.CASCADE, related_name="items")
    recipe = models.ForeignKey("recipes.Recipe", on_delete=models.CASCADE)
    day = models.IntegerField(choices=DAY_CHOICES)
    order = models.PositiveIntegerField(default=0) # For multiple recipes per day

    class Meta:
        ordering = ["day", "order"]
```

---

## API Layer

### New ViewSet: `WeeklyPlanViewSet`
- `GET /weekly-plan/`: Returns the current user's plan with nested items.
- `POST /weekly-plan/add-recipe/`: Body: `{ "recipe_slug": "...", "day": 0 }`.
- `POST /weekly-plan/remove-item/`: Body: `{ "item_id": 123 }`.
- `POST /weekly-plan/clear/`: Removes all items from the plan.
- `POST /weekly-plan/sync-to-cart/`: Bulk adds all ingredients from all planned recipes to the shopping list.

### Recipe Library Endpoint
Update `RecipeViewSet` or add a specific action to filter for the planner:
- `GET /recipes/planner-library/`: 
  - Returns `(author=user OR invited_to_kitchen=user)`.
  - Includes both `draft` and `published`.

---

## Frontend: Weekly Planner UI

### Location
Embedded within `MyKitchenPage.tsx` as a primary tab or a distinct section.

### Components

1.  **WeeklyGrid**: A horizontal or vertical list of 7 "Day" columns.
2.  **DayColumn**: A drop target for recipes. Lists recipes currently assigned to that day.
3.  **RecipeLibrary**: A searchable/filterable sidebar/panel showing "My Recipes" and "Shared with Me".
4.  **PlannerRecipeCard**: A compact version of `RecipeCard` suitable for the grid/sidebar. Supports dragging.

### Interactions

- **Drag and Drop**: Users can drag a recipe from the Library into a DayColumn.
- **Reorder**: Users can drag recipes between days or reorder within a day.
- **Remove**: A simple "X" on the card in the grid removes it from the plan.
- **Bulk Add**: A prominent "🛒 Commit to Cart" button at the top/bottom of the grid.

### Libraries
- `dnd-kit`: For robust drag-and-drop implementation.

---

## Success Criteria

1.  User can see their private drafts and shared recipes in the Library sidebar.
2.  User can drag a recipe onto "Wednesday".
3.  The plan persists across page refreshes (via API).
4.  Clicking "Commit to Cart" populates the Shopping List with all ingredients from the 7-day plan.
