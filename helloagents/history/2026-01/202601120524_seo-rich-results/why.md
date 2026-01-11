# 变更提案: seo-rich-results

## 背景
项目已具备：
- Canonical 兜底（模块化）
- 商品详情页 Product JSON-LD（价格/库存语义等）

但仍缺少更能触发搜索引擎“富结果”（Rich Results）的结构化信息层：如 **BreadcrumbList**（面包屑）与 **ItemList**（列表页商品清单）。对于多页面静态站点，这类结构化数据能帮助搜索引擎更准确理解页面层级与列表语义，并提升 SEO 可解释性与一致性。

## 目标
- **PDP**：新增 `BreadcrumbList` JSON-LD（与页面面包屑/路由一致）
- **PLP**：新增 `ItemList` JSON-LD（与当前渲染商品列表一致）
- **一致性**：结构化数据 URL 去 hash，与 Canonical 规则一致（保留 query）
- **工程守护**：保持零依赖、渐进增强（失败不影响主流程），并同步知识库记录

## 非目标
- 不改变 `SharedData` 数据结构与业务逻辑
- 不新增服务端依赖或第三方 SDK

