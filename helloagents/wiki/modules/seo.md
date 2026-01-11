# SEO 模块

## 职责
- Canonical：统一规范链接，降低 URL 变体导致的重复内容噪声
- 结构化数据（JSON-LD）：为商品/列表/面包屑等页面语义提供机器可读描述，提升可解释性与富结果适配
- 渐进增强：任何 SEO 输出失败都不影响页面主流程与交互

## 关键文件
- `scripts/modules/seo.js`：SEO 工具模块（Canonical 兜底，支持依赖注入便于测试）
- `scripts/main.js`：在 `App.init()` 早期调用 `Seo.ensureCanonical()` + `Seo.upsertWebSiteJsonLd()` + `Seo.upsertOrganizationJsonLd()`（全站兜底与站点级结构化数据）
- `scripts/pages/product-detail.js`：PDP 输出 `Product` + `BreadcrumbList` JSON-LD（优先复用 `Seo.upsertJsonLd()` + URL 规范化）
- `scripts/pages/product-listing.js`：PLP 输出 `ItemList` + `BreadcrumbList` JSON-LD（优先复用 `Seo.upsertJsonLd()` + URL 规范化；基于当前渲染列表与页面模式）
- `sw.js`：PRECACHE_URLS 覆盖 `scripts/modules/seo.js?v=...`，避免离线缺失

## Canonical 约定
- 规则：**去 hash、保留 query**
  - `product-detail.html?id=P001#top` → canonical 为 `product-detail.html?id=P001`
- 协议：仅在 `http(s)` 下生效（`file://` / `about:` 等协议直接跳过）
- 策略：upsert `link[rel="canonical"]`（存在则更新，不存在则创建）

## JSON-LD 约定（脚本 id）
为避免重复插入，所有结构化数据统一采用固定 id 进行 upsert：
- 站点级（全站）
  - `#website-jsonld`：`@type=WebSite`（含 `SearchAction`）
  - `#organization-jsonld`：`@type=Organization`（站点主体/品牌信息，可选 logo/sameAs）
- 商品详情页（PDP）
  - `#product-jsonld`：`@type=Product`
  - `#breadcrumbs-jsonld`：`@type=BreadcrumbList`
- 商品列表页（PLP）
  - `#plp-breadcrumbs-jsonld`：`@type=BreadcrumbList`
  - `#itemlist-jsonld`：`@type=ItemList`

### URL 一致性
- JSON-LD 内的 URL 统一去 hash（与 Canonical 对齐）
- 多页面部署路径不假设为根目录：统一通过 `new URL(relative, location.href)` 构造绝对 URL

### 实体链接（@id）
- `Organization.@id` 统一为 `<index.html>#organization`（同一站点主体实体的稳定标识）
- `WebSite.publisher.@id` 引用同一 `Organization.@id`（站点与组织实体关联）
- PDP `Product.brand.@id` 引用同一 `Organization.@id`（与站点级组织一致，减少实体歧义）

### 体积控制
- PLP `ItemList` 默认最多输出前 60 条（避免列表过大导致 JSON-LD 过重）
- 所有 JSON-LD 写入前会清理 `undefined` 字段（保持 JSON 干净）

## 测试
- `tests/seo.test.mjs`：覆盖 Canonicalize 规则与 upsert 行为（不依赖真实 DOM）

## 变更历史
- [202601120341_seo-canonical-structured-data](../../history/2026-01/202601120341_seo-canonical-structured-data/) - Canonical 兜底 + PDP Product JSON-LD + 首页 LCP 提示
- [202601120416_seo-module-tests](../../history/2026-01/202601120416_seo-module-tests/) - SEO 模块化（Canonical）+ 单测覆盖 + SW/Check 守护同步
- [202601120524_seo-rich-results](../../history/2026-01/202601120524_seo-rich-results/) - Rich Results：PDP BreadcrumbList + PLP ItemList JSON-LD
- [202601120540_seo-searchaction-breadcrumbs](../../history/2026-01/202601120540_seo-searchaction-breadcrumbs/) - WebSite/SearchAction JSON-LD + PLP BreadcrumbList JSON-LD
- [202601120556_seo-organization-jsonld](../../history/2026-01/202601120556_seo-organization-jsonld/) - Organization JSON-LD（站点级主体信息）
- [202601120618_seo-jsonld-entity-linking](../../history/2026-01/202601120618_seo-jsonld-entity-linking/) - JSON-LD 实体关联（Organization/WebSite/Product 统一 @id）
- [202601120635_runtime-error-capture-jsonld-upsert](../../history/2026-01/202601120635_runtime-error-capture-jsonld-upsert/) - JSON-LD upsert 收敛（页面复用 SEO 模块）
