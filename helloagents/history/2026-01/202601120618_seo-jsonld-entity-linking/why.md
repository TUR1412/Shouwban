# 变更提案: seo-jsonld-entity-linking

## 背景
项目已具备站点级 `WebSite/SearchAction` JSON-LD（`#website-jsonld`）与 `Organization` JSON-LD（`#organization-jsonld`），并在 PDP/PLP 输出 `Product/BreadcrumbList/ItemList` 等页面级结构化数据。

但目前这些实体多为“并列输出”，缺少 **稳定的实体标识（`@id`）** 与 **跨实体引用**：
- `WebSite` 未显式关联站点主体（publisher / organization）
- PDP `Product.brand` 仅靠 name 识别，缺少可复用的稳定引用

在搜索引擎的语义图谱理解中，为站点主体建立统一 `@id` 并由 `WebSite/Product` 引用，通常能减少实体歧义并提升结构化数据的一致性。

## 目标
- 站点级：为 `Organization` 增补稳定 `@id`（`<index.html>#organization`）
- 站点级：为 `WebSite` 增补 `publisher` 引用同一 `Organization.@id`
- PDP：为 `Product.brand` 增补 `@id` 引用同一 `Organization.@id`
- 渐进增强：失败不影响主流程；URL 仍遵循“去 hash、保留 query”的 canonical 约定

## 非目标
- 不改动现有业务交互与渲染逻辑
- 不引入第三方依赖/SDK

