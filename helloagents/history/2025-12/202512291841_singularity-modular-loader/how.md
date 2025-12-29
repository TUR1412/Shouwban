# 实施方案（How）：Singularity Modular Loader

目录：`helloagents/plan/202512291841_singularity-modular-loader/`

---

## 1. 方案概览

本次改造采用“**按页初始化 + 数据可迁移**”的方式，在保持当前单文件运行时（`scripts/main.js`）形态的前提下，做到可验证、低风险的性能与工程优化：

- **按页初始化**：将 `App.init()` 由“全模块无差别 init”调整为“基础模块全站 init + 页面模块按 `Utils.getPageName()` 分发 init”。
- **数据可迁移**：在 `account.html` 增加“数据管理”入口，支持导出/导入/清空本地模拟数据。
- **工具链熵减**：移除 `terser`，Vite 构建改为 `esbuild` 压缩，并保持 `drop_console/debugger` 等约束。

---

## 2. 按页初始化策略

### 2.1 全站基础模块（始终初始化）

包含：Header/Theme/Telemetry/Cart/Favorites/Compare/Orders/AddressBook/PriceAlerts 等跨页能力，以及 PWA（SW 注册、Install Prompt）等基础设施。

### 2.2 页面级模块（按页初始化）

- `index.html` → `Homepage.init()`
- `product-detail.html` → `PDP.init()` + `RecentlyViewed.init()`
- `checkout.html` → `Checkout.init()`
- `compare.html` → `ComparePage.init()`
- `orders.html` → `OrdersPage.init()`
- `account.html` → `AccountPage.init()`
- `order-success.html` → `OrderSuccessPage.init()`
- `static-page.html` → `StaticPage.init()`
- `offline.html` → `OfflinePage.init()`
- `products.html` / `category.html` → `ProductListing.init()`

### 2.3 非关键模块的“空闲初始化”

诊断面板与命令面板（Diagnostics/CommandPalette）延后到 `requestIdleCallback`（或 `setTimeout`）以降低首屏主线程压力。

---

## 3. 新增功能：数据导入/导出（Account 数据管理）

### 3.1 位置

- `account.html` 增加“数据管理”卡片：导出备份 / 导入备份 / 清空本地数据

### 3.2 数据范围（Key 白名单）

覆盖关键 localStorage 键（导出 raw string，保留 `SB_*` 二进制前缀协议）：

- theme / shippingRegion / cart / favorites / compare / recentlyViewed / promotion / orders / rewards / addressBook / priceAlerts / checkoutDraft / plp* / telemetryQueue 等

### 3.3 安全策略

- 不上传网络、只在本地读写文件。
- 导入校验：schema + key 白名单 + value 必须为字符串 + 文件大小上限。
- 导入/清空后自动刷新页面，保证 UI 状态一致性。

---

## 4. 构建与依赖（极致熵减）

- 移除 `terser` devDependency。
- `vite.config.mjs`：使用 `esbuild` minify，并设置 `drop: ['console','debugger']`。
- 保留 `compress-dist.mjs`（brotli/gzip 预压缩）与现有校验链路。

---

## 5. 验证

- `npm run verify`
- `npm test`
- （可选）安装依赖并执行 `npm run build` 验证 `dist/` 可产出

