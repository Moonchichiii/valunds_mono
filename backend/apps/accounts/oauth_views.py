from django.conf import settings
from django.shortcuts import redirect
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .security_utils import track_login_attempt


class GoogleLoginCallbackView(APIView):
    """
    Handle Google OAuth callback and issue JWT tokens
    """
    permission_classes = [AllowAny]

    def get(self, request):
        # Get the social account from allauth
        try:
            # After allauth processes OAuth, get the authenticated user
            if not request.user.is_authenticated:
                return redirect(f"{settings.FRONTEND_URL}/login?error=oauth_failed")

            user = request.user

            # Ensure user is active and email is verified
            if not user.is_active:
                return redirect(f"{settings.FRONTEND_URL}/login?error=account_inactive")

            # OAuth users are auto-verified
            if not user.email_verified:
                user.email_verified = True
                user.save(update_fields=['email_verified'])

            # Track login attempt
            track_login_attempt(user, request, success=True)

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            tokens = {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
            }

            # Redirect to frontend with tokens in URL (frontend will store them)
            redirect_url = (
                f"{settings.FRONTEND_URL}/oauth/callback"
                f"?access={tokens['access']}"
                f"&refresh={tokens['refresh']}"
            )

            return redirect(redirect_url)

        except Exception:
            return redirect(f"{settings.FRONTEND_URL}/login?error=oauth_error")


class GoogleLoginInitiateView(APIView):
    """
    Initiate Google OAuth flow
    """
    permission_classes = [AllowAny]

    def get(self, request):
        # Redirect to allauth's Google login URL
        return redirect('/api/accounts/oauth/google/login/')
