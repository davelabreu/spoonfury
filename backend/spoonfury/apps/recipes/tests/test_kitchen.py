"""Tests for the TestKitchenInvite model and kitchen sharing."""
import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe, TestKitchenInvite

User = get_user_model()

SAMPLE_INGREDIENTS = [
    {"quantity": "2", "unit": "Tbsp", "name": "olive oil", "note": ""},
]


@pytest.fixture
def draft_recipe(user):
    """A draft recipe in the user's test kitchen."""
    return Recipe.objects.create(
        title="Secret Sauce",
        description="My work in progress.",
        serves="4",
        ingredients=SAMPLE_INGREDIENTS,
        instructions="Still figuring it out...",
        category="other",
        author=user,
    )


# --- Model tests ---

@pytest.mark.django_db
def test_create_kitchen_invite(user, other_user):
    """An owner can invite another user to view their test kitchen."""
    invite = TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    assert invite.owner == user
    assert invite.invitee == other_user
    assert invite.created_at is not None


@pytest.mark.django_db
def test_kitchen_invite_unique_constraint(user, other_user):
    """Cannot invite the same user twice."""
    TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    with pytest.raises(Exception):  # IntegrityError
        TestKitchenInvite.objects.create(owner=user, invitee=other_user)


@pytest.mark.django_db
def test_kitchen_invite_str(user, other_user):
    """String representation shows owner → invitee."""
    invite = TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    assert str(invite) == f"{user.username} → {other_user.username}"


# --- View kitchen API tests ---

@pytest.mark.django_db
def test_owner_sees_own_kitchen(auth_client, user, draft_recipe):
    """Owner can view their own test kitchen."""
    url = reverse("kitchen-detail", kwargs={"username": user.username})
    response = auth_client.get(url)
    assert response.status_code == 200
    assert len(response.data["recipes"]) == 1
    assert response.data["recipes"][0]["title"] == "Secret Sauce"


@pytest.mark.django_db
def test_invitee_sees_kitchen(auth_client, user, other_user, other_auth_client, draft_recipe):
    """An invited user can view the owner's test kitchen."""
    TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    url = reverse("kitchen-detail", kwargs={"username": user.username})
    response = other_auth_client.get(url)
    assert response.status_code == 200
    assert len(response.data["recipes"]) == 1


@pytest.mark.django_db
def test_stranger_cannot_see_kitchen(other_auth_client, user, draft_recipe):
    """A non-invited user gets 403 when viewing someone's kitchen."""
    url = reverse("kitchen-detail", kwargs={"username": user.username})
    response = other_auth_client.get(url)
    assert response.status_code == 403


@pytest.mark.django_db
def test_unauthenticated_cannot_see_kitchen(api_client, user, draft_recipe):
    """Unauthenticated users get 401."""
    url = reverse("kitchen-detail", kwargs={"username": user.username})
    response = api_client.get(url)
    assert response.status_code == 401


# --- Invite API tests ---

@pytest.mark.django_db
def test_invite_user_to_kitchen(auth_client, user, other_user):
    """Owner can invite another user to their kitchen."""
    url = reverse("kitchen-invite", kwargs={"username": user.username})
    response = auth_client.post(url, {"invitee_username": other_user.username}, format="json")
    assert response.status_code == 201
    assert TestKitchenInvite.objects.filter(owner=user, invitee=other_user).exists()


@pytest.mark.django_db
def test_cannot_invite_to_others_kitchen(other_auth_client, user, other_user):
    """You can only invite to your own kitchen."""
    url = reverse("kitchen-invite", kwargs={"username": user.username})
    response = other_auth_client.post(url, {"invitee_username": "someone"}, format="json")
    assert response.status_code == 403


# --- Revoke API tests ---

@pytest.mark.django_db
def test_revoke_kitchen_access(auth_client, user, other_user):
    """Owner can revoke an invitee's access."""
    TestKitchenInvite.objects.create(owner=user, invitee=other_user)
    url = reverse("kitchen-revoke", kwargs={"username": user.username, "invitee_username": other_user.username})
    response = auth_client.delete(url)
    assert response.status_code == 204
    assert not TestKitchenInvite.objects.filter(owner=user, invitee=other_user).exists()
