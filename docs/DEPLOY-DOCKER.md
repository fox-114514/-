# CloudAsset 云端部署指南（Docker 版）

部署到任意云服务商（阿里云 / 腾讯云 / AWS / DigitalOcean / Hetzner 等）的 Linux VPS。

## 一、服务器最低要求

| 配置 | 建议 |
|---|---|
| CPU | 2 vCPU |
| 内存 | 2 GB |
| 磁盘 | 40 GB+（视资产量） |
| 系统 | Ubuntu 22.04 LTS / Debian 12 |
| 公网 IP | 必须 |
| 端口 | 80 / 443 开放 |

## 二、初始化 VPS

```bash
# 1) SSH 登录
ssh root@<your-server-ip>

# 2) 创建非 root 用户
adduser cloudasset
usermod -aG sudo cloudasset
su - cloudasset

# 3) 安装 Docker
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker cloudasset
newgrp docker

# 4) 验证
docker --version
docker compose version
```

## 三、上传代码

```bash
# 在本地（Windows PowerShell）
cd C:\Users\32939\projects\cloudasset
scp -r . cloudasset@<your-server-ip>:~/cloudasset
# 或用 git
# ssh cloudasset@<your-server-ip> "git clone <repo-url> ~/cloudasset"
```

## 四、配置环境变量

```bash
ssh cloudasset@<your-server-ip>
cd ~/cloudasset

# 生成强随机 API Key
openssl rand -hex 32

cp .env.example .env
nano .env
```

`.env` 关键字段：

```bash
API_KEY=<粘贴上面生成的 64 位 hex>
PUBLIC_BASE_URL=https://asset.example.com
MAX_UPLOAD_MB=1024
WEB_PORT=18080
```

## 五、启动服务

```bash
# 构建并后台启动
docker compose up -d --build

# 查看日志
docker compose logs -f cloudasset-server
docker compose logs -f cloudasset-web

# 检查状态
docker compose ps
```

两条 healthcheck 都应显示 `healthy`。

## 六、域名 + HTTPS（Caddy 方式 · 最简）

用 Caddy 自动签发 Let's Encrypt 证书，无需手写 nginx 配置。

```bash
# 1) 安装 Caddy
sudo apt install -y caddy

# 2) 配置 /etc/caddy/Caddyfile
sudo tee /etc/caddy/Caddyfile > /dev/null <<EOF
asset.example.com {
    reverse_proxy 127.0.0.1:18080
}
EOF

# 3) 启动
sudo systemctl reload caddy
```

打开 `https://asset.example.com` 应该看到 Web 登录页。

## 七、备选：Nginx + Let's Encrypt

参考 `docs/DEPLOY.md`，需要：

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo cp deploy/nginx.conf /etc/nginx/sites-available/cloudasset
sudo ln -s /etc/nginx/sites-available/cloudasset /etc/nginx/sites-enabled/
sudo vim /etc/nginx/sites-available/cloudasset   # 改域名
sudo certbot --nginx -d asset.example.com
```

## 八、数据持久化

数据存在两个命名卷：

```bash
docker volume ls
# cloudasset_cloudasset-data   # SQLite
# cloudasset_cloudasset-files  # 上传的文件
```

备份：

```bash
# 一键打包
docker run --rm \
  -v cloudasset_cloudasset-data:/data:ro \
  -v cloudasset_cloudasset-files:/files:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup-$(date +%F).tar.gz /data /files
```

恢复：

```bash
docker run --rm \
  -v cloudasset_cloudasset-data:/data \
  -v cloudasset_cloudasset-files:/files \
  -v $(pwd):/backup \
  alpine tar xzf /backup/backup-2026-06-12.tar.gz -C /
```

## 九、升级

```bash
cd ~/cloudasset
git pull                       # 或 scp 上传新代码
docker compose up -d --build
```

零停机：`--build` 会先构建新镜像再重启，旧容器在停止前会处理完当前请求。

## 十、云服务商安全组 / 防火墙

| 端口 | 用途 | 是否对外开放 |
|---|---|---|
| 22 | SSH | 仅你 |
| 80 | HTTP (Caddy/Nginx 自动跳转 HTTPS) | 对外 |
| 443 | HTTPS | 对外 |
| 3000 | 后端直连 | **不对外**（仅 docker 内网） |
| 18080 | Web 容器（80 端口） | 不直接对外，由 Caddy/Nginx 代理 |

云服务商安全组只需开放 22 / 80 / 443。

## 十一、推送预构建镜像到 GHCR（可选 · CI/CD）

```bash
# 本地登录
echo $GITHUB_TOKEN | docker login ghcr.io -u <user> --password-stdin

# 构建并推送
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/<user>/cloudasset-server:0.1.0 --target server --push .
docker buildx build --platform linux/amd64,linux/arm64 \
  -t ghcr.io/<user>/cloudasset-web:0.1.0 --target web --push .
```

服务器拉取：

```yaml
# docker-compose.yml
services:
  cloudasset-server:
    image: ghcr.io/<user>/cloudasset-server:0.1.0
    # ...
  cloudasset-web:
    image: ghcr.io/<user>/cloudasset-web:0.1.0
    # ...
```

## 十二、监控与日志

```bash
# 实时资源
docker stats

# 最近 100 行日志
docker compose logs --tail=100 -f

# 仅错误
docker compose logs -f | grep -i error
```

可选：在 VPS 上跑 [Uptime Kuma](https://github.com/louislam/uptime-kuma) 监控 `/api/health`。

## 十三、常见问题

| 现象 | 排查 |
|---|---|
| 502 Bad Gateway | `docker compose ps` 看 server 容器是否 healthy；查看 server 日志 |
| 上传 413 | 调整 `MAX_UPLOAD_MB` 并重启 compose |
| Caddy 没自动签证书 | 检查 80 端口能否外网访问；`sudo journalctl -u caddy` |
| 数据库锁 | 删 `cloudasset-data` 目录下 `*.db-journal` 不会丢数据 |
| 容器内存溢出 | 调高 `MAX_UPLOAD_MB` 减少并发 / 加 swap |

完整 REST / MCP API 文档见 `docs/API.md` 与 `docs/MCP.md`。
