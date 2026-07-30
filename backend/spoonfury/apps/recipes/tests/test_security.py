import io

import pytest
from django.conf import settings
from spoonfury.apps.recipes.models import Recipe

SAMPLE_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
]


@pytest.fixture
def recipe(user):
    return Recipe.objects.create(
        title="Upload Test Recipe",
        description="A test recipe.",
        serves="4",
        ingredients=SAMPLE_INGREDIENTS,
        instructions="Cook it.",
        category="soup",
        author=user,
    )


@pytest.mark.django_db
def test_upload_rejects_oversized_file(auth_client):
    """Image uploads larger than 5 MB are rejected."""
    # Create a fake file slightly over 5 MB
    data = b"\x00" * (5 * 1024 * 1024 + 1)
    file = io.BytesIO(data)
    file.name = "large.jpg"

    response = auth_client.post(
        "/api/recipes/upload-image/",
        {"image": file},
        format="multipart",
    )
    assert response.status_code == 400
    assert "too large" in response.data["error"].lower()


@pytest.mark.django_db
def test_upload_accepts_small_file(auth_client, tmp_path):
    """Image uploads within the size limit succeed."""
    # Create a small valid JPEG-ish file
    file = io.BytesIO(b"\xff\xd8\xff" + b"\x00" * 100)
    file.name = "small.jpg"

    response = auth_client.post(
        "/api/recipes/upload-image/",
        {"image": file},
        format="multipart",
    )
    assert response.status_code == 200
    assert "url" in response.data


def test_throttle_classes_configured():
    """DRF throttle classes and rates are set in settings."""
    rf = settings.REST_FRAMEWORK
    assert "rest_framework.throttling.AnonRateThrottle" in rf["DEFAULT_THROTTLE_CLASSES"]
    assert "rest_framework.throttling.UserRateThrottle" in rf["DEFAULT_THROTTLE_CLASSES"]
    assert "anon" in rf["DEFAULT_THROTTLE_RATES"]
    assert "user" in rf["DEFAULT_THROTTLE_RATES"]
    assert "auth" in rf["DEFAULT_THROTTLE_RATES"]


def test_production_security_settings_exist():
    """Key security settings are defined for production use."""
    # DATA_UPLOAD_MAX_MEMORY_SIZE should be set (5 MB)
    assert settings.DATA_UPLOAD_MAX_MEMORY_SIZE == 5 * 1024 * 1024
    assert settings.FILE_UPLOAD_MAX_MEMORY_SIZE == 5 * 1024 * 1024
    # CONN_MAX_AGE should be set for connection pooling
    assert settings.DATABASES["default"]["CONN_MAX_AGE"] > 0
