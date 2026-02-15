# Spoonfury v0.1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Spoonfury prototype — a recipe-first social platform with forking, recipe books, and Instacart integration.

**Architecture:** Django REST Framework backend + PostgreSQL + React 19/Vite/Tailwind/Shadcn frontend. Django serves the built React app in production. Local dev uses Vite proxy to Django. Containerized via Docker for Jetson deployment.

**Tech Stack:** Python 3.11+, Django 5.x, DRF, django-allauth, psycopg2, pytest-django, React 19, Vite, Tailwind 4, Shadcn UI, react-markdown, Docker, PostgreSQL 16

---

## Phase 1: Backend Foundation

### Task 1: Django Project Scaffold + Postgres Docker

**Files:**
- Create: `backend/requirements.txt`
- Create: `backend/manage.py` (via django-admin)
- Create: `docker-compose.dev.yml`
- Create: `.gitignore`
- Create: `.env.example`

**Step 1: Create .gitignore**

```
# Python
__pycache__/
*.py[cod]
.venv/
*.egg-info/
dist/

# Django
*.sqlite3
backend/staticfiles/
backend/media/

# Frontend
frontend/node_modules/
frontend/dist/

# Env
.env

# Docker
*.log
```

**Step 2: Create requirements.txt**

```
# backend/requirements.txt
Django==5.0.6
djangorestframework==3.15.2
django-allauth==0.63.6
dj-rest-auth==6.0.0
django-cors-headers==4.4.0
psycopg2-binary==2.9.9
python-dotenv==1.0.1
Pillow==10.4.0
python-slugify==8.0.4
pytest-django==4.8.0
pytest==8.3.2
factory-boy==3.3.1
```

**Step 3: Scaffold Django project**

```bash
cd backend
python -m venv .venv
# Windows Git Bash:
source .venv/Scripts/activate
# Linux/Mac:
# source .venv/bin/activate
pip install -r requirements.txt
django-admin startproject config .
```

This creates `backend/config/` (settings, urls, wsgi) and `backend/manage.py`.

**Step 4: Create .env.example**

```bash
# .env.example (repo root)
SECRET_KEY=your-secret-key-here
DEBUG=True
DATABASE_URL=postgresql://spoonfury:spoonfury@localhost:5432/spoonfury
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

**Step 5: Create docker-compose.dev.yml (Postgres only for local dev)**

```yaml
# docker-compose.dev.yml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: spoonfury
      POSTGRES_USER: spoonfury
      POSTGRES_PASSWORD: spoonfury
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

**Step 6: Start Postgres and verify**

```bash
docker compose -f docker-compose.dev.yml up -d
docker compose -f docker-compose.dev.yml ps
```

Expected: `db` container running, healthy.

**Step 7: Commit**

```bash
git add .
git commit -m "chore: scaffold Django project + Postgres dev compose"
```

---

### Task 2: Django Settings

**Files:**
- Modify: `backend/config/settings.py`
- Create: `backend/config/settings_dev.py`

**Step 1: Replace config/settings.py with environment-aware base**

```python
# backend/config/settings.py
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "dev-insecure-key-change-in-prod")
DEBUG = os.environ.get("DEBUG", "True") == "True"
ALLOWED_HOSTS = os.environ.get("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    # Third party
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "dj_rest_auth",
    "dj_rest_auth.registration",
    # Local
    "spoonfury.apps.users",
    "spoonfury.apps.recipes",
    "spoonfury.apps.books",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "spoonfury",
        "USER": "spoonfury",
        "PASSWORD": "spoonfury",
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}

AUTH_USER_MODEL = "users.User"

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

SITE_ID = 1

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
}

ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = True
ACCOUNT_AUTHENTICATION_METHOD = "username_email"
ACCOUNT_EMAIL_VERIFICATION = "none"  # Skip email verification for prototype

CORS_ALLOWED_ORIGINS = os.environ.get(
    "CORS_ALLOWED_ORIGINS", "http://localhost:5173"
).split(",")

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
```

**Step 2: Commit**

```bash
git add backend/config/settings.py
git commit -m "chore: configure Django settings with env vars and DRF"
```

---

### Task 3: Create App Structure + pytest Setup

**Files:**
- Create: `backend/spoonfury/__init__.py`
- Create: `backend/spoonfury/apps/users/__init__.py`
- Create: `backend/spoonfury/apps/recipes/__init__.py`
- Create: `backend/spoonfury/apps/books/__init__.py`
- Create: `backend/pytest.ini`
- Create: `backend/conftest.py`

**Step 1: Create app directories**

```bash
mkdir -p backend/spoonfury/apps/users
mkdir -p backend/spoonfury/apps/recipes
mkdir -p backend/spoonfury/apps/books
touch backend/spoonfury/__init__.py
touch backend/spoonfury/apps/__init__.py
touch backend/spoonfury/apps/users/__init__.py
touch backend/spoonfury/apps/recipes/__init__.py
touch backend/spoonfury/apps/books/__init__.py
```

**Step 2: Create pytest.ini**

```ini
# backend/pytest.ini
[pytest]
DJANGO_SETTINGS_MODULE = config.settings
python_files = tests.py test_*.py *_tests.py
python_classes = Test*
python_functions = test_*
```

**Step 3: Create conftest.py**

```python
# backend/conftest.py
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="testchef",
        email="chef@test.com",
        password="testpass123",
    )

@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()

@pytest.fixture
def auth_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client
```

**Step 4: Write a smoke test**

```python
# backend/spoonfury/apps/users/tests/test_smoke.py
import pytest

@pytest.mark.django_db
def test_database_is_reachable(user):
    """Smoke test: can we hit the database at all?"""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    assert User.objects.filter(username="testchef").exists()
```

**Step 5: Create test directory**

```bash
mkdir -p backend/spoonfury/apps/users/tests
touch backend/spoonfury/apps/users/tests/__init__.py
```

**Step 6: Run the smoke test**

```bash
cd backend
pytest spoonfury/apps/users/tests/test_smoke.py -v
```

Expected: PASS

**Step 7: Commit**

```bash
git add backend/
git commit -m "chore: create app structure + pytest setup + smoke test"
```

---

### Task 4: Custom User Model

**Files:**
- Create: `backend/spoonfury/apps/users/models.py`
- Create: `backend/spoonfury/apps/users/apps.py`
- Create: `backend/spoonfury/apps/users/admin.py`

**Step 1: Write the failing test**

```python
# backend/spoonfury/apps/users/tests/test_models.py
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
def test_user_has_display_name_and_bio(user):
    """User model must have display_name and bio fields."""
    assert hasattr(user, "display_name")
    assert hasattr(user, "bio")

@pytest.mark.django_db
def test_user_str_is_username(user):
    assert str(user) == "testchef"
```

**Step 2: Run — verify failure**

```bash
pytest spoonfury/apps/users/tests/test_models.py -v
```

Expected: FAIL — `AttributeError: 'User' object has no attribute 'display_name'`

**Step 3: Create apps.py**

```python
# backend/spoonfury/apps/users/apps.py
from django.apps import AppConfig

class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "spoonfury.apps.users"
    label = "users"
```

**Step 4: Create models.py**

```python
# backend/spoonfury/apps/users/models.py
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    display_name = models.CharField(max_length=100, blank=True)
    bio = models.CharField(max_length=160, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)

    def __str__(self):
        return self.username
```

**Step 5: Create admin.py**

```python
# backend/spoonfury/apps/users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Profile", {"fields": ("display_name", "bio", "avatar")}),
    )
```

**Step 6: Run migrations**

```bash
python manage.py makemigrations users
python manage.py migrate
```

**Step 7: Run tests — verify pass**

```bash
pytest spoonfury/apps/users/tests/ -v
```

Expected: PASS

**Step 8: Commit**

```bash
git add backend/spoonfury/apps/users/
git commit -m "feat(users): custom User model with display_name and bio"
```

---

## Phase 2: Recipes Backend

### Task 5: Recipe Model

**Files:**
- Create: `backend/spoonfury/apps/recipes/models.py`
- Create: `backend/spoonfury/apps/recipes/apps.py`
- Create: `backend/spoonfury/apps/recipes/admin.py`
- Create: `backend/spoonfury/apps/recipes/tests/test_models.py`

**Step 1: Create apps.py**

```python
# backend/spoonfury/apps/recipes/apps.py
from django.apps import AppConfig

class RecipesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "spoonfury.apps.recipes"
    label = "recipes"
```

**Step 2: Write failing tests**

```python
# backend/spoonfury/apps/recipes/tests/test_models.py
import pytest
from spoonfury.apps.recipes.models import Recipe

@pytest.mark.django_db
def test_recipe_creation(user):
    recipe = Recipe.objects.create(
        title="Caldo Verde",
        description="A hearty Portuguese green soup.",
        serves="6 (about 2 cups each)",
        ingredients=[
            {"quantity": "2", "unit": "Tbsp", "name": "extra-virgin olive oil", "note": ""},
            {"quantity": "0.6", "unit": "lb", "name": "Portuguese chouriço", "note": "sliced into coins"},
        ],
        instructions="# Instructions\n\n1. Render the sausage.",
        category="soup",
        author=user,
    )
    assert recipe.slug == "caldo-verde"
    assert recipe.fork_count == 0
    assert recipe.parent_recipe is None

@pytest.mark.django_db
def test_recipe_str(user):
    recipe = Recipe.objects.create(
        title="Caldo Verde",
        description="A hearty Portuguese green soup.",
        serves="6",
        ingredients=[],
        instructions="Steps here.",
        category="soup",
        author=user,
    )
    assert str(recipe) == "Caldo Verde"

@pytest.mark.django_db
def test_fork_count_starts_at_zero(user):
    recipe = Recipe.objects.create(
        title="My Soup",
        description="desc",
        serves="4",
        ingredients=[],
        instructions="steps",
        category="soup",
        author=user,
    )
    assert recipe.fork_count == 0
```

**Step 3: Run — verify failure**

```bash
mkdir -p spoonfury/apps/recipes/tests
touch spoonfury/apps/recipes/tests/__init__.py
pytest spoonfury/apps/recipes/tests/test_models.py -v
```

Expected: FAIL — `ImportError`

**Step 4: Create models.py**

```python
# backend/spoonfury/apps/recipes/models.py
from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.db.models.signals import pre_save
from django.dispatch import receiver


CATEGORY_CHOICES = [
    ("soup", "Soup"),
    ("pasta", "Pasta"),
    ("bake", "Bake"),
    ("salad", "Salad"),
    ("grill", "Grill"),
    ("breakfast", "Breakfast"),
    ("dessert", "Dessert"),
    ("drink", "Drink"),
    ("snack", "Snack"),
    ("other", "Other"),
]


class Recipe(models.Model):
    title = models.CharField(max_length=100)
    description = models.CharField(max_length=280)
    serves = models.CharField(max_length=50)
    ingredients = models.JSONField(default=list)
    instructions = models.TextField()
    notes = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recipes",
    )
    parent_recipe = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="forks",
    )
    fork_count = models.PositiveIntegerField(default=0)
    slug = models.SlugField(unique=True, max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            n = 1
            while Recipe.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)
```

**Step 5: Create admin.py**

```python
# backend/spoonfury/apps/recipes/admin.py
from django.contrib import admin
from .models import Recipe

@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ["title", "author", "category", "fork_count", "created_at"]
    list_filter = ["category"]
    search_fields = ["title", "author__username"]
    readonly_fields = ["slug", "fork_count", "created_at", "updated_at"]
```

**Step 6: Make migrations + migrate**

```bash
python manage.py makemigrations recipes
python manage.py migrate
```

**Step 7: Run tests — verify pass**

```bash
pytest spoonfury/apps/recipes/tests/test_models.py -v
```

Expected: PASS

**Step 8: Commit**

```bash
git add backend/spoonfury/apps/recipes/
git commit -m "feat(recipes): Recipe model with slug auto-generation and fork lineage"
```

---

### Task 6: Recipe API (Serializers + Views + URLs)

**Files:**
- Create: `backend/spoonfury/apps/recipes/serializers.py`
- Create: `backend/spoonfury/apps/recipes/views.py`
- Create: `backend/spoonfury/apps/recipes/urls.py`
- Modify: `backend/config/urls.py`
- Create: `backend/spoonfury/apps/recipes/tests/test_api.py`

**Step 1: Write failing API tests**

```python
# backend/spoonfury/apps/recipes/tests/test_api.py
import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe

SAMPLE_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
]

@pytest.fixture
def recipe(user):
    return Recipe.objects.create(
        title="Test Soup",
        description="A test soup.",
        serves="4",
        ingredients=SAMPLE_INGREDIENTS,
        instructions="Cook it.",
        category="soup",
        author=user,
    )

@pytest.mark.django_db
def test_list_recipes_is_public(api_client, recipe):
    """Anyone can list recipes without auth."""
    url = reverse("recipe-list")
    response = api_client.get(url)
    assert response.status_code == 200
    assert len(response.data["results"]) == 1

@pytest.mark.django_db
def test_get_recipe_by_slug(api_client, recipe):
    url = reverse("recipe-detail", kwargs={"slug": recipe.slug})
    response = api_client.get(url)
    assert response.status_code == 200
    assert response.data["title"] == "Test Soup"
    assert "author_username" in response.data

@pytest.mark.django_db
def test_create_recipe_requires_auth(api_client):
    url = reverse("recipe-list")
    data = {
        "title": "New Recipe",
        "description": "desc",
        "serves": "2",
        "ingredients": SAMPLE_INGREDIENTS,
        "instructions": "steps",
        "category": "soup",
    }
    response = api_client.post(url, data, format="json")
    assert response.status_code == 401

@pytest.mark.django_db
def test_create_recipe_authenticated(auth_client):
    url = reverse("recipe-list")
    data = {
        "title": "My Carbonara",
        "description": "Classic Roman pasta.",
        "serves": "2",
        "ingredients": SAMPLE_INGREDIENTS,
        "instructions": "Cook pasta. Add eggs.",
        "category": "pasta",
    }
    response = auth_client.post(url, data, format="json")
    assert response.status_code == 201
    assert response.data["slug"] == "my-carbonara"
    assert response.data["fork_count"] == 0
```

**Step 2: Run — verify failure**

```bash
pytest spoonfury/apps/recipes/tests/test_api.py -v
```

Expected: FAIL — `NoReverseMatch`

**Step 3: Create serializers.py**

```python
# backend/spoonfury/apps/recipes/serializers.py
from rest_framework import serializers
from .models import Recipe


class RecipeSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    author_display_name = serializers.CharField(source="author.display_name", read_only=True)
    parent_recipe_slug = serializers.SlugRelatedField(
        source="parent_recipe", slug_field="slug", read_only=True
    )
    parent_recipe_title = serializers.CharField(
        source="parent_recipe.title", read_only=True
    )
    parent_recipe_author = serializers.CharField(
        source="parent_recipe.author.username", read_only=True
    )

    class Meta:
        model = Recipe
        fields = [
            "id", "slug", "title", "description", "serves",
            "ingredients", "instructions", "notes", "category",
            "author_username", "author_display_name",
            "parent_recipe_slug", "parent_recipe_title", "parent_recipe_author",
            "fork_count", "created_at",
        ]
        read_only_fields = ["slug", "fork_count", "created_at", "author_username"]

    def create(self, validated_data):
        validated_data["author"] = self.context["request"].user
        return super().create(validated_data)
```

**Step 4: Create views.py**

```python
# backend/spoonfury/apps/recipes/views.py
from rest_framework import viewsets, permissions
from .models import Recipe
from .serializers import RecipeSerializer


class RecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.select_related("author", "parent_recipe__author").all()
    serializer_class = RecipeSerializer
    lookup_field = "slug"

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
```

**Step 5: Create urls.py**

```python
# backend/spoonfury/apps/recipes/urls.py
from rest_framework.routers import DefaultRouter
from .views import RecipeViewSet

router = DefaultRouter()
router.register(r"recipes", RecipeViewSet, basename="recipe")

urlpatterns = router.urls
```

**Step 6: Update config/urls.py**

```python
# backend/config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),
    path("api/", include("spoonfury.apps.recipes.urls")),
    path("api/", include("spoonfury.apps.books.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

**Step 7: Run tests — verify pass**

```bash
pytest spoonfury/apps/recipes/tests/test_api.py -v
```

Expected: PASS

**Step 8: Commit**

```bash
git add backend/spoonfury/apps/recipes/ backend/config/urls.py
git commit -m "feat(recipes): Recipe CRUD API with public read, auth write"
```

---

### Task 7: Fork API Endpoint

**Files:**
- Create: `backend/spoonfury/apps/recipes/views_fork.py`
- Modify: `backend/spoonfury/apps/recipes/urls.py`
- Create: `backend/spoonfury/apps/recipes/tests/test_fork.py`

**Step 1: Write failing fork tests**

```python
# backend/spoonfury/apps/recipes/tests/test_fork.py
import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe

BASE_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
    {"quantity": "1", "unit": "lb", "name": "pasta", "note": ""},
    {"quantity": "3", "unit": "", "name": "eggs", "note": ""},
    {"quantity": "100", "unit": "g", "name": "pecorino", "note": ""},
]

@pytest.fixture
def parent_recipe(user):
    return Recipe.objects.create(
        title="Carbonara",
        description="Classic Roman.",
        serves="2",
        ingredients=BASE_INGREDIENTS,
        instructions="Cook.",
        category="pasta",
        author=user,
    )

@pytest.mark.django_db
def test_fork_creates_new_recipe(auth_client, parent_recipe, user):
    """Forking creates a new recipe with parent set."""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    forker = User.objects.create_user(username="forker", email="f@f.com", password="pass")
    auth_client.force_authenticate(user=forker)

    url = reverse("recipe-fork", kwargs={"slug": parent_recipe.slug})
    new_ingredients = BASE_INGREDIENTS.copy()
    new_ingredients[1] = {"quantity": "1", "unit": "lb", "name": "rigatoni", "note": ""}  # 1 change

    response = auth_client.post(url, {
        "title": "Carbonara (rigatoni)",
        "description": "With rigatoni instead.",
        "serves": "2",
        "ingredients": new_ingredients,
        "instructions": "Cook.",
        "notes": "",
    }, format="json")

    assert response.status_code == 201
    assert response.data["parent_recipe_slug"] == parent_recipe.slug

@pytest.mark.django_db
def test_fork_increments_parent_fork_count(auth_client, parent_recipe):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    forker = User.objects.create_user(username="forker2", email="f2@f.com", password="pass")
    auth_client.force_authenticate(user=forker)

    url = reverse("recipe-fork", kwargs={"slug": parent_recipe.slug})
    auth_client.post(url, {
        "title": "Carbonara (rigatoni)",
        "description": "desc",
        "serves": "2",
        "ingredients": BASE_INGREDIENTS,
        "instructions": "cook",
        "notes": "",
    }, format="json")

    parent_recipe.refresh_from_db()
    assert parent_recipe.fork_count == 1

@pytest.mark.django_db
def test_fork_rejects_too_many_ingredient_changes(auth_client, parent_recipe):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    forker = User.objects.create_user(username="forker3", email="f3@f.com", password="pass")
    auth_client.force_authenticate(user=forker)

    url = reverse("recipe-fork", kwargs={"slug": parent_recipe.slug})
    # Change 4 ingredients — exceeds limit of 3
    bad_ingredients = [
        {"quantity": "2", "unit": "Tbsp", "name": "butter", "note": ""},      # changed
        {"quantity": "1", "unit": "lb", "name": "rigatoni", "note": ""},      # changed
        {"quantity": "3", "unit": "", "name": "egg yolks", "note": ""},       # changed
        {"quantity": "100", "unit": "g", "name": "parmesan", "note": ""},     # changed
    ]
    response = auth_client.post(url, {
        "title": "Carbonara (rigatoni)",
        "description": "desc",
        "serves": "2",
        "ingredients": bad_ingredients,
        "instructions": "cook",
        "notes": "",
    }, format="json")
    assert response.status_code == 400
    assert "ingredient" in str(response.data).lower()

@pytest.mark.django_db
def test_fork_locks_category(auth_client, parent_recipe):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    forker = User.objects.create_user(username="forker4", email="f4@f.com", password="pass")
    auth_client.force_authenticate(user=forker)

    url = reverse("recipe-fork", kwargs={"slug": parent_recipe.slug})
    response = auth_client.post(url, {
        "title": "Carbonara (rigatoni)",
        "description": "desc",
        "serves": "2",
        "ingredients": BASE_INGREDIENTS,
        "instructions": "cook",
        "notes": "",
        "category": "soup",  # Trying to change category
    }, format="json")
    assert response.status_code == 201
    # Category must match parent regardless of what was sent
    from spoonfury.apps.recipes.models import Recipe
    fork = Recipe.objects.get(slug=response.data["slug"])
    assert fork.category == parent_recipe.category
```

**Step 2: Run — verify failure**

```bash
pytest spoonfury/apps/recipes/tests/test_fork.py -v
```

Expected: FAIL

**Step 3: Create views_fork.py**

```python
# backend/spoonfury/apps/recipes/views_fork.py
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Recipe
from .serializers import RecipeSerializer


def _count_ingredient_changes(original: list, forked: list) -> int:
    """Count how many ingredient *names* differ between original and fork."""
    original_names = {i["name"].strip().lower() for i in original}
    forked_names = {i["name"].strip().lower() for i in forked}
    added = forked_names - original_names
    removed = original_names - forked_names
    # Each swap = 1 remove + 1 add, count as 1 change
    changes = max(len(added), len(removed))
    return changes


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def fork_recipe(request, slug):
    parent = get_object_or_404(Recipe, slug=slug)

    new_ingredients = request.data.get("ingredients", parent.ingredients)
    changes = _count_ingredient_changes(parent.ingredients, new_ingredients)

    if changes > 3:
        return Response(
            {"detail": f"Too many ingredient changes ({changes}). Maximum is 3."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    fork_data = {
        "title": request.data.get("title", f"{parent.title} (my version)"),
        "description": request.data.get("description", parent.description),
        "serves": request.data.get("serves", parent.serves),
        "ingredients": new_ingredients,
        "instructions": request.data.get("instructions", parent.instructions),
        "notes": request.data.get("notes", ""),
        "category": parent.category,  # Always locked
    }

    recipe = Recipe.objects.create(
        author=request.user,
        parent_recipe=parent,
        **fork_data,
    )

    # Increment parent fork count
    Recipe.objects.filter(pk=parent.pk).update(fork_count=parent.fork_count + 1)

    serializer = RecipeSerializer(recipe, context={"request": request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)
```

**Step 4: Add fork URL to recipes/urls.py**

```python
# backend/spoonfury/apps/recipes/urls.py
from rest_framework.routers import DefaultRouter
from django.urls import path
from .views import RecipeViewSet
from .views_fork import fork_recipe

router = DefaultRouter()
router.register(r"recipes", RecipeViewSet, basename="recipe")

urlpatterns = router.urls + [
    path("recipes/<slug:slug>/fork/", fork_recipe, name="recipe-fork"),
]
```

**Step 5: Run tests — verify pass**

```bash
pytest spoonfury/apps/recipes/tests/test_fork.py -v
```

Expected: PASS

**Step 6: Commit**

```bash
git add backend/spoonfury/apps/recipes/
git commit -m "feat(recipes): fork endpoint with ingredient change validation and category lock"
```

---

## Phase 3: Books Backend

### Task 8: RecipeBook Model + API

**Files:**
- Create: `backend/spoonfury/apps/books/models.py`
- Create: `backend/spoonfury/apps/books/apps.py`
- Create: `backend/spoonfury/apps/books/serializers.py`
- Create: `backend/spoonfury/apps/books/views.py`
- Create: `backend/spoonfury/apps/books/urls.py`
- Create: `backend/spoonfury/apps/books/admin.py`
- Create: `backend/spoonfury/apps/books/tests/test_books.py`

**Step 1: Create apps.py**

```python
# backend/spoonfury/apps/books/apps.py
from django.apps import AppConfig

class BooksConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "spoonfury.apps.books"
    label = "books"
```

**Step 2: Write failing tests**

```python
# backend/spoonfury/apps/books/tests/test_books.py
import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe
from spoonfury.apps.books.models import RecipeBook

@pytest.fixture
def recipe(user):
    return Recipe.objects.create(
        title="Caldo Verde", description="desc", serves="4",
        ingredients=[], instructions="cook", category="soup", author=user,
    )

@pytest.mark.django_db
def test_create_book(auth_client):
    url = reverse("book-list")
    response = auth_client.post(url, {"title": "Holiday Meals"}, format="json")
    assert response.status_code == 201
    assert "share_token" in response.data

@pytest.mark.django_db
def test_share_link_is_public(api_client, auth_client, recipe):
    """Anyone with the share link can view a public book."""
    book_resp = auth_client.post(reverse("book-list"), {"title": "My Book"}, format="json")
    book_token = book_resp.data["share_token"]
    book_id = book_resp.data["id"]

    # Add recipe and make public
    auth_client.post(reverse("book-add-recipe", kwargs={"pk": book_id}), {"recipe_slug": recipe.slug}, format="json")
    auth_client.patch(reverse("book-detail", kwargs={"pk": book_id}), {"is_public": True}, format="json")

    # Unauthenticated access via share token
    url = reverse("book-share", kwargs={"share_token": book_token})
    response = api_client.get(url)
    assert response.status_code == 200
    assert response.data["title"] == "My Book"

@pytest.mark.django_db
def test_private_book_not_accessible_without_token(api_client, auth_client):
    book_resp = auth_client.post(reverse("book-list"), {"title": "Secret Book"}, format="json")
    book_id = book_resp.data["id"]

    response = api_client.get(reverse("book-detail", kwargs={"pk": book_id}))
    assert response.status_code in [401, 403]
```

**Step 3: Create models.py**

```python
# backend/spoonfury/apps/books/models.py
import uuid
from django.db import models
from django.conf import settings
from spoonfury.apps.recipes.models import Recipe


class RecipeBook(models.Model):
    title = models.CharField(max_length=100)
    cover_image = models.ImageField(upload_to="book_covers/", blank=True, null=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recipe_books",
    )
    recipes = models.ManyToManyField(Recipe, through="BookRecipe", blank=True)
    is_public = models.BooleanField(default=False)
    share_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} by {self.owner.username}"


class BookRecipe(models.Model):
    """Ordered join table for recipes in a book."""
    book = models.ForeignKey(RecipeBook, on_delete=models.CASCADE)
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["order"]
        unique_together = [["book", "recipe"]]
```

**Step 4: Create serializers.py**

```python
# backend/spoonfury/apps/books/serializers.py
from rest_framework import serializers
from .models import RecipeBook, BookRecipe
from spoonfury.apps.recipes.serializers import RecipeSerializer


class RecipeBookSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source="owner.username", read_only=True)
    recipe_count = serializers.SerializerMethodField()
    share_url = serializers.SerializerMethodField()

    class Meta:
        model = RecipeBook
        fields = [
            "id", "title", "cover_image", "owner_username",
            "is_public", "share_token", "share_url",
            "recipe_count", "created_at",
        ]
        read_only_fields = ["share_token", "owner_username", "created_at"]

    def get_recipe_count(self, obj):
        return obj.recipes.count()

    def get_share_url(self, obj):
        return f"/books/share/{obj.share_token}"

    def create(self, validated_data):
        validated_data["owner"] = self.context["request"].user
        return super().create(validated_data)


class RecipeBookDetailSerializer(RecipeBookSerializer):
    recipes = RecipeSerializer(many=True, read_only=True)

    class Meta(RecipeBookSerializer.Meta):
        fields = RecipeBookSerializer.Meta.fields + ["recipes"]
```

**Step 5: Create views.py**

```python
# backend/spoonfury/apps/books/views.py
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
```

**Step 6: Create urls.py**

```python
# backend/spoonfury/apps/books/urls.py
from rest_framework.routers import DefaultRouter
from .views import RecipeBookViewSet

router = DefaultRouter()
router.register(r"books", RecipeBookViewSet, basename="book")

urlpatterns = router.urls
```

**Step 7: Create admin.py**

```python
# backend/spoonfury/apps/books/admin.py
from django.contrib import admin
from .models import RecipeBook, BookRecipe

class BookRecipeInline(admin.TabularInline):
    model = BookRecipe
    extra = 0

@admin.register(RecipeBook)
class RecipeBookAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "is_public", "created_at"]
    inlines = [BookRecipeInline]
```

**Step 8: Migrate + create test dirs + run tests**

```bash
mkdir -p spoonfury/apps/books/tests
touch spoonfury/apps/books/tests/__init__.py
python manage.py makemigrations books
python manage.py migrate
pytest spoonfury/apps/books/tests/test_books.py -v
```

Expected: PASS

**Step 9: Commit**

```bash
git add backend/spoonfury/apps/books/
git commit -m "feat(books): RecipeBook model + API with share link and recipe management"
```

---

## Phase 4: React Frontend

### Task 9: React + Vite + Tailwind + Shadcn Scaffold

**Files:**
- Create: `frontend/` (via create-vite)
- Modify: `frontend/vite.config.js`
- Create: `frontend/src/lib/api.ts`

**Step 1: Scaffold with Vite**

```bash
cd /g/Projects/dev/1.work/Spoonfury
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

**Step 2: Install Tailwind 4**

```bash
npm install tailwindcss @tailwindcss/vite
```

**Step 3: Configure vite.config.js**

```javascript
// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

**Step 4: Update src/index.css for Tailwind 4**

```css
/* frontend/src/index.css */
@import "tailwindcss";
```

**Step 5: Install Shadcn UI**

```bash
npx shadcn@latest init
```

When prompted:
- Style: `New York`
- Base color: `Slate`
- CSS variables: `yes`

```bash
npx shadcn@latest add button card badge checkbox separator
```

**Step 6: Install router + markdown renderer**

```bash
npm install react-router-dom react-markdown
npm install -D @types/react-router-dom
```

**Step 7: Create API client**

```typescript
// frontend/src/lib/api.ts
const BASE = "/api";

async function request(method: string, path: string, body?: unknown, token?: string) {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Token ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(res.statusText), { status: res.status, data: err });
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (path: string, token?: string) => request("GET", path, undefined, token),
  post: (path: string, body: unknown, token?: string) => request("POST", path, body, token),
  patch: (path: string, body: unknown, token?: string) => request("PATCH", path, body, token),
  delete: (path: string, token?: string) => request("DELETE", path, undefined, token),
};
```

**Step 8: Create auth context**

```typescript
// frontend/src/contexts/AuthContext.tsx
import { createContext, useContext, useState, ReactNode } from "react";
import { api } from "@/lib/api";

interface AuthContextType {
  token: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password1: string, password2: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [username, setUsername] = useState<string | null>(localStorage.getItem("username"));

  const login = async (username: string, password: string) => {
    const data = await api.post("/auth/login/", { username, password });
    localStorage.setItem("token", data.key);
    localStorage.setItem("username", username);
    setToken(data.key);
    setUsername(username);
  };

  const register = async (username: string, email: string, password1: string, password2: string) => {
    const data = await api.post("/auth/registration/", { username, email, password1, password2 });
    localStorage.setItem("token", data.key);
    localStorage.setItem("username", username);
    setToken(data.key);
    setUsername(username);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ token, username, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
```

**Step 9: Wire up router in App.tsx**

```tsx
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { RecipePage } from "@/pages/RecipePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { BooksPage } from "@/pages/BooksPage";
import { BookDetailPage } from "@/pages/BookDetailPage";
import { CreateRecipePage } from "@/pages/CreateRecipePage";
import { HomePage } from "@/pages/HomePage";
import { NavBar } from "@/components/NavBar";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/recipes/:slug" element={<RecipePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/books/share/:token" element={<BookDetailPage shared />} />
            <Route path="/books/:id" element={<BookDetailPage />} />
            <Route path="/recipes/new" element={<CreateRecipePage />} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

**Step 10: Verify dev server starts**

```bash
cd frontend
npm run dev
```

Expected: Server starts at `http://localhost:5173`. Browser shows Vite default page (or minimal app shell — 404 pages are fine at this stage).

**Step 11: Commit**

```bash
cd ..
git add frontend/
git commit -m "feat(frontend): Vite + React + Tailwind 4 + Shadcn scaffold with router and auth context"
```

---

### Task 10: NavBar + Auth Pages

**Files:**
- Create: `frontend/src/components/NavBar.tsx`
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/RegisterPage.tsx`
- Create: `frontend/src/pages/HomePage.tsx`

**Step 1: Create NavBar**

```tsx
// frontend/src/components/NavBar.tsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

export function NavBar() {
  const { username, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav className="border-b px-4 py-3 flex items-center justify-between">
      <Link to="/" className="text-xl font-bold tracking-tight">
        🥄 Spoonfury
      </Link>
      <div className="flex items-center gap-3">
        {username ? (
          <>
            <span className="text-sm text-muted-foreground">@{username}</span>
            <Link to="/books">
              <Button variant="outline" size="sm">My Books</Button>
            </Link>
            <Link to="/recipes/new">
              <Button size="sm">+ Recipe</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate("/"); }}>
              Sign out
            </Button>
          </>
        ) : (
          <>
            <Link to="/login"><Button variant="outline" size="sm">Sign in</Button></Link>
            <Link to="/register"><Button size="sm">Join</Button></Link>
          </>
        )}
      </div>
    </nav>
  );
}
```

**Step 2: Create LoginPage**

```tsx
// frontend/src/pages/LoginPage.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(form.username, form.password);
      navigate("/");
    } catch {
      setError("Invalid username or password.");
    }
  };

  return (
    <div className="max-w-sm mx-auto mt-16">
      <Card>
        <CardHeader><CardTitle>Sign in</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Username"
              value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            <input className="w-full border rounded px-3 py-2 text-sm" type="password" placeholder="Password"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full">Sign in</Button>
            <p className="text-sm text-center text-muted-foreground">
              No account? <Link to="/register" className="underline">Join Spoonfury</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 3: Create RegisterPage**

```tsx
// frontend/src/pages/RegisterPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password1: "", password2: "" });
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password1 !== form.password2) { setError("Passwords don't match."); return; }
    try {
      await register(form.username, form.email, form.password1, form.password2);
      navigate("/");
    } catch (err: any) {
      setError(JSON.stringify(err.data || "Registration failed."));
    }
  };

  const field = (key: keyof typeof form, placeholder: string, type = "text") => (
    <input className="w-full border rounded px-3 py-2 text-sm" type={type} placeholder={placeholder}
      value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
  );

  return (
    <div className="max-w-sm mx-auto mt-16">
      <Card>
        <CardHeader><CardTitle>Join Spoonfury</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {field("username", "Username")}
            {field("email", "Email", "email")}
            {field("password1", "Password", "password")}
            {field("password2", "Confirm password", "password")}
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full">Create account</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 4: Create HomePage (minimal)**

```tsx
// frontend/src/pages/HomePage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";

export function HomePage() {
  const [recipes, setRecipes] = useState<any[]>([]);

  useEffect(() => {
    api.get("/recipes/").then(data => setRecipes(data.results || []));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Latest Recipes</h1>
      <div className="space-y-4">
        {recipes.map((r: any) => (
          <Link key={r.slug} to={`/recipes/${r.slug}`} className="block border rounded-lg p-4 hover:bg-accent transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">{r.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                <p className="text-xs text-muted-foreground mt-2">by @{r.author_username}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <Badge variant="secondary">{r.category}</Badge>
                {r.fork_count > 0 && <span className="text-xs text-muted-foreground">🍴 {r.fork_count}</span>}
              </div>
            </div>
          </Link>
        ))}
        {recipes.length === 0 && <p className="text-muted-foreground">No recipes yet. Be the first!</p>}
      </div>
    </div>
  );
}
```

**Step 5: Manual test**

Start both servers:
```bash
# Terminal 1
cd backend && python manage.py runserver

# Terminal 2
cd frontend && npm run dev
```

Visit `http://localhost:5173` — NavBar appears, home page loads. Sign up, sign in, sign out all work.

**Step 6: Commit**

```bash
git add frontend/src/
git commit -m "feat(frontend): NavBar, auth pages, and home recipe list"
```

---

### Task 11: Recipe Page with Ingredient Checklist + Instacart Button

**Files:**
- Create: `frontend/src/pages/RecipePage.tsx`
- Create: `frontend/src/components/IngredientChecklist.tsx`
- Create: `frontend/src/lib/instacart.ts`

**Step 1: Create Instacart URL builder**

```typescript
// frontend/src/lib/instacart.ts

interface Ingredient {
  quantity: string;
  unit: string;
  name: string;
  note: string;
}

/**
 * Builds an Instacart search URL for a list of ingredients.
 * Uses Instacart's search page as a simple entry point.
 * One item at a time via multiple tabs is impractical — we link
 * to a search for the first item and append others as a comma list.
 * Real affiliate API integration comes post-prototype.
 */
export function buildInstacartUrl(ingredients: Ingredient[]): string {
  if (ingredients.length === 0) return "https://www.instacart.com";

  // Construct a plain text shopping list as a search query
  const query = ingredients
    .map(i => `${i.quantity} ${i.unit} ${i.name}`.trim().replace(/\s+/g, " "))
    .join(", ");

  return `https://www.instacart.com/store/search_v3/term?term=${encodeURIComponent(query)}`;
}
```

**Step 2: Create IngredientChecklist component**

```tsx
// frontend/src/components/IngredientChecklist.tsx
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { buildInstacartUrl } from "@/lib/instacart";

interface Ingredient {
  quantity: string;
  unit: string;
  name: string;
  note: string;
}

export function IngredientChecklist({ ingredients }: { ingredients: Ingredient[] }) {
  const [checked, setChecked] = useState<Set<number>>(
    new Set(ingredients.map((_, i) => i)) // all checked by default
  );

  const toggle = (i: number) =>
    setChecked(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });

  const checkedIngredients = ingredients.filter((_, i) => checked.has(i));

  const openInstacart = () => {
    const url = buildInstacartUrl(checkedIngredients);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-3">
      <h2 className="font-semibold text-lg">Ingredients</h2>
      <p className="text-xs text-muted-foreground">Uncheck items you already have.</p>
      <ul className="space-y-2">
        {ingredients.map((ing, i) => (
          <li key={i} className="flex items-center gap-3">
            <Checkbox
              id={`ing-${i}`}
              checked={checked.has(i)}
              onCheckedChange={() => toggle(i)}
            />
            <label
              htmlFor={`ing-${i}`}
              className={`text-sm cursor-pointer select-none ${!checked.has(i) ? "line-through text-muted-foreground" : ""}`}
            >
              <span className="font-medium">{ing.quantity} {ing.unit}</span> {ing.name}
              {ing.note && <span className="text-muted-foreground"> — {ing.note}</span>}
            </label>
          </li>
        ))}
      </ul>
      <Separator />
      <Button
        onClick={openInstacart}
        disabled={checkedIngredients.length === 0}
        className="w-full"
        variant="outline"
      >
        🛒 Order {checkedIngredients.length} item{checkedIngredients.length !== 1 ? "s" : ""} on Instacart →
      </Button>
    </div>
  );
}
```

**Step 3: Create RecipePage**

```tsx
// frontend/src/pages/RecipePage.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { IngredientChecklist } from "@/components/IngredientChecklist";
import { ForkModal } from "@/components/ForkModal";

export function RecipePage() {
  const { slug } = useParams<{ slug: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<any>(null);
  const [forking, setForking] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.get(`/recipes/${slug}/`).then(setRecipe);
  }, [slug]);

  if (!recipe) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <article className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold leading-tight">{recipe.title}</h1>
          <Badge variant="secondary" className="shrink-0 mt-1">{recipe.category}</Badge>
        </div>
        {recipe.parent_recipe_slug && (
          <p className="text-sm text-muted-foreground mt-1">
            Forked from{" "}
            <a href={`/recipes/${recipe.parent_recipe_slug}`} className="underline">
              @{recipe.parent_recipe_author}'s {recipe.parent_recipe_title}
            </a>
          </p>
        )}
        <p className="text-sm text-muted-foreground mt-1">
          by @{recipe.author_username}
          {recipe.fork_count > 0 && (
            <span className="ml-3">🍴 {recipe.fork_count} fork{recipe.fork_count !== 1 ? "s" : ""}</span>
          )}
        </p>
      </div>

      {/* Description */}
      <p className="text-base leading-relaxed">{recipe.description}</p>
      <p className="text-sm text-muted-foreground">Serves: {recipe.serves}</p>

      <Separator />

      {/* Ingredient checklist + Instacart */}
      <IngredientChecklist ingredients={recipe.ingredients} />

      <Separator />

      {/* Instructions */}
      <div>
        <h2 className="font-semibold text-lg mb-3">Instructions</h2>
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown>{recipe.instructions}</ReactMarkdown>
        </div>
      </div>

      {/* Notes */}
      {recipe.notes && (
        <>
          <Separator />
          <div>
            <h2 className="font-semibold text-lg mb-3">Notes</h2>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown>{recipe.notes}</ReactMarkdown>
            </div>
          </div>
        </>
      )}

      {/* Fork button */}
      {token && (
        <div className="pt-4">
          <Button onClick={() => setForking(true)} className="w-full" size="lg">
            🍴 Make it mine
          </Button>
        </div>
      )}

      {/* Fork modal */}
      {forking && (
        <ForkModal
          recipe={recipe}
          token={token!}
          onClose={() => setForking(false)}
          onSuccess={(slug: string) => navigate(`/recipes/${slug}`)}
        />
      )}
    </article>
  );
}
```

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat(frontend): recipe page with ingredient checklist and Instacart button"
```

---

### Task 12: Fork Modal

**Files:**
- Create: `frontend/src/components/ForkModal.tsx`

**Step 1: Create ForkModal**

```tsx
// frontend/src/components/ForkModal.tsx
import { useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Ingredient {
  quantity: string;
  unit: string;
  name: string;
  note: string;
}

interface ForkModalProps {
  recipe: any;
  token: string;
  onClose: () => void;
  onSuccess: (slug: string) => void;
}

export function ForkModal({ recipe, token, onClose, onSuccess }: ForkModalProps) {
  const [title, setTitle] = useState(`${recipe.title} (my version)`);
  const [description, setDescription] = useState(recipe.description);
  const [serves, setServes] = useState(recipe.serves);
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    JSON.parse(JSON.stringify(recipe.ingredients)) // deep copy
  );
  const [instructions, setInstructions] = useState(recipe.instructions);
  const [notes, setNotes] = useState(recipe.notes || "");
  const [error, setError] = useState("");

  // Count name changes vs original
  const originalNames = new Set(recipe.ingredients.map((i: Ingredient) => i.name.trim().toLowerCase()));
  const currentNames = new Set(ingredients.map(i => i.name.trim().toLowerCase()));
  const added = [...currentNames].filter(n => !originalNames.has(n));
  const removed = [...originalNames].filter(n => !currentNames.has(n));
  const changeCount = Math.max(added.length, removed.length);

  const updateIngredient = (i: number, field: keyof Ingredient, value: string) => {
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [field]: value } : ing));
  };

  const addIngredient = () => {
    if (changeCount >= 3) return;
    setIngredients(prev => [...prev, { quantity: "", unit: "", name: "", note: "" }]);
  };

  const removeIngredient = (i: number) => {
    setIngredients(prev => prev.filter((_, idx) => idx !== i));
  };

  const submit = async () => {
    setError("");
    try {
      const data = await api.post(
        `/recipes/${recipe.slug}/fork/`,
        { title, description, serves, ingredients, instructions, notes },
        token,
      );
      onSuccess(data.slug);
    } catch (err: any) {
      setError(err.data?.detail || "Failed to save fork.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Make it mine — forking "{recipe.title}"</CardTitle>
          <p className="text-sm text-muted-foreground">
            Category locked to: <strong>{recipe.category}</strong> · Ingredient changes:{" "}
            <span className={changeCount > 3 ? "text-red-500 font-bold" : "font-semibold"}>
              {changeCount}/3
            </span>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <input className="w-full border rounded px-3 py-2 text-sm font-semibold" value={title}
            onChange={e => setTitle(e.target.value)} placeholder="Recipe title" />
          <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} value={description}
            onChange={e => setDescription(e.target.value)} maxLength={280} placeholder="Description (280 chars)" />
          <input className="w-full border rounded px-3 py-2 text-sm" value={serves}
            onChange={e => setServes(e.target.value)} placeholder="Serves" />

          <div>
            <h3 className="text-sm font-semibold mb-2">Ingredients</h3>
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                <input className="border rounded px-2 py-1 text-xs w-14" value={ing.quantity}
                  onChange={e => updateIngredient(i, "quantity", e.target.value)} placeholder="Qty" />
                <input className="border rounded px-2 py-1 text-xs w-14" value={ing.unit}
                  onChange={e => updateIngredient(i, "unit", e.target.value)} placeholder="Unit" />
                <input className="border rounded px-2 py-1 text-xs flex-1" value={ing.name}
                  onChange={e => updateIngredient(i, "name", e.target.value)} placeholder="Ingredient name" />
                <input className="border rounded px-2 py-1 text-xs w-24" value={ing.note}
                  onChange={e => updateIngredient(i, "note", e.target.value)} placeholder="Note" />
                <button onClick={() => removeIngredient(i)} className="text-xs text-red-500 hover:text-red-700">✕</button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addIngredient} disabled={changeCount >= 3}>
              + Add ingredient
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Instructions</h3>
            <textarea className="w-full border rounded px-3 py-2 text-sm font-mono" rows={8}
              value={instructions} onChange={e => setInstructions(e.target.value)} />
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Notes (optional)</h3>
            <textarea className="w-full border rounded px-3 py-2 text-sm font-mono" rows={3}
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button onClick={submit} disabled={changeCount > 3} className="flex-1">
              Save my version
            </Button>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Step 2: Manual test**

1. Create a recipe via Django admin or the API
2. Visit `http://localhost:5173/recipes/<slug>`
3. Sign in, click "Make it mine"
4. Tweak an ingredient — change counter should update
5. Save — should redirect to new recipe with fork attribution

**Step 3: Commit**

```bash
git add frontend/src/components/ForkModal.tsx
git commit -m "feat(frontend): fork modal with change counter and ingredient editor"
```

---

### Task 13: Create Recipe Form + Recipe Books Pages

**Files:**
- Create: `frontend/src/pages/CreateRecipePage.tsx`
- Create: `frontend/src/pages/BooksPage.tsx`
- Create: `frontend/src/pages/BookDetailPage.tsx`

**Step 1: Create CreateRecipePage**

```tsx
// frontend/src/pages/CreateRecipePage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CATEGORIES = ["soup","pasta","bake","salad","grill","breakfast","dessert","drink","snack","other"];

export function CreateRecipePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", serves: "",
    instructions: "", notes: "", category: "other",
  });
  const [ingredients, setIngredients] = useState([{ quantity: "", unit: "", name: "", note: "" }]);
  const [error, setError] = useState("");

  if (!token) return <p>Please <a href="/login" className="underline">sign in</a> to create recipes.</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.post("/recipes/", { ...form, ingredients }, token);
      navigate(`/recipes/${data.slug}`);
    } catch (err: any) {
      setError(JSON.stringify(err.data || "Failed to create recipe."));
    }
  };

  const updateIng = (i: number, f: string, v: string) =>
    setIngredients(prev => prev.map((ing, idx) => idx === i ? { ...ing, [f]: v } : ing));

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader><CardTitle>New Recipe</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <input className="w-full border rounded px-3 py-2 text-sm" placeholder="Title (max 100 chars)"
            maxLength={100} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} maxLength={280}
            placeholder="Description (max 280 chars — the elevator pitch)" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          <div className="flex gap-3">
            <input className="border rounded px-3 py-2 text-sm flex-1" placeholder="Serves"
              value={form.serves} onChange={e => setForm(f => ({ ...f, serves: e.target.value }))} />
            <select className="border rounded px-3 py-2 text-sm" value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Ingredients</h3>
            {ingredients.map((ing, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className="border rounded px-2 py-1 text-xs w-14" placeholder="Qty"
                  value={ing.quantity} onChange={e => updateIng(i, "quantity", e.target.value)} />
                <input className="border rounded px-2 py-1 text-xs w-14" placeholder="Unit"
                  value={ing.unit} onChange={e => updateIng(i, "unit", e.target.value)} />
                <input className="border rounded px-2 py-1 text-xs flex-1" placeholder="Name"
                  value={ing.name} onChange={e => updateIng(i, "name", e.target.value)} />
                <input className="border rounded px-2 py-1 text-xs w-24" placeholder="Note"
                  value={ing.note} onChange={e => updateIng(i, "note", e.target.value)} />
                {ingredients.length > 1 && (
                  <button type="button" onClick={() => setIngredients(p => p.filter((_, idx) => idx !== i))}
                    className="text-xs text-red-500">✕</button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm"
              onClick={() => setIngredients(p => [...p, { quantity: "", unit: "", name: "", note: "" }])}>
              + Add ingredient
            </Button>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Instructions (markdown)</h3>
            <textarea className="w-full border rounded px-3 py-2 text-sm font-mono" rows={10}
              value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} />
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Notes (optional markdown)</h3>
            <textarea className="w-full border rounded px-3 py-2 text-sm font-mono" rows={4}
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full">Publish Recipe</Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

**Step 2: Create BooksPage**

```tsx
// frontend/src/pages/BooksPage.tsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function BooksPage() {
  const { token } = useAuth();
  const [books, setBooks] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");

  const load = () => token && api.get("/books/", token).then(d => setBooks(d.results || d));

  useEffect(() => { load(); }, [token]);

  const createBook = async () => {
    if (!newTitle.trim() || !token) return;
    await api.post("/books/", { title: newTitle }, token);
    setNewTitle("");
    load();
  };

  if (!token) return <p>Please <a href="/login" className="underline">sign in</a> to manage your books.</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Recipe Books</h1>
      <div className="flex gap-2">
        <input className="border rounded px-3 py-2 text-sm flex-1" placeholder="New book title..."
          value={newTitle} onChange={e => setNewTitle(e.target.value)}
          onKeyDown={e => e.key === "Enter" && createBook()} />
        <Button onClick={createBook}>Create</Button>
      </div>
      <div className="grid gap-4">
        {books.map((book: any) => (
          <Link key={book.id} to={`/books/${book.id}`}>
            <Card className="hover:bg-accent transition-colors">
              <CardContent className="p-4 flex justify-between items-center">
                <div>
                  <h2 className="font-semibold">{book.title}</h2>
                  <p className="text-sm text-muted-foreground">{book.recipe_count} recipes · {book.is_public ? "Public" : "Private"}</p>
                </div>
                <span className="text-muted-foreground text-sm">→</span>
              </CardContent>
            </Card>
          </Link>
        ))}
        {books.length === 0 && <p className="text-muted-foreground">No books yet. Create your first one!</p>}
      </div>
    </div>
  );
}
```

**Step 3: Create BookDetailPage**

```tsx
// frontend/src/pages/BookDetailPage.tsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function BookDetailPage({ shared = false }: { shared?: boolean }) {
  const { id, token: shareToken } = useParams<{ id?: string; token?: string }>();
  const { token } = useAuth();
  const [book, setBook] = useState<any>(null);
  const [copyMsg, setCopyMsg] = useState("");

  useEffect(() => {
    if (shared && shareToken) {
      api.get(`/books/share/${shareToken}/`).then(setBook);
    } else if (id && token) {
      api.get(`/books/${id}/`, token).then(setBook);
    }
  }, [id, shareToken, token]);

  const togglePublic = async () => {
    if (!token || !id) return;
    const updated = await api.patch(`/books/${id}/`, { is_public: !book.is_public }, token);
    setBook((b: any) => ({ ...b, is_public: updated.is_public }));
  };

  const copyShareLink = () => {
    const url = `${window.location.origin}/books/share/${book.share_token}`;
    navigator.clipboard.writeText(url);
    setCopyMsg("Copied!");
    setTimeout(() => setCopyMsg(""), 2000);
  };

  if (!book) return <p className="text-muted-foreground">Loading...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{book.title}</h1>
          <p className="text-sm text-muted-foreground">by @{book.owner_username}</p>
        </div>
        {!shared && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={togglePublic}>
              {book.is_public ? "Make private" : "Make public"}
            </Button>
            {book.is_public && (
              <Button variant="outline" size="sm" onClick={copyShareLink}>
                {copyMsg || "Copy share link"}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {(book.recipes || []).map((r: any) => (
          <Link key={r.slug} to={`/recipes/${r.slug}`}
            className="flex items-center justify-between border rounded-lg p-3 hover:bg-accent transition-colors">
            <div>
              <p className="font-medium text-sm">{r.title}</p>
              <p className="text-xs text-muted-foreground">by @{r.author_username}</p>
            </div>
            <Badge variant="secondary" className="text-xs">{r.category}</Badge>
          </Link>
        ))}
        {book.recipes?.length === 0 && (
          <p className="text-muted-foreground text-sm">No recipes in this book yet.</p>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add frontend/src/
git commit -m "feat(frontend): create recipe form and recipe book pages"
```

---

## Phase 5: Docker + Jetson Deployment

### Task 14: Dockerfiles

**Files:**
- Create: `backend/Dockerfile`
- Create: `frontend/Dockerfile`
- Create: `backend/.dockerignore`
- Create: `frontend/.dockerignore`

**Step 1: Create backend Dockerfile**

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

**Step 2: Create frontend Dockerfile (multi-stage)**

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production: static files served by Django — nothing extra needed here.
# The dist/ output is copied into Django's static/frontend/ at compose time.
FROM nginx:alpine AS serve
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**Step 3: Create nginx.conf for frontend**

```nginx
# frontend/nginx.conf
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://backend:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Step 4: Create .dockerignore files**

```
# backend/.dockerignore
.venv/
__pycache__/
*.pyc
.env
*.sqlite3
```

```
# frontend/.dockerignore
node_modules/
dist/
.env
```

**Step 5: Commit**

```bash
git add backend/Dockerfile backend/.dockerignore frontend/Dockerfile frontend/.dockerignore frontend/nginx.conf
git commit -m "chore(docker): add Dockerfiles for backend and frontend"
```

---

### Task 15: docker-compose.yml + deploy.sh

**Files:**
- Create: `docker-compose.yml`
- Create: `deploy.sh`
- Create: `.env.example` (update)

**Step 1: Create docker-compose.yml**

```yaml
# docker-compose.yml
version: "3.9"

services:
  db:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_DB: spoonfury
      POSTGRES_USER: spoonfury
      POSTGRES_PASSWORD: ${DB_PASSWORD:-spoonfury}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    restart: always
    environment:
      SECRET_KEY: ${SECRET_KEY:-dev-secret-change-me}
      DEBUG: ${DEBUG:-False}
      DB_HOST: db
      DB_PORT: 5432
      ALLOWED_HOSTS: ${ALLOWED_HOSTS:-localhost,127.0.0.1}
      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-http://localhost}
    depends_on:
      - db
    volumes:
      - media_data:/app/media
    command: >
      sh -c "python manage.py migrate &&
             python manage.py collectstatic --noinput &&
             python manage.py runserver 0.0.0.0:8000"

  frontend:
    build: ./frontend
    restart: always
    ports:
      - "8055:80"
    depends_on:
      - backend

volumes:
  postgres_data:
  media_data:
```

**Step 2: Create deploy.sh**

```bash
#!/bin/bash
# deploy.sh — Spoonfury deployment menu

set -e

echo ""
echo "╔═══════════════════════════════╗"
echo "║     🥄 Spoonfury Deploy       ║"
echo "╚═══════════════════════════════╝"
echo ""
echo "1) Full rebuild (all services)"
echo "2) Rebuild frontend only"
echo "3) Rebuild backend only"
echo "4) Pull latest + rebuild all"
echo "5) View logs"
echo "6) Stop all"
echo ""
read -p "Choose option: " opt

case $opt in
  1)
    echo "→ Full rebuild..."
    docker compose down
    docker compose up --build -d
    ;;
  2)
    echo "→ Rebuilding frontend..."
    docker compose up --build -d frontend
    ;;
  3)
    echo "→ Rebuilding backend..."
    docker compose up --build -d backend
    ;;
  4)
    echo "→ Pulling latest + rebuilding all..."
    git pull
    docker compose down
    docker compose up --build -d
    ;;
  5)
    docker compose logs -f
    ;;
  6)
    docker compose down
    ;;
  *)
    echo "Invalid option."
    exit 1
    ;;
esac

echo ""
echo "✓ Done. Spoonfury running at http://$(hostname -I | awk '{print $1}'):8055"
```

```bash
chmod +x deploy.sh
```

**Step 3: Update .env.example**

```bash
# .env.example
SECRET_KEY=your-secret-key-generate-with-python-secrets
DEBUG=False
DB_PASSWORD=spoonfury
ALLOWED_HOSTS=192.168.1.11,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://192.168.1.11:8055
```

**Step 4: Test Docker build locally**

```bash
cp .env.example .env
# Edit .env with real SECRET_KEY:
# python -c "import secrets; print(secrets.token_urlsafe(50))"
docker compose build
docker compose up -d
```

Visit `http://localhost:8055` — full app should load.

**Step 5: Commit**

```bash
git add docker-compose.yml deploy.sh .env.example
git commit -m "chore(docker): add docker-compose.yml and deploy.sh for Jetson deployment"
```

---

## Phase 6: Run All Tests + Final Commit

### Task 16: Full Test Suite

**Step 1: Run all backend tests**

```bash
cd backend
pytest -v
```

Expected: All tests pass. Minimum:
- `test_database_is_reachable` ✓
- `test_user_has_display_name_and_bio` ✓
- `test_recipe_creation` ✓
- `test_list_recipes_is_public` ✓
- `test_fork_creates_new_recipe` ✓
- `test_fork_rejects_too_many_ingredient_changes` ✓
- `test_fork_locks_category` ✓
- `test_create_book` ✓
- `test_share_link_is_public` ✓

**Step 2: Run frontend lint**

```bash
cd frontend
npm run lint
```

Expected: No errors.

**Step 3: Build frontend**

```bash
npm run build
```

Expected: `dist/` created with no errors.

**Step 4: Final commit**

```bash
cd ..
git add .
git commit -m "chore: verify all tests pass and frontend builds clean for v0.1 prototype"
```

---

## Summary

When complete, `http://localhost:8055` (or `http://192.168.1.11:8055` on Jetson) delivers:

- ✅ Home page with recipe list
- ✅ Recipe page: description, ingredient checklist, Instacart button, instructions, notes, fork attribution
- ✅ Fork a recipe: edit ingredients (max 3 changes), category locked, lineage credited
- ✅ Create original recipes
- ✅ Recipe books: create, add recipes, make public, share link
- ✅ Auth: register, login, logout
- ✅ PostgreSQL + Docker + deploy.sh for Jetson
