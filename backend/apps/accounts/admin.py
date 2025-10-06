from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from django.utils.safestring import mark_safe

from .models import LoginHistory, SecurityEvent, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Enhanced admin for User model with security features
    """
    list_display = [
        "email",
        "first_name",
        "last_name",
        "user_type",
        "email_verified",
        "is_active",
        "is_staff",
        "failed_login_attempts",
        "account_status",
        "date_joined",
    ]

    list_filter = [
        "user_type",
        "email_verified",
        "is_active",
        "is_staff",
        "is_superuser",
        "groups",
        ("account_locked_until", admin.EmptyFieldListFilter),
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
        "last_login_ip",
    ]

    ordering = ["-date_joined"]

    readonly_fields = [
        "last_login",
        "date_joined",
        "verification_token",
        "verification_token_created",
        "password_reset_token",
        "password_reset_token_created",
        "failed_login_attempts",
        "last_failed_login",
        "account_locked_until",
        "last_login_ip",
        "last_login_user_agent",
        "last_login_location",
        "security_summary",
    ]

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
            "Security & Login Tracking",
            {
                "fields": (
                    "security_summary",
                    "failed_login_attempts",
                    "last_failed_login",
                    "account_locked_until",
                    "last_login_ip",
                    "last_login_user_agent",
                    "last_login_location",
                ),
                "classes": ("collapse",),
            },
        ),
        (
            "Password Reset",
            {
                "fields": (
                    "password_reset_token",
                    "password_reset_token_created",
                ),
                "classes": ("collapse",),
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

    def account_status(self, obj):
        """Show account status with color coding"""
        from django.utils import timezone

        if obj.account_locked_until and timezone.now() < obj.account_locked_until:
            return format_html(
                '<span style="color: red; font-weight: bold;">🔒 LOCKED</span>'
            )
        elif obj.failed_login_attempts >= 3:
            return format_html(
                '<span style="color: orange; font-weight: bold;">⚠️ WARNING</span>'
            )
        else:
            return format_html(
                '<span style="color: green;">✓ Normal</span>'
            )

    account_status.short_description = "Account Status"

    def security_summary(self, obj):
        """Display security information summary"""
        from django.utils import timezone

        recent_logins = obj.login_history.filter(
            timestamp__gte=timezone.now() - timezone.timedelta(days=30)
        ).count()

        recent_events = obj.security_events.filter(
            timestamp__gte=timezone.now() - timezone.timedelta(days=30)
        ).count()

        html = f"""
        <div style="background: #f4f3f0; padding: 15px; border-radius: 8px;">
            <h4 style="margin-top: 0;">Security Overview (Last 30 Days)</h4>
            <ul style="list-style: none; padding-left: 0;">
                <li>📊 Total Logins: {recent_logins}</li>
                <li>🔒 Security Events: {recent_events}</li>
                <li>⚠️ Failed Attempts: {obj.failed_login_attempts}</li>
            </ul>
            <p style="margin-bottom: 0;">
                <a href="/admin/accounts/loginhistory/?user__id__exact={obj.id}">
                    View Login History →
                </a><br>
                <a href="/admin/accounts/securityevent/?user__id__exact={obj.id}">
                    View Security Events →
                </a>
            </p>
        </div>
        """
        return mark_safe(html)

    security_summary.short_description = "Security Summary"


@admin.register(LoginHistory)
class LoginHistoryAdmin(admin.ModelAdmin):
    """Admin interface for login history"""

    list_display = [
        "user_email",
        "timestamp",
        "success_badge",
        "ip_address",
        "device_type",
        "browser",
        "location",
        "flagged_badge",
        "notification_sent",
    ]

    list_filter = [
        "success",
        "flagged_as_suspicious",
        "notification_sent",
        "device_type",
        "timestamp",
    ]

    search_fields = [
        "user__email",
        "ip_address",
        "location",
        "browser",
    ]

    readonly_fields = [
        "id",
        "user",
        "timestamp",
        "ip_address",
        "user_agent",
        "device_type",
        "browser",
        "os",
        "location",
        "success",
        "flagged_as_suspicious",
        "notification_sent",
    ]

    ordering = ["-timestamp"]
    date_hierarchy = "timestamp"

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = "User"
    user_email.admin_order_field = "user__email"

    def success_badge(self, obj):
        if obj.success:
            return format_html('<span style="color: green;">✓ Success</span>')
        return format_html('<span style="color: red;">✗ Failed</span>')
    success_badge.short_description = "Status"

    def flagged_badge(self, obj):
        if obj.flagged_as_suspicious:
            return format_html('<span style="color: red; font-weight: bold;">⚠️ FLAGGED</span>')
        return "-"
    flagged_badge.short_description = "Flagged"

    def has_add_permission(self, request):
        # Don't allow manual creation
        return False

    def has_delete_permission(self, request, obj=None):
        # Allow deletion for cleanup
        return request.user.is_superuser


@admin.register(SecurityEvent)
class SecurityEventAdmin(admin.ModelAdmin):
    """Admin interface for security events"""

    list_display = [
        "user_email",
        "event_type_badge",
        "timestamp",
        "ip_address",
        "notification_sent",
    ]

    list_filter = [
        "event_type",
        "notification_sent",
        "timestamp",
    ]

    search_fields = [
        "user__email",
        "ip_address",
        "details",
    ]

    readonly_fields = [
        "id",
        "user",
        "event_type",
        "timestamp",
        "ip_address",
        "user_agent",
        "details",
        "notification_sent",
        "details_formatted",
    ]

    fieldsets = (
        (None, {
            "fields": ("user", "event_type", "timestamp", "notification_sent")
        }),
        ("Event Details", {
            "fields": ("ip_address", "user_agent", "details_formatted")
        }),
    )

    ordering = ["-timestamp"]
    date_hierarchy = "timestamp"

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = "User"
    user_email.admin_order_field = "user__email"

    def event_type_badge(self, obj):
        colors = {
            'password_changed': 'blue',
            'email_changed': 'blue',
            'new_device_login': 'orange',
            'account_locked': 'red',
            'account_recovery': 'orange',
            'suspicious_login': 'red',
        }
        color = colors.get(obj.event_type, 'gray')
        label = obj.get_event_type_display()
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 4px;">{}</span>',
            color, label
        )
    event_type_badge.short_description = "Event Type"

    def details_formatted(self, obj):
        """Format JSON details as readable HTML"""
        import json
        if not obj.details:
            return "-"

        formatted = json.dumps(obj.details, indent=2)
        return format_html('<pre style="background: #f4f3f0; padding: 10px;">{}</pre>', formatted)
    details_formatted.short_description = "Event Details"

    def has_add_permission(self, request):
        # Don't allow manual creation
        return False

    def has_delete_permission(self, request, obj=None):
        # Allow deletion for cleanup
        return request.user.is_superuser
