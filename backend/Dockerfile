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

# Exponer puerto
EXPOSE 8000

# Ejecutar la aplicación con configuración tomada del entorno
CMD [".venv/bin/python", "-m", "mlsuite_backend"]
