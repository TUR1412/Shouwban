# 技术设计: Infinite Evolution Protocol（UI/交互/功能基座）

## 技术方案

### 核心技术
- **样式系统:** `styles/main.css` + `styles/extensions.css`（CSS Variables / `:where()` / `@supports` / View Transition）
- **动效:** Web Animations API（通过 `scripts/motion.js` 的 `Motion.animate()` 统一封装）
- **状态:** `StateHub`（事件 + atom），兼容原有 `Utils.dispatch()` / `Utils.dispatchChanged()`
- **预取:** `<link rel="prefetch/preload">`（弱网/save-data 自动跳过）
- **埋点:** 本地队列 + 可选 endpoint 上报（默认不上传）
- **请求层:** `Http`（fetch + 超时 + 退避重试 + GET 内存缓存）

### 实现要点
1. **视觉系统（Phase 1）**
   - 在 `styles/extensions.css` 增加 token：
     - `--phi / --phi-inv`：黄金比例字阶/间距基础
     - `--shadow-elev-1..5`：动态阴影层级（带品牌色光晕）
     - `--glass-*`：毛玻璃参数与边框
     - `--border-gradient-*`：渐变边框基座
   - 增加 12 列栅格：
     - `.grid-12` + `.col-span-*` + `.col-{bp}-*`
   - 自动注入毛玻璃与渐变边框到主要容器：
     - 使用 `:where(.product-card, .cart-summary, ...)` 统一套用，不需要逐页改 HTML
   - 新增:
     - `.svg-path-loader`：路径描边加载动效
     - `.skeleton*`：骨架屏通用样式
     - `.nav-transition-layer`：站内离场转场遮罩（fallback）

2. **交互逻辑（Phase 2）**
   - `StateHub`：
     - `StateHub.on/off/emit`：轻量事件中心
     - `StateHub.atom(key, fallback, {scope})`：封装 localStorage 读写 + `scope:changed` 订阅
     - 桥接：对 `Utils.dispatch()` 做包装，向后兼容现有 window CustomEvent
   - Skeleton：
     - `Skeleton.withGridSkeleton(grid, task)`：先绘制 skeleton（rAF），再渲染真实内容
     - 接入 `ProductListing` 首次渲染与 `Homepage` 策展/精选区块
   - 转场：
     - `ViewTransitions`（已存在）：在支持 View Transition 时启用共享元素跨页连续性
     - `NavigationTransitions`（新增）：不支持 View Transition 的浏览器拦截站内跳转，播放离场遮罩（WAAPI）

3. **功能矩阵（Phase 3）**
   - 多级智能筛选引擎：
     - `plpFiltersV2`：存储组合筛选条件（categories/tags/status/rarity/price/rating）
     - 高级筛选 Dialog（`filter-dialog`）：实时预览匹配数量，应用后更新列表与 pills
   - 实时搜索预提取：
     - 搜索建议渲染时，预取 `products.html?query=...` 与 top 2 详情页/图片
     - 商品列表 hover 预取详情页/首图
   - 用户行为埋点：
     - `Telemetry.track()` 写入本地队列
     - 对用户输入仅记录 `qHash/qLen`，避免存原文
     - endpoint 可通过以下方式配置：
       - `meta[name="shouwban-telemetry-endpoint"]`
       - `localStorage.sbTelemetryEndpoint`
       - `window.__SHOUWBAN_TELEMETRY__.endpoint`
   - 请求层：
     - `Http.request()`：超时 + 429/5xx 重试 + GET 内存缓存（ttl）

## 安全与性能
- **安全:**
  - 埋点默认不上传；如配置 endpoint，建议服务端进行限流/签名/脱敏
  - 预取遵循 save-data/弱网判断，避免带宽滥用
- **性能:**
  - VirtualScroll 已覆盖海量数据场景（`?stress=...` / `?virtual=1`）
  - Skeleton 仅首渲染启用，减少频繁重绘
  - 转场遮罩仅在不支持 View Transition 时启用，避免双重动效

## 测试与验证
- `npm run verify`（包含：语法检查 + 结构/引用/版本一致性校验 + node --test）
- 手动验证建议：
  - `products.html` → “高级筛选”打开/应用/重置
  - Header 搜索建议：出现后 hover 预取、点击进入详情
  - `?stress=100000`：虚拟滚动与性能表现

