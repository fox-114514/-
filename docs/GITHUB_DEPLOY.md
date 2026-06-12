# GitHub 仓库、GHCR 镜像和 VPS 部署

本文档说明如何把 CloudAsset 上传到 GitHub，并用 GitHub Actions 自动构建 Docker 镜像。

## 1. 创建 GitHub 仓库

在 GitHub 创建一个空仓库，例如：

```text
https://github.com/<owner>/cloudasset.git
```

本地添加远端：

```bash
git remote add origin https://github.com/<owner>/cloudasset.git
git push -u origin main
```

如果你使用 SSH：

```bash
git remote add origin git@github.com:<owner>/cloudasset.git
git push -u origin main
```

## 2. 自动构建 Docker 镜像

仓库包含 workflow：

```text
.github/workflows/docker-ghcr.yml
```

推送到 `main` 后会自动构建并发布两个镜像：

```text
ghcr.io/<owner>/<repo>-server:main
ghcr.io/<owner>/<repo>-web:main
```

也可以在 GitHub Actions 页面手动运行。

## 3. 设置镜像可见性

GHCR 默认可能是 private。部署到 VPS 前建议：

1. 打开 GitHub 仓库页面。
2. 进入右侧 Packages。
3. 找到 `cloudasset-server` 和 `cloudasset-web`。
4. 根据需要设为 public，或在 VPS 上执行 `docker login ghcr.io`。

## 4. VPS 使用预构建镜像部署

在 VPS 上创建目录：

```bash
mkdir -p ~/cloudasset
cd ~/cloudasset
```

上传这些文件：

```text
docker-compose.prod.yml
.env.example
```

生成环境文件：

```bash
cp .env.example .env
nano .env
```

关键配置：

```bash
API_KEY=<强随机字符串>
PUBLIC_BASE_URL=https://asset.example.com
CLOUDASSET_SERVER_IMAGE=ghcr.io/<owner>/<repo>-server:main
CLOUDASSET_WEB_IMAGE=ghcr.io/<owner>/<repo>-web:main
WEB_PORT=18080
MAX_UPLOAD_MB=512
```

启动：

```bash
docker compose -f docker-compose.prod.yml up -d
```

查看状态：

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f
```

## 5. Caddy HTTPS 反代

安装 Caddy 后配置：

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

## 6. 更新部署

推送新代码到 GitHub 后，Actions 会构建新镜像。VPS 更新：

```bash
cd ~/cloudasset
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

## 7. 备份和恢复

备份：

```bash
docker run --rm \
  -v cloudasset_cloudasset-data:/data:ro \
  -v cloudasset_cloudasset-files:/files:ro \
  -v $(pwd):/backup \
  alpine tar czf /backup/cloudasset-backup-$(date +%F).tar.gz /data /files
```

恢复：

```bash
docker run --rm \
  -v cloudasset_cloudasset-data:/data \
  -v cloudasset_cloudasset-files:/files \
  -v $(pwd):/backup \
  alpine tar xzf /backup/cloudasset-backup-2026-06-12.tar.gz -C /
```

## 8. 安全建议

- 不要开放后端 `3000` 到公网。
- 只开放 `80` 和 `443`。
- API Key 至少 32 字节随机。
- 分享链接只发给可信对象。
- 定期备份 volume。
