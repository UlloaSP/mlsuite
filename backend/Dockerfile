FROM python:3.14-slim

# Instalar uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# oNLY DEV: Instalar git (necesario para que uv pueda descargar repositorios)
RUN apt-get update && apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración del proyecto
COPY pyproject.toml .
COPY uv.lock .
COPY README.md .

RUN uv sync --frozen --no-dev --no-install-project   # deps only
COPY src ./src

# Sincronizar dependencias con uv
# --frozen: no actualiza lock, --no-dev: excluye dependencias de desarrollo
RUN uv sync --frozen --no-dev

# Crear directorio para certificados SSL
RUN mkdir -p /etc/ssl/certs

# Instalar openssl para generar certificado self-signed
RUN apt-get update && apt-get install -y --no-install-recommends openssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /app/private.key \
    -out /app/certificate.crt \
    -subj "/CN=localhost" && \
    apt-get remove -y openssl && apt-get clean && rm -rf /var/lib/apt/lists/*

# Exponer puerto
EXPOSE 8000

# Ejecutar la aplicación con uvicorn desde el entorno virtual de uv
CMD [".venv/bin/python", "-m", "uvicorn", "mlsuite_backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--ssl-keyfile=/app/private.key", "--ssl-certfile=/app/certificate.crt"]
