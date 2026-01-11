# 任务清单: seo-organization-jsonld

目录: `helloagents/plan/202601120556_seo-organization-jsonld/`

---

## 1. SEO 模块扩展
- [√] 1.1 扩展 `scripts/modules/seo.js`：新增 `upsertOrganizationJsonLd()`（`#organization-jsonld`）
- [√] 1.2 在 `scripts/main.js` 启动期调用 `Seo.upsertOrganizationJsonLd()`

## 2. 测试
- [√] 2.1 扩展 `tests/seo.test.mjs` 覆盖 Organization JSON-LD 输出

## 3. 文档与知识库
- [√] 3.1 更新 `helloagents/wiki/modules/seo.md`（新增 id/约定）
- [√] 3.2 更新 `README.md`（补齐 Organization 能力说明）
- [√] 3.3 更新 `helloagents/CHANGELOG.md` 与 `helloagents/history/index.md`

## 4. 版本与验证
- [√] 4.1 bump 版本号到 `20260112.10`
- [√] 4.2 运行 `npm run verify`
- [√] 4.3 运行 `npm test`
- [√] 4.4 运行 `npm run build` + `npm run budget`

## 5. 归档
- [√] 5.1 迁移方案包至 `helloagents/history/2026-01/`
