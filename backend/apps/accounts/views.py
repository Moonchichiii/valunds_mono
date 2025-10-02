from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.core.mail import send_mail
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

User = get_user_model()


def set_auth_cookies(response, tokens):
    """Set JWT tokens in HttpOnly cookies"""
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh"],
        httponly=True,
        secure=not settings.DEBUG,  # False in dev, True in prod
        samesite="Lax",
        max_age=7 * 24 * 60 * 60,  # 7 days
    )
    return response


def clear_auth_cookies(response):
    """Clear authentication cookies"""
    response.delete_cookie("refresh_token")
    return response


@method_decorator(ratelimit(key="ip", rate="3/h", method="POST"), name="dispatch")
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        # Create verification token & store
        token = get_random_string(64)
        user.verification_token = token
        user.verification_token_created = timezone.now()
        user.save(update_fields=["verification_token", "verification_token_created"])

        # Email verification link (frontend handles the route)
        verification_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email/{token}"
        send_mail(
            subject="Verify your Valunds account",
            message=f"Click to verify your email: {verification_url}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
        )
        return Response(
            {
                "message": "Account created. Check your email to verify.",
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )


@method_decorator(ratelimit(key='ip', rate='5/15m', method='POST'), name='dispatch')
class LoginView(APIView):
    """
    Rate limited to 5 attempts per 15 minutes per IP address.
    Returns 429 Too Many Requests if limit exceeded.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            username=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )

        if not user:
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Django's auth backend blocks inactive users by default.
        # Extra safety: ensure email verified if you want to hard-enforce it.
        # if not user.email_verified:
        #     return Response({"detail": "Please verify your email first."},
        #                     status=status.HTTP_403_FORBIDDEN)

        # Generate tokens
        refresh = RefreshToken.for_user(user)
        tokens = {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

        response = Response({
            "user": UserSerializer(user).data,
            "tokens": tokens,  # ✅ Wrapped in tokens object
        })

        return set_auth_cookies(response, tokens)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.COOKIES.get("refresh_token")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except TokenError:
            pass

        response = Response({"detail": "Logged out successfully"})
        return clear_auth_cookies(response)


@method_decorator(ratelimit(key='ip', rate='10/15m', method='POST'), name='dispatch')
class RefreshTokenView(APIView):
    """
    Refresh access token and rotate refresh token.
    Rate limited to 10 attempts per 15 minutes per IP.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response(
                {"detail": "Refresh token not found"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            # Validate and blacklist old refresh token
            old_refresh = RefreshToken(refresh_token)
            old_refresh.blacklist()

            # Generate new tokens (rotation)
            new_refresh = RefreshToken.for_user(old_refresh.user)
            tokens = {
                "refresh": str(new_refresh),
                "access": str(new_refresh.access_token),
            }

            response = Response({"access": tokens["access"]})
            return set_auth_cookies(response, tokens)

        except TokenError:
            return Response(
                {"detail": "Invalid refresh token"},
                status=status.HTTP_401_UNAUTHORIZED
            )


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"detail": "Missing token"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(verification_token=token)
        except User.DoesNotExist:
            return Response({"detail": "Invalid verification token"}, status=status.HTTP_400_BAD_REQUEST)

        # token age check: 24 hours
        if not user.verification_token_created or (
            timezone.now() - user.verification_token_created > timedelta(hours=24)
        ):
            return Response({"detail": "Verification link expired"}, status=status.HTTP_400_BAD_REQUEST)

        # verify & activate
        user.email_verified = True
        user.is_active = True
        user.verification_token = None
        user.verification_token_created = None
        user.save(update_fields=["email_verified", "is_active", "verification_token", "verification_token_created"])

        # Now issue tokens
        refresh = RefreshToken.for_user(user)
        tokens = {"refresh": str(refresh), "access": str(refresh.access_token)}

        response = Response(
            {"user": UserSerializer(user).data, "tokens": tokens},
            status=status.HTTP_200_OK,
        )
        return set_auth_cookies(response, tokens)
