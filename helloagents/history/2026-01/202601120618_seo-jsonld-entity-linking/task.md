# 任务清单: seo-jsonld-entity-linking

目录: `helloagents/plan/202601120618_seo-jsonld-entity-linking/`

---

## 1. SEO 结构化数据实体关联
- [√] 1.1 扩展 `scripts/modules/seo.js`：为 `Organization` 增补稳定 `@id`
- [√] 1.2 扩展 `scripts/modules/seo.js`：为 `WebSite` 增补 `publisher.@id` 引用 Organization
- [√] 1.3 扩展 `scripts/pages/product-detail.js`：为 `Product.brand` 增补 `@id` 与 Organization 对齐

## 2. 测试
- [√] 2.1 更新 `tests/seo.test.mjs` 覆盖 `publisher/@id` 输出

## 3. 文档与知识库
- [√] 3.1 更新 `helloagents/wiki/modules/seo.md`（实体链接约定 + 变更历史）
- [√] 3.2 更新 `helloagents/CHANGELOG.md` 与 `helloagents/history/index.md`

## 4. 版本与验证
- [√] 4.1 bump 版本号到 `20260112.11`
- [√] 4.2 运行 `npm run verify`
- [√] 4.3 运行 `npm test`
- [√] 4.4 运行 `npm run build` + `npm run budget`

## 5. 归档
- [√] 5.1 迁移方案包至 `helloagents/history/2026-01/`
