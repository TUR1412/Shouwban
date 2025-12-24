# Runtime JS 模块

## 职责
- 页面交互初始化（Header/Theme/Cart/Checkout/Orders 等）
- 数据读写与跨标签同步（`localStorage` + `storage` event）
- 渐进增强动效与视图过渡
- 统一图标输出（SVG Sprite）

## 关键文件
- `scripts/main.js`：主脚本（包含多个 IIFE 模块 + App.init）
- `scripts/core.js`：可测试的纯函数集合（金额、数量、折扣等）
- `scripts/motion.js`：Motion-lite（WAAPI）

## 关键约定
- HTML 中的运行时脚本统一使用 `type="module"`（确保可被 Vite 构建链路处理）
- 重复逻辑统一收敛到 `Utils`（避免多处实现导致回归）

## Utils（通用能力收敛）
- `Utils.copyText()`：剪贴板复制（安全上下文优先 + legacy fallback）
- `Utils.dispatch()` / `Utils.dispatchChanged()`：跨模块广播（统一 `scope:changed`）
- `Utils.generateId(prefix)`：通用 ID 生成（优先 `crypto.randomUUID`）
- `Utils.readStorageJSON()` / `Utils.writeStorageJSON()`：存储层封装（默认 JSON，热路径键支持二进制协议前缀）

### 存储二进制协议（Protocol-aware localStorage）

为降低高频数据的体积与解析开销，引入两种前缀协议（向后兼容旧 JSON）：

- `SB_A1:`：`string[]`（用于 `favorites` / `compare` / `recentlyViewed`）
- `SB_C1:`：购物车行 `({id, quantity}[])`（用于 `cart`；渲染时由 `SharedData.getProductById()` 补齐价格/名称/图片）

编码/解码实现位于 `scripts/core.js`（可测试、零 DOM 依赖）：
- `ShouwbanCore.encodeStringArrayBase64()` / `decodeStringArrayBase64()`
- `ShouwbanCore.encodeCartLinesBase64()` / `decodeCartLinesBase64()`

## 虚拟滚动（VirtualScroll）

目的：让超长列表在 10 万条数据下仍保持可交互（DOM 常驻数量固定，滚动更新在 `requestAnimationFrame` 内完成）。

- 引擎位置：`scripts/main.js` → `VirtualScroll`
- 接入点：`ProductListing`（可通过参数开启压测/演示）
- 启用方式：
  - 压测模式：`products.html?stress=100000`（自动切换列表视图 + 虚拟滚动，并禁用排序/筛选控件避免误判性能瓶颈）
  - 强制虚拟化：`products.html?virtual=1`（当列表较长且处于列表视图时触发）

## 工程自诊断（Diagnostics）

目标：提供“浏览器控制台健康全景图”，用于快速定位掉帧/长任务/内存上升趋势。

- 入口（任意其一）：
  - URL：`?health=1`（自动开始每 5 秒输出一次快照）
  - 命令面板：`Ctrl/Cmd + K` → `系统健康全景图` / `开始健康监控（5s）`
  - 控制台 API：`window.ShouwbanDiagnostics.print()` / `watch()` / `unwatch()`

## 图标约定
- JS 内部生成按钮/卡片时，统一使用 `Icons.svgHtml('icon-xxx')`
- 收藏态切换：`icon-heart` ↔ `icon-heart-filled`

## 命令面板
- 快捷键：`Ctrl/Cmd + K` 或 `/`
- 目标：减少鼠标操作成本，提供“商业软件级”的效率交互
