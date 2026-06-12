import fs from 'node:fs/promises';
import { createWriteStream, createReadStream } from 'node:fs';
import { mkdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';
import { nanoid } from 'nanoid';
import { config } from '../config.js';

export interface SavedFile {
  storagePath: string;
  absPath: string;
  size: number;
  sha256: string;
}

export async function ensureStorageRoot(): Promise<void> {
  await fs.mkdir(config.storageRoot, { recursive: true });
}

export async function ensureTempDir(): Promise<string> {
  const tmp = path.join(config.storageRoot, '.tmp');
  await fs.mkdir(tmp, { recursive: true });
  return tmp;
}

export async function saveBuffer(buf: Buffer, originalName: string): Promise<SavedFile> {
  await ensureStorageRoot();
  const id = nanoid(16);
  const ext = path.extname(originalName).toLowerCase().slice(0, 16);
  const storagePath = `${id}${ext}`;
  const absPath = path.join(config.storageRoot, storagePath);
  const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
  await fs.writeFile(absPath, buf);
  return { storagePath, absPath, size: buf.length, sha256 };
}

export async function saveStream(
  stream: NodeJS.ReadableStream,
  originalName: string
): Promise<SavedFile> {
  await ensureStorageRoot();
  const id = nanoid(16);
  const ext = path.extname(originalName).toLowerCase().slice(0, 16);
  const storagePath = `${id}${ext}`;
  const absPath = path.join(config.storageRoot, storagePath);
  const hash = crypto.createHash('sha256');
  let size = 0;
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      hash.update(chunk);
      size += chunk.length;
      cb(null, chunk);
    },
  });
  await pipeline(stream, counter, createWriteStream(absPath));
  return { storagePath, absPath, size, sha256: hash.digest('hex') };
}

export async function saveFromFile(
  tmpPath: string,
  originalName: string
): Promise<SavedFile> {
  await ensureStorageRoot();
  const id = nanoid(16);
  const ext = path.extname(originalName).toLowerCase().slice(0, 16);
  const storagePath = `${id}${ext}`;
  const absPath = path.join(config.storageRoot, storagePath);
  const hash = crypto.createHash('sha256');
  let size = 0;
  const stream = createReadStream(tmpPath);
  const counter = new Transform({
    transform(chunk, _enc, cb) {
      hash.update(chunk);
      size += chunk.length;
      cb(null, chunk);
    },
  });
  await pipeline(stream, counter);
  await rename(tmpPath, absPath);
  return { storagePath, absPath, size, sha256: hash.digest('hex') };
}

export async function safeUnlink(p: string): Promise<void> {
  try { await unlink(p); } catch (e: any) { if (e.code !== 'ENOENT') throw e; }
}

export function absPathOf(storagePath: string): string {
  const safe = path.normalize(storagePath).replace(/^(\.\.[/\\])+/, '');
  return path.join(config.storageRoot, safe);
}

export async function deleteFile(storagePath: string): Promise<void> {
  const p = absPathOf(storagePath);
  try {
    await fs.unlink(p);
  } catch (e: any) {
    if (e.code !== 'ENOENT') throw e;
  }
}

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 200) || 'untitled';
}
