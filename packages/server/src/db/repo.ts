import { db } from './connection.js';
import { nanoid } from 'nanoid';

export interface AssetRow {
  id: string;
  name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string;
  category: string;
  description: string | null;
  content_hash: string | null;
  uploaded_at: number;
  updated_at: number;
  share_token: string | null;
}

export interface Asset extends Omit<AssetRow, 'storage_path'> {
  tags: string[];
}

export function toAsset(row: AssetRow, tags: string[]): Asset {
  const { storage_path, ...rest } = row;
  return { ...rest, tags };
}

export function getAssetById(id: string): Asset | null {
  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as AssetRow | undefined;
  if (!row) return null;
  return toAsset(row, getTagsForAsset(id));
}

export function getAssetByShareToken(token: string): Asset | null {
  const row = db.prepare('SELECT * FROM assets WHERE share_token = ?').get(token) as AssetRow | undefined;
  if (!row) return null;
  return toAsset(row, getTagsForAsset(row.id));
}

export function getTagsForAsset(assetId: string): string[] {
  const rows = db.prepare(`
    SELECT t.name FROM tags t
    JOIN asset_tags at ON at.tag_id = t.id
    WHERE at.asset_id = ?
    ORDER BY t.name
  `).all(assetId) as { name: string }[];
  return rows.map(r => r.name);
}

export function setTagsForAsset(assetId: string, tagNames: string[]): void {
  const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
  const getTag = db.prepare('SELECT id FROM tags WHERE name = ?');
  const linkTag = db.prepare('INSERT OR IGNORE INTO asset_tags (asset_id, tag_id) VALUES (?, ?)');
  const clearTags = db.prepare('DELETE FROM asset_tags WHERE asset_id = ?');

  const tx = db.transaction((tags: string[]) => {
    clearTags.run(assetId);
    for (const raw of tags) {
      const t = raw.trim();
      if (!t) continue;
      insertTag.run(t);
      const row = getTag.get(t) as { id: number } | undefined;
      if (row) linkTag.run(assetId, row.id);
    }
  });
  tx(tagNames);
}

export function insertAsset(data: Omit<AssetRow, 'uploaded_at' | 'updated_at'>): void {
  const now = Date.now();
  db.prepare(`
    INSERT INTO assets (id, name, original_name, mime_type, size_bytes, storage_path, category, description, content_hash, uploaded_at, updated_at, share_token)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.id, data.name, data.original_name, data.mime_type, data.size_bytes,
    data.storage_path, data.category, data.description, data.content_hash,
    now, now, data.share_token
  );
}

export function updateAsset(id: string, fields: Partial<Pick<AssetRow, 'name' | 'description' | 'category'>>): void {
  const sets: string[] = [];
  const vals: any[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) { sets.push(`${k} = ?`); vals.push(v); }
  }
  if (sets.length === 0) return;
  sets.push('updated_at = ?'); vals.push(Date.now()); vals.push(id);
  db.prepare(`UPDATE assets SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
}

export function deleteAsset(id: string): AssetRow | null {
  const row = db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as AssetRow | undefined;
  if (!row) return null;
  db.prepare('DELETE FROM assets WHERE id = ?').run(id);
  return row;
}

export function setShareToken(id: string, token: string | null): void {
  db.prepare('UPDATE assets SET share_token = ?, updated_at = ? WHERE id = ?')
    .run(token, Date.now(), id);
}

export function listAllTags(): string[] {
  const rows = db.prepare('SELECT name FROM tags ORDER BY name').all() as { name: string }[];
  return rows.map(r => r.name);
}

export function newId(): string { return nanoid(16); }
