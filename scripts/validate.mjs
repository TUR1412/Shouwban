import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listFiles(dir, { ignoreDirs = [] } = {}) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirs.includes(entry.name)) continue;
      out.push(...listFiles(full, { ignoreDirs }));
      continue;
    }
    if (entry.isFile()) out.push(full);
  }
  return out;
}

function stripQueryAndHash(p) {
  return p.split('#')[0].split('?')[0];
}

function isExternalUrl(u) {
  const s = (u || '').trim();
  return (
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('//') ||
    s.startsWith('mailto:') ||
    s.startsWith('tel:') ||
    s.startsWith('javascript:')
  );
}

function resolveReference(fromFile, rawRef) {
  const ref = (rawRef || '').trim();
  if (!ref || ref === '#') return null;
  if (isExternalUrl(ref)) return null;

  // Pure hash on same page
  if (ref.startsWith('#')) return null;

  const cleaned = stripQueryAndHash(ref);
  if (!cleaned) return null;

  if (cleaned.startsWith('/')) {
    return path.join(workspaceRoot, cleaned.replace(/^\//, ''));
  }
  return path.resolve(path.dirname(fromFile), cleaned);
}

function extractHtmlRefs(content) {
  const refs = [];
  const attrRegex = /\b(?:src|href|data-src)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = attrRegex.exec(content))) {
    refs.push(m[1]);
  }
  return refs;
}

function extractCssRefs(content) {
  const refs = [];
  const urlRegex = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
  let m;
  while ((m = urlRegex.exec(content))) {
    refs.push(m[2]);
  }
  return refs;
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function assertAllHtmlHaveCacheBusting(htmlFiles) {
  const errors = [];
  for (const f of htmlFiles) {
    const c = readText(f);
    const rel = path.relative(workspaceRoot, f);
    if (!c.includes('document.documentElement.classList.add(\'js\')')) {
      errors.push(`[HTML] 缺少 JS 标识脚本: ${rel}`);
    }
    if (!c.includes('document.documentElement.dataset.theme')) {
      errors.push(`[HTML] 缺少主题注入脚本（避免闪烁）: ${rel}`);
    }
    if (!/styles\/main\.css\?v=/.test(c)) {
      errors.push(`[HTML] 缺少 CSS 版本号: ${rel}`);
    }
    if (!/styles\/extensions\.css\?v=/.test(c)) {
      errors.push(`[HTML] 缺少 Extensions CSS 版本号: ${rel}`);
    }
    if (!/scripts\/motion\.js\?v=/.test(c)) {
      errors.push(`[HTML] 缺少 Motion 动效库版本号: ${rel}`);
    }
    if (!/type\s*=\s*["']module["'][^>]*scripts\/motion\.js\?v=/i.test(c)) {
      errors.push(`[HTML] Motion 脚本需使用 type=\"module\"（确保可被 Vite 构建链路处理）: ${rel}`);
    }
    if (!/scripts\/core\.js\?v=/.test(c)) {
      errors.push(`[HTML] 缺少 Core JS 版本号: ${rel}`);
    }
    if (!/type\s*=\s*["']module["'][^>]*scripts\/core\.js\?v=/i.test(c)) {
      errors.push(`[HTML] Core 脚本需使用 type=\"module\"（确保可被 Vite 构建链路处理）: ${rel}`);
    }
    if (!/scripts\/main\.js\?v=/.test(c)) {
      errors.push(`[HTML] 缺少 JS 版本号: ${rel}`);
    }
    if (!/type\s*=\s*["']module["'][^>]*scripts\/main\.js\?v=/i.test(c)) {
      errors.push(`[HTML] Main 脚本需使用 type=\"module\"（确保可被 Vite 构建链路处理）: ${rel}`);
    }
    const hasColorScheme = /\bname\s*=\s*["']color-scheme["'][^>]*\bcontent\s*=\s*["'][^"']*light[^"']*dark[^"']*["']/i.test(
      c,
    );
    if (!hasColorScheme) {
      errors.push(`[HTML] 缺少 color-scheme: light dark: ${rel}`);
    }
  }
  return errors;
}

function assertRequiredRepoFilesExist() {
  const required = [
    'robots.txt',
    'sitemap.xml',
    'sw.js',
    'offline.html',
    'styles/main.css',
    'styles/extensions.css',
    'scripts/motion.js',
    'scripts/core.js',
    'scripts/main.js',
    'scripts/runtime/state.js',
    'scripts/runtime/storage.js',
    'scripts/runtime/perf.js',
    'scripts/modules/accessibility.js',
    'scripts/modules/toast.js',
    'scripts/modules/logger.js',
    'scripts/modules/error-shield.js',
    'scripts/modules/perf-vitals.js',
    'scripts/pages/homepage.js',
    'scripts/pages/product-listing.js',
    'scripts/pages/product-detail.js',
    'scripts/pages/checkout.js',
    'scripts/pages/static-page.js',
    'scripts/pages/offline.js',
    'scripts/pages/compare.js',
    'scripts/pages/orders.js',
    'scripts/pages/account.js',
    'scripts/pages/order-success.js',
    'assets/icons.svg',
  ];
  const errors = [];
  for (const rel of required) {
    const abs = path.join(workspaceRoot, rel);
    if (!isFile(abs)) errors.push(`[REPO] 缺少必要文件: ${rel}`);
  }
  return errors;
}

function countOccurrences(haystack, needle) {
  if (!haystack || !needle) return 0;
  let count = 0;
  let idx = 0;
  while (true) {
    const next = haystack.indexOf(needle, idx);
    if (next === -1) return count;
    count += 1;
    idx = next + needle.length;
  }
}

function extractAssetVersion(html, assetPath) {
  const safe = assetPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`${safe}\\?v=([^"']+)`, 'i');
  const m = String(html || '').match(re);
  return m ? String(m[1] || '').trim() : null;
}

function assertHtmlAssetVersionsConsistent(htmlFiles) {
  const errors = [];
  const versions = {
    mainCss: new Set(),
    extensionsCss: new Set(),
    motionJs: new Set(),
    coreJs: new Set(),
    mainJs: new Set(),
  };

  for (const f of htmlFiles) {
    const c = readText(f);
    const rel = path.relative(workspaceRoot, f);

    const mainCssV = extractAssetVersion(c, 'styles/main.css');
    const extCssV = extractAssetVersion(c, 'styles/extensions.css');
    const motionJsV = extractAssetVersion(c, 'scripts/motion.js');
    const coreJsV = extractAssetVersion(c, 'scripts/core.js');
    const mainJsV = extractAssetVersion(c, 'scripts/main.js');

    if (!mainCssV) errors.push(`[HTML] 无法解析 main.css 版本号: ${rel}`);
    if (!extCssV) errors.push(`[HTML] 无法解析 extensions.css 版本号: ${rel}`);
    if (!motionJsV) errors.push(`[HTML] 无法解析 motion.js 版本号: ${rel}`);
    if (!coreJsV) errors.push(`[HTML] 无法解析 core.js 版本号: ${rel}`);
    if (!mainJsV) errors.push(`[HTML] 无法解析 main.js 版本号: ${rel}`);

    if (mainCssV) versions.mainCss.add(mainCssV);
    if (extCssV) versions.extensionsCss.add(extCssV);
    if (motionJsV) versions.motionJs.add(motionJsV);
    if (coreJsV) versions.coreJs.add(coreJsV);
    if (mainJsV) versions.mainJs.add(mainJsV);
  }

  if (versions.mainCss.size > 1) {
    errors.push(`[VERSION] main.css 版本号不一致: ${Array.from(versions.mainCss).join(', ')}`);
  }
  if (versions.extensionsCss.size > 1) {
    errors.push(
      `[VERSION] extensions.css 版本号不一致: ${Array.from(versions.extensionsCss).join(', ')}`,
    );
  }
  if (versions.motionJs.size > 1) {
    errors.push(`[VERSION] motion.js 版本号不一致: ${Array.from(versions.motionJs).join(', ')}`);
  }
  if (versions.coreJs.size > 1) {
    errors.push(`[VERSION] core.js 版本号不一致: ${Array.from(versions.coreJs).join(', ')}`);
  }
  if (versions.mainJs.size > 1) {
    errors.push(`[VERSION] main.js 版本号不一致: ${Array.from(versions.mainJs).join(', ')}`);
  }

  const mainCssV = versions.mainCss.size === 1 ? Array.from(versions.mainCss)[0] : null;
  const extCssV =
    versions.extensionsCss.size === 1 ? Array.from(versions.extensionsCss)[0] : null;
  const motionJsV = versions.motionJs.size === 1 ? Array.from(versions.motionJs)[0] : null;
  const coreJsV = versions.coreJs.size === 1 ? Array.from(versions.coreJs)[0] : null;
  const mainJsV = versions.mainJs.size === 1 ? Array.from(versions.mainJs)[0] : null;

  if (mainCssV && extCssV && mainCssV !== extCssV) {
    errors.push(`[VERSION] main.css 与 extensions.css 版本号不一致: ${mainCssV} vs ${extCssV}`);
  }
  if (mainCssV && motionJsV && mainCssV !== motionJsV) {
    errors.push(`[VERSION] main.css 与 motion.js 版本号不一致: ${mainCssV} vs ${motionJsV}`);
  }
  if (mainCssV && coreJsV && mainCssV !== coreJsV) {
    errors.push(`[VERSION] main.css 与 core.js 版本号不一致: ${mainCssV} vs ${coreJsV}`);
  }
  if (mainCssV && mainJsV && mainCssV !== mainJsV) {
    errors.push(`[VERSION] main.css 与 main.js 版本号不一致: ${mainCssV} vs ${mainJsV}`);
  }

  return { errors, version: mainCssV };
}

function assertServiceWorkerVersionMatches(version) {
  if (!version) return ['[VERSION] 无法确定统一版本号（请先修复 HTML 版本号解析问题）'];

  const swPath = path.join(workspaceRoot, 'sw.js');
  if (!isFile(swPath)) return ['[REPO] 缺少 sw.js'];

  const sw = readText(swPath);
  const m = sw.match(/const\s+CACHE_NAME\s*=\s*['"]shouwban-([^'"]+)['"]\s*;/i);
  const swVersion = m ? String(m[1] || '').trim() : null;

  const errors = [];
  if (!swVersion) {
    errors.push('[SW] 无法解析 CACHE_NAME 版本号');
    return errors;
  }
  if (swVersion !== version) {
    errors.push(`[VERSION] sw.js CACHE_NAME 与 HTML 版本号不一致: ${swVersion} vs ${version}`);
  }

  const expected = [
    `styles/main.css?v=${version}`,
    `styles/extensions.css?v=${version}`,
    `scripts/motion.js?v=${version}`,
    `scripts/core.js?v=${version}`,
    `scripts/main.js?v=${version}`,
    `scripts/runtime/state.js?v=${version}`,
    `scripts/runtime/storage.js?v=${version}`,
    `scripts/runtime/perf.js?v=${version}`,
    `scripts/modules/accessibility.js?v=${version}`,
    `scripts/modules/toast.js?v=${version}`,
    `scripts/modules/logger.js?v=${version}`,
    `scripts/modules/error-shield.js?v=${version}`,
    `scripts/modules/perf-vitals.js?v=${version}`,
    `scripts/pages/homepage.js?v=${version}`,
    `scripts/pages/product-listing.js?v=${version}`,
    `scripts/pages/product-detail.js?v=${version}`,
    `scripts/pages/checkout.js?v=${version}`,
    `scripts/pages/static-page.js?v=${version}`,
    `scripts/pages/offline.js?v=${version}`,
    `scripts/pages/compare.js?v=${version}`,
    `scripts/pages/orders.js?v=${version}`,
    `scripts/pages/account.js?v=${version}`,
    `scripts/pages/order-success.js?v=${version}`,
  ];
  for (const s of expected) {
    if (!sw.includes(s)) errors.push(`[SW] PRECACHE_URLS 缺少: ${s}`);
  }

  return errors;
}

function extractPrecacheUrlsFromSw(swText) {
  const text = String(swText || '');
  const m = text.match(/const\s+PRECACHE_URLS\s*=\s*\[([\s\S]*?)\]\s*;/i);
  if (!m) return null;

  const body = m[1] || '';
  const urls = [];
  const urlRegex = /['"]([^'"]+)['"]/g;
  let mm;
  while ((mm = urlRegex.exec(body))) {
    urls.push(mm[1]);
  }
  return urls;
}

function normalizeRelPath(p) {
  return String(p || '').replace(/\\/g, '/');
}

function assertServiceWorkerPrecacheCoversHtml(htmlFiles) {
  const swPath = path.join(workspaceRoot, 'sw.js');
  if (!isFile(swPath)) return ['[REPO] 缺少 sw.js'];

  const sw = readText(swPath);
  const urls = extractPrecacheUrlsFromSw(sw);
  if (!urls || urls.length === 0) return ['[SW] 无法解析 PRECACHE_URLS（或列表为空）'];

  const precacheSet = new Set(urls.map((u) => normalizeRelPath(stripQueryAndHash(u))));
  const errors = [];

  for (const abs of htmlFiles) {
    const rel = normalizeRelPath(path.relative(workspaceRoot, abs));
    if (!precacheSet.has(rel)) errors.push(`[SW] PRECACHE_URLS 缺少 HTML: ${rel}`);
  }

  // 额外约束：PRECACHE_URLS 不应包含外链（避免 install 阶段因外链失败导致 SW 装不上）
  for (const raw of urls) {
    if (isExternalUrl(raw)) errors.push(`[SW] PRECACHE_URLS 不应包含外部 URL: ${raw}`);
  }

  return errors;
}

function assertMainCssNotDuplicated() {
  const cssPath = path.join(workspaceRoot, 'styles', 'main.css');
  if (!isFile(cssPath)) return [];

  const css = readText(cssPath);
  const marker = 'Main CSS styles for the figurine landing page';
  const count = countOccurrences(css, marker);
  if (count > 1) {
    return [`[CSS] styles/main.css 疑似被重复拼接：检测到 ${count} 次标识注释（应为 1 次）`];
  }
  return [];
}

function assertAllHtmlHaveManifest(htmlFiles) {
  const errors = [];
  for (const f of htmlFiles) {
    const c = readText(f);
    const rel = path.relative(workspaceRoot, f);
    const hasRel = /\brel\s*=\s*["']manifest["']/.test(c);
    const hasHref = /\bhref\s*=\s*["']assets\/manifest\.webmanifest["']/.test(c);
    if (!hasRel || !hasHref) {
      errors.push(`[HTML] 缺少 PWA Manifest 引用: ${rel}`);
    }
  }
  return errors;
}

function assertNoTargetBlankWithoutNoopener(htmlFiles) {
  const errors = [];
  const aTagRegex = /<a\b[^>]*\btarget\s*=\s*["']_blank["'][^>]*>/gi;

  for (const f of htmlFiles) {
    const c = readText(f);
    const relPath = path.relative(workspaceRoot, f);
    let match;
    while ((match = aTagRegex.exec(c))) {
      const tag = match[0];
      const hasRel = /\brel\s*=\s*["'][^"']*["']/.test(tag);
      const hasNoopener = /\brel\s*=\s*["'][^"']*\bnoopener\b[^"']*["']/.test(tag);
      const hasNoreferrer = /\brel\s*=\s*["'][^"']*\bnoreferrer\b[^"']*["']/.test(tag);
      if (!hasRel || !hasNoopener || !hasNoreferrer) {
        errors.push(`[HTML] 存在 target="_blank" 但缺少 rel="noopener noreferrer": ${relPath}`);
        break;
      }
    }
  }

  return errors;
}

function assertNoExternalRuntimeCdn(htmlFiles) {
  const errors = [];
  const checks = [
    { name: 'Google Fonts', re: /fonts\.googleapis\.com|fonts\.gstatic\.com/i },
    { name: 'Font Awesome / cdnjs', re: /cdnjs\.cloudflare\.com\/ajax\/libs\/font-awesome/i },
    { name: 'Generic CDN', re: /unpkg\.com|cdn\.jsdelivr\.net|cdnjs\.com/i },
  ];

  for (const f of htmlFiles) {
    const c = readText(f);
    const rel = path.relative(workspaceRoot, f);

    for (const rule of checks) {
      if (rule.re.test(c)) {
        errors.push(`[HTML] 不应引入外部 CDN（${rule.name}）: ${rel}`);
      }
    }

    // Guardrail: legacy Font Awesome markup should not exist after migration.
    if (/<i\b[^>]*\bclass\s*=\s*["'][^"']*\bfa[srb]?\b/i.test(c)) {
      errors.push(`[HTML] 检测到遗留的 <i class="fa..."> 图标标记（应改为 SVG Sprite）: ${rel}`);
    }
  }

  return errors;
}

function assertSitemapLocAreAbsolute() {
  const sitemapPath = path.join(workspaceRoot, 'sitemap.xml');
  if (!isFile(sitemapPath)) return [];

  const xml = readText(sitemapPath);
  const locRegex = /<loc>([^<]+)<\/loc>/gi;
  const errors = [];

  let m;
  while ((m = locRegex.exec(xml))) {
    const loc = (m[1] || '').trim();
    if (!/^https?:\/\//.test(loc)) {
      errors.push(`[SITEMAP] <loc> 必须是绝对 URL: ${loc || '(空)'} `);
    }
  }

  return errors;
}

function assertRobotsHasAbsoluteSitemap() {
  const robotsPath = path.join(workspaceRoot, 'robots.txt');
  if (!isFile(robotsPath)) return [];

  const content = readText(robotsPath);
  const errors = [];
  const sitemapLines = content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^sitemap:/i.test(l));

  if (sitemapLines.length === 0) {
    errors.push('[ROBOTS] robots.txt 缺少 Sitemap: 声明');
    return errors;
  }

  const hasAbsolute = sitemapLines.some((l) => /^sitemap:\s*https?:\/\//i.test(l));
  if (!hasAbsolute) {
    errors.push('[ROBOTS] robots.txt 需要至少一条绝对 URL 的 Sitemap: 声明');
  }

  return errors;
}

function validateReferences(files) {
  const missing = [];
  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    const content = readText(f);

    const refs =
      ext === '.html' ? extractHtmlRefs(content) : ext === '.css' ? extractCssRefs(content) : [];

    for (const rawRef of refs) {
      const resolved = resolveReference(f, rawRef);
      if (!resolved) continue;

      // Some references intentionally point to pages with query string (we stripped query)
      // Validate only if it looks like a file path
      const withinRoot = path.resolve(resolved).startsWith(path.resolve(workspaceRoot));
      if (!withinRoot) {
        missing.push(
          `[PATH] 引用路径越界（请检查）: ${path.relative(workspaceRoot, f)} -> ${rawRef}`,
        );
        continue;
      }

      if (!isFile(resolved)) {
        missing.push(
          `[MISS] ${path.relative(workspaceRoot, f)} -> ${rawRef} （解析为 ${path.relative(
            workspaceRoot,
            resolved,
          )}）`,
        );
      }
    }
  }
  return missing;
}

function main() {
  if (!isDirectory(workspaceRoot)) {
    console.error('工作目录不存在:', workspaceRoot);
    process.exit(2);
  }

  const allFiles = listFiles(workspaceRoot, {
    ignoreDirs: ['.git', 'node_modules', 'dist', 'build', 'out', '.cache', 'temp', 'tmp', 'logs'],
  });
  const htmlFiles = allFiles.filter((p) => path.extname(p).toLowerCase() === '.html');
  const cssFiles = allFiles.filter((p) => path.extname(p).toLowerCase() === '.css');

  const structuralErrors = assertAllHtmlHaveCacheBusting(htmlFiles);
  const repoErrors = assertRequiredRepoFilesExist();
  const cssDupErrors = assertMainCssNotDuplicated();
  const pwaErrors = assertAllHtmlHaveManifest(htmlFiles);
  const targetBlankErrors = assertNoTargetBlankWithoutNoopener(htmlFiles);
  const sitemapErrors = assertSitemapLocAreAbsolute();
  const robotsErrors = assertRobotsHasAbsoluteSitemap();
  const cdnErrors = assertNoExternalRuntimeCdn(htmlFiles);

  const versionResult = assertHtmlAssetVersionsConsistent(htmlFiles);
  const versionErrors = versionResult.errors;
  const swVersionErrors = assertServiceWorkerVersionMatches(versionResult.version);
  const swPrecacheErrors = assertServiceWorkerPrecacheCoversHtml(htmlFiles);

  const refErrors = validateReferences([...htmlFiles, ...cssFiles]);

  const errors = [
    ...structuralErrors,
    ...repoErrors,
    ...cssDupErrors,
    ...pwaErrors,
    ...targetBlankErrors,
    ...cdnErrors,
    ...sitemapErrors,
    ...robotsErrors,
    ...versionErrors,
    ...swVersionErrors,
    ...swPrecacheErrors,
    ...refErrors,
  ];

  if (errors.length > 0) {
    console.error(`校验失败：共 ${errors.length} 项问题`);
    for (const e of errors) console.error(' -', e);
    process.exit(1);
  }

  console.log(
    `校验通过：HTML=${htmlFiles.length} CSS=${cssFiles.length}，版本=${versionResult.version || '未知'}，未发现缺失引用与结构问题。`,
  );
}

main();
