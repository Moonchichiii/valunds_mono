"""
Utility functions for security event tracking and notifications
"""
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags
from ipware import get_client_ip as ipware_get_ip
from user_agents import parse

logger = logging.getLogger(__name__)


def get_client_ip(request) -> str:
    """
    Extract client IP from request, handling proxies/load balancers
    Uses django-ipware for robust IP detection
    """
    client_ip, is_routable = ipware_get_ip(request)
    return client_ip or ''


def parse_user_agent(user_agent_string: str) -> dict[str, str]:
    """
    Parse user agent string to extract device, browser, OS info
    """
    try:
        ua = parse(user_agent_string)

        # Determine device type
        if ua.is_mobile:
            device_type = "Mobile"
        elif ua.is_tablet:
            device_type = "Tablet"
        elif ua.is_pc:
            device_type = "Desktop"
        else:
            device_type = "Unknown"

        return {
            'device_type': device_type,
            'browser': f"{ua.browser.family} {ua.browser.version_string}".strip(),
            'os': f"{ua.os.family} {ua.os.version_string}".strip(),
        }
    except Exception as e:
        logger.warning(f"Error parsing user agent: {e}")
        return {
            'device_type': 'Unknown',
            'browser': 'Unknown',
            'os': 'Unknown'
        }


def get_location_from_ip(ip_address: str) -> str:
    """
    Get approximate location from IP address

    MVP: Returns placeholder values. GeoIP not implemented to avoid complexity.
    Location data will show as "Local Development" or "Unknown Location" in:
    - LoginHistory.location field
    - User.last_login_location field
    - Email notifications

    Future enhancement options:
    - MaxMind GeoLite2 (adds ~10MB database file)
    - External API like ipapi.co (adds HTTP overhead)
    """
    if ip_address.startswith('127.') or ip_address == '::1':
        return "Local Development"
    return ""


def is_new_device(user, device_info: dict[str, str], ip_address: str) -> bool:
    """
    Check if this is a new device/location for the user
    """
    from .models import LoginHistory

    # Check if we have any previous successful logins from this IP or device
    recent_logins = LoginHistory.objects.filter(
        user=user,
        success=True,
        timestamp__gte=timezone.now() - timezone.timedelta(days=30)
    )

    # Return True only if there are no recent logins from the same IP or same browser+OS
    return not (
        recent_logins.filter(ip_address=ip_address).exists()
        or recent_logins.filter(
            browser=device_info.get('browser'),
            os=device_info.get('os')
        ).exists()
    )


def send_new_login_notification(user, login_history):
    """
    Send email notification for new device/location login
    """
    try:
        html_message = render_to_string('accounts/new_login_detected.html', {
            'user': user,
            'timestamp': login_history.timestamp,
            'location': login_history.location or 'Unknown',
            'device_type': login_history.device_type or 'Unknown',
            'browser': login_history.browser or 'Unknown',
            'ip_address': login_history.ip_address,
        })
        plain_message = strip_tags(html_message)

        send_mail(
            subject="New login to your Valunds account",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )

        login_history.notification_sent = True
        login_history.save(update_fields=['notification_sent'])

        logger.info(f"New login notification sent to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send new login notification to {user.email}: {e}")


def send_password_change_notification(user, ip_address: str = None):
    """
    Send email notification when password is changed
    """
    try:
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
            fail_silently=False,
        )

        # Log security event
        from .models import SecurityEvent
        SecurityEvent.objects.create(
            user=user,
            event_type=SecurityEvent.EventType.PASSWORD_CHANGED,
            ip_address=ip_address,
            notification_sent=True
        )

        logger.info(f"Password change notification sent to {user.email}")
    except Exception as e:
        logger.error(f"Failed to send password change notification to {user.email}: {e}")


def send_email_change_notification(user, old_email: str, new_email: str):
    """
    Send notification to OLD email when email change is requested
    """
    try:
        html_message = render_to_string('accounts/email_change_notification.html', {
            'user': user,
            'old_email': old_email,
            'new_email': new_email,
        })
        plain_message = strip_tags(html_message)

        # Send to OLD email address
        send_mail(
            subject="Email address change request for your Valunds account",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[old_email],
            html_message=html_message,
            fail_silently=False,
        )

        # Log security event
        from .models import SecurityEvent
        SecurityEvent.objects.create(
            user=user,
            event_type=SecurityEvent.EventType.EMAIL_CHANGED,
            details={'old_email': old_email, 'new_email': new_email},
            notification_sent=True
        )

        logger.info(f"Email change notification sent to {old_email}")
    except Exception as e:
        logger.error(f"Failed to send email change notification: {e}")


def track_login_attempt(user, request, success: bool = True, flagged: bool = False):
    """
    Track login attempt and create LoginHistory record
    Returns the LoginHistory object
    """
    from .models import LoginHistory

    try:
        ip_address = get_client_ip(request)
        user_agent_string = request.META.get('HTTP_USER_AGENT', '')
        device_info = parse_user_agent(user_agent_string)
        location = get_location_from_ip(ip_address)

        login_history = LoginHistory.objects.create(
            user=user,
            ip_address=ip_address,
            user_agent=user_agent_string,
            device_type=device_info.get('device_type', ''),
            browser=device_info.get('browser', ''),
            os=device_info.get('os', ''),
            location=location,
            success=success,
            flagged_as_suspicious=flagged
        )

        # Update user's last login info if successful
        if success:
            user.last_login_ip = ip_address
            user.last_login_user_agent = user_agent_string
            user.last_login_location = location
            user.save(update_fields=['last_login_ip', 'last_login_user_agent', 'last_login_location'])

        return login_history
    except Exception as e:
        logger.error(f"Error tracking login attempt: {e}")
        return None


def check_and_notify_new_device(user, login_history):
    """
    Check if login is from new device and send notification if needed
    """
    if not login_history or not login_history.success:
        return

    try:
        device_info = {
            'browser': login_history.browser,
            'os': login_history.os,
            'device_type': login_history.device_type
        }

        if is_new_device(user, device_info, login_history.ip_address):
            # Mark as new device and send notification
            login_history.flagged_as_suspicious = False
            login_history.save(update_fields=['flagged_as_suspicious'])

            # Send notification
            send_new_login_notification(user, login_history)

            # Log security event
            from .models import SecurityEvent
            SecurityEvent.objects.create(
                user=user,
                event_type=SecurityEvent.EventType.NEW_DEVICE_LOGIN,
                ip_address=login_history.ip_address,
                user_agent=login_history.user_agent,
                details={
                    'device_type': device_info['device_type'],
                    'browser': device_info['browser'],
                    'os': device_info['os'],
                    'location': login_history.location
                },
                notification_sent=True
            )
    except Exception as e:
        logger.error(f"Error checking for new device: {e}")
