import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { apiKeyAuth } from '../auth/apiKey.js';
import { config } from '../config.js';
import { db } from '../db/connection.js';
import { detectCategory } from '../storage/category.js';
import {
  deleteAsset, getAssetById, insertAsset,
  listAllTags, newId, setShareToken, setTagsForAsset, toAsset,
  updateAsset, getAssetByShareToken
} from '../db/repo.js';
import {
  absPathOf, deleteFile as delStorage, ensureTempDir,
  sanitizeFilename, saveFromFile, safeUnlink
} from '../storage/local.js';
import type { AssetRow } from '../db/repo.js';

const upload = multer({
  storage: multer.diskStorage({
    destination: async (_req, _file, cb) => {
      try { cb(null, await ensureTempDir()); } catch (e) { cb(e as any, ''); }
    },
    filename: (_req, file, cb) => {
      cb(null, `${Date.now()}-${nanoid(8)}-${sanitizeFilename(file.originalname)}`);
    },
  }),
  limits: { fileSize: config.maxUploadMB * 1024 * 1024 },
});

export const assetsRouter = Router();

assetsRouter.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

assetsRouter.get('/assets', apiKeyAuth, (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim();
  const category = req.query.category as string | undefined;
  const tag = req.query.tag as string | undefined;
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 50)));

  const where: string[] = [];
  const params: any[] = [];
  if (q) { where.push('(a.name LIKE ? OR a.original_name LIKE ? OR a.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (category) { where.push('a.category = ?'); params.push(category); }
  if (tag) {
    where.push(`a.id IN (SELECT at.asset_id FROM asset_tags at JOIN tags t ON at.tag_id = t.id WHERE t.name = ?)`);
    params.push(tag);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const total = (db.prepare(`SELECT COUNT(*) as c FROM assets a ${whereSql}`).get(...params) as any).c as number;

  const rows = db.prepare(`
    SELECT a.* FROM assets a ${whereSql}
    ORDER BY a.uploaded_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, (page - 1) * limit) as AssetRow[];

  const items = rows.map(r => toAsset(r, getTags(r.id)));
  res.json({ total, page, limit, items });
});

function getTags(assetId: string): string[] {
  return (db.prepare(`
    SELECT t.name FROM tags t JOIN asset_tags at ON at.tag_id = t.id WHERE at.asset_id = ?
  `).all(assetId) as { name: string }[]).map(r => r.name);
}

assetsRouter.get('/assets/:id', apiKeyAuth, (req, res) => {
  const a = getAssetById(req.params.id);
  if (!a) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(a);
});

assetsRouter.get('/assets/:id/content', apiKeyAuth, (req, res) => {
  const a = getAssetById(req.params.id);
  if (!a) { res.status(404).json({ error: 'Not found' }); return; }
  const row = db.prepare('SELECT storage_path FROM assets WHERE id = ?').get(req.params.id) as { storage_path: string } | undefined;
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.setHeader('Content-Type', a.mime_type);
  res.setHeader('Content-Length', String(a.size_bytes));
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(a.original_name)}"`);
  createReadStream(absPathOf(row.storage_path)).pipe(res);
});

assetsRouter.post('/assets/upload', apiKeyAuth, upload.single('file'), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
  const file = req.file;
  const tmpPath = file.path;
  const originalName = file.originalname;
  try {
    const name = sanitizeFilename((req.body.name as string) || originalName);
    const description = (req.body.description as string) || null;
    const category = (req.body.category as string) || detectCategory(file.mimetype, originalName);
    const id = newId();
    const saved = await saveFromFile(tmpPath, originalName);
    insertAsset({
      id, name,
      original_name: sanitizeFilename(originalName),
      mime_type: file.mimetype,
      size_bytes: saved.size,
      storage_path: saved.storagePath,
      category,
      description,
      content_hash: saved.sha256,
      share_token: null,
    });
    const tags = (req.body.tags as string | undefined)?.split(',').map(t => t.trim()).filter(Boolean) ?? [];
    if (tags.length) setTagsForAsset(id, tags);
    res.status(201).json(getAssetById(id));
  } catch (err) {
    await safeUnlink(tmpPath);
    console.error('[upload]', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

assetsRouter.use((err: unknown, _req: Request, res: Response, next: (err?: unknown) => void) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ error: `File exceeds MAX_UPLOAD_MB=${config.maxUploadMB}` });
      return;
    }
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
});

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  category: z.enum(['image', 'video', 'audio', 'document', 'code', 'data', 'other']).optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

assetsRouter.patch('/assets/:id', apiKeyAuth, (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid', details: parsed.error.flatten() }); return; }
  const a = getAssetById(req.params.id);
  if (!a) { res.status(404).json({ error: 'Not found' }); return; }
  const { tags, ...rest } = parsed.data;
  updateAsset(req.params.id, rest as any);
  if (tags) setTagsForAsset(req.params.id, tags);
  res.json(getAssetById(req.params.id));
});

assetsRouter.delete('/assets/:id', apiKeyAuth, async (req, res) => {
  const row = deleteAsset(req.params.id);
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  await delStorage(row.storage_path);
  res.json({ ok: true });
});

assetsRouter.get('/tags', apiKeyAuth, (_req, res) => {
  res.json({ tags: listAllTags() });
});

assetsRouter.post('/assets/:id/share', apiKeyAuth, (req, res) => {
  const row = db.prepare('SELECT share_token FROM assets WHERE id = ?').get(req.params.id) as { share_token: string | null } | undefined;
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  const token = row.share_token ?? nanoid(24);
  if (!row.share_token) setShareToken(req.params.id, token);
  res.json({ share_token: token, url: `${config.publicBaseUrl}/#/s/${token}` });
});

assetsRouter.delete('/assets/:id/share', apiKeyAuth, (req, res) => {
  setShareToken(req.params.id, null);
  res.json({ ok: true });
});

// 公开分享：元数据
assetsRouter.get('/share/:token', (req, res) => {
  const a = getAssetByShareToken(req.params.token);
  if (!a) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(a);
});

// 公开分享：内容下载
assetsRouter.get('/share/:token/content', (req, res) => {
  const a = getAssetByShareToken(req.params.token);
  if (!a) { res.status(404).json({ error: 'Not found' }); return; }
  const row = db.prepare('SELECT storage_path FROM assets WHERE id = ?').get(a.id) as { storage_path: string } | undefined;
  if (!row) { res.status(404).json({ error: 'Not found' }); return; }
  res.setHeader('Content-Type', a.mime_type);
  res.setHeader('Content-Length', String(a.size_bytes));
  const disposition = a.mime_type.startsWith('image/') || a.mime_type.startsWith('video/') || a.mime_type.startsWith('audio/') || a.mime_type === 'application/pdf' || a.mime_type.startsWith('text/')
    ? 'inline'
    : 'attachment';
  res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(a.original_name)}"`);
  createReadStream(absPathOf(row.storage_path)).pipe(res);
});
