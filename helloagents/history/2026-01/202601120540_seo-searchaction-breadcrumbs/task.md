# 任务清单: seo-searchaction-breadcrumbs

目录: `helloagents/plan/202601120540_seo-searchaction-breadcrumbs/`

---

## 1. WebSite + SearchAction
- [√] 1.1 扩展 `scripts/modules/seo.js`：新增 `WebSite` JSON-LD（`#website-jsonld`）与 `SearchAction` urlTemplate
- [√] 1.2 在 `scripts/main.js` 中调用 `Seo.upsertWebSiteJsonLd()`（全站）

## 2. PLP BreadcrumbList JSON-LD
- [√] 2.1 在 `scripts/pages/product-listing.js` 增量新增 `BreadcrumbList` JSON-LD（`#plp-breadcrumbs-jsonld`）

## 3. 文档与知识库
- [√] 3.1 更新 `helloagents/wiki/modules/seo.md`（新增 id/约定）
- [√] 3.2 更新 `README.md`（补齐 SEO 富结果能力）
- [√] 3.3 更新 `helloagents/CHANGELOG.md` 与 `helloagents/history/index.md`

## 4. 版本与验证
- [√] 4.1 bump 版本号到 `20260112.9`
- [√] 4.2 运行 `npm run verify`
- [√] 4.3 运行 `npm test`
- [√] 4.4 运行 `npm run build` + `npm run budget`

## 5. 归档
- [√] 5.1 迁移方案包至 `helloagents/history/2026-01/`
