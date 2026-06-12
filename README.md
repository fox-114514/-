# CloudAsset

部署在自有 Linux VPS 上的 AIGC 资产库 · 三端客户端 (Web / Windows / Android) · MCP 服务器。

## 特性

- 文件 CRUD + 搜索 + 标签 + 分类 + 分享
- 单用户 API Key 鉴权
- MCP 协议（stdio + Streamable HTTP）让 AI Agent 直接调用
- React Web 端 + Electron 桌面 + Expo Android
- 本地磁盘 + SQLite 存储，零外部依赖

## 快速开始

```bash
# 1. 安装依赖（需要 pnpm >= 9）
pnpm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env 至少改 API_KEY

# 3. 启动后端
pnpm dev:server

# 4. 启动 Web
pnpm dev:web

# 5. 让 Agent 通过 MCP 接入
pnpm mcp:stdio   # stdio 模式
# 或者: HTTP 端点 http://localhost:3000/mcp
```

## 文档

- [API 文档](docs/API.md)
- [MCP 文档](docs/MCP.md)
- [部署指南](docs/DEPLOY.md)

## 项目结构

```text
cloudasset/
├── packages/
│   ├── server/      Express + SQLite + MCP Server
│   ├── web/         React + Vite SPA
│   ├── electron/    Windows 桌面端
│   └── android/     Expo Android App
├── deploy/          nginx / systemd / docker
└── docs/
```
