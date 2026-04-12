# Weekly Planner Implementation Plan

> **For Gemini:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a weekly meal planner with a drag-and-drop UI and bulk sync to the shopping cart.

**Architecture:** A centralized `WeeklyPlan` backend model linked to the user, a draggable 7-day grid in the frontend, and a specialized "Library" view to select from private and shared recipes.

**Tech Stack:** Django REST Framework, React, dnd-kit.

---

### Task 1: Backend Models and Migration

**Files:**
- Create: `backend/spoonfury/apps/recipes/migrations/000X_weekly_plan.py` (via `makemigrations`)
- Modify: `backend/spoonfury/apps/recipes/models.py`

**Step 1: Add WeeklyPlan and WeeklyPlanItem models**
- Define `WeeklyPlan` with a `OneToOneField` to `User`.
- Define `WeeklyPlanItem` with fields `plan`, `recipe`, `day` (0-6), and `order`.

**Step 2: Run migrations**
Run: `python manage.py makemigrations recipes && python manage.py migrate recipes`
Expected: Database schema updated.

**Step 3: Commit**
`git commit -m "feat: add WeeklyPlan models"`

---

### Task 2: Weekly Plan Serializers and ViewSet

**Files:**
- Create: `backend/spoonfury/apps/recipes/serializers_planner.py`
- Modify: `backend/spoonfury/apps/recipes/views.py`
- Modify: `backend/spoonfury/apps/recipes/urls.py`

**Step 1: Create Serializers**
- `WeeklyPlanItemSerializer`: Includes `recipe` details.
- `WeeklyPlanSerializer`: Nested items grouped by day.

**Step 2: Implement WeeklyPlanViewSet**
- `list()`: Get or create the user's `WeeklyPlan`.
- `@action add_recipe()`: Logic for adding a recipe to a specific day.
- `@action remove_item()`: Logic for deleting a plan item.

**Step 3: Test API**
Run: `pytest backend/spoonfury/apps/recipes/tests_planner.py` (Create this test file first)
Expected: API endpoints return 200 and persist data.

**Step 4: Commit**
`git commit -m "feat: implement WeeklyPlan API"`

---

### Task 3: Planner-specific Library Endpoint

**Files:**
- Modify: `backend/spoonfury/apps/recipes/views.py`

**Step 1: Add `planner_library` action to `RecipeViewSet`**
- Filter for: `author=user | author__in=invited_to_kitchen`.
- Return a simplified list of recipes for the picker.

**Step 2: Commit**
`git commit -m "feat: add planner-library recipe endpoint"`

---

### Task 4: Frontend "My Kitchen" Planner Tab

**Files:**
- Modify: `frontend/src/pages/MyKitchenPage.tsx`
- Create: `frontend/src/components/planner/WeeklyPlanner.tsx`

**Step 1: Add Tab Navigation**
- Add tabs for "Recipes" and "Weekly Planner" to `MyKitchenPage`.

**Step 2: Implement Basic Weekly Grid**
- Render 7 columns for the days of the week.
- Fetch current `WeeklyPlan` from the API.

**Step 3: Commit**
`git commit -m "feat: add weekly planner shell to My Kitchen"`

---

### Task 5: Drag and Drop Library Integration

**Files:**
- Install: `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- Create: `frontend/src/components/planner/DraggableRecipe.tsx`
- Create: `frontend/src/components/planner/DroppableDay.tsx`
- Create: `frontend/src/components/planner/RecipeLibrary.tsx`

**Step 1: Set up DndContext**
- Wrap `WeeklyPlanner` in `DndContext`.

**Step 2: Implement Library Sidebar**
- Display recipes from `planner_library` as draggable cards.

**Step 3: Implement Drop Logic**
- Update local state and call API when a recipe is dropped onto a day.

**Step 4: Commit**
`git commit -m "feat: implement drag and drop for planner"`

---

### Task 6: Sync to Shopping List

**Files:**
- Modify: `backend/spoonfury/apps/recipes/views.py` (add `sync_to_cart` action)
- Modify: `frontend/src/components/planner/WeeklyPlanner.tsx` (add button)

**Step 1: Implement `sync_to_cart` on backend**
- Logic: Iterate all recipes in the plan → get ingredients → add to `ShoppingList` model.

**Step 2: Add "Commit to Cart" Button**
- Call the sync API and trigger a `SHOPPING_LIST_UPDATED` event to update the cart capsule.

**Step 3: Commit**
`git commit -m "feat: implement planner-to-cart sync"`
