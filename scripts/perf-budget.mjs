// Performance Budget Guardrail (dist/)
// - 以 dist 产物为 SSOT：读取 .gz 预压缩体积，防止主入口体积无感回退。
// - 零第三方依赖，适合作为 CI 门禁。
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

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function pickLargest(files) {
  const list = Array.isArray(files) ? files : [];
  let best = null;
  let bestSize = -1;
  list.forEach((p) => {
    try {
      const size = fs.statSync(p).size;
      if (size > bestSize) {
        bestSize = size;
        best = p;
      }
    } catch {
      // ignore
    }
  });
  return best;
}

function assertBudget({ name, filePath, maxBytes }) {
  const max = Number(maxBytes) || 0;
  if (!filePath || !isFile(filePath)) {
    return {
      name,
      ok: false,
      reason: 'missing',
      file: String(filePath || ''),
      size: 0,
      max,
    };
  }
  const size = fs.statSync(filePath).size;
  const ok = max > 0 ? size <= max : true;
  return { name, ok, reason: ok ? 'ok' : 'exceeded', file: filePath, size, max };
}

function main() {
  const root = process.cwd();
  const distRoot = path.resolve(root, 'dist');
  const assetsRoot = path.join(distRoot, 'assets');

  if (!isDirectory(distRoot)) {
    console.error('[budget] dist 目录不存在，请先运行：npm run build');
    process.exit(2);
  }
  if (!isDirectory(assetsRoot)) {
    console.error('[budget] dist/assets 目录不存在，请先运行：npm run build');
    process.exit(2);
  }

  const allAssets = listFiles(assetsRoot).filter((p) => isFile(p));
  const jsGz = allAssets.filter((p) => p.endsWith('.js.gz'));
  const cssGz = allAssets.filter((p) => p.endsWith('.css.gz'));

  const mainJs = pickLargest(jsGz);
  const mainCss = pickLargest(cssGz);
  const indexHtmlGz = path.join(distRoot, 'index.html.gz');

  // 阈值：以当前基线为参考，留出 buffer（可在后续迭代中收紧/放宽）
  const budgets = [
    { name: 'main-js-gzip', filePath: mainJs, maxBytes: 60 * 1024 },
    { name: 'main-css-gzip', filePath: mainCss, maxBytes: 25 * 1024 },
    { name: 'index-html-gzip', filePath: indexHtmlGz, maxBytes: 12 * 1024 },
  ];

  const results = budgets.map((b) => assertBudget(b));
  const failed = results.filter((r) => !r.ok);

  console.log('[budget] dist performance budget');
  results.forEach((r) => {
    const rel = r.file ? path.relative(distRoot, r.file).replace(/\\/g, '/') : '';
    const verdict = r.ok ? 'OK' : 'EXCEEDED';
    const detail =
      r.reason === 'missing'
        ? 'missing'
        : `${formatBytes(r.size)} / max ${formatBytes(r.max)}`;
    console.log(`  - ${r.name}: ${verdict} (${rel || 'n/a'}) ${detail}`);
  });

  if (failed.length > 0) {
    console.error(`[budget] FAILED: ${failed.length} budget item(s) exceeded`);
    process.exit(1);
  }
  console.log('[budget] OK');
}

main();

