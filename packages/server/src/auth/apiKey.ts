import type { NextFunction, Request, Response } from 'express';
import crypto from 'node:crypto';
import { config } from '../config.js';

const keyBuf = Buffer.from(config.apiKey, 'utf-8');

function extractKey(req: Request): string | null {
  const headerKey = req.header('X-API-Key');
  if (headerKey) return headerKey;
  const auth = req.header('Authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim();
  }
  return null;
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const provided = extractKey(req);
  if (!provided) {
    res.status(401).json({ error: 'Missing X-API-Key header or Bearer token' });
    return;
  }
  const providedBuf = Buffer.from(provided, 'utf-8');
  if (providedBuf.length !== keyBuf.length || !crypto.timingSafeEqual(providedBuf, keyBuf)) {
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }
  next();
}

export function optionalApiKey(req: Request, _res: Response, next: NextFunction): void {
  const provided = extractKey(req);
  if (provided) {
    const providedBuf = Buffer.from(provided, 'utf-8');
    if (providedBuf.length === keyBuf.length && crypto.timingSafeEqual(providedBuf, keyBuf)) {
      (req as any).authed = true;
    }
  }
  next();
}
