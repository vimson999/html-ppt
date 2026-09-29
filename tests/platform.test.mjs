import test from 'node:test';
import assert from 'node:assert/strict';
import { filterCases, gradeLabel, subjectLabel } from '../platform/data.js';
import { collectCases, json, caseFiles, safeRelative } from '../scripts/case-library.mjs';
import { unzipSync, strFromU8 } from 'fflate';
import { readFile, mkdtemp, mkdir, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

test('search combines Chinese subject, grade, keywords and all filters', () => {
  const earth = { title: '地球自转与昼夜交替', summary: '观察昼夜', subject: 'geography', grade: 'grade-7', topic: 'earth-rotation', tags: ['太阳时'], interactions: ['三维探索'] };
  const maths = { title: '三角形', summary: '观察角度', subject: 'math', grade: 'grade-8', topic: 'triangle', tags: [], interactions: ['参数调节'] };
  assert.deepEqual(filterCases([earth, maths], { query: '地理 七年级 太阳时', subject: 'geography', grade: 'grade-7', interaction: '三维探索' }), [earth]);
  assert.deepEqual(filterCases([earth, maths], { query: '地球', grade: 'grade-8' }), []);
  assert.equal(filterCases([earth, maths], { query: '  ' }).length, 2);
  assert.equal(gradeLabel('grade-10'), '高一'); assert.equal(subjectLabel('physics'), '物理');
});
test('generated catalogue exactly matches the metadata source', async () => {
  assert.deepEqual(await json('catalog/experiments.json'), await collectCases());
});
test('download archives are complete, isolated, and match displayed checksums', async () => {
  const downloads = await json('catalog/downloads.json');
  for (const item of await collectCases()) {
    const bytes = await readFile(new URL(`../${item.download}`, import.meta.url));
    assert.equal(bytes.length, downloads[item.key].bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), downloads[item.key].sha256);
    const archive = unzipSync(bytes);
    for (const file of [...await caseFiles(item), 'index.html', 'case.html', 'README.txt', 'manifest.json', 'scripts/serve.mjs']) assert.ok(archive[file], `missing ${file}`);
    for (const file of await caseFiles(item)) assert.deepEqual(Buffer.from(archive[file]), await readFile(new URL(`../${file}`, import.meta.url)), `归档内容过期：${file}`);
    assert.ok(!archive['scripts/build.mjs']);
    assert.ok(!Object.keys(archive).some(file => file.includes('node_modules') || file.includes('/tests/')));
    assert.ok(Object.keys(archive).filter(file => file.startsWith('experiments/')).every(file => file.startsWith(`${item.path}/`)));
    for (const [file, content] of Object.entries(archive)) {
      if (!/\.(html|css|js)$/.test(file) || file.endsWith('LICENSE.html')) continue;
      const text = strFromU8(content);
      const pattern = file.endsWith('.html') ? /(?:src|href)=["']([^"']+)["']/g : file.endsWith('.css') ? /(?:@import\s+|url\()\s*["']?([^'"\s);]+)/g : /(?:from\s*|import\s*\(\s*|new URL\s*\(\s*)["']([^"']+)["']/g;
      for (const match of text.matchAll(pattern)) {
        const reference = match[1].split(/[?#]/)[0];
        if (!reference || /^(https?:|data:|#)/.test(reference) || !reference.startsWith('.')) continue;
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(file), reference));
        assert.ok(archive[target], `${file} -> missing ${target}`);
      }
    }
  }
});
test('resource paths cannot escape or include hidden files', () => {
  for (const value of ['../secret', '/etc/passwd', 'shared/../secret', 'shared/.env', 'shared\\secret', 'shared/file?token=x']) assert.throws(() => safeRelative(value));
});
test('new experiments produce catalogue-ready metadata and increment independently', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'courseware-scaffold-'));
  for (const folder of ['scripts', 'templates']) await cp(new URL(`../${folder}`, import.meta.url), path.join(directory, folder), { recursive: true });
  await mkdir(path.join(directory, 'catalog')); await mkdir(path.join(directory, 'experiments'));
  for (let i = 1; i <= 2; i++) {
    execFileSync(process.execPath, ['scripts/create-experiment.mjs', '--subject', 'math', '--grade', 'grade-8', '--topic', 'triangle', '--name', '三角形 <测试>'], { cwd: directory });
    const metadata = JSON.parse(await readFile(path.join(directory, `experiments/math/grade-8/triangle/exp-00${i}/experiment.json`), 'utf8'));
    assert.equal(metadata.status, 'draft'); assert.deepEqual(metadata.interactions, []);
  }
  const catalog = JSON.parse(await readFile(path.join(directory, 'catalog/experiments.json'), 'utf8'));
  assert.equal(catalog.length, 2); assert.notEqual(catalog[0].key, catalog[1].key);
});
