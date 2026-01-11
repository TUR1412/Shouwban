# 实施方案: seo-searchaction-breadcrumbs

## 方案概述
1. **SEO 模块扩展（WebSite / SearchAction）**
   - 扩展 `scripts/modules/seo.js`：新增 `upsertWebSiteJsonLd()`（固定 id `#website-jsonld`）
   - 在 `scripts/main.js` 中复用现有 SEO 初始化点，在 `App.init()` 早期调用

2. **PLP BreadcrumbList JSON-LD**
   - 在 `scripts/pages/product-listing.js` 中基于 `pageMode/currentCategory/currentQuery` 生成 `BreadcrumbList`
   - 固定 id：`#plp-breadcrumbs-jsonld`

3. **文档与守护**
   - 更新 `helloagents/wiki/modules/seo.md` 记录新增 JSON-LD id 与 WebSite/SearchAction 约定
   - 更新 `README.md`、`helloagents/CHANGELOG.md`、`helloagents/history/index.md`

## 风险与缓解
- 风险：在非 http(s)（如 file://）下生成绝对 URL 可能不可靠  
  缓解：SEO 模块对协议做过滤；无法构造时直接跳过输出（渐进增强）。
- 风险：PLP 模式变化导致 Breadcrumb 不准确  
  缓解：仅使用已用于 UI 的同源状态（pageMode/currentCategory/currentQuery），并对缺失字段做降级。

