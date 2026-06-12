# CloudAsset Docker/VPS 部署指南

最快测试方式是 IP 直连一键部署，默认端口 `18080`：

```bash
curl -fsSL https://raw.githubusercontent.com/fox-114514/-/main/deploy/install-ip.sh | bash
```

详细见 [一键 IP 直连部署](QUICK_DEPLOY.md)。

生产环境推荐：VPS + Docker Compose + Caddy HTTPS 反代。

## 1. 服务器要求

| 项目 | 建议 |
|---|---|
| 系统 | Ubuntu 22.04 / Debian 12 |
| CPU | 2 vCPU |
| 内存 | 2 GB 起 |
| 磁盘 | 40 GB 起，按资产量扩容 |
| 端口 | 80、443 对外开放 |

## 2. 安装 Docker

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

验证：

```bash
docker --version
docker compose version
```

## 3. 方式 A：服务器本地构建

上传整个仓库到 VPS：

```bash
scp -r . user@your-server:~/cloudasset
ssh user@your-server
cd ~/cloudasset
```

配置环境：

```bash
cp .env.example .env
nano .env
```

至少修改：

```bash
API_KEY=<强随机字符串>
PUBLIC_BASE_URL=https://asset.example.com
WEB_PORT=18080
```

启动：

```bash
docker compose up -d --build
```

## 4. 方式 B：使用 GHCR 预构建镜像

适合 GitHub Actions 已经发布镜像的场景。

```bash
mkdir -p ~/cloudasset
cd ~/cloudasset
```

复制 `docker-compose.prod.yml` 和 `.env.example` 到该目录。

```bash
cp .env.example .env
nano .env
```

配置：

```bash
API_KEY=<强随机字符串>
PUBLIC_BASE_URL=https://asset.example.com
CLOUDASSET_SERVER_IMAGE=ghcr.io/<owner>/<repo>-server:main
CLOUDASSET_WEB_IMAGE=ghcr.io/<owner>/<repo>-web:main
WEB_PORT=18080
```

启动：

```bash
docker compose -f docker-compose.prod.yml up -d
```

## 5. 配置 HTTPS

推荐 Caddy：

```bash
sudo apt install -y caddy
sudo nano /etc/caddy/Caddyfile
```

写入：

```caddyfile
asset.example.com {
    reverse_proxy 127.0.0.1:18080
}
```

重载：

```bash
sudo systemctl reload caddy
```

访问：

```text
https://asset.example.com
```

## 6. 登录 Web

打开 Web 后填写：

- 服务器地址：`https://asset.example.com`
- API Key：`.env` 中的 `API_KEY`

## 7. MCP HTTP

远程 Agent 使用：

```text
POST https://asset.example.com/mcp
Authorization: Bearer <API_KEY>
```

或：

```text
X-API-Key: <API_KEY>
```

## 8. 更新

本地构建方式：

```bash
git pull
docker compose up -d --build
```

GHCR 镜像方式：

```bash
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## 9. 备份

```bash
docker run --rm \
  -v cloudasset_cloudasset-data:/data:ro \
  -v cloudasset_cloudasset-files:/files:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/cloudasset-backup-$(date +%F).tar.gz /data /files
```

## 10. 恢复

```bash
docker run --rm \
  -v cloudasset_cloudasset-data:/data \
  -v cloudasset_cloudasset-files:/files \
  -v $(pwd):/backup \
  alpine tar xzf /backup/cloudasset-backup-2026-06-12.tar.gz -C /
```

## 11. 排障

| 现象 | 排查 |
|---|---|
| Web 打不开 | `docker compose ps`，确认 web healthy |
| 登录 403 | API Key 不匹配 |
| 上传 413 | 调整 `MAX_UPLOAD_MB`，同时检查反代 body size |
| MCP 401/403 | 请求缺少 `X-API-Key` 或 Bearer token |
| 分享页打不开 | 确认 `PUBLIC_BASE_URL` 是公网 HTTPS 域名 |
| 数据没了 | 检查是否误删 Docker volume |
