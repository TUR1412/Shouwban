# 技术设计: dist-pwa-lighthouse

## 技术方案
### 核心技术
- Node.js（无额外运行时依赖）
- Vite（现有 devDependency）
- Lighthouse CI（CI 环境执行）

### 实现要点
- **dist Service Worker 生成器**
  - 新增 `scripts/generate-dist-sw.mjs`：
    - 扫描 `dist/` 目录，收集 `*.html` + `assets/**` + `robots.txt`/`sitemap.xml` 等可缓存资源
    - 过滤 `.br/.gz` 等预压缩副产物，避免重复缓存
    - 生成 `dist/sw.js`（网络优先导航 + 静态资源 stale-while-revalidate）
  - 在 `scripts/build-ultra.mjs` 中接入：Vite build → postbuildCopyStatic → generateDistServiceWorker → compressDist

- **Lighthouse CI**
  - 新增 `.lighthouserc.json`，声明：
    - `startServerCommand` 使用 `npm run preview`（Vite preview）
    - `collect.url` 覆盖关键页面路径
    - `assert` 以 warn 阈值为主（性能/可访问性等）
  - 新增 GitHub Actions workflow：安装依赖 → build → LHCI autorun

## 安全与性能
- **安全:** Service Worker 仅缓存同源 GET 请求；不引入任何远端埋点默认上传行为；CI 不引入密钥。
- **性能:** dist/ 预缓存基于构建输出（hash 资源名），避免源站 `?v=` 资源在 dist 形态下失配；Lighthouse 门禁提供回归检测能力。

## 测试与部署
- **测试:**
  - 新增单测覆盖 `generate-dist-sw`：验证生成文件存在、包含关键 HTML、排除 `.br/.gz`。
  - 本地仍沿用 `npm run verify` / `npm run test:coverage` 守护。
- **部署:**
  - 根目录静态部署：继续使用仓库根目录 `sw.js`（`?v=` 版本强一致）。
  - dist/ 部署：`npm run build` 将输出 `dist/sw.js`，可直接托管 `dist/` 目录并获得离线能力。

