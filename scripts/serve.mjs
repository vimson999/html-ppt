import http from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const argumentsList = process.argv.slice(2);
const portIndex = argumentsList.indexOf('--port');
const rootIndex = argumentsList.indexOf('--root');
const port = Number(portIndex >= 0 ? argumentsList[portIndex + 1] : process.env.PORT ?? 5173);
if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('端口无效');
const root = await realpath(rootIndex >= 0 ? argumentsList[rootIndex + 1] : fileURLToPath(new URL('../', import.meta.url)));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (pathname.split('/').some(part => part.startsWith('.')) || pathname.includes('\\')) throw new Error('forbidden');
    let filename = path.resolve(root, `.${pathname}`);
    if (!filename.startsWith(root + path.sep) && filename !== root) throw new Error('forbidden');
    if ((await stat(filename)).isDirectory()) filename = path.join(filename, 'index.html');
    filename = await realpath(filename);
    if (!filename.startsWith(root + path.sep)) throw new Error('forbidden');
    const body = await readFile(filename);
    res.writeHead(200, { 'Content-Type': types[path.extname(filename)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (error) {
    const forbidden = error.message === 'forbidden';
    res.writeHead(forbidden ? 403 : 404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(forbidden ? 'Forbidden' : 'Not found');
  }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '127.0.0.1', () => console.log(`实验台：http://localhost:${server.address().port}`));
