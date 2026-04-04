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


@pytest.fixture
def staff_user(db):
    """A moderator (staff) user."""
    return User.objects.create_user(
        username="modchef", email="mod@test.com", password="testpass123", is_staff=True,
    )


@pytest.fixture
def staff_client(staff_user):
    """Authenticated client for the staff/moderator user."""
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=staff_user)
    return client


@pytest.fixture
def invitee_user(db):
    """A third user who will be invited to kitchens for review."""
    return User.objects.create_user(
        username="inviteechef", email="invitee@test.com", password="testpass123",
    )


@pytest.fixture
def invitee_client(invitee_user):
    """Authenticated client for the invitee user."""
    from rest_framework.test import APIClient
    client = APIClient()
    client.force_authenticate(user=invitee_user)
    return client
