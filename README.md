# Shouwban / 塑梦潮玩

> **Quartz UI** · Apple/Vercel 级视觉质感 + 微交互体系  
> **纯静态 MPA（HTML/CSS/JS）+ PWA（Service Worker）+ 原生零依赖 Runtime**

本仓库以“**不破坏核心运行时与业务逻辑**”为前提，把算力聚焦在 **视觉层级、交互动效、可访问性与性能守护**：  
从按钮按压、卡片悬停、标签切换、页面转场到加载态，都尽量做到 **物理直觉、丝滑（60FPS 友好）**。

---

## 预览（Preview）

<table>
  <tr>
    <td><img src="assets/demos/cinematic-menu.gif" alt="Cinematic menu demo" width="420" /></td>
    <td><img src="assets/demos/rewards-center.gif" alt="Rewards center demo" width="420" /></td>
  </tr>
  <tr>
    <td><img src="assets/demos/price-alerts.gif" alt="Price alerts demo" width="420" /></td>
    <td><img src="assets/images/hero-placeholder.svg" alt="Hero placeholder" width="420" /></td>
  </tr>
</table>

---

## 中文（ZH）

### 你会看到什么
- **Quartz UI 视觉系统**：中性底色 + 玻璃拟态 + 精准阴影层级（更像 Apple/Vercel 的“硬件质感”）。
- **微交互（Micro-interactions）**：hover / press / focus / loading 的统一动效语言（以 transform/opacity 为主，60FPS 友好）。
- **物理级动效引擎（渐进增强）**：`scripts/motion.js` 新增 `Motion.spring()`，用于“弹簧”式关键帧生成（WAAPI）。
- **MPA View Transitions（渐进增强）**：跨页导航过渡与共享元素连续性（不支持的浏览器自动降级）。
- **三态主题**：Light → Dark → Genesis（暗色基座 + 变体 token）。
- **无障碍与偏好中心**：减少动效 / 高对比 / 字体缩放（100%~125%）。
- **PWA**：预缓存 + 离线兜底页，导航请求 network-first。

### 快速开始
1. 安装依赖：`npm install`
2. 本地开发：`npm run dev`
3. 构建产物：`npm run build`

### 校验与测试（推荐）
- 语法检查：`npm run check`
- 结构校验：`npm run validate`（资源引用、版本号一致性、SW precache 覆盖等）
- 完整校验：`npm run verify`
- 单元测试：`npm test`
- 覆盖率守护：`npm run test:coverage`（`scripts/core.js` 100% 覆盖率）
- 性能预算：`npm run budget`（基于 dist gzip 体积阈值，捕捉 bundle 膨胀回退）
- Lighthouse：`npm run lighthouse`（需要本机可用的 Chrome/Chromium；CI 已集成）

### 项目结构（UI/逻辑分离）
- `*.html`：多页面入口（MPA）
- `styles/main.css`：基础变量、布局、组件样式
- `styles/extensions.css`：主题覆盖 + 高级视觉层（Quartz UI / View Transitions / Skeleton / Dialog 等）
- `scripts/motion.js`：本地 Motion-lite（WAAPI）+ `Motion.spring()`（物理级动效）
- `scripts/main.js`：运行时入口（模块聚合 + PageModules loader）
- `scripts/pages/`：按页面拆分的交互逻辑（动态加载，真正代码分割）
- `scripts/modules/`：跨页面模块（A11y/Toast/SEO/Telemetry/Diagnostics 等）
- `sw.js`：PWA 缓存与离线策略

---

## English

### What you get
- **Quartz UI**: neutral palettes + glass surfaces + precise elevation (Apple/Vercel-like “hardware feel”).
- **Micro-interactions**: a consistent motion language for hover/press/focus/loading (transform/opacity first, 60FPS-friendly).
- **Physics-grade motion (progressive enhancement)**: `scripts/motion.js` adds `Motion.spring()` to generate damped-spring keyframes (WAAPI).
- **MPA View Transitions**: navigation transitions & shared-element continuity with graceful fallback.
- **3-state Theme**: Light → Dark → Genesis (dark base + variant tokens).
- **A11y & Preferences**: reduce motion / high contrast / font scaling (100%~125%).
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
- Perf budget: `npm run budget`
- Lighthouse: `npm run lighthouse` (requires Chrome/Chromium locally; enabled in CI)
