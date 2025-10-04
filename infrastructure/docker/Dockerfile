# Multi-stage build for Django backend (collect static at build time)
FROM python:3.12-slim-bookworm AS builder

# Update OS packages and install build deps for compiling wheels
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /wheels -r requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1 \
    STATIC_ROOT=/staticfiles

RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt

FROM python:3.12-slim-bookworm AS production

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

COPY --from=builder /wheels /wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --no-index --find-links=/wheels -r requirements.txt \
    && rm -rf /wheels requirements.txt

COPY --chown=appuser:appuser . .
COPY --from=builder --chown=appuser:appuser /staticfiles /staticfiles

ARG DJANGO_SETTINGS_MODULE=myproject.settings
ARG WSGI_MODULE=myproject.wsgi:application
ENV PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=$DJANGO_SETTINGS_MODULE \
    WSGI_MODULE=$WSGI_MODULE \
    STATIC_ROOT=/staticfiles

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["sh", "-c", "exec gunicorn \"$WSGI_MODULE\" --bind 0.0.0.0:8000 --workers 3 --access-logfile -"]
