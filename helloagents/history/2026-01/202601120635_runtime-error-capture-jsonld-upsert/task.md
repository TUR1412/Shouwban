# 任务清单: runtime-error-capture-jsonld-upsert

目录: `helloagents/plan/202601120635_runtime-error-capture-jsonld-upsert/`

---

## 1. ErrorShield 增量扩展
- [√] 1.1 扩展 `scripts/modules/error-shield.js`：新增 `capture()` API（不抛异常）
- [√] 1.2 扩展 `scripts/main.js`：PageModules 动态 import 失败时调用 `ErrorShield.capture()`

## 2. JSON-LD 写入收敛
- [√] 2.1 扩展 `scripts/main.js`：将 `Seo` 注入 PageModules runtime context
- [√] 2.2 重构 `scripts/pages/product-detail.js`：JSON-LD upsert 复用 `Seo.upsertJsonLd()` + URL 规范化
- [√] 2.3 重构 `scripts/pages/product-listing.js`：JSON-LD upsert 复用 `Seo.upsertJsonLd()` + URL 规范化

## 3. 测试
- [√] 3.1 扩展 `tests/error-shield.test.mjs` 覆盖 `capture()` 行为

## 4. 文档与知识库
- [√] 4.1 更新 `helloagents/wiki/modules/seo.md`（页面 JSON-LD 约定与实现说明）
- [√] 4.2 更新 `helloagents/CHANGELOG.md` 与 `helloagents/history/index.md`

## 5. 版本与验证
- [√] 5.1 bump 版本号到 `20260112.12`
- [√] 5.2 运行 `npm run verify`
- [√] 5.3 运行 `npm test`
- [√] 5.4 运行 `npm run build` + `npm run budget`

## 6. 归档
- [√] 6.1 迁移方案包至 `helloagents/history/2026-01/`
