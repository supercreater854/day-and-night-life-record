import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const root = new URL('../dist/', import.meta.url);
async function filesAt(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? filesAt(join(dir, entry.name)) : join(dir, entry.name)))).flat();
}
const { fileURLToPath } = await import('node:url');
const directory = fileURLToPath(root);
const paths = (await filesAt(directory)).filter(path => !path.endsWith('sw.js')).sort();
const hash = createHash('sha256');
hash.update(await readFile(new URL(import.meta.url)));
for (const path of paths) hash.update(await readFile(path));
const version = hash.digest('hex').slice(0, 12);
const files = paths.filter(path => !path.endsWith('.wav') && !path.endsWith('MUSIC.md')).map(path => './' + relative(directory, path).replaceAll('\\', '/'));
await writeFile(new URL('sw.js', root), `
const CACHE = 'day-and-night-${version}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('day-and-night-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = event.request.mode === 'navigate' ? new URL('./index.html', self.registration.scope).href : event.request;
    // These are versioned, public static assets. Preview servers may vary their
    // CORS headers by Origin; that must not prevent matching an offline module.
    const cached = await cache.match(key, { ignoreVary: true });
    if (cached) return cached;
    if (new URL(event.request.url).pathname.endsWith('/quiet-orbit.wav')) {
      // Fetch one complete response so offline audio also works for range requests.
      const response = await fetch(event.request.url);
      if (response.ok) { try { await cache.put(event.request.url, response.clone()); } catch {} }
      return response;
    }
    return fetch(event.request);
  })());
});
`);
console.log('Offline app shell generated:', version);
