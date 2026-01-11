// dist Service Worker generator
// - Vite 构建产物（dist/）的资源名通常带 hash，无法复用源站 sw.js 的 `?v=` precache。
// - 本脚本通过扫描 dist 输出文件生成 dist/sw.js，补齐离线能力与缓存策略一致性。
import fs from 'node:fs';
import path from 'node:path';

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function listFiles(dir) {
  if (!isDirectory(dir)) return [];
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(full));
      continue;
    }
    if (entry.isFile()) out.push(full);
  }
  return out;
}

function toWebPath(absRoot, absFile) {
  const rel = path.relative(absRoot, absFile);
  // dist 目录内部资源按相对路径缓存（与 fetch 匹配时更稳定）
  return rel.split(path.sep).join('/');
}

function shouldPrecache(webPath) {
  const p = String(webPath || '');
  if (!p) return false;
  // 过滤预压缩副产物（避免重复缓存/缓存膨胀）
  if (p.endsWith('.br') || p.endsWith('.gz')) return false;
  // 常见无关文件（避免误缓存）
  if (p.endsWith('.DS_Store')) return false;
  return true;
}

function inferVersionFromSourceSw(workspaceRoot) {
  try {
    const swSource = path.join(workspaceRoot, 'sw.js');
    if (!isFile(swSource)) return '';
    const text = fs.readFileSync(swSource, 'utf8');
    const m = text.match(/const\s+CACHE_NAME\s*=\s*['"]shouwban-([^'"]+)['"]/);
    return m && m[1] ? String(m[1]).trim() : '';
  } catch {
    return '';
  }
}

function renderServiceWorker({ cacheName, precacheUrls }) {
  const urls = Array.isArray(precacheUrls) ? precacheUrls : [];
  const normalized = urls
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .filter(shouldPrecache);

  // stable ordering = stable output (更利于 diff 与调试)
  normalized.sort();

  return `/* Service Worker (dist build)
   - Generated: ${new Date().toISOString()}
   - Cache: ${cacheName}
   - Strategy:
     - HTML navigation: network-first, fallback to offline.html
     - Static assets: stale-while-revalidate
*/
const CACHE_NAME = ${JSON.stringify(cacheName)};
const PRECACHE_URLS = ${JSON.stringify(normalized, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  const data = event?.data;
  if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isSameOrigin(request) {
  try {
    const url = new URL(request.url);
    return url.origin === self.location.origin;
  } catch {
    return false;
  }
}

function isNavigationRequest(request) {
  if (request.mode === 'navigate') return true;
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

function fetchWithTimeout(request, timeoutMs) {
  const ms = Number(timeoutMs) || 0;
  if (ms <= 0) return fetch(request);

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('SW fetch timeout')), ms);
    fetch(request)
      .then((response) => {
        clearTimeout(timer);
        resolve(response);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (!isSameOrigin(request)) return;

  if (isNavigationRequest(request)) {
    event.respondWith(
      fetchWithTimeout(request, 4500)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            try {
              const url = new URL(request.url);
              if (url.pathname.endsWith('/')) return caches.match('index.html');
            } catch {
              // ignore
            }
            return caches.match('offline.html');
          }),
        ),
    );
    return;
  }

  // 静态资源：stale-while-revalidate（先用缓存保证速度，再后台更新）
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => null);

      if (cached) {
        event.waitUntil(fetchPromise.catch(() => {}));
        return cached;
      }

      return fetchPromise.then((r) => r || new Response('', { status: 504, statusText: 'Offline' }));
    }),
  );
});
`;
}

export function generateDistServiceWorker({
  outDir = 'dist',
  workspaceRoot = process.cwd(),
  cacheNamePrefix = 'shouwban-dist',
} = {}) {
  const root = path.resolve(workspaceRoot);
  const distRoot = path.resolve(root, outDir);
  if (!isDirectory(distRoot)) {
    throw new Error(`dist 目录不存在：${distRoot}`);
  }

  const version = inferVersionFromSourceSw(root);
  const cacheName = version ? `${cacheNamePrefix}-${version}` : `${cacheNamePrefix}-${Date.now()}`;

  const absFiles = listFiles(distRoot).filter((abs) => isFile(abs));
  const precacheUrls = absFiles.map((abs) => toWebPath(distRoot, abs));

  // 必须确保离线兜底页存在（否则 navigation fallback 失效）
  if (!precacheUrls.includes('offline.html')) {
    throw new Error('dist 缺少 offline.html，无法生成可用的 Service Worker');
  }

  const swText = renderServiceWorker({ cacheName, precacheUrls });
  const swPath = path.join(distRoot, 'sw.js');
  ensureDir(path.dirname(swPath));
  fs.writeFileSync(swPath, swText, 'utf8');

  return { swPath, cacheName, precacheCount: precacheUrls.length };
}
