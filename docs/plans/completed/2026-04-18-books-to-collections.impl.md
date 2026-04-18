# Books → Collections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand "Books" as "Collections", absorb into My Kitchen, and simplify the fork flow to one-click with a toast.

**Architecture:** Backend adds `is_default` field to RecipeBook and auto-creates a "Forked Recipes" collection per user. Fork endpoint auto-adds to default collection. Frontend removes standalone Books page, adds Collections section to My Kitchen top, replaces ForkModal with instant fork + Sonner toast.

**Tech Stack:** Django 5 + DRF (backend), React 19 + Vite + Tailwind 4 + Shadcn UI + Sonner (frontend)

---

## File Map

### Backend (modify)
| File | Change |
|------|--------|
| `backend/spoonfury/apps/books/models.py` | Add `is_default` field to RecipeBook |
| `backend/spoonfury/apps/books/views.py` | Prevent deletion of default collection |
| `backend/spoonfury/apps/books/serializers.py` | Add `is_default` to serializer fields, update `share_url` |
| `backend/spoonfury/apps/recipes/views_fork.py` | Auto-add forked recipe to default collection |
| `backend/spoonfury/apps/books/tests/test_books.py` | Tests for default collection, delete protection, fork auto-add |

### Backend (create)
| File | Purpose |
|------|---------|
| `backend/spoonfury/apps/books/migrations/0002_recipebook_is_default.py` | Auto-generated migration |
| `backend/spoonfury/apps/books/migrations/0003_create_default_collections.py` | Data migration for existing users |
| `backend/spoonfury/apps/users/signals.py` | Post-save signal to create default collection on registration |
| `backend/spoonfury/apps/users/apps.py` | Wire up signal in `ready()` |

### Frontend (modify)
| File | Change |
|------|--------|
| `frontend/src/App.tsx` | Remove `/books` route, add `/collections/*` routes, add `<Toaster />` |
| `frontend/src/pages/MyKitchenPage.tsx` | Add Collections section at top with inline expand |
| `frontend/src/pages/RecipePage.tsx` | Replace ForkModal with instant fork + toast, rename "book" → "collection" |
| `frontend/src/components/NavBar.tsx` | Remove "My Books" sticker and dropdown item |
| `frontend/src/types.ts` | Add `is_default` to Book interface |

### Frontend (create)
| File | Purpose |
|------|---------|
| `frontend/src/components/ui/sonner.tsx` | Shadcn Sonner toast wrapper |

### Frontend (rename)
| Old | New |
|-----|-----|
| `frontend/src/pages/BookDetailPage.tsx` | `frontend/src/pages/CollectionDetailPage.tsx` |

### Frontend (delete)
| File | Reason |
|------|--------|
| `frontend/src/pages/BooksPage.tsx` | Absorbed into MyKitchenPage |
| `frontend/src/components/ForkModal.tsx` | Replaced by toast flow |

---

## Task 1: Add `is_default` field to RecipeBook model

**Files:**
- Modify: `backend/spoonfury/apps/books/models.py:7-22`
- Test: `backend/spoonfury/apps/books/tests/test_books.py`

- [ ] **Step 1: Write the failing test**

In `backend/spoonfury/apps/books/tests/test_books.py`, add:

```python
@pytest.mark.django_db
def test_recipebook_has_is_default_field(user):
    book = RecipeBook.objects.create(title="Test", owner=user)
    assert book.is_default is False
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/books/tests/test_books.py::test_recipebook_has_is_default_field -v`
Expected: FAIL — `RecipeBook has no field named 'is_default'`

- [ ] **Step 3: Add `is_default` field to model**

In `backend/spoonfury/apps/books/models.py`, add after `share_token` (line 17):

```python
    is_default = models.BooleanField(default=False)
```

- [ ] **Step 4: Generate migration**

Run: `cd backend && ../.venv/Scripts/python manage.py makemigrations books`
Expected: Creates `0002_recipebook_is_default.py`

- [ ] **Step 5: Apply migration**

Run: `cd backend && ../.venv/Scripts/python manage.py migrate books`

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/books/tests/test_books.py::test_recipebook_has_is_default_field -v`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add backend/spoonfury/apps/books/models.py backend/spoonfury/apps/books/migrations/0002_recipebook_is_default.py backend/spoonfury/apps/books/tests/test_books.py
git commit -m "feat(books): add is_default field to RecipeBook model"
```

---

## Task 2: Auto-create default collection on user registration

**Files:**
- Create: `backend/spoonfury/apps/users/signals.py`
- Modify: `backend/spoonfury/apps/users/apps.py`
- Test: `backend/spoonfury/apps/books/tests/test_books.py`

- [ ] **Step 1: Write the failing test**

In `backend/spoonfury/apps/books/tests/test_books.py`, add:

```python
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
def test_default_collection_created_on_registration():
    new_user = User.objects.create_user(username="newchef", password="testpass123")
    default = RecipeBook.objects.filter(owner=new_user, is_default=True)
    assert default.count() == 1
    assert default.first().title == "Forked Recipes"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/books/tests/test_books.py::test_default_collection_created_on_registration -v`
Expected: FAIL — `assert 0 == 1`

- [ ] **Step 3: Create the signal**

Create `backend/spoonfury/apps/users/signals.py`:

```python
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_default_collection(sender, instance, created, **kwargs):
    if created:
        from spoonfury.apps.books.models import RecipeBook
        RecipeBook.objects.get_or_create(
            owner=instance,
            is_default=True,
            defaults={"title": "Forked Recipes"},
        )
```

- [ ] **Step 4: Wire up signal in apps.py**

Replace `backend/spoonfury/apps/users/apps.py` with:

```python
from django.apps import AppConfig


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "spoonfury.apps.users"
    label = "users"

    def ready(self):
        import spoonfury.apps.users.signals  # noqa: F401
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/books/tests/test_books.py::test_default_collection_created_on_registration -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/spoonfury/apps/users/signals.py backend/spoonfury/apps/users/apps.py backend/spoonfury/apps/books/tests/test_books.py
git commit -m "feat(users): auto-create Forked Recipes collection on registration"
```

---

## Task 3: Data migration for existing users

**Files:**
- Create: `backend/spoonfury/apps/books/migrations/0003_create_default_collections.py`

- [ ] **Step 1: Write the data migration**

Create `backend/spoonfury/apps/books/migrations/0003_create_default_collections.py`:

```python
from django.db import migrations


def create_defaults(apps, schema_editor):
    User = apps.get_model("users", "User")
    RecipeBook = apps.get_model("books", "RecipeBook")
    for user in User.objects.all():
        RecipeBook.objects.get_or_create(
            owner=user,
            is_default=True,
            defaults={"title": "Forked Recipes"},
        )


def remove_defaults(apps, schema_editor):
    RecipeBook = apps.get_model("books", "RecipeBook")
    RecipeBook.objects.filter(is_default=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("books", "0002_recipebook_is_default"),
        ("users", "0002_user_avatar_user_bio_user_display_name"),
    ]

    operations = [
        migrations.RunPython(create_defaults, remove_defaults),
    ]
```

- [ ] **Step 2: Apply migration**

Run: `cd backend && ../.venv/Scripts/python manage.py migrate books`

- [ ] **Step 3: Verify in shell**

Run: `cd backend && ../.venv/Scripts/python manage.py shell -c "from spoonfury.apps.books.models import RecipeBook; print(RecipeBook.objects.filter(is_default=True).count())"`
Expected: A count equal to the number of existing users.

- [ ] **Step 4: Commit**

```bash
git add backend/spoonfury/apps/books/migrations/0003_create_default_collections.py
git commit -m "feat(books): data migration — create default collections for existing users"
```

---

## Task 4: Prevent deletion of default collection + add to serializer

**Files:**
- Modify: `backend/spoonfury/apps/books/views.py:10-50`
- Modify: `backend/spoonfury/apps/books/serializers.py:6-28`
- Test: `backend/spoonfury/apps/books/tests/test_books.py`

- [ ] **Step 1: Write the failing tests**

In `backend/spoonfury/apps/books/tests/test_books.py`, add:

```python
@pytest.mark.django_db
def test_cannot_delete_default_collection(auth_client, user):
    default_book = RecipeBook.objects.get(owner=user, is_default=True)
    url = reverse("book-detail", kwargs={"pk": default_book.pk})
    response = auth_client.delete(url)
    assert response.status_code == 400
    assert "cannot delete" in response.data["detail"].lower()


@pytest.mark.django_db
def test_serializer_includes_is_default(auth_client, user):
    url = reverse("book-list")
    response = auth_client.get(url)
    assert response.status_code == 200
    results = response.data if isinstance(response.data, list) else response.data.get("results", response.data)
    default_books = [b for b in results if b["is_default"]]
    assert len(default_books) == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/books/tests/test_books.py::test_cannot_delete_default_collection spoonfury/apps/books/tests/test_books.py::test_serializer_includes_is_default -v`
Expected: Both FAIL

- [ ] **Step 3: Add delete protection to ViewSet**

In `backend/spoonfury/apps/books/views.py`, add a `destroy` override after the `retrieve` method (after line 26):

```python
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_default:
            return Response(
                {"detail": "Cannot delete the default collection."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)
```

- [ ] **Step 4: Add `is_default` to serializer**

In `backend/spoonfury/apps/books/serializers.py`, add `"is_default"` to `Meta.fields` (line 14) and `Meta.read_only_fields` (line 18):

```python
    class Meta:
        model = RecipeBook
        fields = [
            "id", "title", "cover_image", "owner_username",
            "is_public", "is_default", "share_token", "share_url",
            "recipe_count", "created_at",
        ]
        read_only_fields = ["share_token", "owner_username", "is_default", "created_at"]
```

Also update the `share_url` method to use the new collections route (line 23-24):

```python
    def get_share_url(self, obj):
        return f"/collections/share/{obj.share_token}"
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/books/tests/test_books.py -v`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add backend/spoonfury/apps/books/views.py backend/spoonfury/apps/books/serializers.py backend/spoonfury/apps/books/tests/test_books.py
git commit -m "feat(books): prevent default collection deletion, add is_default to serializer"
```

---

## Task 5: Fork endpoint auto-adds to default collection

**Files:**
- Modify: `backend/spoonfury/apps/recipes/views_fork.py:22-72`
- Test: `backend/spoonfury/apps/books/tests/test_books.py`

- [ ] **Step 1: Write the failing test**

In `backend/spoonfury/apps/books/tests/test_books.py`, add:

```python
@pytest.mark.django_db
def test_fork_auto_adds_to_default_collection(auth_client, user):
    # Create a recipe by another user to fork
    other = User.objects.create_user(username="forkauthor", password="testpass123")
    parent = Recipe.objects.create(
        title="Original Pasta", description="desc", serves="4",
        ingredients=[{"name": "pasta", "quantity": "1", "unit": "lb", "note": ""}],
        instructions="cook it", category="pasta_noodles", author=other,
    )

    url = reverse("recipe-fork", kwargs={"slug": parent.slug})
    response = auth_client.post(url, {
        "title": "Original Pasta (my version)",
        "description": "desc",
        "serves": "4",
        "ingredients": [{"name": "pasta", "quantity": "1", "unit": "lb", "note": ""}],
        "instructions": "cook it",
        "notes": "",
    }, format="json")
    assert response.status_code == 201

    forked_slug = response.data["slug"]
    default_book = RecipeBook.objects.get(owner=user, is_default=True)
    assert default_book.recipes.filter(slug=forked_slug).exists()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/books/tests/test_books.py::test_fork_auto_adds_to_default_collection -v`
Expected: FAIL — `assert False` (recipe not in default collection)

- [ ] **Step 3: Update fork endpoint**

In `backend/spoonfury/apps/recipes/views_fork.py`, add after the `Recipe.objects.create` block (after line 66) and before the fork_count increment (line 68):

```python
    # Auto-add to user's default collection
    from spoonfury.apps.books.models import RecipeBook, BookRecipe
    default_book, _ = RecipeBook.objects.get_or_create(
        owner=request.user,
        is_default=True,
        defaults={"title": "Forked Recipes"},
    )
    order = default_book.bookrecipe_set.count()
    BookRecipe.objects.get_or_create(
        book=default_book, recipe=recipe, defaults={"order": order}
    )
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && ../.venv/Scripts/pytest spoonfury/apps/books/tests/test_books.py::test_fork_auto_adds_to_default_collection -v`
Expected: PASS

- [ ] **Step 5: Run all tests**

Run: `cd backend && ../.venv/Scripts/pytest -v`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add backend/spoonfury/apps/recipes/views_fork.py backend/spoonfury/apps/books/tests/test_books.py
git commit -m "feat(fork): auto-add forked recipe to default collection"
```

---

## Task 6: Install Sonner + add Toaster to App layout

**Files:**
- Create: `frontend/src/components/ui/sonner.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Install Shadcn Sonner component**

Run: `cd frontend && npx shadcn@latest add sonner`

If the CLI doesn't work headless, create `frontend/src/components/ui/sonner.tsx` manually:

```tsx
import { Toaster as Sonner, type ToasterProps } from "sonner"

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
```

- [ ] **Step 2: Add Toaster to App.tsx**

In `frontend/src/App.tsx`, add import:

```tsx
import { Toaster } from "@/components/ui/sonner";
```

Add `<Toaster />` right after the closing `</main>` tag (before `</BrowserRouter>`):

```tsx
            </main>
            <Toaster position="bottom-center" />
          </BrowserRouter>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/ui/sonner.tsx frontend/src/App.tsx
git commit -m "feat(ui): install Sonner toast, mount Toaster in App layout"
```

---

## Task 7: Remove "My Books" from NavBar

**Files:**
- Modify: `frontend/src/components/NavBar.tsx:22,196-199`

- [ ] **Step 1: Remove "My Books" sticker**

In `frontend/src/components/NavBar.tsx`, remove line 22:

```tsx
  { label: "My Books", to: "/books", color: "bg-[#4ECDC4]", authRequired: true },
```

- [ ] **Step 2: Remove "My Books" dropdown item**

Find lines 196-199 and remove the entire dropdown item:

```tsx
        <DropdownMenuItem onClick={() => navigate("/books")} className="gap-2 cursor-pointer">
          <BookOpen className="w-4 h-4" />
          My Books
        </DropdownMenuItem>
```

Also check if `BookOpen` is imported from lucide-react and remove that import if it's no longer used anywhere in the file.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/NavBar.tsx
git commit -m "feat(nav): remove My Books sticker and dropdown item"
```

---

## Task 8: Rename BookDetailPage → CollectionDetailPage + update routes

**Files:**
- Rename: `frontend/src/pages/BookDetailPage.tsx` → `frontend/src/pages/CollectionDetailPage.tsx`
- Modify: `frontend/src/pages/CollectionDetailPage.tsx` (relabel "book" → "collection")
- Modify: `frontend/src/App.tsx` (update routes and imports)

- [ ] **Step 1: Rename the file**

```bash
cd frontend && git mv src/pages/BookDetailPage.tsx src/pages/CollectionDetailPage.tsx
```

- [ ] **Step 2: Update component name and labels inside CollectionDetailPage**

In `frontend/src/pages/CollectionDetailPage.tsx`:

- Rename the exported function from `BookDetailPage` to `CollectionDetailPage`
- Replace "Remove recipe from book" with "Remove recipe from collection"
- Replace any "book" labels with "collection" equivalents
- Add a "← Back to Kitchen" link at the top (using `<Link to="/kitchen">`)

- [ ] **Step 3: Update App.tsx routes and imports**

In `frontend/src/App.tsx`:

Replace the BookDetailPage import:
```tsx
import { CollectionDetailPage } from "@/pages/CollectionDetailPage";
```

Replace the three `/books/...` routes:
```tsx
                <Route path="/collections/share/:token" element={<CollectionDetailPage shared />} />
                <Route path="/collections/:id" element={<CollectionDetailPage />} />
```

Remove the `/books` route entirely (BooksPage import removal happens in Task 11).

Add redirects for old `/books/*` URLs (after the collections routes):
```tsx
                {/* Legacy redirects */}
                <Route path="/books/share/:token" element={<Navigate to={`/collections/share/${window.location.pathname.split('/').pop()}`} replace />} />
                <Route path="/books/:id" element={<Navigate to={window.location.pathname.replace('/books/', '/collections/')} replace />} />
                <Route path="/books" element={<Navigate to="/kitchen" replace />} />
```

Add `Navigate` to the react-router-dom import:
```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/CollectionDetailPage.tsx frontend/src/App.tsx
git commit -m "feat(collections): rename BookDetailPage → CollectionDetailPage, update routes"
```

---

## Task 9: Replace ForkModal with instant fork + toast on RecipePage

**Files:**
- Modify: `frontend/src/pages/RecipePage.tsx:1-606`
- Modify: `frontend/src/types.ts:60-66`

- [ ] **Step 1: Add `is_default` to Book type**

In `frontend/src/types.ts`, update the Book interface:

```typescript
export interface Book {
  id: number;
  title: string;
  description?: string;
  is_public: boolean;
  is_default?: boolean;
  recipe_count?: number;
  recipes?: Recipe[];
}
```

- [ ] **Step 2: Replace fork flow in RecipePage**

In `frontend/src/pages/RecipePage.tsx`:

Remove the `ForkModal` import (line 17):
```tsx
// DELETE: import { ForkModal } from "@/components/ForkModal";
```

Add sonner import:
```tsx
import { toast } from "sonner";
```

Remove `forking` state (line 49):
```tsx
// DELETE: const [forking, setForking] = useState(false);
```

Replace the fork button (line 420-422). Change `onClick={() => setForking(true)}` to call a new `handleFork` function:

```tsx
                      <Button variant="outline" size="sm" onClick={handleFork} disabled={forkingInProgress} className="border-indigo-200 bg-white/50 text-indigo-700 hover:bg-indigo-50">
                        {forkingInProgress ? "Forking..." : "🍴 Make it mine"}
                      </Button>
```

Add new state and handler. After the existing `deleteRecipe` function (around line 109), add:

```tsx
  const [forkingInProgress, setForkingInProgress] = useState(false);

  const handleFork = async () => {
    if (!token || !recipe) return;
    setForkingInProgress(true);
    try {
      await api.post(`/recipes/${recipe.slug}/fork/`, {
        title: `${recipe.title} (my version)`,
        description: recipe.description,
        serves: recipe.serves,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        notes: recipe.notes || "",
      }, token);
      toast("Saved to Forked Recipes", {
        action: {
          label: "Change",
          onClick: () => navigate("/kitchen"),
        },
      });
    } catch (err: unknown) {
      const e = err as { data?: { detail?: string } };
      toast.error(e.data?.detail || "Failed to fork. Try again.");
    } finally {
      setForkingInProgress(false);
    }
  };
```

Remove the ForkModal render block (lines 599-606):
```tsx
// DELETE the entire {forking && (<ForkModal ... />)} block
```

- [ ] **Step 3: Update "Add to collection" dropdown (owner section)**

In RecipePage.tsx, the owner action strip (lines 373-393) has an "Add to book" dropdown. Update the placeholder text:

Replace `"Add to book…"` with `"Add to collection…"` (line 377).

Replace `"Create a book first"` / `/books` link (lines 390-392) — this can be removed entirely since every user now has a default collection. Replace the else branch:

```tsx
                    ) : null}
```

- [ ] **Step 4: Remove unused imports**

Remove `Book` from the type import on line 23 if no longer used. Remove `ForkModal` import. Check if `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` are still needed (they are — for the owner "Add to collection" dropdown).

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/RecipePage.tsx frontend/src/types.ts
git commit -m "feat(fork): one-click fork with Sonner toast, replace ForkModal"
```

---

## Task 10: Add Collections section to MyKitchenPage

**Files:**
- Modify: `frontend/src/pages/MyKitchenPage.tsx`

This is the largest frontend task. Adds the Collections card grid + inline expand at the top of the My Recipes tab.

- [ ] **Step 1: Add state and data fetching for collections**

In `MyKitchenPage.tsx`, add imports:

```tsx
import { api } from "@/lib/api";  // likely already imported
import { Link } from "react-router-dom";  // likely already imported
import type { Book, Recipe as RecipeType } from "@/types";
```

Add state variables alongside existing state:

```tsx
  const [collections, setCollections] = useState<Book[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [expandedRecipes, setExpandedRecipes] = useState<RecipeType[]>([]);
  const [newCollectionTitle, setNewCollectionTitle] = useState("");
```

Add a fetch effect for collections (alongside the existing recipe fetch):

```tsx
  useEffect(() => {
    if (!token) return;
    api.get("/books/", token).then((data: any) => {
      const results: Book[] = data.results ?? data;
      setCollections(results);
    });
  }, [token]);
```

- [ ] **Step 2: Add expand/collapse handler**

```tsx
  const toggleCollection = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedRecipes([]);
      return;
    }
    setExpandedId(id);
    try {
      const data = await api.get(`/books/${id}/`, token!);
      setExpandedRecipes(data.recipes ?? []);
    } catch {
      setExpandedRecipes([]);
    }
  };

  const createCollection = async () => {
    const title = newCollectionTitle.trim();
    if (!title || !token) return;
    try {
      const created = await api.post("/books/", { title }, token);
      setCollections(prev => [...prev, created]);
      setNewCollectionTitle("");
    } catch {}
  };
```

- [ ] **Step 3: Add Collections section JSX**

Inside the My Recipes tab content area, at the very top (before the Test Kitchen section), add:

```tsx
              {/* ── Collections ── */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">My Collections</h2>
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-7 w-40 text-xs"
                      placeholder="New collection…"
                      value={newCollectionTitle}
                      onChange={e => setNewCollectionTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") createCollection(); }}
                    />
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-amber-600" onClick={createCollection} disabled={!newCollectionTitle.trim()}>
                      + New
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {collections.map((c, i) => {
                    const gradients = [
                      "from-amber-500 to-orange-600",
                      "from-teal-400 to-emerald-600",
                      "from-indigo-500 to-purple-600",
                      "from-pink-400 to-rose-600",
                      "from-sky-400 to-blue-600",
                      "from-lime-400 to-green-600",
                      "from-fuchsia-400 to-purple-600",
                      "from-orange-400 to-red-600",
                    ];
                    const gradient = gradients[i % gradients.length];
                    const isExpanded = expandedId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => toggleCollection(c.id)}
                        className={`bg-gradient-to-br ${gradient} rounded-lg p-3 text-white text-left transition-all ${
                          isExpanded ? "ring-2 ring-offset-2 ring-amber-500" : "hover:scale-[1.02]"
                        }`}
                      >
                        <div className="font-bold text-sm truncate">{c.title}</div>
                        <div className="text-xs opacity-80">{c.recipe_count ?? 0} recipe{(c.recipe_count ?? 0) !== 1 ? "s" : ""}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Inline preview */}
                {expandedId && (
                  <div className="mt-3 bg-white border border-border rounded-xl p-4 border-l-4 border-l-amber-500 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm">
                        {collections.find(c => c.id === expandedId)?.title}
                      </span>
                      <Link
                        to={`/collections/${expandedId}`}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                      >
                        View all {expandedRecipes.length} →
                      </Link>
                    </div>
                    {expandedRecipes.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No recipes in this collection yet.</p>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {expandedRecipes.slice(0, 6).map(r => {
                          const fb = getCategoryFallback(r.category ?? "other");
                          return (
                            <Link key={r.slug} to={`/recipes/${r.slug}`} className="shrink-0 w-28 group">
                              <div className="w-28 h-20 rounded-lg overflow-hidden mb-1">
                                {r.image_url ? (
                                  <img src={r.image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                ) : (
                                  <div className={`w-full h-full bg-gradient-to-br ${fb.gradient} flex items-center justify-center text-2xl`}>
                                    {fb.emoji}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs font-semibold truncate">{r.title}</div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
```

- [ ] **Step 4: Add missing imports**

Make sure these are imported at the top of MyKitchenPage.tsx:

```tsx
import { getCategoryFallback } from "@/lib/categoryFallback";
import { Input } from "@/components/ui/input";
```

(`Button`, `Link`, `api`, `useAuth` should already be imported.)

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/MyKitchenPage.tsx
git commit -m "feat(kitchen): add Collections section with inline expand preview"
```

---

## Task 11: Delete BooksPage and ForkModal, clean up imports

**Files:**
- Delete: `frontend/src/pages/BooksPage.tsx`
- Delete: `frontend/src/components/ForkModal.tsx`
- Modify: `frontend/src/App.tsx` (remove BooksPage import)

- [ ] **Step 1: Delete files**

```bash
cd frontend
git rm src/pages/BooksPage.tsx
git rm src/components/ForkModal.tsx
```

- [ ] **Step 2: Remove BooksPage import from App.tsx**

In `frontend/src/App.tsx`, remove:
```tsx
import { BooksPage } from "@/pages/BooksPage";
```

Also remove the BookDetailPage import if still present (it should have been replaced in Task 8):
```tsx
// Ensure this line is gone:
import { BookDetailPage } from "@/pages/BookDetailPage";
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && npx tsc --noEmit`
Expected: Clean. If any other files still import ForkModal or BooksPage, fix those imports.

- [ ] **Step 4: Run full test suite**

Run: `cd frontend && npm run test -- --run` (if vitest tests exist)
Run: `cd backend && ../.venv/Scripts/pytest -v`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove BooksPage and ForkModal (absorbed into Kitchen + toast)"
```

---

## Task 12: Update TODO and docs

**Files:**
- Modify: `docs/TODO.md`
- Modify: `docs/CLAUDE.md`
- Modify: `HEARTBEAT.md`

- [ ] **Step 1: Update TODO.md**

Strike through the "Books → Collections" item under UI/UX. Mark it as done.

- [ ] **Step 2: Update CLAUDE.md**

In the Active plans table, add the collections spec + impl entry. Update version to v0.10.

- [ ] **Step 3: Update HEARTBEAT.md**

Update with the current session's work summary. Don't write the Focus line — ask the user for it.

- [ ] **Step 4: Commit**

```bash
git add docs/TODO.md docs/CLAUDE.md HEARTBEAT.md
git commit -m "docs: update TODO, CLAUDE.md, and HEARTBEAT for collections rebrand"
```
