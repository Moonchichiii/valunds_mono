from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Keeps admin consistent with API serializers and views:
    - Shows contact/location fields
    - Exposes email verification status + timestamps (read-only)
    - Standard auth permissions + dates
    """

    # Changelist
    list_display = [
        "email",
        "first_name",
        "last_name",
        "user_type",
        "email_verified",
        "is_active",
        "is_staff",
        "date_joined",
    ]
    list_filter = [
        "user_type",
        "email_verified",
        "is_active",
        "is_staff",
        "is_superuser",
        "groups",
    ]
    search_fields = [
        "email",
        "first_name",
        "last_name",
        "phone_number",
        "address",
        "city",
        "postcode",
        "country",
    ]
    ordering = ["-date_joined"]

    # Keep tokens/dates read-only so staff can see them but not edit
    readonly_fields = ["last_login", "date_joined", "verification_token", "verification_token_created"]

    # Detail page layout
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal info",
            {
                "fields": (
                    "first_name",
                    "last_name",
                    "user_type",
                    "phone_number",
                    "address",
                    "city",
                    "postcode",
                    "country",
                )
            },
        ),
        (
            "Email verification",
            {
                "fields": (
                    "email_verified",
                    "verification_token",
                    "verification_token_created",
                )
            },
        ),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    # Form layout
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "password1",
                    "password2",
                    "first_name",
                    "last_name",
                    "user_type",
                    "phone_number",
                    "address",
                    "city",
                    "postcode",
                    "country",
                ),
            },
        ),
    )

    filter_horizontal = ("groups", "user_permissions")
