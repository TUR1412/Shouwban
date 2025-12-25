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
- 事件广播统一使用 `scope:changed`（兼容 window CustomEvent），并可被 `StateHub` 订阅

## Utils（通用能力收敛）
- `Utils.copyText()`：剪贴板复制（安全上下文优先 + legacy fallback）
- `Utils.dispatch()` / `Utils.dispatchChanged()`：跨模块广播（统一 `scope:changed`）
- `Utils.generateId(prefix)`：通用 ID 生成（优先 `crypto.randomUUID`）
- `Utils.readStorageJSON()` / `Utils.writeStorageJSON()`：存储层封装（默认 JSON，热路径键支持二进制协议前缀）

## StateHub（统一事件 + Atom）

目标：在不破坏既有代码的前提下，统一“交互组件状态管理”的底座能力。

- **事件中心:** `StateHub.on/off/emit`（轻量订阅）
- **Atom:** `StateHub.atom(key, fallback, {scope})`
  - `get()`：读取持久化状态
  - `set(value, {silent})`：写入并（可选）触发 `scope:changed`
  - `subscribe(handler)`：订阅 `scope:changed` 并立即触发一次（便于 state-driven UI）
- **桥接:** `Utils.dispatch()` 被包装后会同时触发 `StateHub.emit()`（window CustomEvent 兼容不变）

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

## Skeleton（骨架屏）

目的：提升感知性能，避免“首屏/切换时的突兀空白”。

- 模块：`scripts/main.js` → `Skeleton`
- 接入点：
  - `ProductListing` 首次渲染：`Skeleton.withGridSkeleton(...)`
  - `Homepage` 精选与策展：`Skeleton.withGridSkeleton(...)`

## 页面转场（NavigationTransitions）

- 优先使用：`styles/extensions.css` 的 `@view-transition { navigation: auto; }`
- Fallback：当浏览器不支持 View Transition 时，`NavigationTransitions` 会拦截站内跳转播放离场遮罩（WAAPI）

## Prefetch（实时搜索预取）

目的：在不引入依赖的情况下提升“搜索/列表 -> 详情”的跳转首屏速度。

- 模块：`scripts/main.js` → `Prefetch`
- 触发点：
  - Header 搜索建议渲染：预取搜索页 + top 2 详情页/首图
  - 商品列表 hover：预取详情页/首图
- 保护策略：自动跳过 `save-data` 与 `2g/slow-2g`

## Telemetry（用户行为埋点）

默认策略：**仅本地队列，不上传**。如配置 endpoint 才会自动上报（用于对接真实后端时的可观察性）。

- 模块：`scripts/main.js` → `Telemetry`
- 隐私策略：
  - 对用户输入仅记录 `qHash/qLen`（hash + 长度），避免保存原文
- 可选 endpoint 配置：
  - `meta[name="shouwban-telemetry-endpoint"]`
  - `localStorage.sbTelemetryEndpoint`
  - `window.__SHOUWBAN_TELEMETRY__.endpoint`

## Http（请求重试 + 缓存）

目的：为未来 API 对接准备统一请求层（错误重试、超时、GET 缓存）。

- 模块：`scripts/main.js` → `Http`
- 能力：
  - 429/5xx 自动退避重试
  - AbortController 超时
  - GET 内存缓存（ttl）

## 多级筛选（ProductListing）

- 存储键：`plpFiltersV2`
- 形态：高级筛选 Dialog + pills 展示
- 逻辑：组内 OR、组间 AND；与原“快速筛选（chips）”叠加

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

## 变更历史
- [202512260005_infinite-evolution-ui](../../history/2025-12/202512260005_infinite-evolution-ui/) - StateHub/Prefetch/Telemetry/Http/Skeleton/NavigationTransitions 与多级筛选引擎
