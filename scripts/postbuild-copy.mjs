import fs from 'node:fs';
import path from 'node:path';

function isDirectory(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function copyFile(from, to) {
  ensureDir(path.dirname(to));
  fs.copyFileSync(from, to);
}

function copyDir(fromDir, toDir) {
  if (!isDirectory(fromDir)) return;
  ensureDir(toDir);
  const entries = fs.readdirSync(fromDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(fromDir, entry.name);
    const dst = path.join(toDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(src, dst);
      continue;
    }
    if (entry.isFile()) copyFile(src, dst);
  }
}

export function postbuildCopyStatic({ outDir = 'dist' } = {}) {
  const root = process.cwd();
  const distRoot = path.resolve(root, outDir);

  // 这些资源在运行时以“字符串路径”引用（不会被 Vite 静态分析 import），需要复制到 dist 以保证功能不缺失。
  copyFile(path.join(root, 'assets', 'icons.svg'), path.join(distRoot, 'assets', 'icons.svg'));
  copyDir(path.join(root, 'assets', 'images'), path.join(distRoot, 'assets', 'images'));

  // SEO/平台常用静态文件（Vite 不会自动复制根目录下的 txt/xml）
  copyFile(path.join(root, 'robots.txt'), path.join(distRoot, 'robots.txt'));
  copyFile(path.join(root, 'sitemap.xml'), path.join(distRoot, 'sitemap.xml'));
}

