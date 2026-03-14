# Shopping List Feedback Refinement — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the "Added 0 items" punishment message with a persistent green badge (🛍️❤️ "In your shopping list") that shows when a recipe's ingredients are already in the cart.

**Architecture:** Add a lightweight status endpoint to the backend. On the frontend, check status on page load and after adds. Show a persistent badge below the Add button; disable the button when badge is visible.

**Tech Stack:** Django REST Framework, React 19, Tailwind CSS

---

### Task 1: Backend — Add `already_in_list` to add response

**Files:**
- Modify: `backend/spoonfury/apps/shopping/views.py:19-57`
- Test: `backend/spoonfury/apps/shopping/tests/test_shopping.py`

**Step 1: Write the failing test**

Add to `test_shopping.py`:

```python
@pytest.mark.django_db
def test_add_returns_already_in_list_flag(auth_client, recipe, ingredients):
    """Add response includes already_in_list boolean."""
    url = reverse("shopping-list-add")
    payload = {"recipe_slug": recipe.slug, "recipe_title": recipe.title, "ingredients": ingredients}

    # First add — items added, now in list
    r1 = auth_client.post(url, payload, format="json")
    assert r1.data["added"] == 2
    assert r1.data["already_in_list"] is True

    # Second add — nothing new, but still in list
    r2 = auth_client.post(url, payload, format="json")
    assert r2.data["added"] == 0
    assert r2.data["already_in_list"] is True
```

**Step 2: Run test to verify it fails**

Run: `cd .worktrees/feature-v0.4-shopping/backend && ../../../.venv/Scripts/python -m pytest spoonfury/apps/shopping/tests/test_shopping.py::test_add_returns_already_in_list_flag -v`
Expected: FAIL — `already_in_list` key missing from response

**Step 3: Write minimal implementation**

In `views.py`, update `ShoppingListAddView.post` return to:

```python
in_list = shopping_list.items.filter(recipe_slug=recipe_slug).exists()
return Response({"added": added, "already_in_list": in_list}, status=status.HTTP_201_CREATED)
```

**Step 4: Run test to verify it passes**

Run: `cd .worktrees/feature-v0.4-shopping/backend && ../../../.venv/Scripts/python -m pytest spoonfury/apps/shopping/tests/test_shopping.py::test_add_returns_already_in_list_flag -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/spoonfury/apps/shopping/views.py backend/spoonfury/apps/shopping/tests/test_shopping.py
git commit -m "feat(shopping): return already_in_list flag from add endpoint"
```

---

### Task 2: Backend — Add status check endpoint

**Files:**
- Modify: `backend/spoonfury/apps/shopping/views.py` (add new view)
- Modify: `backend/spoonfury/apps/shopping/urls.py:9-14`
- Test: `backend/spoonfury/apps/shopping/tests/test_shopping.py`

**Step 1: Write the failing tests**

Add to `test_shopping.py`:

```python
@pytest.mark.django_db
def test_status_returns_false_when_empty(auth_client, recipe):
    """Status endpoint returns in_list=false when recipe has no items."""
    url = reverse("shopping-list-status")
    response = auth_client.get(f"{url}?recipe_slug={recipe.slug}")
    assert response.status_code == 200
    assert response.data["in_list"] is False


@pytest.mark.django_db
def test_status_returns_true_when_items_exist(auth_client, recipe, ingredients):
    """Status endpoint returns in_list=true when recipe has items."""
    auth_client.post(reverse("shopping-list-add"), {
        "recipe_slug": recipe.slug,
        "recipe_title": recipe.title,
        "ingredients": ingredients,
    }, format="json")

    url = reverse("shopping-list-status")
    response = auth_client.get(f"{url}?recipe_slug={recipe.slug}")
    assert response.status_code == 200
    assert response.data["in_list"] is True
```

**Step 2: Run tests to verify they fail**

Run: `cd .worktrees/feature-v0.4-shopping/backend && ../../../.venv/Scripts/python -m pytest spoonfury/apps/shopping/tests/test_shopping.py::test_status_returns_false_when_empty spoonfury/apps/shopping/tests/test_shopping.py::test_status_returns_true_when_items_exist -v`
Expected: FAIL — no reverse match for `shopping-list-status`

**Step 3: Write minimal implementation**

Add to `views.py`:

```python
class ShoppingListStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        recipe_slug = request.query_params.get("recipe_slug", "")
        if not recipe_slug:
            return Response({"error": "recipe_slug is required"}, status=status.HTTP_400_BAD_REQUEST)
        shopping_list, _ = ShoppingList.objects.get_or_create(owner=request.user)
        in_list = shopping_list.items.filter(recipe_slug=recipe_slug).exists()
        return Response({"in_list": in_list})
```

Add to `urls.py`:

```python
from .views import ShoppingListStatusView
# ...
path("shopping-list/status/", ShoppingListStatusView.as_view(), name="shopping-list-status"),
```

**Step 4: Run tests to verify they pass**

Run: `cd .worktrees/feature-v0.4-shopping/backend && ../../../.venv/Scripts/python -m pytest spoonfury/apps/shopping/tests/test_shopping.py -v`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add backend/spoonfury/apps/shopping/views.py backend/spoonfury/apps/shopping/urls.py backend/spoonfury/apps/shopping/tests/test_shopping.py
git commit -m "feat(shopping): add status endpoint to check if recipe is in list"
```

---

### Task 3: Frontend — Add persistent badge and smart button state

**Files:**
- Modify: `frontend/src/pages/RecipePage.tsx:22-90, 251-259`
- Modify: `frontend/src/components/IngredientChecklist.tsx:49-72`

**Step 1: Update RecipePage state and logic**

In `RecipePage.tsx`:

1. Add `inList` state:
```typescript
const [inList, setInList] = useState(false);
```

2. Add effect to check status on page load (after recipe loads):
```typescript
useEffect(() => {
  if (!token || !recipe) return;
  api.get(`/shopping-list/status/?recipe_slug=${recipe.slug}`, token)
    .then((data: any) => setInList(data.in_list))
    .catch(() => {});
}, [token, recipe]);
```

3. Update `addToList` to set `inList` from response and remove the temporary message:
```typescript
const addToList = async (needed: Ingredient[]) => {
  if (!token || !recipe) return;
  try {
    const res = await api.post(
      "/shopping-list/add/",
      { recipe_slug: recipe.slug, recipe_title: recipe.title, ingredients: needed },
      token
    );
    setInList(res.already_in_list);
  } catch {
    setListMsg("Failed to add to list.");
    setTimeout(() => setListMsg(""), 2500);
  }
};
```

**Step 2: Update IngredientChecklist to accept and show badge**

In `IngredientChecklist.tsx`, add `inList` prop:

```typescript
interface Props {
  ingredients: Ingredient[];
  inList?: boolean;
  onAddToList?: (needed: Ingredient[]) => void;
  onBuyNow?: (needed: Ingredient[]) => void;
}
```

Disable the Add button when `inList` is true. Show badge below buttons:

```tsx
{onAddToList && (
  <button
    type="button"
    disabled={needed.length === 0 || inList}
    onClick={() => onAddToList(needed)}
    className="flex-1 text-sm border border-indigo-200 rounded-md px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
    + Add {needed.length} to Shopping List
  </button>
)}

{/* ... Buy Now button ... */}

{inList && (
  <div className="flex items-center gap-2 w-full px-3 py-2 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm font-medium animate-in fade-in slide-in-from-bottom-1">
    <span className="text-base">🛍️❤️</span>
    In your shopping list
  </div>
)}
```

**Step 3: Wire the prop in RecipePage**

```tsx
<IngredientChecklist
  ingredients={recipe.ingredients}
  inList={inList}
  onAddToList={token ? addToList : undefined}
  onBuyNow={setBuyNowIngredients}
/>
```

Remove the old `listMsg` display below IngredientChecklist (keep the state only for error messages).

**Step 4: Test manually**

1. Start both servers from the worktree
2. Navigate to a recipe, click "Add to Shopping List" → badge appears, button disables
3. Navigate away and back → badge still shows
4. Clear shopping list → navigate to recipe → badge gone, button re-enabled
5. Add again → badge returns

**Step 5: Commit**

```bash
git add frontend/src/pages/RecipePage.tsx frontend/src/components/IngredientChecklist.tsx
git commit -m "feat(shopping): add persistent green badge when recipe is in shopping list"
```

---

### Task 4: Run all backend tests

**Step 1: Run full test suite**

Run: `cd .worktrees/feature-v0.4-shopping/backend && ../../../.venv/Scripts/python -m pytest -v`
Expected: ALL PASS

**Step 2: Fix any failures**

If tests fail, investigate and fix before proceeding.

---

### Task 5: Manual end-to-end testing

**Step 1: Start servers from worktree**

```bash
# Terminal 1 — Backend
cd .worktrees/feature-v0.4-shopping/backend
../../../.venv/Scripts/python manage.py migrate
../../../.venv/Scripts/python manage.py runserver

# Terminal 2 — Frontend
cd .worktrees/feature-v0.4-shopping/frontend
npm run dev
```

**Step 2: Test the happy path**

1. Log in, open a recipe
2. Click "Add to Shopping List" → green 🛍️❤️ badge appears, button disables
3. Navigate away and return → badge persists
4. Go to Shopping List page → items are there
5. Clear shopping list → return to recipe → badge gone, button active
6. Add again → badge returns

**Step 3: Test edge cases**

1. Logged out user: no Add button, no badge, no errors
2. Recipe with no ingredients: Add button disabled, no badge
3. Check some ingredients as "already have", add the rest → badge shows
