import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    """Custom user model with UUID primary key"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_("email address"), unique=True)
    # Email verification
    email_verified = models.BooleanField(default=False)
    verification_token = models.CharField(max_length=64, blank=True, null=True)
    verification_token_created = models.DateTimeField(blank=True, null=True)

    # User type for marketplace
    class UserType(models.TextChoices):
        FREELANCER = "freelancer", _("Freelancer")
        CLIENT = "client", _("Client")
        ADMIN = "admin", _("Admin")

    user_type = models.CharField(
        max_length=20, choices=UserType.choices, default=UserType.FREELANCER
    )

    # Remove username requirement
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["user_type"]),
            models.Index(fields=["verification_token"]),
        ]

    def __str__(self):
        return self.email
