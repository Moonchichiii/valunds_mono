# backend/config/urls.py
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # Admin & docs
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),

    # App APIs
    path("api/accounts/", include("backend.apps.accounts.urls")),
    path("api/bookings/", include("backend.apps.bookings.urls")),
    path("api/competence/", include("backend.apps.competence.urls")),
    path("api/contracts/", include("backend.apps.contracts.urls")),
    path("api/identity/", include("backend.apps.identity.urls")),
    path("api/payments/", include("backend.apps.payments.urls")),
    path("api/ratings/", include("backend.apps.ratings.urls")),
    path("api/search/", include("backend.apps.search.urls")),

    # Metrics
    path("metrics/", include("django_prometheus.urls")),
]
