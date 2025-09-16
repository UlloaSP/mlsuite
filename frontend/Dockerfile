FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf 'server { listen 5173; server_name _; root /usr/share/nginx/html; include /etc/nginx/mime.types; try_files $uri /index.html; }' > /etc/nginx/conf.d/default.conf
EXPOSE 5173
