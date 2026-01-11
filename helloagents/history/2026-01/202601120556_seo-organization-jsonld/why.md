# 变更提案: seo-organization-jsonld

## 背景
项目已补齐 Canonical、Product/BreadcrumbList/ItemList JSON-LD 与 WebSite/SearchAction。
但站点级 **Organization**（组织/品牌实体）结构化数据仍缺少统一的“单一真实来源”与可测试的注入逻辑。

在纯静态多页面站点中，Organization JSON-LD 是非常常见的行业标准模块：
- 让搜索引擎更稳定地识别站点主体（brand/organization）
- 与页面级 Product 的 `brand` 保持一致，减少实体识别歧义
- 与 OG/站点标题等信息协同，提升整体可解释性

## 目标
- 全站：新增/兜底注入 `Organization` JSON-LD（固定 id：`#organization-jsonld`）
- 模块化：扩展 `scripts/modules/seo.js`，复用既有 `upsertJsonLd()`，确保可测试与可复用
- 渐进增强：任何失败不影响主流程；仅在 http(s) 下输出绝对 URL

## 非目标
- 不改动现有页面渲染/交互逻辑
- 不引入第三方 SDK/依赖

