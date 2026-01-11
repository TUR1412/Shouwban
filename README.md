# Shouwban · 塑梦潮玩

一个以“手办收藏体验”为核心的高质感前端样板：**纯静态站点（多页面 HTML/CSS/JS）+ PWA（Service Worker）+ 原生零依赖 Runtime**。
目标是以“保留核心架构、不破坏原逻辑根基”为前提，演示商业化电商站点在 **交互、性能、可维护性、离线与可访问性** 维度的最佳实践组合。

---

## 中文（ZH）

### 功能亮点（摘选）
- **会员体系**：积分 → 等级 → 权益闭环（折扣、包邮门槛等）。
- **关注中心**：收藏 / 降价 / 到货提醒统一视图，趋势记录贯穿详情页。
- **套装策略**：组合购推荐 + 套装折扣 + 购物车一键移除。
- **订单旅程**：订单时间轴 + 售后入口，完整还原下单生命周期。
- **智能策展**：基于浏览/收藏/品类偏好生成推荐。
- **三态主题**：Light → Dark → Genesis（暗色基座 + 变体 token）。
- **无障碍与偏好中心（新增）**：减少动效 / 高对比模式 / 字体缩放（100%~125%）。
- **可操作 Toast（新增）**：关键操作反馈支持“撤销”（如购物车清空/移除），并提供关闭入口。
- **可观测性（新增）**：`ErrorShield` 全局错误边界 + `Logger` 本地日志 + `PerfVitals` 性能埋点（默认本地，按需对接 endpoint）。
- **诊断中心（新增）**：`account.html#diagnostics` 一站式查看日志/错误/性能快照，支持复制摘要、下载日志 JSON、配置 Telemetry endpoint（可选）。
- **性能薄启动（新增）**：非关键模块（诊断/PWA/动效等）延后到 idle 初始化，并预加载 `assets/icons.svg` 降低首屏请求链路。
- **工具模块懒加载（新增）**：Diagnostics / Command Palette 抽离为独立模块，触发时动态加载，进一步降低首屏 JS 解析成本。
- **Lighthouse CI（新增）**：对关键页面做性能/可访问性/SEO 回归门禁（CI 自动产出报告，避免性能回退无感发生）。
- **SEO（新增）**：全站 Canonical 兜底（去 hash、保留 query）+ PDP Product/BreadcrumbList JSON-LD + PLP ItemList JSON-LD（InStock/OutOfStock/PreOrder），增强权重聚合与富结果可解释性。
- **PWA**：预缓存 + 离线兜底页，导航请求 network-first。

### 快速开始
1. 安装依赖：`npm install`
2. 本地开发：`npm run dev`
3. 构建产物：`npm run build`

### 校验与测试
- 语法检查：`npm run check`
- 结构校验：`npm run validate`（资源引用、版本号一致性、SW precache 覆盖等）    
- 完整校验：`npm run verify`
- 单元测试：`npm test`
- 覆盖率守护：`npm run test:coverage`（`scripts/core.js` 100% 覆盖率）
- 性能预算：`npm run budget`（基于 dist 的 gzip 体积阈值，稳定捕捉 bundle 膨胀回退）
- Lighthouse：`npm run lighthouse`（需要本机可用的 Chrome/Chromium；CI 已集成）

### 部署（建议）
本仓库支持两种部署形态：
1. **根目录静态部署（推荐演示一致性）**：直接托管仓库根目录文件（HTML 内含 `?v=YYYYMMDD.N` 缓存穿透版本）。
2. **Vite 构建产物（产物更小）**：`npm run build` 输出到 `dist/`，并会生成 `dist/sw.js`（dist 形态同样具备 PWA 离线兜底能力）。

### 项目结构
- `index.html` / `*.html`：多页面入口（MPA）
- `styles/main.css`：基础变量、布局与组件样式
- `styles/extensions.css`：扩展组件皮肤、主题覆盖与高级特性（View Transitions、content-visibility 等）
- `scripts/main.js`：运行时入口（模块聚合 + PageModules loader + App.init）
- `scripts/runtime/`：运行时内核（StateHub / StorageKit / PerfKit）
- `scripts/pages/`：按页面拆分的交互逻辑（动态加载，实现真正代码分割）
- `scripts/modules/`：跨页面的扩展模块（如 Accessibility）
- `sw.js`：PWA 缓存与离线策略

### 无障碍与偏好中心（A11y）
- 存储键：`localStorage.a11y`
- 映射：
  - `reduceMotion=true` → `html[data-motion="reduce"]`
  - `highContrast=true` → `html[data-contrast="high"]`
  - `fontScale` → `--a11y-font-scale`（影响全站 rem 字阶）
- 动效：`scripts/motion.js` 会同时尊重用户偏好与系统 `prefers-reduced-motion`。

---

## English

### Highlights (Selected)
- **Membership**: points → tiers → benefits (discounts, shipping perks, etc.).
- **Watch Center**: favorites + price alerts + restock alerts in one dashboard.
- **Bundling Strategy**: bundle recommendations + bundle discounts + one-click removal.
- **Order Journey**: a visual timeline + after-sales entry for the whole lifecycle.
- **Smart Curation**: behavior-driven recommendations.
- **3-state Theme**: Light → Dark → Genesis (dark base + variant tokens).       
- **A11y & Preferences (NEW)**: reduce motion / high contrast / font scaling (100%~125%).
- **Actionable Toasts (NEW)**: undo for destructive actions (e.g., cart clear/remove) with dismiss support.
- **Observability (NEW)**: `ErrorShield` (error boundary) + local `Logger` + `PerfVitals` telemetry (local-first; optional endpoint).
- **Diagnostics Center (NEW)**: `account.html#diagnostics` to inspect logs/errors/perf snapshot, copy a report, download logs JSON, and optionally configure a telemetry endpoint.
- **Thin Startup (NEW)**: defers non-critical modules (diagnostics/PWA/animations) to idle time and preloads `assets/icons.svg` to reduce first-load request chaining.
- **Lazy Tooling Modules (NEW)**: splits Diagnostics / Command Palette out of `main.js` and dynamically loads them on demand to further reduce first-load JS parsing.
- **Lighthouse CI (NEW)**: CI regression gate for performance/a11y/SEO on key pages (report as artifact).
- **SEO (NEW)**: runtime canonical fallback (hash-stripped; query-preserved) + Product/BreadcrumbList JSON-LD on PDP + ItemList JSON-LD on PLP (InStock/OutOfStock/PreOrder availability).
- **PWA**: precache + offline fallback, network-first navigation.

### Quick Start
1. Install: `npm install`
2. Dev: `npm run dev`
3. Build: `npm run build`

### Validation & Tests
- Syntax: `npm run check`
- Structure validation: `npm run validate`
- Full verify: `npm run verify`
- Unit tests: `npm test`
- Coverage guardrail: `npm run test:coverage` (100% for `scripts/core.js`)
- Perf budget: `npm run budget` (gzip size thresholds based on dist outputs; stable bundle regression guardrail)
- Lighthouse: `npm run lighthouse` (requires Chrome/Chromium locally; enabled in CI)

### Structure
- `*.html`: multi-page entries (MPA)
- `styles/`: base styles + extensions/theme layer
- `scripts/main.js`: runtime entry (module aggregation + PageModules loader)
- `scripts/runtime/`: runtime kernels (State / Storage / Perf)
- `scripts/pages/`: page-level modules (lazy-loaded)
- `scripts/modules/`: shared feature modules (e.g. Accessibility)
- `sw.js`: service worker (PWA caching & offline)
