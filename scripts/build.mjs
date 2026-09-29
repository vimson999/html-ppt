import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { zipSync, strToU8 } from 'fflate';
import { createHash } from 'node:crypto';
import { root, caseFiles, escapeHtml } from './case-library.mjs';
import { generateCatalog } from './catalog.mjs';
import { syncVendor } from './vendor.mjs';

await syncVendor();
const records = await generateCatalog();
await mkdir(path.join(root, 'downloads'), { recursive: true });
const downloads = {};
for (const item of records) {
  const entries = {};
  for (const file of await caseFiles(item)) entries[file] = new Uint8Array(await readFile(path.join(root, file)));
  entries['scripts/serve.mjs'] = new Uint8Array(await readFile(path.join(root, 'scripts/serve.mjs')));
  const launch = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(item.title)} · 独立课件</title><style>body{font:18px/1.8 system-ui;background:#101c25;color:#edf6f1;max-width:850px;margin:8vh auto;padding:24px}a{color:#aceed0}h1{font-size:36px}li{margin:12px 0}.button{display:inline-block;padding:12px 24px;background:#aceed0;color:#163529;border-radius:8px;text-decoration:none}small{color:#aabdc7}</style><p>INTERACTIVE CLASSROOM / 独立课件包</p><h1>${escapeHtml(item.title)}</h1><p>${escapeHtml(item.summary)}</p><a class="button" href="./${item.path}/index.html">进入互动课件 →</a><h2>学习目标</h2><ul>${item.objectives.map(goal => `<li>${escapeHtml(goal)}</li>`).join('')}</ul><h2>使用说明</h2><p>安装 Node.js 20+ 后，在解压目录运行 <code>node scripts/serve.mjs</code>，访问终端显示的地址。无需 npm install，无需联网。请保留完整目录，不要直接双击课件 HTML。</p><p>${escapeHtml(item.requirements || '建议使用现代桌面浏览器。')}</p><small>版本 ${escapeHtml(item.version || '1.0.0')} · 包内包含依赖和许可证 · 学习记录仅保留在当前页面</small></html>`;
  entries['index.html'] = strToU8(launch);
  entries['case.html'] = strToU8(launch);
  entries['README.txt'] = strToU8(`${item.title}\n\n独立课件包\n1. 安装 Node.js 20 或更新版本（仅首次需要）。\n2. 解压整个 ZIP。\n3. 在解压目录运行：node scripts/serve.mjs\n4. 浏览器打开终端显示的地址。无需安装 npm 依赖，运行时无需联网。\n\n端口占用时：node scripts/serve.mjs --port 5180\n\n保留目录结构，不支持直接双击 HTML。WebGL2 支持三维模式；不支持时可使用二维兼容模式。\n许可证位于 shared/vendor，数据来源在案例 data/SOURCES.md。\n`);
  entries['manifest.json'] = strToU8(JSON.stringify({ title: item.title, key: item.key, version: item.version || '1.0.0', libraries: item.libraries, files: Object.keys(entries).sort() }, null, 2));
  const bytes = zipSync(entries, { level: 6, mtime: new Date('2026-01-01T00:00:00Z') });
  await writeFile(path.join(root, item.download), bytes);
  downloads[item.key] = { path: item.download, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), version: item.version || '1.0.0' };
  console.log(`打包 ${item.title}：${(bytes.length / 1024 / 1024).toFixed(2)} MB`);
}
await writeFile(path.join(root, 'catalog/downloads.json'), JSON.stringify(downloads, null, 2) + '\n');
// dist is exclusively generated build output, never a source directory.
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const relative of ['index.html', 'case.html', 'catalog', 'platform', 'shared', 'experiments']) {
  await cp(path.join(root, relative), path.join(dist, relative), { recursive: true, filter: source => !source.split(path.sep).some(part => part.startsWith('.') || part === 'tests') });
}
for (const item of records) {
  await mkdir(path.join(dist, 'downloads'), { recursive: true });
  await cp(path.join(root, item.download), path.join(dist, item.download));
}
console.log(`构建完成：${records.length} 个案例；静态站点位于 dist/。`);
