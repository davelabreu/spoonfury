# Spoonfury Backend

Django REST Framework API for the Spoonfury social platform.

## Core Technologies
- **Framework**: Django 5.0
- **API**: Django REST Framework (DRF)
- **Database**: PostgreSQL
- **Auth**: dj-rest-auth + django-allauth (Token Authentication)
- **Testing**: pytest-django

## Architecture & Code Patterns

### Ownership Security
`RecipeViewSet` and other ownership-sensitive views strictly enforce ownership on `PATCH` and `DELETE` via `perform_update` and `perform_destroy`. This ensures users can only modify their own data.

### Action Pattern
Complex business logic (like `add-recipe`, `remove-recipe`, `fork`, etc.) is implemented as custom DRF actions using `POST` to handle request bodies reliably.

### App Layout
All Django apps live under `backend/spoonfury/apps/`. Project-wide configuration (ASGI/WSGI/Settings/URLs) lives in `backend/config/`.

## Key Applications
- `spoonfury.apps.recipes`: Core recipe logic, forking, and category management.
- `spoonfury.apps.books`: User recipe collections and sharing.
- `spoonfury.apps.users`: Custom user model and profiles.
- `spoonfury.apps.shopping`: Shopping list management (one per user).

## Development
```bash
# Recommended: Use the project-root .venv
# Windows
..\.venv\Scripts\python manage.py runserver

# Linux
../.venv/bin/python manage.py runserver
```

## Running Tests
```bash
..\.venv\Scripts\pytest
```

## API Conventions
- **Slugs**: Recipes are identified by unique slugs, not IDs.
- **Security**: Ownership is strictly enforced on all write operations (`POST`, `PATCH`, `DELETE`).
- **Actions**: Custom actions using `POST`.
