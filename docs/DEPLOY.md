# 部署相关
- [DEPLOY.md](DEPLOY.md) · Linux + Nginx + systemd 完整流程
- 关键文件：
  - `Dockerfile` · 容器化
  - `docker-compose.yml` · 一键起服务
  - `deploy/nginx.conf` · 反代 + HTTPS 模板
  - `deploy/cloudasset.service` · systemd unit
