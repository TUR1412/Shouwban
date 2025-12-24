import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

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

function shouldCompress(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.br' || ext === '.gz') return false;
  return (
    ext === '.html' ||
    ext === '.css' ||
    ext === '.js' ||
    ext === '.json' ||
    ext === '.svg' ||
    ext === '.xml' ||
    ext === '.txt' ||
    ext === '.webmanifest'
  );
}

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export async function compressDist({
  outDir = 'dist',
  brotliQuality = 11,
  gzipLevel = 9,
} = {}) {
  const root = path.resolve(process.cwd(), outDir);
  if (!isDirectory(root)) {
    throw new Error(`dist 目录不存在：${root}`);
  }

  const files = listFiles(root).filter((f) => isFile(f) && shouldCompress(f));
  const report = [];

  for (const abs of files) {
    const raw = fs.readFileSync(abs);
    const rel = path.relative(root, abs).replace(/\\/g, '/');

    const br = brotliCompressSync(raw, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: brotliQuality,
      },
    });

    const gz = gzipSync(raw, { level: gzipLevel });

    fs.writeFileSync(`${abs}.br`, br);
    fs.writeFileSync(`${abs}.gz`, gz);

    report.push({
      file: rel,
      raw: raw.length,
      br: br.length,
      gz: gz.length,
    });
  }

  const totals = report.reduce(
    (acc, item) => {
      acc.raw += item.raw;
      acc.br += item.br;
      acc.gz += item.gz;
      return acc;
    },
    { raw: 0, br: 0, gz: 0 },
  );

  // Keep output concise: only summarize totals + top 10 biggest wins.
  report.sort((a, b) => b.raw - a.raw);
  const top = report.slice(0, 10);

  console.log(`[compress] files=${report.length}`);
  console.log(`[compress] raw=${formatBytes(totals.raw)} br=${formatBytes(totals.br)} gz=${formatBytes(totals.gz)}`);
  top.forEach((x) => {
    const brPct = x.raw > 0 ? Math.round((1 - x.br / x.raw) * 100) : 0;
    const gzPct = x.raw > 0 ? Math.round((1 - x.gz / x.raw) * 100) : 0;
    console.log(`  - ${x.file}: ${formatBytes(x.raw)} → br ${formatBytes(x.br)} (-${brPct}%) / gz ${formatBytes(x.gz)} (-${gzPct}%)`);
  });
}

const isMain = (() => {
  try {
    if (!process.argv[1]) return false;
    const invoked = path.resolve(process.cwd(), process.argv[1]);
    const self = path.resolve(fileURLToPath(import.meta.url));
    return invoked === self;
  } catch {
    return false;
  }
})();

if (isMain) {
  compressDist().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
