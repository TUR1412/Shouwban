# Tooling 模块

## 校验脚本：`scripts/validate.mjs`

校验内容（关键）：
- HTML 是否包含版本号（CSS/JS）
- HTML 与 `sw.js` 的版本号是否一致
- `sw.js` 的 `PRECACHE_URLS` 是否覆盖全部 HTML
- 资源引用是否存在（含 `assets/icons.svg#...`）
- 禁止引入外部 CDN（Google Fonts / Font Awesome / 通用 CDN 兜底规则）

## 版本号脚本：`scripts/bump-version.mjs`
- 用途：统一更新 HTML/CSS/JS 引用的 `?v=` 与 `sw.js` 的 `CACHE_NAME`
- 格式：`YYYYMMDD.N`

