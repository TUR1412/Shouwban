# UI / Styles 模块

## 职责
- 定义视觉变量（颜色、间距、字体栈等）
- 组件样式与响应式布局
- 深色/浅色/Genesis 主题表现（Genesis 为暗色基座 + 变体 token）
- 玻璃拟态（Glassmorphism）与动效的视觉配合
- Infinite Evolution Visual System：12 列栅格 / 动态阴影层级 / 黄金比例字阶与间距 / 渐变边框 / Skeleton

## 关键文件
- `styles/main.css`：基础变量、布局、组件样式
- `styles/extensions.css`：扩展组件（收藏/对比/订单/对话框/命令面板等）
- `assets/icons.svg`：本地 SVG Sprite（替代外部 Icon CDN）
- `scripts/modules/toast.js`：全局反馈 Toast（可操作 action/关闭，事件驱动）

## 视觉系统（Phase 1）核心约定

### Token（CSS Variables）
`styles/extensions.css` 在不破坏 `styles/main.css` 既有变量的前提下新增了一组“可复用 token”：
- `--phi / --phi-inv`：黄金比例字阶/间距基座
- `--shadow-elev-1..5`：动态阴影层级（含轻微品牌色光晕）
- `--glass-*`：毛玻璃参数（blur/saturate/bg/border）
- `--border-gradient / --border-gradient-soft`：动态渐变边框基座
- `--spotlight-*`：Spotlight 光斑 token（尺寸/强度/stop 等），与 `--spotlight-x/--spotlight-y`（运行时写入位置）配合提供统一“动态高光”语言
- `--spotlight-icon-*`：小尺寸控件的 Spotlight token（用于 close/back-to-top/导航按钮等更“紧凑”的光学高光）
- `--a11y-font-scale`：字体缩放系数（映射到全站 rem 字阶，范围受控）

### 12 列响应式栅格
- `.grid-12`：12 列容器
- `.col-span-1..12`：默认列跨度
- `.col-{bp}-1..12`：断点列跨度（bp: `sm/md/lg/xl`）

### 毛玻璃 + 渐变边框“容器注入”
- `styles/extensions.css` 使用 `:where(.product-card, .cart-summary, ...)` 将毛玻璃与渐变边框自动套用到主要 UI 容器
- 如需要显式套用，可在任意容器上添加：
  - `.evolve-surface`（毛玻璃 + 渐变边框）
  - `.evolve-surface--strong`（更强的玻璃与边框）
  - `.elev-1..5`（强制阴影层级）

### 组件化动效视觉
- SVG 路径加载：`.svg-path-loader`（描边 draw 动效）
- Skeleton：`.skeleton` / `.skeleton-card` / `.skeleton-line`
- 页面转场遮罩：`.nav-transition-layer`（仅在 JS fallback 时注入）

## 视觉升级（Neo-Quark）
- 未来感渐变背景 + 细网格纹理
- 玻璃拟态强化（透明卡片 + 柔和高光）
- 新字体栈与更高对比度的标题排版
- 新增组件皮肤：库存面板、套装卡片、关注中心、会员卡片、订单旅程

## 视觉升级（Quartz UI Reskin）
- 目标：对标 Apple / Vercel 的“中性底色 + 精准层级 + 硬件质感”审美，尽量减少 “ 花哨” 干扰，把视觉与交互聚焦到可读性与可信赖的反馈上。
- Token：在 `styles/extensions.css` 追加 Quartz 设计 token（颜色/阴影/圆角/动效曲线），并统一覆盖关键容器（卡片/对话框/Toast/筛选条/面包屑等）的玻璃与边框表述。
- Motion：在 `scripts/motion.js` 增量扩展 `Motion.spring()`（阻尼弹簧关键帧生成，WAAPI 渐进增强），用于物理级微交互（例如首页策展 Tab 指示器）。
- Spotlight：按钮/胶囊与关键玻璃容器的高光层支持跟随鼠标位置的动态光斑（CSS `::before/::after` + `--spotlight-x/--spotlight-y`），并通过 `--spotlight-*` token 统一管理尺寸/强度；已覆盖 `.filter-option`、`.pagination__link`、`.breadcrumb__link`、`.remove-btn`、`.add-to-cart-btn`、`.view-toggle__btn` 等高频交互点，在减少动效时保持静态（渐进增强，不影响业务逻辑）。
- Spotlight（扩展）：策展 Tab（`.curation-tab`）加入动态光斑与 hover/focus 光学高光，保持与 Quartz 按钮/胶囊一致的“硬件级反馈”语言。
- Surface Spotlight（扩展）：对比表容器 `.compare-table-wrap` 与订单卡 `.order-card` 纳入 Surface Spotlight（`::after` + `--spotlight-x/--spotlight-y`），让对比/订单页的玻璃表面反馈与首页/购物车保持一致。
- Segmented Control：对 `.view-toggle` 追加 `:has()` 渐进增强的滑动选中底板，让“切换视图”更接近 iOS 的分段控件反馈；不支持 `:has()` 的浏览器自动回退到既有样式（不影响业务逻辑）。
- A11y：沿用 `html[data-motion="reduce"]` 与系统 `prefers-reduced-motion`，确保动效降级可控；Focus ring 统一提升可见性并尊重高对比模式。

- 精修：修复 `Motion.spring()` 在仅动画部分 transform 分量（如仅 `x/width`）时的“未声明分量归零/归一”跳变；补齐 `--transition-fast/--transition-base` 与高对比 `--glass-bg/--focus-ring`，并补充 Header 导航 underline hover 微交互、滚动条皮肤与 Tabs 指示器 `will-change`（纯视觉/动效层，不影响核心业务逻辑）。

- 动效：Dialog/Toast 物理级入场与产品媒体 Hover Zoom：`glass-dialog` pop-in + backdrop fade-in、Toast 轻微缩放+blur→clear、产品卡片与 PDP 主图 hover zoom（均在 `prefers-reduced-motion` 下自动降级）。
- A11y：Cross-Document View Transitions 同时尊重系统 `prefers-reduced-motion` 与用户显式 `html[data-motion="reduce"]`（reduce 时禁用共享元素命名并关闭 View Transition pseudo-elements 动画）。
- 动效引擎：`Motion.animate()` 的 transform 简写（`x/y/scale/rotate`）保留未声明分量，避免 hover/press 等叠加交互时 transform 被重置；`flyToCart` 升级为抛物线飞入 + 购物车入口 pulse。

### 高级筛选 Dialog（PLP）
`styles/extensions.css` 增加以下结构类以配合 `ProductListing` 的高级筛选对话框：
- `.filter-dialog` / `.filter-dialog__content`
- `.filter-section` / `.filter-section__title`
- `.filter-options` / `.filter-option`
- `.filter-range` / `.filter-range__sep`

## 约定
- SVG 图标统一使用 `<svg class="icon"><use ...></use></svg>`，尺寸随 `font-size` 继承
- Footer 社交按钮使用“按钮化”外观（固定尺寸、边框与 hover 状态）

## SEO / LCP 约定
- Canonical：运行时兜底补齐 `link[rel="canonical"]`（去 hash、保留 query），减少 URL 变体造成的重复内容噪声。
- Product JSON-LD：商品详情页会写入 `#product-jsonld`（`availability` 支持 InStock/OutOfStock/PreOrder，并可选输出 `availabilityStarts`）。
- Hero LCP：首页首屏关键图显式声明 `loading="eager"`、`decoding="async"` 与 `fetchpriority`（渐进增强，不改变布局/视觉）。

## UI 注入点（运行时）
- PDP Lightbox：`scripts/main.js` 的 PDP 模块会按需注入 `<dialog class="lightbox-dialog">`，支持点击主图/键盘 Enter 打开大图预览（左右键切换、缩略图选择）
- PDP 库存面板：`product-detail.html` + `product-detail.js` 动态写入库存状态与预售提示
- PDP 组合购推荐：`bundle-deals` + `bundle-card` 动态渲染套装权益
- PDP 智能策展：`smart-curation` 卡片网格由 `SmartCuration` 渲染
- 会员中心关注中心：`watch-center` 列表动态渲染关注/降价/到货状态
- 订单旅程：`orders.js` + `order-success.js` 写入 `order-journey` 时间轴
- Checkout 支付方式选中态：结算页通过 `.payment-option.is-selected`（JS 注入）与 `:has(input:checked)`（CSS 渐进增强）共同提供稳定的选中态视觉反馈
- Toast：`scripts/modules/toast.js` 会注入 `.toast-container` 并统一承接 `toast:show` 事件（支持 action/关闭）
- ErrorShield：`scripts/modules/error-shield.js` 会按需注入 `.glass-dialog.error-shield-dialog` 错误面板（复制报告/导出备份/重置刷新）
- 会员中心诊断中心：`account.html#diagnostics` 将 `Logger / ErrorShield / PerfVitals / Telemetry` 汇聚为可视化面板（本地日志/错误摘要/性能快照/可选上报）
- Theme Color：主题切换时会动态更新 `meta[name="theme-color"]`，从 CSS Token 读取，确保浏览器 UI（地址栏/状态栏）与站点配色一致
- Genesis Theme：三态主题切换（Light → Dark → Genesis），其中 Genesis 采用 `data-theme="dark"` + `data-variant="genesis"` 的表达方式，以复用暗色主题覆写并叠加霓虹/极光 token

## 无障碍与偏好（A11y）
`styles/extensions.css` 提供用户级偏好映射（配合 `scripts/modules/accessibility.js`）：
- `html[data-motion="reduce"]`：减少动效（兜底关闭 CSS animation/transition，并与 `prefers-reduced-motion` 协同）
- `html[data-cinematic="on"]`：Cinematic 动效启用标记（Motion 可用且未开启减少动效时设置；用于避免 CSS `:active { transform: ... }` 与按压动画冲突，并由 Motion 统一接管 press feedback / hover lift 等微交互）
- `html[data-contrast="high"]`：高对比模式（增强 glass/bg/border 与 focus ring 可读性）
- `--a11y-font-scale`：字体缩放（100%~125%）

## 变更历史
- [202512260005_infinite-evolution-ui](../../history/2025-12/202512260005_infinite-evolution-ui/) - 视觉系统（玻璃/渐变/栅格）与 Skeleton/转场基础设施
- [202601112017_quark-overhaul](../../history/2026-01/202601112017_quark-overhaul/) - Neo-Quark 视觉升级与新业务组件样式
- [202601112230_accessibility-preferences](../../history/2026-01/202601112230_accessibility-preferences/) - 无障碍偏好中心（减少动效/高对比/字体缩放）
- [202601112345_actionable-toast-undo](../../history/2026-01/202601112345_actionable-toast-undo/) - 可操作 Toast 与购物车撤销交互
- [202601120023_observability-standards](../../history/2026-01/202601120023_observability-standards/) - ErrorShield 错误面板（Glass Dialog）与可观测性 UI 基座
- [202601120102_diagnostics-center](../../history/2026-01/202601120102_diagnostics-center/) - 会员中心诊断中心（日志/错误/性能快照/Telemetry）与可执行操作入口  
- [202601120341_seo-canonical-structured-data](../../history/2026-01/202601120341_seo-canonical-structured-data/) - SEO（canonical / Product JSON-LD）与首页 Hero LCP 提示（渐进增强）
- [202601121230_quartz-ui-reskin](../../history/2026-01/202601121230_quartz-ui-reskin/) - Quartz UI Reskin（Apple/Vercel）+ Motion.spring 微交互
- [202601130626_quartz-ui-polish](../../history/2026-01/202601130626_quartz-ui-polish/) - Quartz UI 精修（High Contrast / Theme Color / Motion.spring transform）
- [202601130645_quartz-motion-microinteractions](../../history/2026-01/202601130645_quartz-motion-microinteractions/) - Quartz Motion 微交互升级（Dialog/Toast 物理入场 + Product hover zoom）
- [202601130703_vt-reduced-motion-guardrail](../../history/2026-01/202601130703_vt-reduced-motion-guardrail/) - View Transitions 减少动效兜底（html[data-motion="reduce"]）
- [202601130719_motion-transform-flytocart](../../history/2026-01/202601130719_motion-transform-flytocart/) - Motion.animate transform 保持分量 + flyToCart 抛物线微交互
