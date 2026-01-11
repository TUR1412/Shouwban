# 变更提案: seo-searchaction-breadcrumbs

## 背景
项目已具备 SEO 的基础与富结果扩展：
- Canonical（模块化）
- PDP：Product JSON-LD + BreadcrumbList JSON-LD
- PLP：ItemList JSON-LD

但仍有两类“行业常见标准”可以进一步补齐，且完全符合开闭原则（增量扩展、无业务侵入）：
1. **WebSite + SearchAction**：为站内搜索提供可机器理解的入口（常用于 Sitelinks Search Box 等富结果能力）。
2. **列表页 BreadcrumbList**：PLP 当前已渲染面包屑 UI，但缺少对应的 BreadcrumbList JSON-LD（与 PDP 的富结果语义保持一致）。

## 目标
- 全站：输出 `WebSite` JSON-LD（含 `SearchAction`，urlTemplate 指向 `products.html?query={search_term_string}`）
- PLP：输出 `BreadcrumbList` JSON-LD（与当前页面模式一致：all/category/search/favorites）
- 一致性：所有 JSON-LD 与 Canonical 规则一致（去 hash、保留 query），并采用固定 id upsert 防止重复

## 非目标
- 不引入第三方依赖
- 不改变既有搜索/筛选/列表渲染逻辑

