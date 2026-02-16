# Spoonfury Backend

Django REST Framework API for the Spoonfury social platform.

## Core Technologies
- **Framework**: Django 5.0
- **API**: Django REST Framework (DRF)
- **Database**: PostgreSQL
- **Auth**: dj-rest-auth + django-allauth (Token Authentication)
- **Testing**: pytest-django

## Key Applications
- `spoonfury.apps.recipes`: Core recipe logic, forking, and category management.
- `spoonfury.apps.books`: User recipe collections and sharing.
- `spoonfury.apps.users`: Custom user model and profiles.

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
- **Actions**: Complex business logic (like adding a recipe to a book) is implemented as custom DRF actions using `POST`.
