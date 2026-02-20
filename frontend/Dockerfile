FROM node:25-alpine3.21 AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:1.29.3-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Crear directorio para certificados SSL
RUN mkdir -p /etc/nginx/certs

# Generar certificado self-signed para desarrollo
RUN apk add --no-cache openssl && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/certs/private.key \
    -out /etc/nginx/certs/certificate.crt \
    -subj "/CN=localhost" && \
    apk del openssl

# Configuración de Nginx con HTTPS
RUN printf 'server {\n  listen 5173 ssl http2;\n  server_name _;\n  root /usr/share/nginx/html;\n  include /etc/nginx/mime.types;\n  \n  # SSL Configuration\n  ssl_certificate /etc/nginx/certs/certificate.crt;\n  ssl_certificate_key /etc/nginx/certs/private.key;\n  ssl_protocols TLSv1.2 TLSv1.3;\n  ssl_ciphers HIGH:!aNULL:!MD5;\n  ssl_prefer_server_ciphers on;\n  ssl_session_cache shared:SSL:10m;\n  ssl_session_timeout 10m;\n  \n  # Security Headers\n  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n  add_header X-Content-Type-Options "nosniff" always;\n  add_header X-Frame-Options "DENY" always;\n  add_header X-XSS-Protection "1; mode=block" always;\n  add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n  \n  # SPA Routing\n  try_files $uri /index.html;\n  \n  # Gzip Compression\n  gzip on;\n  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;\n  gzip_min_length 1000;\n}' > /etc/nginx/conf.d/default.conf

EXPOSE 5173
