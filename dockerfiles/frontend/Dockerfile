# ---------- Build (Angular) ----------
FROM node:20-alpine AS build
WORKDIR /app

# Copia package.json/lock primero para cache
COPY package*.json ./
RUN npm ci

# Copia el resto del código
COPY . .

# Usa configuración según ARG (staging|production)
ARG BUILD_CONFIG=staging
# Para Angular >= 16: ajusta el nombre del proyecto si no es "jbs-rest"
RUN npm run build -- --configuration $BUILD_CONFIG

# ---------- Runtime (NGINX) ----------
FROM nginx:1.27-alpine AS runtime
# NGINX conf para SPA + /health
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia el build (ajusta si tu directorio dist tiene otro nombre)
COPY --from=build /app/dist/jbs-rest /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=20s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/health || exit 1
