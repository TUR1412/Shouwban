# 实施方案: seo-module-tests

## 方案概述
1. 新增 `scripts/modules/seo.js`，提供 `createSeo()`：
   - `canonicalizeHref()`：去 hash、保留 query，并过滤非 http(s) 协议。
   - `ensureCanonical()`：在可用 DOM 下 upsert `link[rel="canonical"]`（渐进增强）。
2. 在 `scripts/main.js` 以增量方式接入：
   - 新增 import（带 `?v=` 版本参数，与现有 modules 规则一致）
   - 在 `App.init()` 早期调用 `Seo.ensureCanonical()`
3. 工程守护同步：
   - `sw.js` PRECACHE_URLS 补齐 `scripts/modules/seo.js?v=...`
   - `package.json` 的 `npm run check` 增加 `node --check scripts/modules/seo.js`
4. 新增单测 `tests/seo.test.mjs`：
   - 使用依赖注入/最小 DOM stub，覆盖 canonical 规则与 upsert 行为

## 风险与缓解
- 风险：不同部署形态对 query 的处理差异导致缓存/预取异常  
  缓解：保持与现有 modules 一致的 `?v=` 约定，SW precache 同步更新。
- 风险：DOM 不可用时抛错影响主流程  
  缓解：SEO 模块内部全程 try/catch，返回 boolean，不抛异常。

