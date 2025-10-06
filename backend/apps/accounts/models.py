import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """Custom user model with UUID primary key and extended profile fields"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_("email address"), unique=True)

    email_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=64, blank=True, null=True)
    verification_token_created = models.DateTimeField(blank=True, null=True)
    # Password reset
    password_reset_token = models.CharField(max_length=64, blank=True, null=True)
    password_reset_token_created = models.DateTimeField(blank=True, null=True)
    # Failed login tracking
    failed_login_attempts = models.IntegerField(default=0)
    last_failed_login = models.DateTimeField(blank=True, null=True)
    account_locked_until = models.DateTimeField(blank=True, null=True)

    class UserType(models.TextChoices):
        FREELANCER = "freelancer", _("Freelancer")
        CLIENT = "client", _("Client")
        ADMIN = "admin", _("Admin")

    user_type = models.CharField(
        max_length=20, choices=UserType.choices, default=UserType.FREELANCER
    )

    phone_number = models.CharField(
        _("phone number"), max_length=20, blank=True, help_text="Contact phone number"
    )
    address = models.CharField(_("street address"), max_length=255, blank=True)
    city = models.CharField(_("city"), max_length=100, blank=True)
    postcode = models.CharField(_("postal code"), max_length=20, blank=True)
    country = models.CharField(_("country"), max_length=100, blank=True, default="Sweden")

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["user_type"]),
            models.Index(fields=["verification_token"]),
            models.Index(fields=["city"]),
        ]

    def __str__(self):
        return self.email

    @property
    def full_address(self):
        """Returns complete formatted address"""
        parts = [self.address, self.postcode, self.city, self.country]
        return ", ".join(filter(None, parts))
