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
    if (!/styles\/main\.css\?v=/.test(c)) {
      errors.push(`[HTML] 缺少 CSS 版本号: ${rel}`);
    }
    if (!/scripts\/main\.js\?v=/.test(c)) {
      errors.push(`[HTML] 缺少 JS 版本号: ${rel}`);
    }
  }
  return errors;
}

function assertRequiredRepoFilesExist() {
  const required = ['robots.txt', 'sitemap.xml'];
  const errors = [];
  for (const rel of required) {
    const abs = path.join(workspaceRoot, rel);
    if (!isFile(abs)) errors.push(`[REPO] 缺少必要文件: ${rel}`);
  }
  return errors;
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

  const allFiles = listFiles(workspaceRoot, { ignoreDirs: ['.git', 'node_modules'] });
  const htmlFiles = allFiles.filter((p) => path.extname(p).toLowerCase() === '.html');
  const cssFiles = allFiles.filter((p) => path.extname(p).toLowerCase() === '.css');

  const structuralErrors = assertAllHtmlHaveCacheBusting(htmlFiles);
  const repoErrors = assertRequiredRepoFilesExist();
  const pwaErrors = assertAllHtmlHaveManifest(htmlFiles);
  const targetBlankErrors = assertNoTargetBlankWithoutNoopener(htmlFiles);
  const sitemapErrors = assertSitemapLocAreAbsolute();
  const robotsErrors = assertRobotsHasAbsoluteSitemap();
  const refErrors = validateReferences([...htmlFiles, ...cssFiles]);

  const errors = [
    ...structuralErrors,
    ...repoErrors,
    ...pwaErrors,
    ...targetBlankErrors,
    ...sitemapErrors,
    ...robotsErrors,
    ...refErrors,
  ];

  if (errors.length > 0) {
    console.error(`校验失败：共 ${errors.length} 项问题`);
    for (const e of errors) console.error(' -', e);
    process.exit(1);
  }

  console.log(`校验通过：HTML=${htmlFiles.length} CSS=${cssFiles.length}，未发现缺失引用与结构问题。`);
}

main();

