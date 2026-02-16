import pytest


@pytest.mark.django_db
def test_database_is_reachable(user):
    """Smoke test: can we hit the database at all?"""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    assert User.objects.filter(username="testchef").exists()
