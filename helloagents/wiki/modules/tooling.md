# Tooling 模块

## 校验脚本：`scripts/validate.mjs`

校验内容（关键）：
- HTML 是否包含版本号（CSS/JS）
- HTML 与 `sw.js` 的版本号是否一致
- `sw.js` 的 `PRECACHE_URLS` 是否覆盖全部 HTML
- `sw.js` 的 `PRECACHE_URLS` 是否覆盖浏览器运行时模块（如 `scripts/modules/*.js?v=...`）
- 资源引用是否存在（含 `assets/icons.svg#...`）
- 禁止引入外部 CDN（Google Fonts / Font Awesome / 通用 CDN 兜底规则）
- 忽略构建产物目录（`dist/`、`build/`、`out/` 等），避免“构建后自检误报”
- 运行时脚本必须使用 `type="module"`（确保 Vite 构建链路可用）

## 版本号脚本：`scripts/bump-version.mjs`
- 用途：统一更新 HTML/CSS/JS 引用的 `?v=` 与 `sw.js` 的 `CACHE_NAME`
- 格式：`YYYYMMDD.N`
- 覆盖：HTML + `sw.js` + `scripts/main.js` + `scripts/modules/*`

## 可选构建链路：Vite

> 运行时依然保持零第三方依赖；Vite 仅作为开发期工具，用于生成更小的 `dist/` 产物（默认压缩由 Vite 内置的 esbuild 链路完成）。

- `vite.config.mjs`：多页面输入（14 个 HTML）+ esbuild 压缩配置
- `scripts/build-ultra.mjs`：一键执行构建 + 产物补齐 + 预压缩（对应 `npm run build`）
- `scripts/generate-dist-sw.mjs`：为 dist 构建产物生成 `dist/sw.js`（基于输出文件列表生成 precache），使 dist 部署形态也具备 PWA 离线兜底能力
- `scripts/postbuild-copy.mjs`：补齐运行时以“字符串路径”引用的静态资源（`assets/icons.svg`、`assets/images/*` 等）
- `scripts/compress-dist.mjs`：为 `dist/` 生成 `.br` / `.gz` 预压缩文件（便于静态托管启用预压缩分发）

## 性能回归：Lighthouse CI
- 配置：`.lighthouserc.json`（关键页面 URL + 分项阈值断言）
- 本地：`npm run lighthouse`（会先 `npm run build` 再执行 `lhci autorun`）
- CI：`.github/workflows/lighthouse.yml`（自动构建并产出 `.lighthouseci` 报告作为 artifact）

## 体积预算：Performance Budget
- 脚本：`scripts/perf-budget.mjs`
- 目的：对 dist 主入口（最大 `.js.gz/.css.gz`）与 `index.html.gz` 做 gzip 体积阈值断言，稳定捕捉 bundle 膨胀回退
- 使用：`npm run build` 后执行 `npm run budget`（`npm run lighthouse` 已自动包含 budget 门禁）
