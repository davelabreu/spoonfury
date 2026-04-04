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
def other_user(db):
    """A second user for ownership and kitchen sharing tests."""
    return User.objects.create_user(
        username="otherchef",
        email="other@test.com",
        password="testpass123",
    )


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def auth_client(user):
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def other_auth_client(other_user):
    """Authenticated client for other_user."""
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=other_user)
    return client
