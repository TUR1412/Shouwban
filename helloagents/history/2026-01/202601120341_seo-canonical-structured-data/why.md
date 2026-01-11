# 变更提案: seo-canonical-structured-data

## 需求背景
项目当前已具备较完整的 SEO 基础（title/description/OG/JSON-LD Organization、sitemap/robots 校验），但仍存在两类可改进点：

1. **Canonical（规范链接）缺失或不一致**：多页面站点在带 query/hash（如 `product-detail.html?id=...`、`account.html#diagnostics`）的场景下，容易产生重复 URL 变体，不利于搜索引擎聚合权重，也可能影响 Lighthouse 的 SEO 项。
2. **商品页结构化数据不足**：目前商品详情页缺少与实际商品数据一致的 `Product` JSON-LD（价格/库存/图片/评分等），对 SEO 友好度与可解释性不够。

同时，项目强调“保留核心架构、不破坏原逻辑根基”，因此本次升级应遵循开闭原则：通过增量式扩展补齐 SEO 能力，不改变现有业务逻辑与数据模型。

## 变更内容
1. **全站 Canonical 兜底**：在运行时入口中增量补齐 `link[rel="canonical"]`，将 canonical 统一为“当前页面 URL（去 hash）”，并保留 query（使商品详情 `id` 具备唯一 canonical）。
2. **商品详情页 Product JSON-LD**：在 `product-detail` 页面模块中根据实际渲染商品数据生成 `Product` JSON-LD，并写入 `<script type="application/ld+json">`，覆盖 name/image/offers/availability/sku 等关键字段。
3. **LCP 细节增强（渐进）**：对首页 Hero 图的加载提示进行补齐（`loading/fetchpriority/decoding`），降低首屏关键资源的链路不确定性（不改变视觉与布局）。

## 影响范围
- **模块:**
  - SEO（canonical / JSON-LD）
  - 性能（首屏资源提示，轻量）
- **文件:**
  - `scripts/main.js`（新增 canonical 兜底逻辑）
  - `scripts/pages/product-detail.js`（新增 Product JSON-LD 生成）
  - `index.html`（Hero 图片属性微调）
  - `README.md`、`helloagents/wiki/modules/ui.md`、`helloagents/CHANGELOG.md`
- **API:** 无外部 API 变更
- **数据:** 不改变 `SharedData` 数据结构，仅在 SEO 输出层做映射

## 核心场景

### 需求: URL 权重聚合（Canonical）
**模块:** SEO
在不同入口/分享/导航中产生的 URL 变体应统一 canonical，以减少重复页面的 SEO 噪声。

#### 场景: 商品详情页带参数
访问 `product-detail.html?id=P001#top`：
- canonical 应为 `.../product-detail.html?id=P001`（去 hash，保留 id）

### 需求: 商品结构化数据（Product JSON-LD）
**模块:** SEO / Product Detail
商品详情页应输出与 UI 一致的 Product JSON-LD：
- name/sku/image/price/availability/url 等字段可被机器解析

#### 场景: 预售/现货库存
当商品为预售/现货时，JSON-LD availability 应分别反映 `PreOrder`/`InStock`/`OutOfStock`。

## 风险评估
- **风险:** JSON-LD 内容与 UI 不一致（例如库存字段缺失或格式变化）导致 SEO 数据错误。
  - **缓解:** JSON-LD 生成逻辑只依赖已用于 UI 渲染的 `productToDisplay`（同源数据），并对缺失字段做安全降级。
- **风险:** Canonical 逻辑误处理 file:// 或非标准路径。
  - **缓解:** 仅在安全取到 URL 时注入；失败时不抛错（渐进增强）。

