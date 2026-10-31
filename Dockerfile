# ---- 构建阶段 ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund

COPY . .
ENV DOCKER_BUILD=1
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- 运行阶段 ----
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# 启动器 + 100 个点播源（start.js 读取 sources.json 注入 DEFAULT_SOURCES）
COPY --from=builder /app/start.js ./start.js
COPY --from=builder /app/sources.json ./sources.json

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

RUN mkdir -p /app/data && chmod 777 /app/data

EXPOSE 8080
CMD ["node", "start.js"]
