#!/usr/bin/env bash
set -Eeuo pipefail

REPO_URL="${REPO_URL:-https://github.com/fox-114514/-.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/cloudasset}"
CLOUDASSET_PORT="${CLOUDASSET_PORT:-18080}"
BRANCH="${BRANCH:-main}"

info() { printf '\033[1;34m[cloudasset]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[cloudasset]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[cloudasset]\033[0m %s\n' "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "缺少命令：$1。请先安装 Docker、Docker Compose、git、curl。"
}

compose() {
  docker compose "$@"
}

detect_ip() {
  local ip
  ip="$(curl -fsS --max-time 4 https://api.ipify.org 2>/dev/null || true)"
  if [ -z "$ip" ]; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  [ -n "$ip" ] || ip="127.0.0.1"
  printf '%s' "$ip"
}

random_key() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    tr -dc 'A-Za-z0-9' </dev/urandom | head -c 64
  fi
}

write_env() {
  local public_url="$1"
  if [ -f .env ]; then
    info "检测到已有 .env，保留 API_KEY 和数据配置，仅同步端口与 PUBLIC_BASE_URL"
    grep -q '^WEB_PORT=' .env && sed -i "s|^WEB_PORT=.*|WEB_PORT=${CLOUDASSET_PORT}|" .env || printf '\nWEB_PORT=%s\n' "$CLOUDASSET_PORT" >> .env
    grep -q '^PUBLIC_BASE_URL=' .env && sed -i "s|^PUBLIC_BASE_URL=.*|PUBLIC_BASE_URL=${public_url}|" .env || printf 'PUBLIC_BASE_URL=%s\n' "$public_url" >> .env
    return
  fi

  cat > .env <<EOF
PORT=3000
NODE_ENV=production
API_KEY=$(random_key)
DB_PATH=/app/data/cloudasset.db
STORAGE_ROOT=/app/files
PUBLIC_BASE_URL=${public_url}
LOG_LEVEL=info
MAX_UPLOAD_MB=512
WEB_PORT=${CLOUDASSET_PORT}

CLOUDASSET_SERVER_IMAGE=ghcr.io/fox-114514/--server:main
CLOUDASSET_WEB_IMAGE=ghcr.io/fox-114514/--web:main
EOF
}

main() {
  need_cmd docker
  need_cmd git
  need_cmd curl
  docker compose version >/dev/null 2>&1 || fail "Docker Compose 不可用。请安装 docker compose plugin。"

  if [ "$(id -u)" -ne 0 ] && [ ! -w "$(dirname "$INSTALL_DIR")" ]; then
    fail "当前用户无法写入 $(dirname "$INSTALL_DIR")。请用 sudo 运行，或设置 INSTALL_DIR 到可写目录。"
  fi

  info "安装目录：${INSTALL_DIR}"
  mkdir -p "$(dirname "$INSTALL_DIR")"

  if [ -d "$INSTALL_DIR/.git" ]; then
    info "检测到已有仓库，更新 ${BRANCH}"
    git -C "$INSTALL_DIR" fetch origin "$BRANCH"
    git -C "$INSTALL_DIR" checkout "$BRANCH"
    git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH"
  else
    rm -rf "$INSTALL_DIR"
    info "克隆仓库：${REPO_URL}"
    git clone --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  fi

  cd "$INSTALL_DIR"
  local ip public_url api_key
  ip="$(detect_ip)"
  public_url="http://${ip}:${CLOUDASSET_PORT}"
  write_env "$public_url"

  info "启动 CloudAsset，宿主机端口：${CLOUDASSET_PORT}"
  compose up -d --build

  api_key="$(grep '^API_KEY=' .env | sed 's/^API_KEY=//')"
  cat <<EOF

CloudAsset 已启动。

访问地址：
  ${public_url}

API Key：
  ${api_key}

常用命令：
  查看状态：cd ${INSTALL_DIR} && docker compose ps
  查看日志：cd ${INSTALL_DIR} && docker compose logs -f
  更新服务：cd ${INSTALL_DIR} && bash deploy/update-ip.sh
  停止服务：cd ${INSTALL_DIR} && docker compose down

如果云服务商安全组未开放 ${CLOUDASSET_PORT}/tcp，请先放行该端口。
EOF
}

main "$@"
