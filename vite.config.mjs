import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const htmlPages = [
  'index.html',
  'products.html',
  'category.html',
  'product-detail.html',
  'cart.html',
  'checkout.html',
  'compare.html',
  'favorites.html',
  'account.html',
  'orders.html',
  'order-success.html',
  'static-page.html',
  'offline.html',
  '404.html',
];

function shouwbanHtmlRuntimeEntry() {
  return {
    name: 'shouwban:html-runtime-entry',
    enforce: 'pre',
    transformIndexHtml(html) {
      let out = String(html ?? '');

      // Strip internal cache-busting query to let Vite own the fingerprinting.
      out = out.replace(/styles\/main\.css\?v=[^"']+/gi, 'styles/main.css');
      out = out.replace(/styles\/extensions\.css\?v=[^"']+/gi, 'styles/extensions.css');
      out = out.replace(/scripts\/motion\.js\?v=[^"']+/gi, 'scripts/motion.js');
      out = out.replace(/scripts\/core\.js\?v=[^"']+/gi, 'scripts/core.js');
      out = out.replace(/scripts\/main\.js\?v=[^"']+/gi, 'scripts/main.js');

      return out;
    },
  };
}

function toRollupInputMap(pages) {
  const input = {};
  pages.forEach((file) => {
    const name = file.replace(/\.html$/i, '');
    input[name] = path.resolve(__dirname, file);
  });
  return input;
}

export default defineConfig({
  base: './',
  plugins: [shouwbanHtmlRuntimeEntry()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2018',
    minify: 'esbuild',
    reportCompressedSize: true,
    esbuild: {
      drop: ['console', 'debugger'],
    },
    rollupOptions: {
      input: toRollupInputMap(htmlPages),
    },
  },
});
