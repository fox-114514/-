# CloudAsset MCP 文档

MCP（Model Context Protocol）服务器让你的 AI Agent（Claude Code、Codex、Cursor、自建 Agent 等）直接调用资产库。

## 启动方式

### 1. stdio 模式（推荐 · 本地 Agent）

```bash
# 在 CloudAsset 项目根目录
pnpm --filter @cloudasset/server mcp:stdio
# 或直接：
node packages/server/dist/mcp/stdio.js
```

在 Claude Code / Codex 配置中添加：

```json
{
  "mcpServers": {
    "cloudasset": {
      "command": "node",
      "args": ["/opt/cloudasset/packages/server/dist/mcp/stdio.js"],
      "env": { "API_KEY": "your-key" }
    }
  }
}
```

### 2. Streamable HTTP 模式（推荐 · 远程 Agent）

服务端默认暴露 `POST /mcp` 端点。

```bash
curl -X POST https://asset.example.com/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

在 Agent 配置中：

```json
{
  "mcpServers": {
    "cloudasset": {
      "type": "http",
      "url": "https://asset.example.com/mcp"
    }
  }
}
```

---

## 工具清单（8 个）

| 工具 | 用途 |
|---|---|
| `list_assets` | 按关键字/分类/标签搜索资产 |
| `get_asset` | 取单个资产元数据 |
| `read_asset` | 读取文本/代码片段（≤200KB），或返回二进制文件元信息 |
| `upload_asset` | 上传（base64 编码） |
| `update_asset` | 改名/改描述/改分类/改标签 |
| `delete_asset` | 删除 |
| `share_asset` | 生成分享 token 与 URL |
| `manage_tags` | list / add / remove / rename 标签 |

---

## 工具参数

### list_assets
```json
{
  "q": "logo",
  "category": "image",
  "tag": "brand",
  "page": 1,
  "limit": 20
}
```

### get_asset
```json
{ "id": "abc123" }
```

### read_asset
```json
{ "id": "abc123", "max_bytes": 200000 }
```

### upload_asset
```json
{
  "name": "demo",
  "original_name": "demo.png",
  "mime_type": "image/png",
  "content_base64": "iVBORw0KGgo...",
  "category": "image",
  "description": "可选",
  "tags": ["a", "b"]
}
```

### update_asset
```json
{
  "id": "abc123",
  "name": "新名",
  "description": "新描述",
  "category": "image",
  "tags": ["a"]
}
```

### delete_asset
```json
{ "id": "abc123" }
```

### share_asset
```json
{ "id": "abc123" }
```

返回：
```json
{ "token": "...", "url": "https://..." }
```

### manage_tags
```json
{ "action": "list" }
{ "action": "add",    "name": "aigc" }
{ "action": "remove", "name": "aigc" }
{ "action": "rename", "name": "old", "new_name": "new" }
```

---

## 典型 Agent 工作流

1. Agent 接到任务："把这张产品图加上 2024 角标"
2. `list_assets({ category: "image", q: "product" })` 找到原图
3. `read_asset({ id })` 取出 base64
4. （在 Agent 内部用图像模型处理）
5. `upload_asset({ ..., content_base64: "new..." , tags: ["v2"] })` 上传新版本
6. `share_asset({ id })` 拿分享链接返回给用户
