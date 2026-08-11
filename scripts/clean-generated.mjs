import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GENERATED = path.join(ROOT, 'generated');

const KEEP = new Set(['.gitkeep', 'README.md']);

async function main() {
  const entries = await fs.readdir(GENERATED, { withFileTypes: true });
  for (const entry of entries) {
    if (KEEP.has(entry.name)) continue;
    await fs.rm(path.join(GENERATED, entry.name), { recursive: true, force: true });
  }
  console.log('generated/ cleared (kept .gitkeep + README.md)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
