from datetime import timedelta

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

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer

User = get_user_model()


def set_auth_cookies(response, tokens):
    """Set JWT tokens in HttpOnly cookies"""
    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh"],
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
        max_age=7 * 24 * 60 * 60,
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

        token = get_random_string(64)
        user.verification_token = token
        user.verification_token_created = timezone.now()
        user.save(update_fields=["verification_token", "verification_token_created"])

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
    Also tracks failed login attempts per user account.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        # Check if account exists and is locked
        try:
            user = User.objects.get(email=email)

            # Check if account is locked
            if user.account_locked_until and timezone.now() < user.account_locked_until:
                time_remaining = (user.account_locked_until - timezone.now()).total_seconds() / 60
                return Response(
                    {
                        "detail": f"Account temporarily locked due to too many failed login attempts. Try again in {int(time_remaining)} minutes.",
                        "code": "account_locked",
                        "locked_until": user.account_locked_until.isoformat()
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            # Reset lock if time has passed
            if user.account_locked_until and timezone.now() >= user.account_locked_until:
                user.account_locked_until = None
                user.failed_login_attempts = 0
                user.save(update_fields=['account_locked_until', 'failed_login_attempts'])

        except User.DoesNotExist:
            # Don't reveal that user doesn't exist - still authenticate to prevent timing attacks
            pass

        # Authenticate
        user = authenticate(
            username=email,
            password=password,
        )

        if not user:
            # Failed login - track attempt
            self._handle_failed_login(email)
            return Response(
                {"detail": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # Check if email is verified
        if not user.email_verified:
            return Response(
                {
                    "detail": "Email not verified. Please check your email for the verification link.",
                    "code": "email_not_verified",
                    "email": user.email
                },
                status=status.HTTP_403_FORBIDDEN
            )

        # Successful login - reset failed attempts
        if user.failed_login_attempts > 0 or user.last_failed_login:
            user.failed_login_attempts = 0
            user.last_failed_login = None
            user.save(update_fields=['failed_login_attempts', 'last_failed_login'])

        refresh = RefreshToken.for_user(user)
        tokens = {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

        response = Response({
            "user": UserSerializer(user).data,
            "tokens": tokens,
        })

        return set_auth_cookies(response, tokens)

    def _handle_failed_login(self, email):
        """Track failed login attempts and lock account if needed"""
        try:
            user = User.objects.get(email=email)

            # Reset counter if last failure was more than 15 minutes ago
            if user.last_failed_login and (timezone.now() - user.last_failed_login).total_seconds() > 900:
                user.failed_login_attempts = 0

            user.failed_login_attempts += 1
            user.last_failed_login = timezone.now()

            # Lock account after 5 failed attempts
            if user.failed_login_attempts >= 5:
                user.account_locked_until = timezone.now() + timedelta(minutes=15)
                user.save(update_fields=['failed_login_attempts', 'last_failed_login', 'account_locked_until'])

                # Send security alert email
                self._send_lockout_notification(user)
            else:
                user.save(update_fields=['failed_login_attempts', 'last_failed_login'])

        except User.DoesNotExist:
            # Don't reveal user doesn't exist
            pass

    def _send_lockout_notification(self, user):
        """Send email notification when account is locked"""
        html_message = render_to_string('accounts/account_locked.html', {
            'user': user,
            'locked_until': user.account_locked_until,
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
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        current = request.data.get('current_password')
        new = request.data.get('new_password')

        if not request.user.check_password(current):
            return Response(
                {"detail": "Current password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST
            )

        request.user.set_password(new)
        request.user.save()

        # Invalidate all sessions except current
        refresh = RefreshToken.for_user(request.user)

        response = Response({"detail": "Password changed successfully"})
        return set_auth_cookies(response, {
            "refresh": str(refresh),
            "access": str(refresh.access_token)
        })


class ChangeEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_email = request.data.get('email')

        if User.objects.filter(email=new_email).exists():
            return Response(
                {"detail": "Email already in use"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Generate new verification token
        token = get_random_string(64)
        request.user.email = new_email
        request.user.email_verified = False
        request.user.verification_token = token
        request.user.verification_token_created = timezone.now()
        request.user.save()

        # Send verification email to new address
        verification_url = f"{settings.FRONTEND_URL}/verify-email/{token}"
        send_mail(...)  # Same as registration

        return Response({"detail": "Verification email sent to new address"})


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        password = request.data.get('password')

        if not request.user.check_password(password):
            return Response(
                {"detail": "Password incorrect"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Soft delete or hard delete - your choice
        request.user.is_active = False  # Soft delete
        request.user.save()
        # Or: request.user.delete()  # Hard delete

        response = Response({"detail": "Account deleted"})
        return clear_auth_cookies(response)

# backend/apps/accounts/views.py

@method_decorator(ratelimit(key='ip', rate='3/h', method='POST'), name='dispatch')
class RequestPasswordResetView(APIView):
    """
    Request password reset email.
    Rate limited to 3 attempts per hour per IP.
    """
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

            # Generate reset token
            token = get_random_string(64)
            user.password_reset_token = token
            user.password_reset_token_created = timezone.now()
            user.save(update_fields=['password_reset_token', 'password_reset_token_created'])

            # Send reset email
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

            # Send security notification to existing email
            self._send_security_notification(user)

        except User.DoesNotExist:
            # Don't reveal if email exists (security best practice)
            pass

        # Always return success to prevent email enumeration
        return Response(
            {"detail": "If an account exists with this email, you will receive password reset instructions."},
            status=status.HTTP_200_OK
        )

    def _send_security_notification(self, user):
        """Notify user that password reset was requested"""
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
    """
    Reset password with valid token.
    Rate limited to 5 attempts per hour per IP.
    """
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

        # Check token expiry (1 hour)
        if not user.password_reset_token_created or (
            timezone.now() - user.password_reset_token_created > timedelta(hours=1)
        ):
            return Response(
                {"detail": "Reset link has expired. Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate password strength
        try:
            validate_password(new_password, user)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update password and clear reset token
        user.set_password(new_password)
        user.password_reset_token = None
        user.password_reset_token_created = None
        user.failed_login_attempts = 0  # Reset failed attempts
        user.account_locked_until = None  # Unlock account if locked
        user.save()

        # Send confirmation email
        html_message = render_to_string('accounts/password_changed.html', {
            'user': user,
        })
        plain_message = strip_tags(html_message)

        send_mail(
            subject="Your Valunds password has been changed",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
        )

        return Response(
            {"detail": "Password successfully reset. You can now log in with your new password."},
            status=status.HTTP_200_OK
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

        # Check if email is verified
        if not user.email_verified:
            return Response(
                {
                    "detail": "Email not verified. Please check your email for the verification link.",
                    "code": "email_not_verified",
                    "email": user.email
                },
                status=status.HTTP_403_FORBIDDEN
            )

        refresh = RefreshToken.for_user(user)
        tokens = {
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }

        response = Response({
            "user": UserSerializer(user).data,
            "tokens": tokens,
        })

        return set_auth_cookies(response, tokens)



@method_decorator(ratelimit(key='ip', rate='3/h', method='POST'), name='dispatch')
class ResendVerificationView(APIView):
    """
    Resend email verification link.
    Rate limited to 3 attempts per hour per IP.
    """
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

            # Check if already verified
            if user.email_verified:
                return Response(
                    {"detail": "Email already verified. Please log in."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Generate new verification token
            token = get_random_string(64)
            user.verification_token = token
            user.verification_token_created = timezone.now()
            user.save(update_fields=['verification_token', 'verification_token_created'])

            # Send verification email
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
            # Don't reveal if email exists (security best practice)
            pass

        # Always return success to prevent email enumeration
        return Response(
            {"detail": "If an unverified account exists with this email, a new verification link has been sent."},
            status=status.HTTP_200_OK
        )
