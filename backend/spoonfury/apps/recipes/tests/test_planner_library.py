import pytest
from django.urls import reverse
from spoonfury.apps.recipes.models import Recipe, TestKitchenInvite

@pytest.fixture
def other_user(db):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.create_user(
        username="otherchef",
        email="other@test.com",
        password="testpass123",
    )

@pytest.fixture
def random_user(db):
    from django.contrib.auth import get_user_model
    User = get_user_model()
    return User.objects.create_user(
        username="randomchef",
        email="random@test.com",
        password="testpass123",
    )

@pytest.mark.django_db
def test_planner_library_requires_auth(api_client):
    url = reverse("recipe-planner-library")
    response = api_client.get(url)
    assert response.status_code == 401

@pytest.mark.django_db
def test_planner_library_filtering(auth_client, user, other_user, random_user):
    # User A (auth_client) recipes
    Recipe.objects.create(title="A Draft", author=user, status="draft", category="soup")
    Recipe.objects.create(title="A Published", author=user, status="published", category="soup")
    
    # User B (other_user) recipes
    Recipe.objects.create(title="B Draft", author=other_user, status="draft", category="soup")
    Recipe.objects.create(title="B Published", author=other_user, status="published", category="soup")
    
    # User C (random_user) recipes
    Recipe.objects.create(title="C Draft", author=random_user, status="draft", category="soup")
    Recipe.objects.create(title="C Published", author=random_user, status="published", category="soup")

    # Initially, User A only sees their own recipes in the planner library
    url = reverse("recipe-planner-library")
    response = auth_client.get(url)
    assert response.status_code == 200
    titles = [r["title"] for r in response.data]
    assert len(titles) == 2
    assert "A Draft" in titles
    assert "A Published" in titles
    assert "B Draft" not in titles
    assert "C Published" not in titles

    # Now invite User A to User B's kitchen
    TestKitchenInvite.objects.create(owner=other_user, invitee=user)

    # Now User A should see their own AND User B's recipes
    response = auth_client.get(url)
    assert response.status_code == 200
    titles = [r["title"] for r in response.data]
    assert len(titles) == 4
    assert "A Draft" in titles
    assert "A Published" in titles
    assert "B Draft" in titles
    assert "B Published" in titles
    assert "C Draft" not in titles
    assert "C Published" not in titles

@pytest.mark.django_db
def test_planner_library_excludes_other_statuses(auth_client, user):
    # Statuses that should NOT be in the planner library by default (as per task description)
    # Task says: "Check for both draft and published statuses."
    # We'll assume only those two are wanted for now.
    Recipe.objects.create(title="In Review", author=user, status="in_review", category="soup")
    Recipe.objects.create(title="Mod Queue", author=user, status="mod_queue", category="soup")
    
    url = reverse("recipe-planner-library")
    response = auth_client.get(url)
    assert response.status_code == 200
    titles = [r["title"] for r in response.data]
    assert "In Review" not in titles
    assert "Mod Queue" not in titles
