# syntax=docker/dockerfile:1.7

FROM node:26-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS build
WORKDIR /app
RUN npm install -g vite-plus@0.3.3
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN vp install --ignore-scripts --frozen-lockfile
COPY . .
RUN vp run build

FROM nginx:1.31.5-alpine@sha256:72ba65eb42c10344912a84ff42408db7d34f2feb642204570ab8fc5ffd29f1d3
RUN apk upgrade --no-cache libuuid libexpat

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173
