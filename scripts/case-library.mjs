import { readFile, readdir, stat, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const json = async filename => JSON.parse(await readFile(path.join(root, filename), 'utf8'));
export const escapeHtml = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
export function safeRelative(value) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.split('/').some(part => !part || part.startsWith('.')) || path.isAbsolute(value) || /[?#:<>"\u0000-\u001f]/.test(value)) throw new Error(`不安全的资源路径：${value}`);
  return value;
}
export async function filesIn(relative) {
  safeRelative(relative);
  const absolute = path.join(root, relative);
  if (!(await realpath(absolute)).startsWith(root)) throw new Error(`资源不能指向项目外：${relative}`);
  if (!(await stat(absolute)).isDirectory()) return [relative];
  const files = [];
  for (const entry of await readdir(absolute, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || ['node_modules', 'tests'].includes(entry.name)) continue;
    if (entry.isSymbolicLink()) throw new Error(`不打包符号链接：${relative}/${entry.name}`);
    files.push(...await filesIn(`${relative}/${entry.name}`));
  }
  return files.sort();
}
export async function collectCases() {
  const files = await filesIn('experiments');
  const records = [];
  for (const filename of files.filter(file => file.endsWith('/experiment.json'))) {
    const item = await json(filename);
    for (const field of ['subject', 'grade', 'topic']) if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item[field] ?? '')) throw new Error(`案例字段无效：${filename} / ${field}`);
    if (!/^exp-\d{3,}$/.test(item.id)) throw new Error(`案例编号无效：${filename}`);
    const key = [item.subject, item.grade, item.topic, item.id].join('/');
    if (filename !== `experiments/${key}/experiment.json`) throw new Error(`元信息与目录不一致：${filename}`);
    if (!item.title?.trim() || !item.summary?.trim()) throw new Error(`案例缺少标题或简介：${key}`);
    for (const field of ['interactions', 'objectives', 'tags', 'sharedAssets']) {
      if (!Array.isArray(item[field]) || item[field].some(value => typeof value !== 'string')) throw new Error(`案例列表字段无效：${key} / ${field}`);
    }
    if (!Array.isArray(item.libraries) || !Array.isArray(item.steps)) throw new Error(`案例类库或流程字段无效：${key}`);
    for (const step of item.steps) if (typeof step.title !== 'string' || typeof step.description !== 'string' || !Number.isFinite(step.minutes) || step.minutes <= 0) throw new Error(`教学环节无效：${key}`);
    if (!['draft', 'prototype', 'ready'].includes(item.status)) throw new Error(`案例状态无效：${key}`);
    if (item.durationMinutes !== null && (!Number.isFinite(item.durationMinutes) || item.durationMinutes <= 0)) throw new Error(`课时无效：${key}`);
    if (item.cover) await stat(path.join(root, `experiments/${key}`, safeRelative(item.cover)));
    await stat(path.join(root, `experiments/${key}/index.html`));
    records.push({ ...item, key, path: `experiments/${key}`, download: `downloads/${key.replaceAll('/', '--')}.zip` });
  }
  return records.sort((a, b) => a.key.localeCompare(b.key));
}
export async function caseFiles(item) {
  const registry = await json('shared/vendor/registry.json');
  const files = new Set(await filesIn(item.path));
  for (const resource of item.sharedAssets) {
    if (!safeRelative(resource).startsWith('shared/') || resource.startsWith('shared/vendor/')) throw new Error(`请通过 libraries 声明第三方库：${resource}`);
    for (const file of await filesIn(resource)) files.add(file);
  }
  for (const dependency of item.libraries) {
    const library = registry.find(entry => entry.name === dependency.name && entry.version === dependency.version);
    if (!library) throw new Error(`未登记类库：${dependency.name}@${dependency.version}`);
    for (const file of library.files) {
      const relative = safeRelative(`${library.path}/${file}`);
      await stat(path.join(root, relative)); files.add(relative);
    }
  }
  return [...files].sort();
}
