from django.urls import path

from .views import LoginView, LogoutView, MeView, RefreshTokenView, RegisterView

app_name = "accounts"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("refresh/", RefreshTokenView.as_view(), name="refresh"),
    path("me/", MeView.as_view(), name="me"),
]
