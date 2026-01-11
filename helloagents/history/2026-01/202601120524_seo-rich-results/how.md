# 实施方案: seo-rich-results

## 方案概述
1. **PDP BreadcrumbList**
   - 在 `scripts/pages/product-detail.js` 中基于 `product` 数据（category/id/name）生成 `BreadcrumbList` JSON-LD。
   - 使用 `new URL(relative, location.href)` 构造绝对 URL，并统一去掉 hash（保持 query）。
   - 使用固定脚本 id（如 `breadcrumbs-jsonld`）进行 upsert，避免重复插入。

2. **PLP ItemList**
   - 在 `scripts/pages/product-listing.js` 中对“当前渲染的商品列表”生成 `ItemList` JSON-LD。
   - `itemListElement` 采用 `ListItem`（position + url + name），保持轻量可维护。

3. **文档与知识库**
   - 新增 `helloagents/wiki/modules/seo.md`：记录 Canonical、Product JSON-LD、BreadcrumbList、ItemList 等约定与 id 命名。
   - 更新 `README.md` 与 `helloagents/CHANGELOG.md` 说明新增 SEO 富结果能力。
   - 更新 `helloagents/history/index.md` 并迁移方案包至 `helloagents/history/2026-01/`。

## 风险与缓解
- 风险：JSON-LD 与 UI 不一致导致 SEO 信号混乱  
  缓解：结构化数据只依赖已用于渲染的同源数据（PDP 的 `product`、PLP 的渲染列表），并在缺失字段时安全降级。
- 风险：部署路径非根目录时相对链接错误  
  缓解：统一使用 `new URL(relative, location.href)` 构造 URL，自动继承 base path。

