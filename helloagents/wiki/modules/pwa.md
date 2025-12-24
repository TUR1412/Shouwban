# PWA 模块

## 关键文件
- `sw.js`：Service Worker（缓存策略 + 版本控制）
- `assets/manifest.webmanifest`：PWA manifest
- `offline.html`：离线兜底页

## 缓存策略（摘要）
- **HTML 导航：** network-first，失败回退 `offline.html`
- **静态资源：** stale-while-revalidate（先返回缓存，后台更新）
- **版本切换：** `CACHE_NAME = shouwban-YYYYMMDD.N`，激活时清理旧 cache

## 注意事项
- 更新核心资源后请 bump 版本号（建议 `npm run bump:version -- YYYYMMDD.N`）
- `dist/`（Vite 极限构建产物）默认不保证与源站 `sw.js` 预缓存策略一致；如需 PWA 离线能力，优先采用“仓库根目录直接静态部署”模式
