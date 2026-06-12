import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const electronRoot = path.resolve(here, '..');
const repoRoot = path.resolve(electronRoot, '..', '..');
const src = path.join(repoRoot, 'packages', 'web', 'dist');
const dest = path.join(electronRoot, 'dist', 'web');

await fs.rm(dest, { recursive: true, force: true });
await fs.mkdir(path.dirname(dest), { recursive: true });
await fs.cp(src, dest, { recursive: true });

console.log(`[cloudasset-electron] copied ${src} -> ${dest}`);
