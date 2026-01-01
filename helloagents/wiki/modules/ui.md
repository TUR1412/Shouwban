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

## 视觉系统（Phase 1）核心约定

### Token（CSS Variables）
`styles/extensions.css` 在不破坏 `styles/main.css` 既有变量的前提下新增了一组“可复用 token”：
- `--phi / --phi-inv`：黄金比例字阶/间距基座
- `--shadow-elev-1..5`：动态阴影层级（含轻微品牌色光晕）
- `--glass-*`：毛玻璃参数（blur/saturate/bg/border）
- `--border-gradient / --border-gradient-soft`：动态渐变边框基座

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

### 高级筛选 Dialog（PLP）
`styles/extensions.css` 增加以下结构类以配合 `ProductListing` 的高级筛选对话框：
- `.filter-dialog` / `.filter-dialog__content`
- `.filter-section` / `.filter-section__title`
- `.filter-options` / `.filter-option`
- `.filter-range` / `.filter-range__sep`

## 约定
- SVG 图标统一使用 `<svg class="icon"><use ...></use></svg>`，尺寸随 `font-size` 继承
- Footer 社交按钮使用“按钮化”外观（固定尺寸、边框与 hover 状态）

## UI 注入点（运行时）
- PDP Lightbox：`scripts/main.js` 的 PDP 模块会按需注入 `<dialog class="lightbox-dialog">`，支持点击主图/键盘 Enter 打开大图预览（左右键切换、缩略图选择）
- Checkout 支付方式选中态：结算页通过 `.payment-option.is-selected`（JS 注入）与 `:has(input:checked)`（CSS 渐进增强）共同提供稳定的选中态视觉反馈
- Theme Color：主题切换时会动态更新 `meta[name="theme-color"]`，从 CSS Token 读取，确保浏览器 UI（地址栏/状态栏）与站点配色一致
- Genesis Theme：三态主题切换（Light → Dark → Genesis），其中 Genesis 采用 `data-theme="dark"` + `data-variant="genesis"` 的表达方式，以复用暗色主题覆写并叠加霓虹/极光 token

## 变更历史
- [202512260005_infinite-evolution-ui](../../history/2025-12/202512260005_infinite-evolution-ui/) - 视觉系统（玻璃/渐变/栅格）与 Skeleton/转场基础设施
