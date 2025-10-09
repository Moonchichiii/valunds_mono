from datetime import timedelta

import requests
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.utils.decorators import method_decorator
from django.utils.html import strip_tags
from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .security_utils import (
    check_and_notify_new_device,
    get_client_ip,
    send_email_change_notification,
    send_password_change_notification,
    track_login_attempt,
)
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

User = get_user_model()

# Utilities -------------------------------------------------------------------

def set_auth_cookies(response, tokens):
    """Set JWT tokens in HttpOnly cookies."""
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh"],
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        max_age=30 * 24 * 60 * 60,
    )
    return response


def clear_auth_cookies(response):
    """Clear authentication cookies."""
    response.delete_cookie("refresh_token")
    return response




# Authentication Views --------------------------------------------------------

@method_decorator(ratelimit(key="ip", rate="3/h", method="POST"), name="dispatch")
class RegisterView(APIView):
    """User registration with reCAPTCHA (rate-limited)."""
    permission_classes = [AllowAny]

    def post(self, request):
        # Verify reCAPTCHA
        recaptcha_token = request.data.get("recaptcha_token")
        is_valid, score = verify_recaptcha(recaptcha_token, action="register")

        if not is_valid or score < 0.5:
            return Response(
                {
                    "detail": "reCAPTCHA verification failed. Please try again.",
                    "code": "recaptcha_failed",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        token = get_random_string(64)
        user.verification_token = token
        user.verification_token_created = timezone.now()
        user.save(update_fields=["verification_token", "verification_token_created"])

        verification_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email/{token}"

        html_message = render_to_string("accounts/verify_email.html", {
            "user": user,
            "verification_url": verification_url,
        })
        plain_message = strip_tags(html_message)

        send_mail(
            subject="Verify your Valunds account",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
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
    """Email/password login with adaptive reCAPTCHA and device tracking."""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        # Pre-auth checks: reCAPTCHA trigger and lock handling
        try:
            user = User.objects.get(email=email)

            if getattr(user, "failed_login_attempts", 0) >= 2:
                recaptcha_token = request.data.get("recaptcha_token")
                is_valid, score = verify_recaptcha(recaptcha_token, action="login")

                if not is_valid or score < 0.5:
                    return Response(
                        {
                            "detail": "reCAPTCHA verification required after multiple failed attempts.",
                            "code": "recaptcha_required",
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            if user.account_locked_until and timezone.now() < user.account_locked_until:
                time_remaining = (user.account_locked_until - timezone.now()).total_seconds() / 60
                return Response(
                    {
                        "detail": f"Account temporarily locked due to too many failed login attempts. Try again in {int(time_remaining)} minutes.",
                        "code": "account_locked",
                        "locked_until": user.account_locked_until.isoformat(),
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            if user.account_locked_until and timezone.now() >= user.account_locked_until:
                user.account_locked_until = None
                user.failed_login_attempts = 0
                user.save(update_fields=["account_locked_until", "failed_login_attempts"])

        except User.DoesNotExist:
            pass

        # Authenticate
        user = authenticate(username=email, password=password)

        if not user:
            try:
                failed_user = User.objects.get(email=email)
                track_login_attempt(failed_user, request, success=False)
            except User.DoesNotExist:
                pass

            self._handle_failed_login(email)
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.email_verified:
            return Response(
                {
                    "detail": "Email not verified. Please check your email for the verification link.",
                    "code": "email_not_verified",
                    "email": user.email,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if getattr(user, "failed_login_attempts", 0) > 0 or getattr(user, "last_failed_login", None):
            user.failed_login_attempts = 0
            user.last_failed_login = None
            user.save(update_fields=["failed_login_attempts", "last_failed_login"])

        login_history = track_login_attempt(user, request, success=True)
        if login_history:
            check_and_notify_new_device(user, login_history)

        refresh = RefreshToken.for_user(user)
        tokens = {"refresh": str(refresh), "access": str(refresh.access_token)}

        response = Response({"user": UserSerializer(user).data, "tokens": tokens})

        return set_auth_cookies(response, tokens)

    def _handle_failed_login(self, email):
        """Increment failed attempts and lock account if threshold reached."""
        try:
            user = User.objects.get(email=email)

            if user.last_failed_login and (timezone.now() - user.last_failed_login).total_seconds() > 900:
                user.failed_login_attempts = 0

            user.failed_login_attempts += 1
            user.last_failed_login = timezone.now()

            if user.failed_login_attempts >= 5:
                user.account_locked_until = timezone.now() + timedelta(minutes=15)
                user.save(update_fields=["failed_login_attempts", "last_failed_login", "account_locked_until"])
                self._send_lockout_notification(user)
            else:
                user.save(update_fields=["failed_login_attempts", "last_failed_login"])

        except User.DoesNotExist:
            pass

    def _send_lockout_notification(self, user):
        """Notify user when account is locked."""
        html_message = render_to_string("accounts/account_locked.html", {
            "user": user,
            "locked_until": user.account_locked_until
        })
        plain_message = strip_tags(html_message)

        send_mail(
            subject="Your Valunds account has been temporarily locked",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
        )


class LogoutView(APIView):
    """Logout by blacklisting refresh token."""
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
    """Refresh access token and rotate refresh token (rate-limited)."""
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")

        if not refresh_token:
            return Response(
                {"detail": "Refresh token not found"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            old_refresh = RefreshToken(refresh_token)
            old_refresh.blacklist()

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
    """Return current authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


@method_decorator(ratelimit(key='ip', rate='5/h', method='POST'), name='dispatch')
class VerifyEmailView(APIView):
    """Verify email token (rate-limited)."""
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"detail": "Missing token"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(verification_token=token)
        except User.DoesNotExist:
            return Response({"detail": "Invalid verification token"}, status=status.HTTP_400_BAD_REQUEST)

        if user.email_verified:
            return Response(
                {"detail": "Email already verified. Please log in."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.verification_token_created or (
            timezone.now() - user.verification_token_created > timedelta(hours=1)
        ):
            return Response({"detail": "Verification link expired"}, status=status.HTTP_400_BAD_REQUEST)

        user.email_verified = True
        user.is_active = True
        user.verification_token = None
        user.verification_token_created = None
        user.save(update_fields=["email_verified", "is_active", "verification_token", "verification_token_created"])

        refresh = RefreshToken.for_user(user)
        tokens = {"refresh": str(refresh), "access": str(refresh.access_token)}

        response = Response(
            {"user": UserSerializer(user).data, "tokens": tokens},
            status=status.HTTP_200_OK,
        )
        return set_auth_cookies(response, tokens)


class UpdateProfileView(APIView):
    """Update current user's profile."""
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    """Change password for authenticated user."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current = request.data.get('current_password')
        new = request.data.get('new_password')

        if not request.user.check_password(current):
            return Response(
                {"detail": "Current password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(new, request.user)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        ip_address = get_client_ip(request)

        request.user.set_password(new)
        request.user.save()

        send_password_change_notification(request.user, ip_address)

        refresh = RefreshToken.for_user(request.user)

        response = Response({"detail": "Password changed successfully"})
        return set_auth_cookies(response, {
            "refresh": str(refresh),
            "access": str(refresh.access_token)
        })


class ChangeEmailView(APIView):
    """Request email change and verify new address."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_email = request.data.get('email')

        if not new_email:
            return Response({"detail": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=new_email).exists():
            return Response(
                {"detail": "Email already in use"},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_email = request.user.email
        token = get_random_string(64)
        request.user.email = new_email
        request.user.email_verified = False
        request.user.verification_token = token
        request.user.verification_token_created = timezone.now()
        request.user.save()

        send_email_change_notification(request.user, old_email, new_email)

        verification_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email/{token}"
        html_message = render_to_string('accounts/verify_email.html', {
            'user': request.user,
            'verification_url': verification_url,
        })
        plain_message = strip_tags(html_message)
        send_mail(
            subject="Verify your new Valunds email address",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[new_email],
            html_message=html_message,
        )

        return Response({"detail": "Verification email sent to new address. Security notification sent to old address."})


class DeleteAccountView(APIView):
    """Soft-delete the authenticated user's account."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        password = request.data.get('password')

        if not request.user.check_password(password):
            return Response(
                {"detail": "Password incorrect"},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.is_active = False  # Soft delete
        request.user.save()

        response = Response({"detail": "Account deleted"})
        return clear_auth_cookies(response)


@method_decorator(ratelimit(key='ip', rate='3/h', method='POST'), name='dispatch')
class RequestPasswordResetView(APIView):
    """Request password reset email (rate-limited)."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')

        if not email:
            return Response(
                {"detail": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)

            token = get_random_string(64)
            user.password_reset_token = token
            user.password_reset_token_created = timezone.now()
            user.save(update_fields=['password_reset_token', 'password_reset_token_created'])

            reset_url = f"{settings.FRONTEND_URL.rstrip('/')}/reset-password/{token}"

            html_message = render_to_string('accounts/reset_password_email.html', {
                'user': user,
                'reset_url': reset_url,
            })
            plain_message = strip_tags(html_message)

            send_mail(
                subject="Reset your Valunds password",
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
            )

            self._send_security_notification(user)

        except User.DoesNotExist:
            pass

        return Response(
            {"detail": "If an account exists with this email, you will receive password reset instructions."},
            status=status.HTTP_200_OK
        )

    def _send_security_notification(self, user):
        """Notify user that a password reset was requested."""
        html_message = render_to_string('accounts/password_reset_notification.html', {
            'user': user,
        })
        plain_message = strip_tags(html_message)

        send_mail(
            subject="Password reset requested for your Valunds account",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
        )


@method_decorator(ratelimit(key='ip', rate='5/h', method='POST'), name='dispatch')
class ResetPasswordView(APIView):
    """Reset password using token (rate-limited)."""
    permission_classes = [AllowAny]

    def post(self, request):
        token = request.data.get('token')
        new_password = request.data.get('password')

        if not token or not new_password:
            return Response(
                {"detail": "Token and password are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(password_reset_token=token)
        except User.DoesNotExist:
            return Response(
                {"detail": "Invalid or expired reset token"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.password_reset_token_created or (
            timezone.now() - user.password_reset_token_created > timedelta(hours=1)
        ):
            return Response(
                {"detail": "Reset link has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(new_password, user)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        ip_address = get_client_ip(request)

        user.set_password(new_password)
        user.password_reset_token = None
        user.password_reset_token_created = None
        user.failed_login_attempts = 0
        user.account_locked_until = None
        user.save()

        send_password_change_notification(user, ip_address)

        return Response(
            {"detail": "Password successfully reset. You can now log in with your new password."},
            status=status.HTTP_200_OK
        )


@method_decorator(ratelimit(key='ip', rate='3/h', method='POST'), name='dispatch')
class ResendVerificationView(APIView):
    """Resend email verification link (rate-limited)."""
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')

        if not email:
            return Response(
                {"detail": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)

            if user.email_verified:
                return Response(
                    {"detail": "Email already verified. Please log in."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            token = get_random_string(64)
            user.verification_token = token
            user.verification_token_created = timezone.now()
            user.save(update_fields=['verification_token', 'verification_token_created'])

            verification_url = f"{settings.FRONTEND_URL.rstrip('/')}/verify-email/{token}"

            html_message = render_to_string('accounts/verify_email.html', {
                'user': user,
                'verification_url': verification_url,
            })
            plain_message = strip_tags(html_message)

            send_mail(
                subject="Verify your Valunds account",
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                html_message=html_message,
            )

        except User.DoesNotExist:
            pass

        return Response(
            {"detail": "If an unverified account exists with this email, a new verification link has been sent."},
            status=status.HTTP_200_OK
        )


def verify_recaptcha(token: str, action: str = None) -> tuple[bool, float]:
    """Verify reCAPTCHA v3 token; returns (is_valid, score)."""
    if not token:
        return False, 0.0

    try:
        response = requests.post(
            'https://www.google.com/recaptcha/api/siteverify',
            data={
                'secret': settings.RECAPTCHA_PRIVATE_KEY,
                'response': token,
            },
            timeout=5
        )

        result = response.json()

        if not result.get('success'):
            return False, 0.0

        score = result.get('score', 0.0)

        if action and result.get('action') != action:
            return False, 0.0

        return True, score

    except Exception as e:
        print(f"reCAPTCHA verification error: {e}")
        # Graceful degradation on verification service failure
        return True, 1.0
