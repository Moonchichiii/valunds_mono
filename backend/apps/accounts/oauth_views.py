from urllib.parse import urlencode

import requests
from django.conf import settings
from django.shortcuts import redirect
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .security_utils import track_login_attempt
from .views import set_auth_cookies


class GoogleLoginInitiateView(APIView):
    """Initiate Google OAuth flow by redirecting to Google."""
    permission_classes = [AllowAny]

    def get(self, request):
        # Build Google OAuth URL manually
        google_auth_url = "https://accounts.google.com/o/oauth2/v2/auth"

        # Get Google credentials from settings
        google_config = settings.SOCIALACCOUNT_PROVIDERS.get('google', {}).get('APP', {})
        client_id = google_config.get('client_id', '')

        if not client_id:
            return redirect(f"{settings.FRONTEND_URL}/login?error=oauth_not_configured")

        # Build callback URL
        callback_url = f"{request.scheme}://{request.get_host()}/api/accounts/oauth/google/callback/"

        # OAuth parameters
        params = {
            "client_id": client_id,
            "redirect_uri": callback_url,
            "response_type": "code",
            "scope": "openid email profile",
            "access_type": "online",
            "prompt": "select_account",
        }

        # Redirect to Google
        auth_url = f"{google_auth_url}?{urlencode(params)}"
        return redirect(auth_url)


class GoogleLoginCallbackView(APIView):
    """Handle Google OAuth callback: exchange code for tokens, create/login user."""
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            # Get authorization code from Google
            code = request.GET.get('code')
            error = request.GET.get('error')

            if error:
                return redirect(f"{settings.FRONTEND_URL}/login?error=oauth_cancelled")

            if not code:
                return redirect(f"{settings.FRONTEND_URL}/login?error=oauth_failed")

            # Get Google credentials
            google_config = settings.SOCIALACCOUNT_PROVIDERS.get('google', {}).get('APP', {})
            client_id = google_config.get('client_id', '')
            client_secret = google_config.get('secret', '')

            # Build callback URL (must match the one sent to Google)
            callback_url = f"{request.scheme}://{request.get_host()}/api/accounts/oauth/google/callback/"

            # Exchange authorization code for access token
            token_url = "https://oauth2.googleapis.com/token"
            token_data = {
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": callback_url,
                "grant_type": "authorization_code",
            }

            token_response = requests.post(token_url, data=token_data, timeout=10)
            token_response.raise_for_status()
            tokens = token_response.json()
            access_token = tokens.get('access_token')

            # Get user info from Google
            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            userinfo_response = requests.get(
                userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10
            )
            userinfo_response.raise_for_status()
            user_data = userinfo_response.json()

            # Extract user information
            email = user_data.get('email')
            if not email:
                return redirect(f"{settings.FRONTEND_URL}/login?error=no_email")

            # Get or create user
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email,
                    'first_name': user_data.get('given_name', ''),
                    'last_name': user_data.get('family_name', ''),
                    'email_verified': True,  # Google already verified email
                    'is_active': True,
                }
            )

            # Update existing user's verification status
            if not created and not user.email_verified:
                user.email_verified = True
                user.save(update_fields=['email_verified'])

            # Check if account is active
            if not user.is_active:
                return redirect(f"{settings.FRONTEND_URL}/login?error=account_inactive")

            # Track successful login
            track_login_attempt(user, request, success=True)

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            jwt_tokens = {
                "refresh": str(refresh),
                "access": str(refresh.access_token)
            }

            # ✅ Redirect to frontend WITHOUT tokens in URL
            response = redirect(f"{settings.FRONTEND_URL}/oauth/callback")

            # ✅ Set HttpOnly refresh token cookie (secure, can't be accessed by JS)
            response = set_auth_cookies(response, jwt_tokens)

            # ✅ Set temporary access token cookie (frontend can read once)
            response.set_cookie(
                key="access_token",
                value=jwt_tokens["access"],
                httponly=False,  # Frontend needs to read this
                secure=not settings.DEBUG,
                samesite="Lax",
                max_age=5 * 60,  # 5 minutes - frontend will delete after reading
                path="/"
            )

            return response

        except requests.RequestException as e:
            # Log the error for debugging
            print(f"OAuth error: {e}")
            return redirect(f"{settings.FRONTEND_URL}/login?error=oauth_error")

        except Exception as e:
            # Log unexpected errors
            print(f"Unexpected OAuth error: {e}")
            return redirect(f"{settings.FRONTEND_URL}/login?error=oauth_error")
