from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from config.throttles import AuthRateThrottle
from dj_rest_auth.views import LoginView
from dj_rest_auth.registration.views import RegisterView


class ThrottledLoginView(LoginView):
    throttle_classes = [AuthRateThrottle]


class ThrottledRegisterView(RegisterView):
    throttle_classes = [AuthRateThrottle]


urlpatterns = [
    path("admin/", admin.site.urls),
    # Throttled auth endpoints — placed before includes so they match first
    path("api/auth/login/", ThrottledLoginView.as_view(), name="rest_login"),
    path("api/auth/registration/", ThrottledRegisterView.as_view(), name="rest_register"),
    # Remaining dj-rest-auth endpoints (sub-paths like /verify-email/ still route here)
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),
    path("api/users/", include("spoonfury.apps.users.urls")),
    path("api/", include("spoonfury.apps.recipes.urls")),
    path("api/", include("spoonfury.apps.books.urls")),
    path("api/", include("spoonfury.apps.shopping.urls")),
    path("api/", include("spoonfury.apps.notifications.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
