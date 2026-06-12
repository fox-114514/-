import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { config } from '../config.js';
import { db } from '../db/connection.js';
import { detectCategory } from '../storage/category.js';
import {
  deleteAsset, getAssetById, getAssetByShareToken, insertAsset,
  listAllTags, newId, setShareToken, setTagsForAsset, toAsset, updateAsset
} from '../db/repo.js';
import {
  absPathOf, deleteFile, sanitizeFilename, saveBuffer
} from '../storage/local.js';
import { createReadStream, readFileSync, statSync } from 'node:fs';
import type { AssetRow } from '../db/repo.js';
import { Readable } from 'node:stream';

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'cloudasset',
    version: '0.1.0',
  });

  // ---- list_assets ----
  server.tool(
    'list_assets',
    {
      q: z.string().optional().describe('Search by name/description'),
      category: z.enum(['image', 'video', 'audio', 'document', 'code', 'data', 'other']).optional(),
      tag: z.string().optional(),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(100).default(20),
    },
    async (args) => {
      const { q, category, tag, page, limit } = args;
      const where: string[] = [];
      const params: any[] = [];
      if (q) { where.push('(a.name LIKE ? OR a.original_name LIKE ? OR a.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
      if (category) { where.push('a.category = ?'); params.push(category); }
      if (tag) { where.push(`a.id IN (SELECT at.asset_id FROM asset_tags at JOIN tags t ON at.tag_id = t.id WHERE t.name = ?)`); params.push(tag); }
      const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
      const total = (db.prepare(`SELECT COUNT(*) as c FROM assets a ${whereSql}`).get(...params) as any).c as number;
      const rows = db.prepare(`
        SELECT a.* FROM assets a ${whereSql}
        ORDER BY a.uploaded_at DESC LIMIT ? OFFSET ?
      `).all(...params, limit, (page - 1) * limit) as AssetRow[];
      const items = rows.map(r => toAsset(r, getTags(r.id)));
      return { content: [{ type: 'text', text: JSON.stringify({ total, page, limit, items }, null, 2) }] };
    }
  );

  // ---- get_asset ----
  server.tool(
    'get_asset',
    { id: z.string() },
    async ({ id }) => {
      const a = getAssetById(id);
      if (!a) return { content: [{ type: 'text', text: 'Not found' }], isError: true };
      return { content: [{ type: 'text', text: JSON.stringify(a, null, 2) }] };
    }
  );

  // ---- read_asset (preview text/binary meta) ----
  server.tool(
    'read_asset',
    { id: z.string(), max_bytes: z.number().int().min(1).max(5_000_000).default(200_000) },
    async ({ id, max_bytes }) => {
      const a = getAssetById(id);
      if (!a) return { content: [{ type: 'text', text: 'Not found' }], isError: true };
      const row = db.prepare('SELECT storage_path, size_bytes FROM assets WHERE id = ?').get(id) as { storage_path: string; size_bytes: number } | undefined;
      if (!row) return { content: [{ type: 'text', text: 'Not found' }], isError: true };
      const abs = absPathOf(row.storage_path);
      const isText = a.mime_type.startsWith('text/') || a.mime_type === 'application/json' || ['md', 'txt', 'csv', 'json', 'xml', 'yaml', 'yml', 'js', 'ts', 'py', 'html', 'css', 'sql'].some(e => a.name.toLowerCase().endsWith('.' + e));
      if (!isText) {
        const stat = statSync(abs);
        return { content: [{ type: 'text', text: `Binary file · mime=${a.mime_type} · size=${stat.size} bytes · path=${row.storage_path}` }] };
      }
      const fd = readFileSync(abs);
      const truncated = fd.length > max_bytes;
      const slice = truncated ? fd.subarray(0, max_bytes) : fd;
      return { content: [{ type: 'text', text: slice.toString('utf-8') + (truncated ? `\n\n[... truncated, ${fd.length - max_bytes} more bytes]` : '') }] };
    }
  );

  // ---- upload_asset (base64) ----
  server.tool(
    'upload_asset',
    {
      name: z.string().describe('Display name'),
      original_name: z.string().describe('Original filename with extension'),
      mime_type: z.string().describe('MIME type, e.g. image/png'),
      content_base64: z.string().describe('File content encoded in base64'),
      category: z.enum(['image', 'video', 'audio', 'document', 'code', 'data', 'other']).optional(),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    },
    async (args) => {
      const buf = Buffer.from(args.content_base64, 'base64');
      const id = newId();
      const saved = await saveBuffer(buf, args.original_name);
      const category = args.category ?? detectCategory(args.mime_type, args.original_name);
      insertAsset({
        id,
        name: sanitizeFilename(args.name),
        original_name: sanitizeFilename(args.original_name),
        mime_type: args.mime_type,
        size_bytes: saved.size,
        storage_path: saved.storagePath,
        category,
        description: args.description ?? null,
        content_hash: saved.sha256,
        share_token: null,
      });
      if (args.tags && args.tags.length) setTagsForAsset(id, args.tags);
      return { content: [{ type: 'text', text: JSON.stringify(getAssetById(id), null, 2) }] };
    }
  );

  // ---- update_asset ----
  server.tool(
    'update_asset',
    {
      id: z.string(),
      name: z.string().min(1).max(200).optional(),
      description: z.string().max(2000).nullable().optional(),
      category: z.enum(['image', 'video', 'audio', 'document', 'code', 'data', 'other']).optional(),
      tags: z.array(z.string()).optional(),
    },
    async ({ id, tags, ...rest }) => {
      const a = getAssetById(id);
      if (!a) return { content: [{ type: 'text', text: 'Not found' }], isError: true };
      updateAsset(id, rest as any);
      if (tags) setTagsForAsset(id, tags);
      return { content: [{ type: 'text', text: JSON.stringify(getAssetById(id), null, 2) }] };
    }
  );

  // ---- delete_asset ----
  server.tool(
    'delete_asset',
    { id: z.string() },
    async ({ id }) => {
      const row = deleteAsset(id);
      if (!row) return { content: [{ type: 'text', text: 'Not found' }], isError: true };
      await deleteFile(row.storage_path);
      return { content: [{ type: 'text', text: JSON.stringify({ ok: true, id }) }] };
    }
  );

  // ---- share_asset ----
  server.tool(
    'share_asset',
    { id: z.string() },
    async ({ id }) => {
      const row = db.prepare('SELECT share_token FROM assets WHERE id = ?').get(id) as { share_token: string | null } | undefined;
      if (!row) return { content: [{ type: 'text', text: 'Not found' }], isError: true };
      const token = row.share_token ?? Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      if (!row.share_token) setShareToken(id, token);
      const url = `${config.publicBaseUrl}/s/${token}`;
      return { content: [{ type: 'text', text: JSON.stringify({ token, url }, null, 2) }] };
    }
  );

  // ---- manage_tags ----
  server.tool(
    'manage_tags',
    {
      action: z.enum(['list', 'add', 'remove', 'rename']),
      name: z.string().optional(),
      new_name: z.string().optional(),
    },
    async ({ action, name, new_name }) => {
      if (action === 'list') {
        return { content: [{ type: 'text', text: JSON.stringify({ tags: listAllTags() }, null, 2) }] };
      }
      if (!name) return { content: [{ type: 'text', text: 'name required' }], isError: true };
      if (action === 'add') {
        db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)').run(name);
      } else if (action === 'remove') {
        db.prepare('DELETE FROM tags WHERE name = ?').run(name);
      } else if (action === 'rename') {
        if (!new_name) return { content: [{ type: 'text', text: 'new_name required' }], isError: true };
        db.prepare('UPDATE tags SET name = ? WHERE name = ?').run(new_name, name);
      }
      return { content: [{ type: 'text', text: JSON.stringify({ tags: listAllTags() }, null, 2) }] };
    }
  );

  return server;
}

function getTags(assetId: string): string[] {
  return (db.prepare(`
    SELECT t.name FROM tags t JOIN asset_tags at ON at.tag_id = t.id WHERE at.asset_id = ?
  `).all(assetId) as { name: string }[]).map(r => r.name);
}
