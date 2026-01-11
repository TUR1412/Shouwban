# 任务清单: seo-rich-results

目录: `helloagents/plan/202601120524_seo-rich-results/`

---

## 1. PDP BreadcrumbList
- [√] 1.1 在 `scripts/pages/product-detail.js` 增量新增 `BreadcrumbList` JSON-LD（upsert，URL 去 hash）

## 2. PLP ItemList
- [√] 2.1 在 `scripts/pages/product-listing.js` 增量新增 `ItemList` JSON-LD（基于当前渲染列表）

## 3. 文档与知识库
- [√] 3.1 新增 `helloagents/wiki/modules/seo.md`（SEO 模块与结构化数据约定）
- [√] 3.2 更新 `README.md`（补齐富结果能力说明）
- [√] 3.3 更新 `helloagents/CHANGELOG.md`（新增版本条目）
- [√] 3.4 更新 `helloagents/history/index.md`（补齐索引）

## 4. 版本与验证
- [√] 4.1 bump 版本号到 `20260112.8`
- [√] 4.2 运行 `npm run verify`
- [√] 4.3 运行 `npm test`
- [√] 4.4 运行 `npm run build` + `npm run budget`

## 5. 归档
- [√] 5.1 迁移方案包至 `helloagents/history/2026-01/`
