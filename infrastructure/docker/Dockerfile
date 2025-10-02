# backend/Dockerfile
# Multi-stage build for Django backend (collect static at build time)
FROM python:3.12-slim AS builder

# Build deps for compiling wheels (ensure packages are upgraded to receive security fixes)
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and build wheels (faster/reproducible installs)
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /wheels -r requirements.txt

# Copy project sources (context is ./backend in docker-compose)
COPY . .

# Ensure static collection goes to a known directory
ENV PYTHONUNBUFFERED=1 \
    STATIC_ROOT=/staticfiles

# Install requirements (from wheels) into builder to run collectstatic
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt

# Run Django collectstatic (ensure manage.py exists and settings are available/configured)
# If your settings require environment variables, provide them via build args or make collectstatic a runtime step
# Production image
FROM python:3.12-slim AS production

# Runtime deps only (upgrade packages to apply security fixes before installing runtime deps)
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Create non-root user

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy wheels from builder, install into final image
COPY --from=builder /wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels requirements.txt

# Copy application code and collected static from builder
COPY --chown=appuser:appuser . .
COPY --from=builder --chown=appuser:appuser /staticfiles /staticfiles

# Defaults; override in compose/env
ENV PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-myproject.settings} \
    WSGI_MODULE=${WSGI_MODULE:-myproject.wsgi:application} \
    STATIC_ROOT=/staticfiles

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Use WSGI_MODULE env to point to your project's wsgi (default above)
# Example override in compose: - WSGI_MODULE=myproject.wsgi:application
CMD ["sh", "-c", "exec gunicorn \"$WSGI_MODULE\" --bind 0.0.0.0:8000 --workers 3 --access-logfile -"]
