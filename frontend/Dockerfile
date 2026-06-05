# syntax=docker/dockerfile:1.7

FROM node:25-alpine3.21 AS build
WORKDIR /app
RUN npm install -g vite-plus@latest
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN vp install --ignore-scripts --no-frozen-lockfile
COPY . .
RUN vp run build

FROM nginx:1.29.3-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=build /app/public/runtime-config.js.template /usr/share/nginx/html/runtime-config.js.template
COPY nginx.conf /etc/nginx/conf.d/default.conf

RUN apk add --no-cache gettext

RUN printf '#!/bin/sh\nset -eu\nenvsubst '\''$VITE_BACKEND_URL'\'' < /usr/share/nginx/html/runtime-config.js.template > /usr/share/nginx/html/runtime-config.js\n' > /docker-entrypoint.d/40-runtime-config.sh && chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 5173
