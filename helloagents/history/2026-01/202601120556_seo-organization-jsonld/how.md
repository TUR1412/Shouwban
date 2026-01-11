# 实施方案: seo-organization-jsonld

## 方案概述
1. 扩展 `scripts/modules/seo.js`
   - 新增 `upsertOrganizationJsonLd()`：
     - 固定 id：`#organization-jsonld`
     - 输出：`@type=Organization`（name/url/logo/sameAs 可选）
     - URL 统一去 hash，与 canonical 规则一致

2. 在 `scripts/main.js` 启动期注入
   - 在 `App.init()` 早期调用 `Seo.upsertOrganizationJsonLd()`（与 Canonical / WebSite 同层级）

3. 测试与文档
   - 扩展 `tests/seo.test.mjs`：覆盖 `upsertOrganizationJsonLd()` 的输出形状与 url/logo 规则
   - 更新 `helloagents/wiki/modules/seo.md` 补齐 `#organization-jsonld` 约定
   - 更新 `README.md`、`helloagents/CHANGELOG.md`、`helloagents/history/index.md`

## 风险与缓解
- 风险：logo URL 在不同部署路径下不正确  
  缓解：使用 `new URL(relative, currentCanonical)` 构造绝对路径，避免硬编码域名。
- 风险：在 file:// 下输出无意义 URL  
  缓解：SEO 模块协议过滤，无法 canonicalize 时直接跳过。

