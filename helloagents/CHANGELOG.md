# Changelog

本文件记录项目所有重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循项目既有的“缓存穿透版本号”风格（`YYYYMMDD.N`）。

## [Unreleased]

## [20260112.1] - 2026-01-12

### 新增
- 诊断中心：`account.html#diagnostics` 增加可观测性 UI（日志/错误/性能快照/Telemetry 队列），支持复制摘要、下载日志 JSON、导出备份与可选 Flush
- Command Palette：新增“打开诊断中心 / 打开错误报告”命令入口
- 测试：新增 `tests/error-shield.test.mjs` 与 `tests/perf-vitals.test.mjs`

### 变更
- UI：`styles/extensions.css` 补齐诊断中心原子组件样式（KPI/面板/日志详情）
- 版本：统一缓存穿透版本号 bump 到 `20260112.1`（HTML `?v=` 与 `sw.js` CACHE_NAME 强一致）

## [20260111.4] - 2026-01-11

### 新增
- Observability：新增 `Logger`（本地 ring buffer 日志）、`ErrorShield`（全局错误边界）、`PerfVitals`（性能埋点）
- 测试：新增 `tests/logger.test.mjs` 覆盖 Logger 的 ring buffer 与大对象保护逻辑

### 变更
- DataPortability：备份白名单补齐 `a11y`、`sbLogs`、`sbTelemetryQueue/sbTelemetryEndpoint`，并修复旧 telemetry key 命名不一致
- PWA/Guardrails：`sw.js` precache、`validate/check` 覆盖新增模块
- UI：错误面板复用 Glass Dialog 风格，并提供复制报告/导出备份/重置刷新入口

## [20260111.3] - 2026-01-11

### 新增
- Toast：可操作反馈升级（支持 action/关闭），并抽离为 `scripts/modules/toast.js`
- Cart：清空购物车/移除商品提供“撤销”入口（Toast action）

### 变更
- UI：Toast 样式结构化（icon/body/actions），并基于 `--glass-*` token 自动适配 Neo-Quark 与暗色主题
- PWA/Guardrails：`sw.js` precache、`validate/check` 补齐新模块覆盖

## [20260111.2] - 2026-01-11

### 新增
- 无障碍与偏好中心：在会员中心提供「减少动效 / 高对比 / 字体缩放（100%~125%）」并持久化到 `localStorage.a11y`

### 变更
- Motion：`scripts/motion.js` 的 `Motion.animate()` 自动尊重用户偏好与 `prefers-reduced-motion`
- PWA：`sw.js` precache 补齐 `scripts/modules/accessibility.js?v=...`
- 工程守护：`bump-version` 支持替换 `scripts/modules/*` 的版本号；`validate/check` 覆盖新增模块

### 修复
- 单测覆盖：补齐 `scripts/core.js` 的库存纯函数覆盖，恢复 `npm run test:coverage` 为 100%

## [20260111.1] - 2026-01-11

### 新增
- Runtime 拆分：新增 `StorageKit / StateHub / Perf` 三个运行时模块（schema 迁移、状态中心、性能工具）
- 业务扩展：库存/预售提示、套装优惠、会员等级、关注中心、订单旅程与售后、智能策展
- 视觉升级：Neo-Quark 视觉体系（霓虹渐变 + 玻璃拟态 + 未来感背景）

### 变更
- Cart/Checkout：引入套装与会员折扣行，配送费用支持会员权益
- Orders/Order Success：补齐订单费用明细、旅程时间轴与售后入口
- 工程守护：`sw.js` 预缓存新增 runtime 模块，`bump-version` 支持 runtime 版本替换，`validate` 校验 runtime 文件

### 修复
- Cart Summary：移除未定义积分变量，避免运行时异常

## [20260101.1] - 2026-01-01

### 新增
- Genesis Theme：新增第三主题变体（Light → Dark → Genesis）。Genesis 采用 `data-theme="dark"` + `data-variant="genesis"`，在复用暗色主题覆写的同时叠加霓虹/极光 token

### 变更
- UI Token：主色相关的 `rgba(31, 111, 235, …)` 收敛为 `rgba(var(--color-primary-rgb), …)`，使按钮光晕/徽章/边框在不同主题下保持一致
- Docs：README 作为“产品门户”补齐 ASCII 标题与 Emoji 功能清单，并更新主题切换说明

## [20251231.2] - 2025-12-31

### 变更
- Index：About/Contact 区块对齐 BEM 结构（`about__*` / `contact__*`），修复旧类名残留导致的样式漂移并提升可维护性
- CSS 清理：移除一批历史遗留的重复样式与无效变量引用（`header:not(.header)` / 旧 Hero / 旧 Gallery / 旧 About/Contact），降低样式冲突风险
- 渐进增强一致性：
  - `fade-in-up` 动效仅在 `html.js` 下生效，避免无 JS 环境被隐藏/错位
  - LazyLoad 样式与运行时类名对齐（`img.loaded/img.error`），避免 `lazyload.loaded` 无效分支

## [20251231.1] - 2025-12-31

### 新增
- PageModules（按页代码分割）：页面级模块迁移到 `scripts/pages/*.js`，运行时按 `Utils.getPageName()` 动态加载，避免非当前页面模块被解析/执行
- PWA 预缓存补齐：`sw.js` 的 `PRECACHE_URLS` 增加 `scripts/pages/*.js?v=...`，保证离线与首屏一致性

### 变更
- 工程守护升级：
  - `scripts/bump-version.mjs`：版本号替换覆盖 `scripts/pages/*`
  - `scripts/validate.mjs`：校验 `PRECACHE_URLS` 必须包含页面模块脚本
  - `package.json`：`npm run check` 覆盖 `scripts/pages/*.js`
- Runtime：`scripts/main.js` 增加 `PageModules` loader，并将原“页面模块”从单文件中拆分

## [20251229.2] - 2025-12-29

### 新增
- PDP Lightbox：商品详情页主图支持「点击/回车」打开大图预览（左右切换、缩略图选择、Esc/点击遮罩关闭、关闭后焦点回归）

### 变更
- Theme：`meta[name="theme-color"]` 不再硬编码，改为从 CSS Token 动态读取（浅色使用 `--color-primary`，深色使用 `--color-background-darker`）以保持与当前品牌配色一致
- Checkout UI：结算页表单控件统一玻璃拟态质感；支付方式卡片增加明确的 hover/selected 视觉反馈（`is-selected` + `:has()` 渐进增强）

## [20251229.1] - 2025-12-29

### 新增
- DataPortability：会员中心新增「数据管理」卡片，支持本地数据导出/导入/清空（JSON 备份，schema + 白名单校验）

### 变更
- App.init 按页初始化：页面级模块仅在对应页面执行；Diagnostics/CommandPalette 延后到空闲时初始化以降低首屏主线程压力
- 可选构建链路：移除 `terser` devDependency，Vite 构建压缩改为 `esbuild`（并保持 drop console/debugger 约束）

## [20251226.1] - 2025-12-26

### 新增
- Infinite Evolution Visual System（Phase 1）：黄金比例字阶/间距 token、12 列响应式栅格、动态阴影层级、毛玻璃 + 动态渐变边框、SVG 路径加载动画、Skeleton 样式
- StateHub（Phase 2）：统一事件中心 + atom（本地持久化 + `scope:changed` 订阅），并桥接到 `Utils.dispatch()`
- NavigationTransitions（Phase 2）：跨文档 View Transition 不支持时的站内跳转离场动效（WAAPI fallback）
- Http（Phase 3）：fetch 超时 + 429/5xx 退避重试 + GET 内存缓存
- Prefetch（Phase 3）：搜索/hover 预取（弱网/save-data 自动跳过）
- Telemetry（Phase 3）：用户行为埋点（默认仅本地队列；输入仅记录 hash/长度，避免保存原文）
- ProductListing 多级智能筛选（Phase 3）：高级筛选 Dialog + `plpFiltersV2` + pills 展示

### 变更
- Header 搜索建议：渲染时触发预取（搜索页 + top 2 详情页/首图），并补齐建议点击/搜索提交埋点
- ProductListing：首渲染自动 Skeleton，占位后再渲染真实内容；列表 hover 预取详情
- PWA：缓存穿透版本号升级到 `20251226.1`（HTML query + Service Worker cache name 同步）

### 修复
- Toast：补齐 `info/warning/error` 类型的边框样式

## [20251224.3] - 2025-12-24

### 新增
- VirtualScroll：零依赖窗口级虚拟滚动引擎 + 商品列表压测模式（`products.html?stress=100000`）
- Diagnostics：控制台“系统健康全景图”（FPS/LongTask/事件循环延迟/内存趋势）
- 二进制协议编解码（`scripts/core.js`）：为高频键提供 base64+二进制存储能力（SB_A1 / SB_C1）

### 变更
- `Utils.readStorageJSON()` / `Utils.writeStorageJSON()`：热路径键自动使用二进制前缀协议（向后兼容 JSON）
- `Cart.normalizeCartItems()`：允许仅存储 `{id, quantity}`，运行时自动从 `SharedData` 补齐价格/名称/图片
- `SharedData.getProductById()`：支持压测 ID（`__S` 后缀）映射回基础商品

### 安全
- 说明：不提供“运行态自脱壳/反逆向”类机制；敏感数据请在服务端保密并最小化前端暴露面

## [20251224.2] - 2025-12-24

### 新增
- Vite 极限构建链路（devDependencies）：支持多页面打包 + terser 压缩 + brotli/gzip 预压缩（输出到 `dist/`）
- postbuild 静态文件补齐：确保 `dist/` 具备运行时所需的 `assets/icons.svg` 与 `assets/images/*`（避免字符串路径引用导致资源缺失）

### 变更
- Runtime 去重抽象：剪贴板复制/事件分发/ID 生成统一收敛到 `Utils`
- HTML 运行时脚本统一升级为 `type="module"`（保证构建链路自洽）
- 校验脚本忽略构建产物目录，并强制 module 脚本约束，防止回归

## [20251224.1] - 2025-12-24

### 新增
- 本地 SVG Sprite 图标库：`assets/icons.svg`（替代运行时外部 Icon CDN）
- 命令面板：`Ctrl/Cmd + K` 打开（快速跳转/搜索/复制链接/切换主题）

### 变更
- 全站移除运行时第三方 CDN（字体/图标），改为系统字体栈 + 本地图标
- 校验脚本增加“禁止外部 CDN”守护规则（避免回归）

### 修复
- `scripts/main.js` 中遗留的 Font Awesome 图标注入与切换逻辑，统一迁移到 SVG Sprite
