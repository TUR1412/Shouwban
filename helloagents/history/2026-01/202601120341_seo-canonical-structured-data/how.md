# 技术设计: seo-canonical-structured-data

## 技术方案
### 核心技术
- 原生 DOM API（零依赖）
- Schema.org JSON-LD（`Product`）

### 实现要点
1. **Canonical 兜底（`scripts/main.js`）**
   - 在尽可能早的初始化阶段执行：
     - 如果页面 head 中不存在 `link[rel="canonical"]`，则创建并插入。
     - canonical 值使用 `new URL(location.href)`，清空 `hash`（去掉 `#...`），保留 `search`（参数）。
   - 失败保护：任何异常均吞掉，不影响页面主流程。

2. **Product JSON-LD（`scripts/pages/product-detail.js`）**
   - 在商品数据确定且 `populatePage(product)` 成功后生成 JSON-LD：
     - `@type: Product`
     - `name/sku/image/description`
     - `offers.priceCurrency=CNY`、`offers.price`
     - `offers.availability` 根据库存/预售映射到 schema.org URL
     - `offers.url` 使用 canonical URL
   - 输出位置：
     - 优先复用已有 `<script type="application/ld+json">`（如有指定 id）
     - 否则动态创建并追加到 `<head>`

3. **Hero 图片加载提示（`index.html`）**
   - 对首屏 Hero 主图补齐：
     - `loading="eager"`（首屏关键资源）
     - `fetchpriority="high"`（渐进增强）
     - `decoding="async"`
   - 不改变图片 URL，不引入新资源，不影响布局结构。

## 安全与性能
- **安全:** JSON-LD 文本为序列化 JSON，不拼接用户输入；description 去 HTML 标签并做长度保护。
- **性能:** Canonical 逻辑只执行一次 DOM 操作；JSON-LD 仅在 PDP 页面执行；Hero 提示为 HTML 属性级变更。

## 测试与部署
- **测试:** `npm run verify`、`npm test`、`npm run build`、`npm run budget`。
- **部署:** 变更涉及 HTML/JS，需 bump 版本号以确保 SW 更新与缓存一致性。

