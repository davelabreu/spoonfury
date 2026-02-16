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
