# 项目结构

```text
cloudasset/
├── package.json                  # pnpm workspace 根
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── Dockerfile                    # server / web 多阶段镜像
├── docker-compose.yml            # 本地构建部署
├── docker-compose.prod.yml       # 使用 GHCR 镜像部署
├── .dockerignore
├── .env.example
├── README.md
│
├── .github/workflows/
│   ├── docker-ghcr.yml           # 构建并推送 GHCR 镜像
│   └── android-eas.yml           # 手动触发 Android APK 构建
│
├── packages/
│   ├── server/                   # Express + SQLite + MCP
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts          # HTTP 入口
│   │       ├── config.ts         # 环境变量
│   │       ├── auth/apiKey.ts    # X-API-Key / Bearer 鉴权
│   │       ├── db/               # SQLite schema + repo
│   │       ├── storage/          # 本地文件存储
│   │       ├── routes/assets.ts  # REST API
│   │       └── mcp/              # MCP stdio + HTTP
│   │
│   ├── web/                      # React + Vite SPA
│   │   ├── vite.config.mjs
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── api/client.ts
│   │       ├── pages/
│   │       │   ├── Login.tsx
│   │       │   ├── AssetList.tsx
│   │       │   ├── AssetDetail.tsx
│   │       │   ├── Upload.tsx
│   │       │   ├── ShareManager.tsx
│   │       │   └── ShareLanding.tsx
│   │       └── styles/global.css
│   │
│   ├── electron/                 # Windows 桌面壳
│   │   ├── electron-builder.yml
│   │   ├── scripts/copy-web-dist.mjs
│   │   └── src/
│   │       ├── main.ts
│   │       └── preload.ts
│   │
│   └── android/                  # Expo Android
│       ├── app.json
│       ├── eas.json
│       ├── assets/
│       │   ├── icon.png
│       │   └── splash.png
│       └── src/
│           ├── App.tsx
│           ├── api/client.ts
│           └── screens/
│
├── deploy/
│   ├── nginx.conf
│   ├── nginx.web.conf
│   └── cloudasset.service
│
└── docs/
    ├── USAGE.md
    ├── API.md
    ├── MCP.md
    ├── DEPLOY.md
    ├── GITHUB_DEPLOY.md
    ├── ANDROID.md
    ├── E2E.md
    └── STRUCTURE.md
```

## 数据流

```text
User/Web/Android/Electron
  -> HTTPS reverse proxy
  -> cloudasset-web
  -> /api/* proxied to cloudasset-server
  -> SQLite metadata + local files

AI Agent
  -> stdio MCP or POST /mcp
  -> API Key / Bearer auth
  -> same repository and storage layer
```
