# 项目结构

```
cloudasset/
├── package.json                  # pnpm workspace 根
├── pnpm-workspace.yaml
├── Dockerfile                    # 后端容器化
├── docker-compose.yml
├── .env.example
├── .gitignore
├── README.md
│
├── packages/
│   ├── server/                   # ★ 后端 + MCP
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts          # Express + MCP HTTP 启动入口
│   │   │   ├── config.ts         # 环境变量
│   │   │   ├── db/
│   │   │   │   ├── schema.sql
│   │   │   │   ├── connection.ts
│   │   │   │   └── repo.ts
│   │   │   ├── auth/apiKey.ts
│   │   │   ├── storage/
│   │   │   │   ├── local.ts
│   │   │   │   └── category.ts
│   │   │   ├── routes/assets.ts  # REST 路由
│   │   │   └── mcp/
│   │   │       ├── server.ts     # 8 个 tool 注册
│   │   │       ├── http.ts       # Streamable HTTP 传输
│   │   │       └── stdio.ts      # stdio 入口
│   │   └── files/                # 默认存储根
│   │
│   ├── web/                      # ★ React + Vite SPA
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   └── src/
│   │       ├── main.tsx
│   │       ├── api/client.ts     # 跨客户端 fetch 封装
│   │       ├── pages/
│   │       │   ├── Login.tsx
│   │       │   ├── AssetList.tsx
│   │       │   ├── AssetDetail.tsx
│   │       │   ├── Upload.tsx
│   │       │   └── ShareManager.tsx
│   │       ├── components/
│   │       └── styles/global.css
│   │
│   ├── electron/                 # ★ Windows 桌面
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── electron-builder.yml
│   │   └── src/
│   │       ├── main.ts
│   │       └── preload.ts
│   │
│   └── android/                  # ★ Expo Android
│       ├── package.json
│       ├── app.json
│       ├── eas.json
│       ├── tsconfig.json
│       ├── assets/
│       └── src/
│           ├── App.tsx
│           ├── types.ts
│           ├── api/client.ts
│           └── screens/
│               ├── LoginScreen.tsx
│               ├── ListScreen.tsx
│               ├── UploadScreen.tsx
│               └── PreviewScreen.tsx
│
├── deploy/
│   ├── nginx.conf                # 反代 + HTTPS 模板
│   └── cloudasset.service        # systemd unit
│
└── docs/
    ├── API.md                    # REST API 文档
    ├── MCP.md                    # MCP 工具文档
    ├── DEPLOY.md                 # 部署指南
    ├── E2E.md                    # 端到端测试
    └── STRUCTURE.md              # 本文件
```

## 端到端数据流

```
[用户] ──HTTPS──> [Nginx] ──> [Express :3000]
                                  │
                                  ├─> /api/*          → REST CRUD
                                  └─> /mcp (POST)     → MCP HTTP
                  
[AI Agent]
   ├── stdio: spawn  packages/server/dist/mcp/stdio.js
   └── HTTP: POST https://host/mcp  (Streamable HTTP)
                ↓
         调用 list_assets / upload_asset / share_asset ...
                ↓
         Express → SQLite (元数据) + 本地文件 (./files)
```
