import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();

function usage() {
  console.log('用法: node scripts/bump-version.mjs <YYYYMMDD.N>');
  console.log('示例: node scripts/bump-version.mjs 20251218.4');
}

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function writeText(p, text) {
  fs.writeFileSync(p, text, 'utf8');
}

function listRootHtmlFiles() {
  const entries = fs.readdirSync(workspaceRoot, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith('.html'))
    .map((e) => path.join(workspaceRoot, e.name));
}

function replaceAll(str, re, replacement) {
  const next = str.replace(re, replacement);
  return { next, changed: next !== str };
}

function bumpHtmlVersion(html, nextVersion) {
  let out = html;
  let changed = false;

  const targets = ['styles/main.css', 'styles/extensions.css', 'scripts/motion.js', 'scripts/core.js', 'scripts/main.js'];
  for (const asset of targets) {
    const re = new RegExp(`${asset.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\?v=[^"']+`, 'g');
    const r = replaceAll(out, re, `${asset}?v=${nextVersion}`);
    out = r.next;
    changed ||= r.changed;
  }

  return { next: out, changed };
}

function bumpSwVersion(sw, nextVersion) {
  let out = sw;
  let changed = false;

  const r1 = replaceAll(out, /Cache version follows asset query:\s*[0-9]{8}\.[0-9]+/g, `Cache version follows asset query: ${nextVersion}`);
  out = r1.next;
  changed ||= r1.changed;

  const r2 = replaceAll(out, /const\s+CACHE_NAME\s*=\s*['"]shouwban-[^'"]+['"]\s*;/g, `const CACHE_NAME = 'shouwban-${nextVersion}';`);
  out = r2.next;
  changed ||= r2.changed;

  const r3 = replaceAll(out, /styles\/main\.css\?v=[^'"]+/g, `styles/main.css?v=${nextVersion}`);
  out = r3.next;
  changed ||= r3.changed;

  const r4 = replaceAll(out, /styles\/extensions\.css\?v=[^'"]+/g, `styles/extensions.css?v=${nextVersion}`);
  out = r4.next;
  changed ||= r4.changed;

  const r5 = replaceAll(out, /scripts\/main\.js\?v=[^'"]+/g, `scripts/main.js?v=${nextVersion}`);
  out = r5.next;
  changed ||= r5.changed;

  const r6 = replaceAll(out, /scripts\/core\.js\?v=[^'"]+/g, `scripts/core.js?v=${nextVersion}`);
  out = r6.next;
  changed ||= r6.changed;

  const r7 = replaceAll(out, /scripts\/motion\.js\?v=[^'"]+/g, `scripts/motion.js?v=${nextVersion}`);
  out = r7.next;
  changed ||= r7.changed;

  return { next: out, changed };
}

function bumpTaskStatus(text, nextVersion) {
  // 只替换“版本号”标记行，避免误伤日期/数字
  const re = /(缓存穿透统一版本号\*{0,2}：)`[^`]+`/g;
  return replaceAll(text, re, `$1\`${nextVersion}\``);
}

function main() {
  const nextVersion = (process.argv[2] || '').trim();
  if (!nextVersion) {
    usage();
    process.exit(2);
  }

  if (!/^\d{8}\.\d+$/.test(nextVersion)) {
    console.error('版本号格式不正确，应为 YYYYMMDD.N，例如 20251218.4');
    process.exit(2);
  }

  const htmlFiles = listRootHtmlFiles();
  let touched = 0;

  for (const file of htmlFiles) {
    const raw = readText(file);
    const r = bumpHtmlVersion(raw, nextVersion);
    if (r.changed) {
      writeText(file, r.next);
      touched += 1;
    }
  }

  const swPath = path.join(workspaceRoot, 'sw.js');
  if (fs.existsSync(swPath)) {
    const raw = readText(swPath);
    const r = bumpSwVersion(raw, nextVersion);
    if (r.changed) {
      writeText(swPath, r.next);
      touched += 1;
    }
  }

  const taskPath = path.join(workspaceRoot, 'Task_Status.md');
  if (fs.existsSync(taskPath)) {
    const raw = readText(taskPath);
    const r = bumpTaskStatus(raw, nextVersion);
    if (r.changed) {
      writeText(taskPath, r.next);
      touched += 1;
    }
  }

  console.log(`完成：已更新版本号到 ${nextVersion}，写入文件数=${touched}`);
}

main();
