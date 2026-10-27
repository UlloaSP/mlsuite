# syntax=docker/dockerfile:1.7

FROM node:26-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS build
WORKDIR /app
RUN npm install -g vite-plus@1.3.0
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN vp install --ignore-scripts --frozen-lockfile
COPY . .
RUN vp run build

FROM nginx:1.31.5-alpine@sha256:72ba65eb42c10344912a84ff42408db7d34f2feb642204570ab8fc5ffd29f1d3 AS runtime
RUN apk upgrade --no-cache

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
# A build whose API is on another origin may connect to it; the CSP otherwise allows only this one.
ARG VITE_BACKEND_URL
RUN if [ -n "$VITE_BACKEND_URL" ]; then \
      sed -i "s#connect-src 'self';#connect-src 'self' ${VITE_BACKEND_URL};#" /etc/nginx/conf.d/default.conf; \
    fi

EXPOSE 5173
