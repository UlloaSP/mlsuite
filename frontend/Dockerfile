# syntax=docker/dockerfile:1.7

FROM node:25-alpine3.21@sha256:32509199057d74a987fdd88cde00fdfd48ef52469adbd6bd11969fc701477761 AS build
WORKDIR /app
RUN npm install -g vite-plus@0.2.5
ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN vp install --ignore-scripts --frozen-lockfile
COPY . .
RUN vp run build

FROM nginx:1.29.3-alpine@sha256:b3c656d55d7ad751196f21b7fd2e8d4da9cb430e32f646adcf92441b72f82b14
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173
