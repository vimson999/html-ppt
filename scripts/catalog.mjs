import { writeFile } from 'node:fs/promises';
import { root, collectCases } from './case-library.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export async function generateCatalog() {
  const records = await collectCases();
  await writeFile(path.join(root, 'catalog/experiments.json'), JSON.stringify(records, null, 2) + '\n');
  return records;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(`已生成 ${(await generateCatalog()).length} 个案例的目录。`);
