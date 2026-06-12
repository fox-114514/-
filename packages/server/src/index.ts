import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ensureStorageRoot } from './storage/local.js';
import { assetsRouter } from './routes/assets.js';
import { mountMcpHttp } from './mcp/http.js';

async function main() {
  await ensureStorageRoot();
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '2mb' }));

  app.get('/', (_req, res) => res.json({ name: 'CloudAsset', version: '0.1.0' }));
  app.use('/api', assetsRouter);

  mountMcpHttp(app);

  app.listen(config.port, () => {
    console.log(`[CloudAsset] listening on http://localhost:${config.port}`);
    console.log(`[CloudAsset] MCP HTTP endpoint: ${config.publicBaseUrl}/mcp`);
  });
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
