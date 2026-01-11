# 实施方案: seo-jsonld-entity-linking

## 方案概述
1. 扩展 `scripts/modules/seo.js`
   - `upsertOrganizationJsonLd()` 增补 `@id = <index.html>#organization`
   - `upsertWebSiteJsonLd()` 增补 `publisher: { "@id": <index.html>#organization }`

2. 扩展 PDP `Product` JSON-LD
   - 在 `scripts/pages/product-detail.js` 的 `upsertProductJsonLd()` 中，为 `brand` 增补 `@id`，与站点级 `Organization` 对齐

3. 测试与文档同步
   - 更新 `tests/seo.test.mjs` 覆盖 `publisher/@id` 输出
   - 更新 `helloagents/wiki/modules/seo.md` 说明实体链接约定
   - 更新 `helloagents/CHANGELOG.md` 与 `helloagents/history/index.md`

## 风险与缓解
- 风险：部署路径变化导致 `@id` 不正确  
  缓解：`@id` 基于 canonical 的 `index.html` 绝对 URL 拼接 hash，避免硬编码域名/根路径。
- 风险：结构化数据扩展影响主流程  
  缓解：所有 SEO 输出均为渐进增强，失败直接跳过，不抛出异常。

