from django.urls import include, path

from .oauth_views import GoogleLoginCallbackView, GoogleLoginInitiateView
from .views import (
    ChangeEmailView,
    ChangePasswordView,
    DeleteAccountView,
    LoginView,
    LogoutView,
    MeView,
    RefreshTokenView,
    RegisterView,
    RequestPasswordResetView,
    ResendVerificationView,
    ResetPasswordView,
    UpdateProfileView,
    VerifyEmailView,
)

app_name = "accounts"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="resend-verification"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("refresh/", RefreshTokenView.as_view(), name="refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("settings/profile/", UpdateProfileView.as_view(), name="update-profile"),
    path("settings/password/", ChangePasswordView.as_view(), name="change-password"),
    path("settings/email/", ChangeEmailView.as_view(), name="change-email"),
    path("settings/delete/", DeleteAccountView.as_view(), name="delete-account"),
    path("password-reset/request/", RequestPasswordResetView.as_view(), name="request-password-reset"),
    path("password-reset/confirm/", ResetPasswordView.as_view(), name="reset-password"),
    path('oauth/', include('allauth.socialaccount.urls')),
    path('oauth/google/callback/', GoogleLoginCallbackView.as_view(), name='google-callback'),
    path('oauth/google/initiate/', GoogleLoginInitiateView.as_view(), name='google-initiate'),
]
