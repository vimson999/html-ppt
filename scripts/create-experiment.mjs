import { mkdir, readFile, writeFile, readdir, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { generateCatalog } from './catalog.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
const options = {};
const allowed = new Set(['subject', 'grade', 'topic', 'name']);
for (let i = 0; i < args.length; i += 2) {
  const key = args[i]?.replace(/^--/, '');
  if (!args[i]?.startsWith('--') || !allowed.has(key) || !args[i + 1] || options[key]) {
    throw new Error('参数格式：--subject geography --grade grade-7 --topic earth-rotation --name 地球自转初探');
  }
  options[key] = args[i + 1];
}
for (const key of ['subject', 'grade', 'topic']) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(options[key] ?? '')) throw new Error(`${key} 必须使用小写英文、数字和连字符。`);
}
if (!options.name?.trim()) throw new Error('请使用 --name 提供实验名称。');
const parent = path.join(root, 'experiments', options.subject, options.grade, options.topic);
await mkdir(parent, { recursive: true });
const existing = await readdir(parent);
const numbers = existing.filter(name => /^exp-\d+$/.test(name)).map(name => Number(name.slice(4)));
const id = `exp-${String(Math.max(0, ...numbers) + 1).padStart(3, '0')}`;
const destination = path.join(parent, id);
await mkdir(destination);
await cp(path.join(root, 'templates/basic'), destination, { recursive: true });
await mkdir(path.join(destination, 'assets'));
await mkdir(path.join(destination, 'data'));
for (const folder of ['assets', 'data']) await writeFile(path.join(destination, folder, '.gitkeep'), '');
const escapeHtml = value => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const htmlPath = path.join(destination, 'index.html');
await writeFile(htmlPath, (await readFile(htmlPath, 'utf8')).replaceAll('{{TITLE}}', escapeHtml(options.name.trim())).replaceAll('{{CASE_KEY}}', encodeURIComponent([options.subject, options.grade, options.topic, id].join('/'))));
const record = { id, title: options.name.trim(), subject: options.subject, grade: options.grade, topic: options.topic };
const metadata = { ...record, version: '0.1.0', summary: `${options.name.trim()}互动课件，等待完善教学方案。`, status: 'draft', objectives: [], durationMinutes: null, interactions: [], tags: [], cover: null, scenario: '待设计', requirements: '现代浏览器，通过本地 HTTP 服务访问。', steps: [], libraries: [], sharedAssets: ['shared/styles/base.css', 'shared/styles/tokens.css', 'shared/js/classroom.js'], createdAt: new Date().toISOString() };
await writeFile(path.join(destination, 'experiment.json'), JSON.stringify(metadata, null, 2) + '\n');
await generateCatalog();
console.log(`已创建：${path.relative(root, destination)}\n预览：http://localhost:5173/${path.relative(root, destination)}/index.html`);
