# 多架构 (linux/amd64 + linux/arm64) 镜像构建
#
# 用法:
#   docker buildx create --name cb --use
#   docker buildx build \
#     --platform linux/amd64,linux/arm64 \
#     -t <registry>/cloudasset-server:0.1.0 \
#     --target server --push .
#   docker buildx build \
#     --platform linux/amd64,linux/arm64 \
#     -t <registry>/cloudasset-web:0.1.0 \
#     --target web --push .
#
# 推送到 GitHub Container Registry:
#   echo $GITHUB_TOKEN | docker login ghcr.io -u <user> --password-stdin
#   docker buildx build --platform linux/amd64,linux/arm64 \
#     -t ghcr.io/<user>/cloudasset-server:0.1.0 --target server --push .
