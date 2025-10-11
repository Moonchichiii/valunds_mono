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

            print(f"🔍 OAuth Callback - Code: {bool(code)}, Error: {error}")

            if error:
                print(f"❌ OAuth Error: {error}")
                return redirect(f"{settings.FRONTEND_URL}/login?error=oauth_cancelled")

            if not code:
                print("❌ No authorization code")
                return redirect(f"{settings.FRONTEND_URL}/login?error=oauth_failed")

            # Get Google credentials
            google_config = settings.SOCIALACCOUNT_PROVIDERS.get('google', {}).get('APP', {})
            client_id = google_config.get('client_id', '')
            client_secret = google_config.get('secret', '')

            print(f"🔍 Client ID configured: {bool(client_id)}")
            print(f"🔍 Client Secret configured: {bool(client_secret)}")

            if not client_id or not client_secret:
                print("❌ Missing OAuth credentials")
                return redirect(f"{settings.FRONTEND_URL}/login?error=oauth_not_configured")

            # Build callback URL (must match the one sent to Google)
            callback_url = f"{request.scheme}://{request.get_host()}/api/accounts/oauth/google/callback/"
            print(f"🔍 Callback URL: {callback_url}")

            # Exchange authorization code for access token
            token_url = "https://oauth2.googleapis.com/token"
            token_data = {
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": callback_url,
                "grant_type": "authorization_code",
            }

            print("🔍 Exchanging code for token...")
            token_response = requests.post(token_url, data=token_data, timeout=10)

            print(f"🔍 Token response status: {token_response.status_code}")

            if token_response.status_code != 200:
                print(f"❌ Token exchange failed: {token_response.text}")
                return redirect(f"{settings.FRONTEND_URL}/login?error=oauth_error")

            token_response.raise_for_status()
            tokens = token_response.json()
            access_token = tokens.get('access_token')

            print(f"🔍 Access token received: {bool(access_token)}")

            # Get user info from Google
            userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
            userinfo_response = requests.get(
                userinfo_url,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10
            )

            print(f"🔍 Userinfo response status: {userinfo_response.status_code}")

            if userinfo_response.status_code != 200:
                print(f"❌ Userinfo request failed: {userinfo_response.text}")
                return redirect(f"{settings.FRONTEND_URL}/login?error=oauth_error")

            userinfo_response.raise_for_status()
            user_data = userinfo_response.json()

            # Extract user information
            email = user_data.get('email')
            print(f"🔍 User email: {email}")

            if not email:
                print("❌ No email in user data")
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

            print(f"🔍 User {'created' if created else 'exists'}: {user.email}")

            # Update existing user's verification status
            if not created and not user.email_verified:
                user.email_verified = True
                user.save(update_fields=['email_verified'])

            # Check if account is active
            if not user.is_active:
                print(f"❌ Account inactive: {user.email}")
                return redirect(f"{settings.FRONTEND_URL}/login?error=account_inactive")

            # Track successful login
            track_login_attempt(user, request, success=True)

            # Generate JWT tokens
            refresh = RefreshToken.for_user(user)
            jwt_tokens = {
                "refresh": str(refresh),
                "access": str(refresh.access_token)
            }

            print(f"✅ JWT tokens generated for: {user.email}")

            # ✅ Redirect to frontend WITHOUT tokens in URL
            frontend_callback = f"{settings.FRONTEND_URL}/oauth/callback"
            print(f"✅ Redirecting to: {frontend_callback}")

            response = redirect(frontend_callback)

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

            print(f"✅ OAuth flow complete for: {user.email}")
            return response

        except requests.RequestException as e:
            # Log the error for debugging
            print(f"❌ OAuth RequestException: {e}")
            import traceback
            traceback.print_exc()
            return redirect(f"{settings.FRONTEND_URL}/login?error=oauth_error")

        except Exception as e:
            # Log unexpected errors
            print(f"❌ Unexpected OAuth error: {e}")
            import traceback
            traceback.print_exc()
            return redirect(f"{settings.FRONTEND_URL}/login?error=oauth_error")
