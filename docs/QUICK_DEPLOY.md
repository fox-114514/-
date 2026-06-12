# 一键 IP 直连部署

这个方式用于云服务器快速测试：

- 不需要域名
- 不配置 HTTPS
- 不占用 `8080`
- 默认只开放宿主机 `18080`
- 要求服务器已经安装 Docker 和 Docker Compose

## 一键部署

在服务器上运行：

```bash
curl -fsSL https://raw.githubusercontent.com/fox-114514/-/main/deploy/install-ip.sh | bash
```

完成后脚本会输出：

- 访问地址，例如 `http://1.2.3.4:18080`
- 自动生成的 API Key
- 查看日志、更新、停止命令

浏览器打开访问地址，用脚本输出的 API Key 登录。

## 自定义端口

例如改用 `19090`：

```bash
CLOUDASSET_PORT=19090 curl -fsSL https://raw.githubusercontent.com/fox-114514/-/main/deploy/install-ip.sh | bash
```

访问：

```text
http://服务器IP:19090
```

如果云服务商有安全组，记得放行对应 TCP 端口。

## 自定义安装目录

默认安装到 `/opt/cloudasset`。

```bash
INSTALL_DIR=/data/cloudasset curl -fsSL https://raw.githubusercontent.com/fox-114514/-/main/deploy/install-ip.sh | bash
```

## 更新

默认安装目录：

```bash
cd /opt/cloudasset
bash deploy/update-ip.sh
```

自定义安装目录：

```bash
INSTALL_DIR=/data/cloudasset bash /data/cloudasset/deploy/update-ip.sh
```

更新会保留：

- `.env`
- API Key
- SQLite 数据库
- 上传文件 volume

## 查看状态

```bash
cd /opt/cloudasset
docker compose ps
```

## 查看日志

```bash
cd /opt/cloudasset
docker compose logs -f
```

## 停止服务

```bash
cd /opt/cloudasset
docker compose down
```

这不会删除数据 volume。

## 卸载

停止并删除容器：

```bash
cd /opt/cloudasset
docker compose down
```

删除源码目录：

```bash
sudo rm -rf /opt/cloudasset
```

如果确认要删除所有数据，再删除 volume：

```bash
docker volume rm cloudasset_cloudasset-data cloudasset_cloudasset-files
```

## 端口说明

默认宿主机端口：

```text
18080 -> cloudasset-web:80
```

后端端口：

```text
cloudasset-server:3000
```

后端 `3000` 只在 Docker 内网使用，不映射到宿主机公网。

## 常见问题

| 问题 | 处理 |
|---|---|
| `缺少 docker` | 先安装 Docker 和 Docker Compose |
| 页面打不开 | 检查云厂商安全组是否放行 `18080/tcp` |
| 登录 403 | 使用脚本输出的 API Key |
| 想换端口 | 重新运行 `CLOUDASSET_PORT=新端口 ...install-ip.sh` |
| 需要 HTTPS | 使用 `docs/DEPLOY.md` 的 Caddy 域名部署方式 |
