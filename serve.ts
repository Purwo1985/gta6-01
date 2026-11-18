// A tiny static server for game/ (Node 22, standard library only), so an
// entry can be played locally without a build step: `node serve.ts` puts
// game/ on http://localhost:8080. It answers with the MIME types a
// browser game needs, refuses every path that escapes game/, and does
// nothing clever: a development convenience, not a server for the web.
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
  ['.glb', 'model/gltf-binary'],
  ['.gltf', 'model/gltf+json'],
  ['.bin', 'application/octet-stream'],
  ['.wasm', 'application/wasm'],
  ['.wav', 'audio/wav'],
  ['.mp3', 'audio/mpeg'],
  ['.ogg', 'audio/ogg'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function flagValue(argv, flag, fallback) {
  const at = argv.indexOf(flag);
  if (at === -1) return fallback;
  const raw = argv[at + 1];
  if (raw === undefined || raw === '') return fallback;
  return raw;
}

function pickPort(argv) {
  const wanted = Number(flagValue(argv, '--port', '8080'));
  if (Number.isInteger(wanted) && wanted > 0 && wanted < 65536) return wanted;
  return 8080;
}

const argv = process.argv.slice(2);
const port = pickPort(argv);
const host = flagValue(argv, '--host', '127.0.0.1');

function insideRoot(file) {
  return file === root || file.startsWith(root + sep);
}

function mimeFor(file) {
  return MIME.get(extname(file).toLowerCase()) ?? 'application/octet-stream';
}

createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('bad request');
    return;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = resolve(join(root, normalize(pathname)));
  if (!insideRoot(file)) {
    response.writeHead(403).end('forbidden');
    return;
  }
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    // A missing file is usually a broken reference in the game; log it
    // instead of failing silently, so it gets fixed instead of shipped.
    console.error(`404 ${pathname}`);
    response.writeHead(404).end('not found');
    return;
  }
  response.writeHead(200, {
    'content-type': mimeFor(file),
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(response);
}).listen(port, host, () => {
  console.log(`game/ is on http://${host}:${port}`);
});
