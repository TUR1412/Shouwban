# 任务清单: seo-module-tests

目录: `helloagents/plan/202601120416_seo-module-tests/`

---

## 1. SEO 模块化
- [√] 1.1 新增 `scripts/modules/seo.js`（Canonical 兜底：去 hash、保留 query、协议过滤）
- [√] 1.2 `scripts/main.js` 接入 `createSeo()`，并在 `App.init()` 调用 `ensureCanonical()`

## 2. 工程守护
- [√] 2.1 `sw.js` precache 补齐 `scripts/modules/seo.js?v=...`
- [√] 2.2 `package.json` 的 `npm run check` 覆盖 `scripts/modules/seo.js`

## 3. 单元测试
- [√] 3.1 新增 `tests/seo.test.mjs` 覆盖 canonicalize 与 upsert 行为

## 4. 版本/验证/归档
- [√] 4.1 bump 版本号到 `20260112.7`
- [√] 4.2 运行 `npm run verify`、`npm test`、`npm run build`、`npm run budget`
- [√] 4.3 同步 `helloagents/CHANGELOG.md` 与 `helloagents/history/index.md`
- [√] 4.4 迁移方案包至 `helloagents/history/2026-01/`
