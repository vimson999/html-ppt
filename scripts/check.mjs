import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectCases, caseFiles } from './case-library.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const records = JSON.parse(await readFile(path.join(root, 'catalog/experiments.json'), 'utf8'));
const current = await collectCases();
if (JSON.stringify(records) !== JSON.stringify(current)) throw new Error('目录未同步，请运行 npm run catalog 或 npm run build。');
for (const item of current) await caseFiles(item);
const seen = new Set();
for (const record of records) {
  for (const key of ['subject', 'grade', 'topic']) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record[key] ?? '')) throw new Error(`目录字段无效：${key}`);
  }
  if (!/^exp-\d{3,}$/.test(record.id)) throw new Error('实验编号无效');
  const relative = [record.subject, record.grade, record.topic, record.id].join('/');
  if (seen.has(relative)) throw new Error(`目录记录重复：${relative}`);
  seen.add(relative);
  const directory = path.join(root, 'experiments', relative);
  for (const file of ['index.html', 'main.js', 'style.css', 'README.md', 'assets', 'data']) await access(path.join(directory, file));
  const metadata = JSON.parse(await readFile(path.join(directory, 'experiment.json'), 'utf8'));
  for (const key of ['id', 'title', 'subject', 'grade', 'topic']) {
    if (metadata[key] !== record[key]) throw new Error(`目录与元信息不一致：${relative} / ${key}`);
  }
}
async function findMetadata(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await findMetadata(filename);
    else if (entry.name === 'experiment.json') {
      const relative = path.relative(path.join(root, 'experiments'), directory).split(path.sep).join('/');
      if (!seen.has(relative)) throw new Error(`实验未登记到目录：${relative}`);
    }
  }
}
await findMetadata(path.join(root, 'experiments'));
console.log(`检查通过：${records.length} 个实验，目录和元信息一致。`);
