import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

function num(key: string, def: number): number {
  const v = process.env[key];
  if (!v) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

export const config = {
  port: num('PORT', 3000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  apiKey: process.env.API_KEY ?? 'change-me-to-a-strong-random-key',
  dbPath: process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(ROOT, 'data', 'cloudasset.db'),
  storageRoot: process.env.STORAGE_ROOT
    ? path.resolve(process.env.STORAGE_ROOT)
    : path.join(ROOT, 'files'),
  publicBaseUrl: process.env.PUBLIC_BASE_URL ?? `http://localhost:${num('PORT', 3000)}`,
  logLevel: process.env.LOG_LEVEL ?? 'info',
  maxUploadMB: num('MAX_UPLOAD_MB', 512),
};

if (config.apiKey === 'change-me-to-a-strong-random-key' && config.nodeEnv === 'production') {
  console.error('[FATAL] API_KEY must be changed in production!');
  process.exit(1);
}
