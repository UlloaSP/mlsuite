# syntax=docker/dockerfile:1.7

FROM node:25-alpine3.21 AS build
WORKDIR /app
RUN npm install -g vite-plus@latest
COPY package.json pnpm-lock.yaml ./
COPY --from=mlform package.json /tmp/mlform/package.json
COPY --from=mlform dist /tmp/mlform/dist
RUN npm pkg set dependencies.mlform=file:/tmp/mlform
RUN vp install --ignore-scripts --no-frozen-lockfile
COPY . .
RUN vp run build

FROM nginx:1.29.3-alpine
COPY --from=build /app/dist /usr/share/nginx/html

# Directorio para certificados SSL montados desde host
RUN mkdir -p /etc/nginx/certs

# Configuración de Nginx con HTTPS
RUN printf 'server {\n  listen 5173 ssl http2;\n  server_name _;\n  root /usr/share/nginx/html;\n  include /etc/nginx/mime.types;\n  \n  # SSL Configuration\n  ssl_certificate /etc/nginx/certs/localhost.pem;\n  ssl_certificate_key /etc/nginx/certs/localhost-key.pem;\n  ssl_protocols TLSv1.2 TLSv1.3;\n  ssl_ciphers HIGH:!aNULL:!MD5;\n  ssl_prefer_server_ciphers on;\n  ssl_session_cache shared:SSL:10m;\n  ssl_session_timeout 10m;\n  \n  # Security Headers\n  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;\n  add_header X-Content-Type-Options "nosniff" always;\n  add_header X-Frame-Options "DENY" always;\n  add_header X-XSS-Protection "1; mode=block" always;\n  add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n  \n  # SPA Routing\n  try_files $uri /index.html;\n  \n  # Gzip Compression\n  gzip on;\n  gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;\n  gzip_min_length 1000;\n}' > /etc/nginx/conf.d/default.conf

EXPOSE 5173
