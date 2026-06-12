#!/usr/bin/env bash
set -Eeuo pipefail

INSTALL_DIR="${INSTALL_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BRANCH="${BRANCH:-main}"

info() { printf '\033[1;34m[cloudasset]\033[0m %s\n' "$*"; }
fail() { printf '\033[1;31m[cloudasset]\033[0m %s\n' "$*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || fail "缺少 docker"
command -v git >/dev/null 2>&1 || fail "缺少 git"
docker compose version >/dev/null 2>&1 || fail "Docker Compose 不可用"

cd "$INSTALL_DIR"
[ -d .git ] || fail "${INSTALL_DIR} 不是 Git 仓库"
[ -f .env ] || fail "缺少 .env，请先运行 deploy/install-ip.sh"

info "拉取最新代码"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

info "重建并重启容器"
docker compose up -d --build

public_url="$(grep '^PUBLIC_BASE_URL=' .env | sed 's/^PUBLIC_BASE_URL=//')"

cat <<EOF

CloudAsset 已更新。

访问地址：
  ${public_url}

当前状态：
EOF

docker compose ps
