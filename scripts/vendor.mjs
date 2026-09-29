import { cp, mkdir, readFile } from 'node:fs/promises';
import { root } from './case-library.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export async function syncVendor() {
  const registry = JSON.parse(await readFile(path.join(root, 'shared/vendor/registry.json'), 'utf8'));
  for (const library of registry) {
    const installed = JSON.parse(await readFile(path.join(root, 'node_modules', library.name, 'package.json'), 'utf8'));
    if (installed.version !== library.version) throw new Error(`依赖版本不一致：${library.name}`);
    await mkdir(path.join(root, library.path), { recursive: true });
    for (const [source, target] of Object.entries(library.packageFiles)) {
      await cp(path.join(root, 'node_modules', library.name, source), path.join(root, library.path, target));
    }
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) { await syncVendor(); console.log('已同步固定版本浏览器类库。'); }
