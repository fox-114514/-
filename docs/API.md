# CloudAsset API 文档

基础 URL: `https://asset.example.com`

所有需鉴权接口需在 Header 中携带：`X-API-Key: <your-key>`

---

## 通用约定

- 所有时间戳为 Unix 毫秒
- 分页参数：`page`（从 1 开始）、`limit`（最大 100）
- 错误响应格式：`{ "error": "...", "details"?: {...} }`

---

## 健康检查

### `GET /api/health`

无需鉴权。

**响应** `200 OK`
```json
{ "ok": true, "ts": 1717800000000 }
```

---

## 资产

### `GET /api/assets`

列出资产，支持按关键字、分类、标签过滤。

**Query 参数**

| 名称 | 类型 | 说明 |
|---|---|---|
| `q` | string | 按 name / original_name / description 模糊匹配 |
| `category` | string | image / video / audio / document / code / data / other |
| `tag` | string | 标签名 |
| `page` | int | 默认 1 |
| `limit` | int | 默认 50，最大 100 |

**响应** `200 OK`
```json
{
  "total": 42,
  "page": 1,
  "limit": 50,
  "items": [
    {
      "id": "abc123",
      "name": "logo-final",
      "original_name": "logo.png",
      "mime_type": "image/png",
      "size_bytes": 12345,
      "category": "image",
      "description": "新版 logo",
      "content_hash": "sha256...",
      "uploaded_at": 1717800000000,
      "updated_at": 1717800000000,
      "share_token": null,
      "tags": ["brand", "v2"]
    }
  ]
}
```

### `GET /api/assets/:id`

获取单个资产详情。

### `GET /api/assets/:id/content`

下载或在线预览文件。响应体为二进制流。

### `POST /api/assets/upload` (multipart)

上传新资产。

**Form 字段**

| 字段 | 必填 | 说明 |
|---|---|---|
| `file` | ✓ | 文件二进制 |
| `name` | × | 显示名（留空用原始文件名） |
| `description` | × | 描述 |
| `category` | × | 分类（留空自动识别） |
| `tags` | × | 逗号分隔 |

**响应** `201 Created`：返回完整资产对象。

### `PATCH /api/assets/:id`

修改元数据。

**Body**
```json
{
  "name": "新名",
  "description": "新描述",
  "category": "image",
  "tags": ["a", "b"]
}
```

### `DELETE /api/assets/:id`

删除资产（含文件）。

**响应** `200 OK` `{ "ok": true }`

---

## 标签

### `GET /api/tags`

列出所有标签。

**响应**
```json
{ "tags": ["aigc", "banner", "v1"] }
```

---

## 分享

### `POST /api/assets/:id/share`

生成或返回已有的分享 token。

**响应**
```json
{
  "share_token": "abc123def456",
  "url": "https://asset.example.com/#/s/abc123def456"
}
```

### `DELETE /api/assets/:id/share`

取消分享。

### `GET /api/share/:token` （公开）

无需鉴权访问分享的资产元数据。

### `GET /api/share/:token/content` （公开）

无需鉴权下载或在线预览分享资产的文件内容。

分享页 URL 格式为：

```text
https://asset.example.com/#/s/<token>
```

---

## 错误码

| 状态码 | 含义 |
|---|---|
| 400 | 参数错误 |
| 401 | 缺少 X-API-Key |
| 403 | API Key 无效 |
| 404 | 资源不存在 |
| 413 | 上传文件超过 `MAX_UPLOAD_MB` |
| 500 | 服务器内部错误 |
