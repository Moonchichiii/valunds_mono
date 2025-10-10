import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """Custom user with UUID primary key and profile/security fields."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_("email address"), unique=True)

    email_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=64, blank=True, null=True)
    verification_token_created = models.DateTimeField(blank=True, null=True)

    password_reset_token = models.CharField(max_length=64, blank=True, null=True)
    password_reset_token_created = models.DateTimeField(blank=True, null=True)

    failed_login_attempts = models.IntegerField(default=0)
    last_failed_login = models.DateTimeField(blank=True, null=True)
    account_locked_until = models.DateTimeField(blank=True, null=True)

    last_login_ip = models.GenericIPAddressField(blank=True, null=True, help_text="IPv4/IPv6")
    last_login_user_agent = models.CharField(max_length=512, blank=True)
    last_login_location = models.CharField(max_length=255, blank=True, help_text="City, Country")

    class UserType(models.TextChoices):
        FREELANCER = "freelancer", _("Freelancer")
        CLIENT = "client", _("Client")
        ADMIN = "admin", _("Admin")

    user_type = models.CharField(
        max_length=20, choices=UserType.choices, default=UserType.FREELANCER
    )

    phone_number = models.CharField(_("phone number"), max_length=20, blank=True, help_text="Contact phone number")
    address = models.CharField(_("street address"), max_length=255, blank=True)
    city = models.CharField(_("city"), max_length=100, blank=True)
    postcode = models.CharField(_("postal code"), max_length=20, blank=True)
    country = models.CharField(_("country"), max_length=100, blank=True, default="Sweden")

    # Swedish BankID fields
    bankid_verified = models.BooleanField(default=False)
    bankid_personal_number = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        unique=True,
        help_text="Hashed Swedish personnummer (never store raw)"
    )
    bankid_verified_at = models.DateTimeField(blank=True, null=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["user_type"]),
            models.Index(fields=["verification_token"]),
            models.Index(fields=["city"]),
            models.Index(fields=["last_login_ip"]),
            models.Index(fields=["bankid_personal_number"]),
        ]

    def __str__(self):
        return self.email

    @property
    def full_address(self):
        parts = [self.address, self.postcode, self.city, self.country]
        return ", ".join(filter(None, parts))


class LoginHistory(models.Model):
    """Record of login attempts."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_history')

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.CharField(max_length=512)

    device_type = models.CharField(max_length=50, blank=True)
    browser = models.CharField(max_length=100, blank=True)
    os = models.CharField(max_length=100, blank=True)

    location = models.CharField(max_length=255, blank=True, help_text="City, Country")

    success = models.BooleanField(default=True)
    flagged_as_suspicious = models.BooleanField(default=False)
    notification_sent = models.BooleanField(default=False)

    class Meta:
        db_table = "login_history"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user", "-timestamp"]),
            models.Index(fields=["ip_address"]),
            models.Index(fields=["flagged_as_suspicious"]),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.timestamp} - {self.ip_address}"


class SecurityEvent(models.Model):
    """Audit trail of security-related events."""
    class EventType(models.TextChoices):
        PASSWORD_CHANGED = "password_changed", _("Password Changed")
        EMAIL_CHANGED = "email_changed", _("Email Changed")
        NEW_DEVICE_LOGIN = "new_device_login", _("New Device Login")
        ACCOUNT_LOCKED = "account_locked", _("Account Locked")
        ACCOUNT_RECOVERY = "account_recovery", _("Account Recovery Attempted")
        SUSPICIOUS_LOGIN = "suspicious_login", _("Suspicious Login Attempt")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='security_events')
    event_type = models.CharField(max_length=30, choices=EventType.choices)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=512, blank=True)
    details = models.JSONField(default=dict, blank=True)

    notification_sent = models.BooleanField(default=False)

    class Meta:
        db_table = "security_events"
        ordering = ["-timestamp"]
        indexes = [
            models.Index(fields=["user", "-timestamp"]),
            models.Index(fields=["event_type"]),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.event_type} - {self.timestamp}"
