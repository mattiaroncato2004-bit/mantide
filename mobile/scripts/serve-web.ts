// Serves dist-web/ under /mantide/ on port 4173, the way GitHub Pages serves the project site.
// Run: npx tsx scripts/serve-web.ts
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const ROOT = join(__dirname, '..', 'dist-web');
const PREFIX = '/mantide/';
const TYPES: Record<string, string> = {
  '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.ttf': 'font/ttf', '.svg': 'image/svg+xml',
};

createServer((req, res) => {
  const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
  if (!path.startsWith(PREFIX)) return res.writeHead(404).end();
  let file = normalize(join(ROOT, path.slice(PREFIX.length)));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
}).listen(4173, '127.0.0.1', () => console.log('serving dist-web at http://127.0.0.1:4173/mantide/'));
