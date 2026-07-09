# Build (Angular) ----------
FROM node:20-alpine AS build
WORKDIR /app

# Copia package.json/lock primero para cache
COPY package*.json ./
RUN npm ci

# Copia el resto del código
COPY . .

# Tag de la imagen desplegada (ej: 20240115-abc1234-staging). Si no se pasa, usa 'dev'.
ARG APP_VERSION=dev

# Inyecta la versión directamente en version.ts antes de compilar
RUN echo "export const version = '${APP_VERSION}';" > src/environments/version.ts

# Usa configuración según ARG (staging|production)
ARG BUILD_CONFIG=staging
RUN npm run build -- --configuration $BUILD_CONFIG

# ---------- Runtime (NGINX) ----------
FROM nginx:1.27-alpine AS runtime

# NGINX conf para SPA + /health
COPY dockerfiles/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copia el build (ajusta si tu directorio dist tiene otro nombre)
COPY --from=build /app/dist/LaComanda /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=20s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/health || exit 1
