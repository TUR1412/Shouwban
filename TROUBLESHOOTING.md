# 故障排查（Troubleshooting）

本项目为纯静态站点模板，常见问题多数与 **浏览器缓存 / Service Worker 缓存 / file:// 限制** 有关。

## 1) “我改了代码，但页面没变化”

优先怀疑缓存（尤其是启用 PWA 后）。

排查顺序：

1. **确认版本号是否已 bump**
   - 所有 HTML 引用必须带版本号：`styles/main.css?v=...`、`styles/extensions.css?v=...`、`scripts/main.js?v=...`
   - `sw.js` 的 `CACHE_NAME` 与 `PRECACHE_URLS` 版本号必须一致
2. **运行仓库校验脚本**
   - `node scripts/validate.mjs`
3. **清理 Service Worker（开发时很常见）**
   - Chrome/Edge：DevTools -> Application -> Service Workers -> Unregister
   - 然后：DevTools -> Application -> Clear storage -> Clear site data

推荐的一键版本号更新方式：

```powershell
pwsh -NoLogo -NoProfile -Command 'node scripts/bump-version.mjs 20251218.4'
```

更新后建议执行：

```powershell
pwsh -NoLogo -NoProfile -Command 'npm run verify'
```

## 2) “双击打开 HTML 一切正常，但跳转/资源/搜索不工作”

这通常是 `file://` 场景的浏览器安全限制导致。

解决方式：用本地静态服务器预览（推荐）。

```powershell
pwsh -NoLogo -NoProfile -Command 'python -m http.server 5173'
```

访问：`http://localhost:5173/index.html`

## 3) “离线页总出现 / PWA 行为不符合预期”

- `sw.js` 仅在 **https 或 localhost** 下生效（浏览器要求）。
- 离线页出现说明：导航请求网络失败，且缓存中不存在对应页面（或首次访问未缓存）。

建议：

- 确保已在线访问过目标页面，使其进入缓存（或由 `PRECACHE_URLS` 预缓存）。
- 检查 `sw.js` 是否包含全部 HTML 页面（可通过 `node scripts/validate.mjs` 侧面确认）。

## 4) “CI 校验失败（GitHub Actions 红了）”

本仓库 CI 会做两类检查：

- JS 语法检查：`node --check scripts/main.js` / `node --check sw.js`
- 结构与引用校验：`node scripts/validate.mjs`

请先在本地执行：

```powershell
pwsh -NoLogo -NoProfile -Command 'npm run verify'
```

然后根据报错定位到具体文件与缺失引用。

## 5) “字体/图标加载失败”

当前版本默认不依赖运行时第三方 CDN（字体使用系统字体栈；图标使用本地 `assets/icons.svg`）。

如果出现“图标缺失/空白”：

- 确认 `assets/icons.svg` 存在且路径正确（可运行 `npm run verify`）
- 若开启了 Service Worker，尝试在 DevTools → Application → Service Workers 中“更新/注销”后硬刷新

如你在二次开发中引入第三方字体或图标资源（CDN），生产环境建议：
- 自托管资源或启用版本号缓存穿透（`?v=`）
- 配合部署平台配置 CSP/安全响应头（如需要）
