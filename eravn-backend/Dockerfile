# ==========================================
# eravnProjects Backend - Unified Dockerfile
# ==========================================
# Dùng cho CẢ Cloud Run Service LẪN Job.
# Chế độ hoạt động điều khiển bởi RUN_MODE env var.
# ==========================================

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production && cp -R node_modules /prod_modules
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# Stage 2: Run
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /prod_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Mặc định cho Service mode
ENV PORT=8080
ENV NODE_ENV=production

EXPOSE 8080

CMD ["./entrypoint.sh"]
