# CloudAsset E2E 测试脚本

> 适用于 P0 整改后版本（含 MCP 鉴权 / 流式上传 / 公开分享内容 / Android multipart 修复）

## 〇、P0 验收（必须通过才能上线）

### 0.1 /mcp 未鉴权必须 403/401
```bash
# 期望: 401 或 403
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# 期望: 200 + 8 个 tool
curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools | length'
```

### 0.2 /mcp Bearer 鉴权也应通过
```bash
curl -s -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq '.result.tools | length'
```

### 0.3 流式上传 512MB 不 OOM
```bash
# 生成 512MB 测试文件
dd if=/dev/urandom of=/tmp/big.bin bs=1M count=512

# 监控内存
docker stats cloudasset-server --no-stream &

# 上传
curl -X POST -H "X-API-Key: $API_KEY" \
  -F "file=@/tmp/big.bin" \
  http://localhost:3000/api/assets/upload | jq

# 上传后容器内存应保持稳定（< 200MB），不是 512MB
```

### 0.4 公开分享能下载文件
```bash
ID=$(curl -s -H "X-API-Key: $API_KEY" http://localhost:3000/api/assets | jq -r '.items[0].id')
SHARE=$(curl -s -X POST -H "X-API-Key: $API_KEY" http://localhost:3000/api/assets/$ID/share | jq -r .share_token)

# 公开下载，无需 API Key
curl -o /tmp/dl.bin -w "size=%{size_download} http=%{http_code}\n" \
  http://localhost:3000/api/share/$SHARE/content
# 期望: http=200, size 与上传一致

# 公开访问元数据
curl -s http://localhost:3000/api/share/$SHARE | jq
```

### 0.5 短链 /s/:token
```bash
# 浏览器打开下面链接应该看到落地页
echo "https://your-domain/#/s/$SHARE"
```

---

## 一、后端冒烟

```bash
# 1. 健康
curl -s http://localhost:3000/api/health | jq

# 2. 列表（应为空）
curl -s -H "X-API-Key: $API_KEY" http://localhost:3000/api/assets | jq

# 3. 上传
echo "hello cloudasset" > /tmp/test.txt
curl -s -X POST http://localhost:3000/api/assets/upload \
  -H "X-API-Key: $API_KEY" \
  -F "file=@/tmp/test.txt" \
  -F "tags=test,demo" | jq

# 4. 搜索
curl -s -H "X-API-Key: $API_KEY" \
  "http://localhost:3000/api/assets?q=test&tag=demo" | jq

# 5. 分享
ID=$(curl -s -H "X-API-Key: $API_KEY" http://localhost:3000/api/assets | jq -r '.items[0].id')
curl -s -X POST -H "X-API-Key: $API_KEY" http://localhost:3000/api/assets/$ID/share | jq

# 6. 删除
curl -s -X DELETE -H "X-API-Key: $API_KEY" http://localhost:3000/api/assets/$ID
```

## 二、MCP stdio 联通

```bash
# 用 MCP Inspector
npx @modelcontextprotocol/inspector node packages/server/dist/mcp/stdio.js
```

应看到 8 个工具列出。

## 三、MCP HTTP 联通

```bash
# 列出工具
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | jq

# 调用 list_assets
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer $API_KEY" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": { "name": "list_assets", "arguments": { "limit": 5 } }
  }' | jq
```

## 四、Agent 端到端

1. 在 Claude Code / Codex 配置中加入 CloudAsset MCP server（stdio 模式）
2. 重启 Agent
3. 在 Agent 中说："列出我的资产库前 5 项"
4. 应看到 Agent 自动调用 `list_assets` 工具

## 五、客户端验证

- **Web**：浏览器打开 `https://asset.example.com/`，输入 API Key 登录，验证上传 / 列表 / 预览 / 分享
- **Windows**：本地构建后双击运行，登录后验证
- **Android**：EAS Build 出 APK，安装后登录验证

## 六、常见问题

| 现象 | 排查 |
|---|---|
| 401 缺 Key | 检查请求 Header `X-API-Key` |
| 403 Key 错 | 检查 `.env` 中 `API_KEY` 与客户端一致 |
| 上传 413 | 调整 `MAX_UPLOAD_MB` 或 nginx `client_max_body_size` |
| MCP 端点 405 | MCP 仅支持 POST，GET 不可用 |
| 移动端连接失败 | 检查服务器域名 + HTTPS 证书 + `PUBLIC_BASE_URL` |
