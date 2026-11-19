import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export function pwaBuild() {
  let outDir;
  return {
    name: 'local-pwa',
    apply: 'build',
    configResolved(config) { outDir = resolve(config.root, config.build.outDir); },
    closeBundle() {
      const files = ['index.html', 'manifest.webmanifest', 'icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];
      const hash = createHash('sha256');
      for (const file of files) hash.update(readFileSync(resolve(outDir, file)));
      const version = hash.digest('hex').slice(0, 16);
      writeFileSync(resolve(outDir, 'sw.js'), `
const PREFIX = 'estimate-pwa-' + self.registration.scope;
const CACHE = PREFIX + '${version}';
const FILES = ${JSON.stringify(files)};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new Request(new URL(file, self.registration.scope), {cache: 'reload'})))));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin || !url.href.startsWith(self.registration.scope)) return;
  const relative = url.pathname.slice(new URL(self.registration.scope).pathname.length);
  if (event.request.mode === 'navigate' && (relative === '' || relative === 'index.html')) {
    event.respondWith(fetch(event.request).then(response => {
      if (!response.ok) throw new Error('Unavailable');
      return response;
    }).catch(() => caches.open(CACHE).then(cache => cache.match(new URL('index.html', self.registration.scope)))));
  } else if (FILES.includes(relative)) {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request, {ignoreSearch: true})) || fetch(event.request)));
  }
});
`);
    }
  };
}
