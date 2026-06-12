# CloudAsset

CloudAsset 是一个部署在自有 VPS 上的轻量 AIGC 资产库，适合保存图片、视频、音频、文档、代码片段、数据文件和生成式 AI 工作流产物。

它的核心目标是：**自己掌控文件、简单部署、多端可用、让 AI Agent 也能直接访问资产库**。

## 功能

- 资产上传、搜索、分类、标签、预览、下载、删除
- 单用户 API Key 鉴权
- 公开分享链接，支持分享页预览和下载
- React Web 客户端
- Electron 桌面壳
- Expo Android 客户端，可打 APK 安装测试
- MCP stdio + Streamable HTTP，供 Codex、Claude Code、Cursor 等 Agent 调用
- SQLite + 本地磁盘存储，无需对象存储和外部数据库
- Docker 多阶段镜像，支持 GHCR 自动构建和 VPS 部署

## 快速开始

要求：

- Node.js 20 或 22，不建议 Node 24
- pnpm 9

```bash
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install

cp .env.example .env
# 编辑 .env，把 API_KEY 改成强随机字符串

pnpm dev:server
pnpm dev:web
```

打开 Web：

```text
http://localhost:5173
```

登录时填写：

- 服务器地址：本地开发留空，或填 `http://localhost:3000`
- API Key：`.env` 里的 `API_KEY`

## Docker 本地运行

```bash
cp .env.example .env
# 修改 API_KEY
docker compose up -d --build
```

打开：

```text
http://localhost:8080
```

## Android APK

Android 使用 Expo + EAS。

```bash
pnpm android:typecheck
pnpm android:build:eas
```

构建完成后，EAS 会给出 APK 下载链接。更多步骤见 [Android 打包文档](docs/ANDROID.md)。

## GitHub 和容器镜像

仓库内置 GitHub Actions：

- `.github/workflows/docker-ghcr.yml`：推送到 `main` 后构建并发布 server/web 镜像到 GHCR
- `.github/workflows/android-eas.yml`：手动触发 Android APK 云构建

详细部署见 [GitHub/GHCR 部署文档](docs/GITHUB_DEPLOY.md) 和 [Docker 部署文档](docs/DEPLOY.md)。

## MCP 接入

stdio 本地模式：

```bash
pnpm mcp:stdio
```

HTTP 远程模式：

```text
POST https://asset.example.com/mcp
Authorization: Bearer <API_KEY>
```

详细工具列表见 [MCP 文档](docs/MCP.md)。

## 文档索引

- [使用手册](docs/USAGE.md)
- [API 文档](docs/API.md)
- [MCP 文档](docs/MCP.md)
- [Docker/VPS 部署](docs/DEPLOY.md)
- [GitHub/GHCR 部署](docs/GITHUB_DEPLOY.md)
- [Android 打包](docs/ANDROID.md)
- [项目结构](docs/STRUCTURE.md)
- [冒烟测试](docs/E2E.md)

## 当前建议

- 生产环境固定 Node 20 或使用 Docker 镜像运行
- `API_KEY` 至少使用 32 字节随机值
- 不要把 `3000` 后端端口直接暴露公网，只暴露 HTTPS 反代入口
- 定期备份 Docker volume 中的 SQLite 数据库和文件目录
