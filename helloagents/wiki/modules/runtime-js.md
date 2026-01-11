# Runtime JS 模块

## 职责
- 页面交互初始化（Header/Theme/Cart/Checkout/Orders 等）
- 数据读写与跨标签同步（`localStorage` + `storage` event）
- 渐进增强动效与视图过渡
- 统一图标输出（SVG Sprite）

## 关键文件
- `scripts/main.js`：运行时入口（全站基础模块 + `PageModules` loader + `App.init`）
- `scripts/runtime/state.js`：StateHub 拆分模块（事件中心 + Atom）
- `scripts/runtime/storage.js`：StorageKit（schema 迁移 / 会员 / 关注 / 订单旅程 / 价格趋势）
- `scripts/runtime/perf.js`：PerfKit（raf 节流 / memoize / 批量 DOM）
- `scripts/pages/*.js`：页面级模块（按需动态加载，实现真正代码分割）
  - `scripts/pages/homepage.js`：`index.html`
  - `scripts/pages/product-listing.js`：`products.html` / `category.html`
  - `scripts/pages/product-detail.js`：`product-detail.html`（含 RecentlyViewed + PDP）
  - `scripts/pages/checkout.js`：`checkout.html`
  - `scripts/pages/compare.js`：`compare.html`
  - `scripts/pages/orders.js`：`orders.html`
  - `scripts/pages/account.js`：`account.html`
  - `scripts/pages/order-success.js`：`order-success.html`
  - `scripts/pages/static-page.js`：`static-page.html`
  - `scripts/pages/offline.js`：`offline.html`
- `scripts/core.js`：可测试的纯函数集合（金额、数量、折扣等）
- `scripts/motion.js`：Motion-lite（WAAPI）
- `scripts/modules/accessibility.js`：无障碍与偏好（A11y Preferences：reduce motion / high contrast / font scale）
- `scripts/modules/toast.js`：全局 Toast（可操作 action/关闭，事件驱动）
- `scripts/modules/logger.js`：本地日志（ring buffer，可导出/可清空）
- `scripts/modules/error-shield.js`：全局错误边界（error/unhandledrejection 捕捉 + 详情面板）
- `scripts/modules/perf-vitals.js`：性能埋点（TTFB/FCP/LCP/CLS/INP/LongTask 近似）

## Runtime Kit（拆分模块）
目的：降低 `scripts/main.js` 体积，将“状态 / 存储 / 性能”职责拆分为可独立维护的运行时单元。

- `StorageKit`（`scripts/runtime/storage.js`）
  - Schema 迁移 + 初始化（会员 / 关注 / 订单旅程 / 价格趋势）
  - 本地结构化存储读写与变更广播
- `StateHub`（`scripts/runtime/state.js`）
  - 事件中心 + Atom，统一跨模块事件与状态订阅
- `Perf`（`scripts/runtime/perf.js`）
  - raf 节流、Memoize、批量 DOM 写入（减少 Layout 抖动）

## 业务扩展模块
由 `scripts/main.js` 聚合并注入页面模块：
- `InventoryPulse`：库存/预售状态计算
- `BundleDeals`：套装组合与折扣策略
- `WatchCenter`：收藏/降价/到货提醒统一聚合
- `OrderJourney`：订单时间轴与售后记录
- `SmartCuration`：基于偏好的人群策展推荐

## 关键约定
- HTML 中的运行时脚本统一使用 `type="module"`（确保可被 Vite 构建链路处理）
- 重复逻辑统一收敛到 `Utils`（避免多处实现导致回归）
- 事件广播统一使用 `scope:changed`（兼容 window CustomEvent），并可被 `StateHub` 订阅

## PageModules（按页代码分割）

目标：让“逻辑上的按页初始化”升级为“物理上的按页加载”，避免非当前页面模块被解析/编译/执行。

- 位置：`scripts/main.js` → `PageModules`
- 触发：`App.init()` 内部根据 `Utils.getPageName()` 选择对应页面模块
- 两种运行模式：
  - **Vite（dev/build）**：走静态可分析的 `import('./pages/xxx.js')`，产物可 code split
  - **根目录静态部署**：走 `import(/* @vite-ignore */ './pages/xxx.js?v=YYYYMMDD.N')`，并从入口 `scripts/main.js?v=...` 解析 `v`，保证缓存穿透一致性
- 依赖注入：页面模块统一暴露 `init(ctx)`，由 `scripts/main.js` 注入运行时依赖
  - 说明：避免页面模块直接 `import './main.js'` 导致 `?v=` URL 不一致（浏览器会视为不同模块而重复加载）

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

## 数据可迁移（DataPortability）

目的：为纯静态站点的本地数据提供“可备份/可迁移/可恢复”的能力，降低 demo/原型在多设备/多浏览器之间迁移成本。

- 模块：`scripts/main.js` → `DataPortability`
- UI：`account.html` → 数据管理（导出备份 / 导入备份 / 清空本地数据）
- 备份策略：导出 **raw string**（保留 `SB_*` 前缀协议），避免二次编码导致兼容性问题
- 安全策略：schema 校验 + key 白名单 + value 必须为字符串 + 文件大小上限（2MB）
- 导入/清空后：自动刷新页面，保证 UI 状态一致性

## 虚拟滚动（VirtualScroll）

目的：让超长列表在 10 万条数据下仍保持可交互（DOM 常驻数量固定，滚动更新在 `requestAnimationFrame` 内完成）。

- 引擎位置：`scripts/main.js` → `VirtualScroll`
- 接入点：`ProductListing`（位于 `scripts/pages/product-listing.js`，可通过参数开启压测/演示）
- 启用方式：
  - 压测模式：`products.html?stress=100000`（自动切换列表视图 + 虚拟滚动，并禁用排序/筛选控件避免误判性能瓶颈）
  - 强制虚拟化：`products.html?virtual=1`（当列表较长且处于列表视图时触发）

## Skeleton（骨架屏）

目的：提升感知性能，避免“首屏/切换时的突兀空白”。

- 模块：`scripts/main.js` → `Skeleton`
- 接入点：
  - `ProductListing` 首次渲染（`scripts/pages/product-listing.js`）：`Skeleton.withGridSkeleton(...)`
  - `Homepage` 精选与策展（`scripts/pages/homepage.js`）：`Skeleton.withGridSkeleton(...)`

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

## Observability（可观测性）
在不引入第三方依赖的前提下，项目通过“本地优先”的方式补齐可观测性基座：

- `Logger`：写入 `localStorage.sbLogs` 的 ring buffer（默认仅本地，不上传）
- `ErrorShield`：捕捉运行时错误并提供用户可见反馈（Toast + 详情面板）
- `PerfVitals`：采集 Web Vitals 级指标，并输出到 Logger（可选 Telemetry 入队）

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
- 内置命令：`打开诊断中心`（`account.html#diagnostics`）与 `打开错误报告`（`ErrorShield.open()`）

## Accessibility（无障碍与偏好）
- 存储键：`localStorage.a11y`
- 映射：
  - `reduceMotion=true` → `html[data-motion="reduce"]`
  - `highContrast=true` → `html[data-contrast="high"]`
  - `fontScale` → `--a11y-font-scale`（影响全站 rem 字阶）
- 同步：`CrossTabSync` 监听 `storage` 事件的 `a11y` key，并触发 `a11y:changed`
- 动效：`scripts/motion.js` 的 `Motion.animate()` 同时尊重用户偏好与系统 `prefers-reduced-motion`

## 变更历史
- [202512260005_infinite-evolution-ui](../../history/2025-12/202512260005_infinite-evolution-ui/) - StateHub/Prefetch/Telemetry/Http/Skeleton/NavigationTransitions 与多级筛选引擎
- [202601112017_quark-overhaul](../../history/2026-01/202601112017_quark-overhaul/) - Runtime 拆分与会员/关注/套装/订单旅程/策展模块
- [202601112230_accessibility-preferences](../../history/2026-01/202601112230_accessibility-preferences/) - 无障碍偏好中心（A11y）+ Motion 动效降级 + CrossTabSync 同步
- [202601120023_observability-standards](../../history/2026-01/202601120023_observability-standards/) - Logger/ErrorShield/PerfVitals 可观测性基座（本地日志/错误边界/性能埋点）
- [202601120102_diagnostics-center](../../history/2026-01/202601120102_diagnostics-center/) - 诊断中心（`account.html#diagnostics`）+ Command Palette 快捷入口
