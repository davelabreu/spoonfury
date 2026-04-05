from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("dj_rest_auth.urls")),
    path("api/auth/registration/", include("dj_rest_auth.registration.urls")),
    path("api/users/", include("spoonfury.apps.users.urls")),
    path("api/", include("spoonfury.apps.recipes.urls")),
    path("api/", include("spoonfury.apps.books.urls")),
    path("api/", include("spoonfury.apps.shopping.urls")),
    path("api/", include("spoonfury.apps.notifications.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
