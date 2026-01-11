import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generateDistServiceWorker } from '../scripts/generate-dist-sw.mjs';

test('generateDistServiceWorker: emits dist/sw.js and filters compression artifacts', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shouwban-dist-sw-'));
  try {
    fs.writeFileSync(
      path.join(root, 'sw.js'),
      "const CACHE_NAME = 'shouwban-20260112.4';\n",
      'utf8',
    );

    const distRoot = path.join(root, 'dist');
    fs.mkdirSync(path.join(distRoot, 'assets'), { recursive: true });

    fs.writeFileSync(path.join(distRoot, 'index.html'), '<!doctype html>', 'utf8');
    fs.writeFileSync(path.join(distRoot, 'offline.html'), '<!doctype html>', 'utf8');

    fs.writeFileSync(path.join(distRoot, 'assets', 'app-123.js'), 'console.log(1)', 'utf8');
    fs.writeFileSync(path.join(distRoot, 'assets', 'app-123.js.br'), 'x', 'utf8');
    fs.writeFileSync(path.join(distRoot, 'assets', 'styles.css.gz'), 'x', 'utf8');

    const { swPath } = generateDistServiceWorker({
      workspaceRoot: root,
      outDir: 'dist',
    });

    const swText = fs.readFileSync(swPath, 'utf8');

    assert.match(swText, /shouwban-dist-20260112\.4/);
    assert.match(swText, /index\.html/);
    assert.match(swText, /offline\.html/);
    assert.match(swText, /assets\/app-123\.js/);
    assert.doesNotMatch(swText, /\.br/);
    assert.doesNotMatch(swText, /\.gz/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
