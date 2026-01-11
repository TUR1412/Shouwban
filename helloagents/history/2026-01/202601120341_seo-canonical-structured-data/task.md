# 任务清单: seo-canonical-structured-data

目录: `helloagents/plan/202601120341_seo-canonical-structured-data/`

---

## 1. Canonical 兜底
- [√] 1.1 在 `scripts/main.js` 中新增 canonical 兜底逻辑（去 hash、保留 query），验证 why.md#需求-url-权重聚合-canonical-场景-商品详情页带参数

## 2. 商品结构化数据
- [√] 2.1 在 `scripts/pages/product-detail.js` 中生成 Product JSON-LD（name/sku/image/offers/availability/url），验证 why.md#需求-商品结构化数据-product-json-ld-场景-预售-现货库存

## 3. LCP 渐进增强
- [√] 3.1 更新 `index.html` Hero 图片属性（loading/fetchpriority/decoding），不改变布局与视觉

## 4. 文档更新
- [√] 4.1 更新 `README.md`：补齐 SEO（canonical / JSON-LD）能力说明
- [√] 4.2 更新 `helloagents/wiki/modules/ui.md`：记录 SEO/LCP 相关约定（可选，按需）
- [√] 4.3 更新 `helloagents/CHANGELOG.md`：记录本次变更

## 5. 版本与验证
- [√] 5.1 执行 `node scripts/bump-version.mjs 20260112.6`
- [√] 5.2 运行 `npm run verify`
- [√] 5.3 运行 `npm test`
- [√] 5.4 运行 `npm run build` + `npm run budget`
