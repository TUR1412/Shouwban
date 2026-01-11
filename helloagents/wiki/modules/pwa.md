# PWA 模块

## 关键文件
- `sw.js`：Service Worker（缓存策略 + 版本控制）
- `assets/manifest.webmanifest`：PWA manifest
- `offline.html`：离线兜底页
- `scripts/pages/*.js`：页面级运行时模块（需纳入 `PRECACHE_URLS`，保证离线与首屏一致性）
- `scripts/modules/*.js`：跨页面共享模块（同样应纳入 `PRECACHE_URLS`，避免离线缺失）

## 缓存策略（摘要）
- **HTML 导航：** network-first，失败回退 `offline.html`
- **静态资源：** stale-while-revalidate（先返回缓存，后台更新）
- **版本切换：** `CACHE_NAME = shouwban-YYYYMMDD.N`，激活时清理旧 cache

## 注意事项
- 更新核心资源后请 bump 版本号（建议 `npm run bump:version -- YYYYMMDD.N`）
- 如新增/删除页面模块文件，请同步更新：
  - `sw.js` → `PRECACHE_URLS`（`scripts/pages/*.js?v=...`）
  - `scripts/bump-version.mjs`（确保版本号替换覆盖 `scripts/pages/*` 与 `scripts/modules/*`）
  - `scripts/validate.mjs`（确保校验能守护 precache 不回退）
- `dist/`（Vite 极限构建产物）默认不保证与源站 `sw.js` 预缓存策略一致；如需 PWA 离线能力，优先采用“仓库根目录直接静态部署”模式
