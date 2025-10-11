"""
Production-ready Django settings with python-decouple.
Toggle DEBUG to switch between dev/prod.

Settings are organized in logical groups for easy maintenance.
"""
from datetime import timedelta
from pathlib import Path

from decouple import Csv, config

# CORE DJANGO SETTINGS

BASE_DIR = Path(__file__).resolve().parent.parent.parent
SECRET_KEY = config("SECRET_KEY")
DEBUG = config("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())
ROOT_URLCONF = "backend.config.urls"
WSGI_APPLICATION = "backend.config.wsgi.application"
SITE_ID = 1

# Project URLs
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:5173").rstrip("/")
DEFAULT_FROM_EMAIL = config("DEFAULT_FROM_EMAIL", default="kontakt@valunds.se")
SERVER_EMAIL = DEFAULT_FROM_EMAIL

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# INSTALLED APPS & MIDDLEWARE

INSTALLED_APPS = [
    # Django core
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    # Third-party
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "django_celery_beat",
    "django_celery_results",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "django_prometheus",
    # Local apps
    "backend.apps.accounts",
    "backend.apps.competence",
    "backend.apps.bookings",
    "backend.apps.contracts",
    "backend.apps.identity",
    "backend.apps.payments",
    "backend.apps.ratings",
    "backend.apps.search",
]

MIDDLEWARE = [
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",
]

# TEMPLATES

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "backend" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# DATABASE CONFIGURATION

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Production PostgreSQL (commented for dev)
# DATABASES = {
#     "default": {
#         "ENGINE": "django.db.backends.postgresql",
#         "NAME": config("DB_NAME", default="valund"),
#         "USER": config("DB_USER", default="postgres"),
#         "PASSWORD": config("DB_PASSWORD", default=""),
#         "HOST": config("DB_HOST", default="localhost"),
#         "PORT": config("DB_PORT", default="5432"),
#         "CONN_MAX_AGE": 600,
#     }
# }


# CACHE & REDIS

REDIS_URL = config("REDIS_URL", default="redis://localhost:6379/0")

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
    }
} if not DEBUG else {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
    }
}


# CELERY CONFIGURATION

CELERY_BROKER_URL = config("CELERY_BROKER_URL", default=REDIS_URL.replace("/0", "/1"))
CELERY_RESULT_BACKEND = "django-db"
CELERY_CACHE_BACKEND = "django-cache"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"

# AUTHENTICATION & USER MODEL

AUTH_USER_MODEL = "accounts.User"

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 12}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
    {"NAME": "backend.apps.accounts.validators.UppercaseValidator"},
    {"NAME": "backend.apps.accounts.validators.SpecialCharacterValidator"},
] if not DEBUG else []

# DJANGO ALLAUTH CONFIGURATION

# Django Allauth settings
ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'password1*', 'password2*']
ACCOUNT_EMAIL_REQUIRED = True
ACCOUNT_USERNAME_REQUIRED = False
ACCOUNT_EMAIL_VERIFICATION = 'optional'
SOCIALACCOUNT_EMAIL_VERIFICATION = 'none'
SOCIALACCOUNT_AUTO_SIGNUP = True

LOGIN_REDIRECT_URL = '/api/accounts/oauth/post-login/'
ACCOUNT_LOGOUT_REDIRECT_URL = '/'

# Google OAuth provider
SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['openid', 'email', 'profile'],
        'AUTH_PARAMS': {
            'access_type': 'online',
        },
        'APP': {
            'client_id': config('GOOGLE_OAUTH_CLIENT_ID', default=''),
            'secret': config('GOOGLE_OAUTH_CLIENT_SECRET', default=''),
            'key': ''
        }
    }
}

# REST FRAMEWORK & JWT

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=30),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "ALGORITHM": "HS256",
    "SIGNING_KEY": SECRET_KEY,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# CORS & CSRF CONFIGURATION

CORS_ALLOW_CREDENTIALS = True

if DEBUG:
    CORS_ALLOWED_ORIGINS = [
        FRONTEND_URL,
        "http://127.0.0.1:5173",
    ]
else:
    CORS_ALLOWED_ORIGINS = config("CORS_ALLOWED_ORIGINS", default="", cast=Csv())

CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default=f"{FRONTEND_URL},http://127.0.0.1:5173" if DEBUG else FRONTEND_URL,
    cast=Csv()
)
CSRF_COOKIE_HTTPONLY = False
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SAMESITE = "Lax"

# SECURITY SETTINGS

# Always enabled security headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# Production-only security
if not DEBUG:
    # Proxy headers (for NGINX)
    USE_X_FORWARDED_HOST = True
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

    # SSL/TLS
    SECURE_SSL_REDIRECT = True
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True

# RATE LIMITING

RATELIMIT_ENABLE = not DEBUG
RATELIMIT_USE_CACHE = "default"

if not DEBUG:
    RATELIMIT_IP_META_KEY = 'HTTP_X_FORWARDED_FOR'

# STATIC & MEDIA FILES

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# EMAIL CONFIGURATION

EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = config("EMAIL_HOST")
EMAIL_PORT = config("EMAIL_PORT", default=465, cast=int)
EMAIL_USE_SSL = config("EMAIL_USE_SSL", default=True, cast=bool)
EMAIL_HOST_USER = config("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = config("EMAIL_HOST_PASSWORD")

# THIRD-PARTY SERVICES
# Google reCAPTCHA
# -----------------------------
RECAPTCHA_PUBLIC_KEY = config('RECAPTCHA_PUBLIC_KEY')
RECAPTCHA_PRIVATE_KEY = config('RECAPTCHA_PRIVATE_KEY')
RECAPTCHA_REQUIRED_SCORE = 0.5

# 🇸🇪 BankID
# -----------------------------
# 🇸🇪 BankID
# -----------------------------
BANKID_API_URL = config(
    'BANKID_API_URL',
    default='https://appapi2.test.bankid.com/rp/v6.0'
)

# Salt for hashing personnummer (GDPR compliance)
BANKID_SALT = config(
    'BANKID_SALT',
    default='change-in-production-random-salt'
)

# ✅ Certificate paths - resolve relative paths against BASE_DIR
def _resolve_bankid_path(env_var: str, default_relative: str) -> str:
    """
    Resolve BankID certificate path from environment variable.
    If the path is relative, join it with BASE_DIR.
    Always returns an absolute path as a string.
    """
    from pathlib import Path

    path_str = config(env_var, default=default_relative)
    path_obj = Path(path_str)

    # If already absolute, return as string
    if path_obj.is_absolute():
        return str(path_obj)

    # If relative, join with BASE_DIR
    return str(BASE_DIR / path_obj)

BANKID_CERT_PATH = _resolve_bankid_path(
    'BANKID_CERT_PATH',
    'backend/secrets/bankid/test_cert.pem'
)

BANKID_KEY_PATH = _resolve_bankid_path(
    'BANKID_KEY_PATH',
    'backend/secrets/bankid/test_key.pem'
)

BANKID_CA_CERT_PATH = _resolve_bankid_path(
    'BANKID_CA_CERT_PATH',
    'backend/secrets/bankid/bankid_ca.pem'
)

# ✅ Debug: Print resolved paths (remove after verification)
if DEBUG:
    print("\n" + "="*60)
    print("🇸🇪 BankID Configuration:")
    print("="*60)
    print(f"API URL: {BANKID_API_URL}")
    print(f"Cert Path: {BANKID_CERT_PATH}")
    print(f"Cert Exists: {Path(BANKID_CERT_PATH).exists()}")
    print(f"Key Path: {BANKID_KEY_PATH}")
    print(f"Key Exists: {Path(BANKID_KEY_PATH).exists()}")
    print(f"CA Path: {BANKID_CA_CERT_PATH}")
    print(f"CA Exists: {Path(BANKID_CA_CERT_PATH).exists()}")
    print("="*60 + "\n")

# Sentry Monitoring
SENTRY_DSN = config("SENTRY_DSN", default="")
if SENTRY_DSN and not DEBUG:
    import sentry_sdk
    sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.1)
