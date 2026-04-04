"""Tests for the TestKitchenInvite model and kitchen sharing."""
import pytest
from django.contrib.auth import get_user_model
from spoonfury.apps.recipes.models import TestKitchenInvite

User = get_user_model()


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
