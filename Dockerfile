# syntax=docker/dockerfile:1.7

# ===== 构建阶段 =====
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# 先拷贝 manifest，命中 Docker 缓存
COPY package.json pnpm-workspace.yaml ./
COPY packages/server/package.json       packages/server/
COPY packages/web/package.json         packages/web/
COPY packages/electron/package.json    packages/electron/
# 如果有 pnpm-lock.yaml 用 frozen-lockfile，否则用普通 install（开发/CI 友好）
COPY pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile --filter @cloudasset/server... --filter @cloudasset/web...; \
    else \
      echo "WARNING: pnpm-lock.yaml not found, using regular install" && \
      pnpm install --filter @cloudasset/server... --filter @cloudasset/web...; \
    fi

# 拷贝源码并构建
COPY packages/server/    packages/server/
COPY packages/web/       packages/web/
RUN pnpm --filter @cloudasset/server build
RUN pnpm --filter @cloudasset/web build


# ===== 后端运行时 =====
FROM node:20-alpine AS server
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate
RUN apk add --no-cache wget tini

COPY package.json pnpm-workspace.yaml ./
COPY packages/server/package.json packages/server/
COPY pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile --filter @cloudasset/server... --prod; \
    else \
      pnpm install --filter @cloudasset/server... --prod; \
    fi
COPY --from=builder /app/packages/server/dist packages/server/dist

RUN mkdir -p /app/data /app/files
ENV DB_PATH=/app/data/cloudasset.db
ENV STORAGE_ROOT=/app/files
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "packages/server/dist/index.js"]


# ===== Web 前端运行时（nginx 静态托管）=====
FROM nginx:1.27-alpine AS web
COPY --from=builder /app/packages/web/dist /usr/share/nginx/html
COPY deploy/nginx.web.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1
