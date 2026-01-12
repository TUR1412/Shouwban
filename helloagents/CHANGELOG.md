# Changelog

本文件记录项目所有重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循项目既有的“缓存穿透版本号”风格（`YYYYMMDD.N`）。

## [Unreleased]

### 新增
- Tooling：新增 `scripts/perf-budget.mjs` 与 `npm run budget`（基于 dist gzip 体积阈值的稳定回归门禁）

### 变更
- Lighthouse：`npm run lighthouse` 串联 `build → budget → lhci`，在 CI 中先做体积预算守护再执行 Lighthouse 回归

## [20260112.16] - 2026-01-12

### 修复
- A11y：补齐 View Transitions 的“减少动效”兜底：当 `html[data-motion="reduce"]` 时，禁用共享元素命名并关闭 View Transition pseudo-elements 动画，避免导航过渡违背用户偏好

### 变更
- 版本：统一缓存穿透版本号 bump 到 `20260112.16`

## [20260112.15] - 2026-01-12

### 新增
- UI：Dialog 物理级入场：`glass-dialog` 与 `::backdrop` 在 `prefers-reduced-motion: no-preference` 下启用 pop-in + fade-in（渐进增强，不改业务逻辑）
- UI：商品媒体 Hover Zoom：产品卡片与 PDP 主图在 `hover/pointer: fine` 下增加轻微缩放与饱和度微交互（以 transform/filter 为主，60FPS 友好）

### 变更
- UI：Toast 入场动效升级：加入轻微缩放与 blur→clear 过渡，统一到 Quartz motion token，并在 `prefers-reduced-motion` 下自动降级
- UI：Dialog Backdrop：统一为 Quartz 的更深遮罩与更强 blur/saturate（更接近系统级层级感）
- 版本：统一缓存穿透版本号 bump 到 `20260112.15`

## [20260112.14] - 2026-01-12

### 修复
- Motion：修复 `Motion.spring()` 在只动画部分 transform 分量（例如仅 `x/width`）时会把未声明分量强制归零/归一的问题；现在会保持既有 transform 分量不变（更符合物理直觉，避免跳变）

### 变更
- UI：Quartz 视觉精修：补齐 `--transition-fast/--transition-base`，高对比模式下对齐 `--glass-bg` 与 `--focus-ring`，并补充 Header 导航下划线 hover 微交互与滚动条皮肤（不影响业务逻辑）
- PWA：统一 `manifest.webmanifest` 与各页面 `<meta name="theme-color">` 的默认配色到 `#0A84FF`
- 版本：统一缓存穿透版本号 bump 到 `20260112.14`

## [20260112.13] - 2026-01-12

### 新增
- UI：Quartz UI Reskin（Apple/Vercel 风格）—— 在 `styles/extensions.css` 落地新一组中性 token（颜色/阴影/圆角/动效曲线）并覆盖关键容器皮肤
- Motion：`scripts/motion.js` 增量扩展 `Motion.spring()`（阻尼弹簧关键帧生成，WAAPI 渐进增强），用于物理级微交互
- 交互：首页策展 Tabs 指示器优先使用 `Motion.spring()`（无支持时自动回退到 `Motion.animate()` / CSS transition）
- 文档：重制双语 README（聚焦 Quartz UI 与微交互体系）

### 变更
- 版本：统一缓存穿透版本号 bump 到 `20260112.13`

## [20260112.12] - 2026-01-12

### 新增
- Observability：`ErrorShield` 增量扩展 `capture()` API，用于记录“已被捕获但不会抛出”的异常（进入 Logger/Telemetry 闭环）

### 变更
- Runtime：PageModules 动态 import 失败会写入 ErrorShield（保留原 Toast 提示，渐进增强不影响主流程）
- SEO：PDP/PLP 页面级 JSON-LD upsert 优先复用 `Seo.upsertJsonLd()` + URL 规范化逻辑，降低重复实现与不一致风险
- 测试/文档：扩展 ErrorShield 单测与 SEO 模块文档
- 版本：统一缓存穿透版本号 bump 到 `20260112.12`

## [20260112.11] - 2026-01-12

### 新增
- SEO：JSON-LD 实体关联：为 `WebSite.publisher` 与 `Organization.@id` 建立稳定引用（`<index.html>#organization`）

### 变更
- SEO：PDP `Product.brand` 增补 `@id` 与站点级 `Organization` 对齐，减少实体歧义（渐进增强）
- 测试/文档：扩展 SEO 单测与模块文档
- 版本：统一缓存穿透版本号 bump 到 `20260112.11`

## [20260112.10] - 2026-01-12

### 新增
- SEO：全站新增 `Organization` JSON-LD（`#organization-jsonld`），补齐站点主体/品牌信息（可选 logo/sameAs）

### 变更
- SEO：`scripts/main.js` 启动期调用 `Seo.upsertOrganizationJsonLd()`，与 Canonical 规则一致（渐进增强）
- 测试/文档：扩展 SEO 单测与模块文档，README 补齐能力说明
- 版本：统一缓存穿透版本号 bump 到 `20260112.10`

## [20260112.9] - 2026-01-12

### 新增
- SEO：全站新增 `WebSite` + `SearchAction` JSON-LD（`#website-jsonld`），指向 `products.html?query={search_term_string}` 的站内搜索入口
- SEO：商品列表页新增 `BreadcrumbList` JSON-LD（`#plp-breadcrumbs-jsonld`），与页面模式一致（all/category/search/favorites）

### 变更
- SEO：`scripts/modules/seo.js` 增量扩展 `upsertJsonLd/upsertWebSiteJsonLd`，并在 `scripts/main.js` 启动期调用
- 文档：更新 SEO 模块约定与 README 能力说明
- 版本：统一缓存穿透版本号 bump 到 `20260112.9`

## [20260112.8] - 2026-01-12

### 新增
- SEO：商品详情页新增 BreadcrumbList JSON-LD（`#breadcrumbs-jsonld`）
- SEO：商品列表页新增 ItemList JSON-LD（`#itemlist-jsonld`）
- 文档：新增 `helloagents/wiki/modules/seo.md`（SEO 模块与结构化数据约定）

### 变更
- 文档：`README.md` 补齐 SEO 富结果能力说明
- 版本：统一缓存穿透版本号 bump 到 `20260112.8`

## [20260112.7] - 2026-01-12

### 新增
- SEO：新增 `scripts/modules/seo.js`（Canonical 兜底模块化，支持依赖注入便于测试）
- 测试：新增 `tests/seo.test.mjs` 覆盖 Canonical 规则与 upsert 行为

### 变更
- SEO：`scripts/main.js` 改为使用 SEO 模块（保持 `?v=` 版本一致性）
- PWA：`sw.js` precache 补齐 `scripts/modules/seo.js?v=...`，避免离线场景缺失
- 工程守护：`npm run check` 覆盖新增 SEO 模块
- SEO：商品详情页 Product JSON-LD 补齐 `url`、`aggregateRating`、`itemCondition`，并对 offers.url 去 hash（与 canonical 对齐）
- 版本：统一缓存穿透版本号 bump 到 `20260112.7`

## [20260112.6] - 2026-01-12

### 新增
- SEO：运行时新增 Canonical 兜底（去 hash、保留 query），降低重复 URL 噪声

### 变更
- SEO：商品详情页 Product JSON-LD availability 支持 InStock/OutOfStock/PreOrder，并可选输出 availabilityStarts
- 性能：首页 Hero 首屏图补齐 loading/fetchpriority/decoding 提示（渐进增强）
- 版本：统一缓存穿透版本号 bump 到 `20260112.6`

## [20260112.5] - 2026-01-12

### 新增
- dist/PWA：新增 `scripts/generate-dist-sw.mjs`，在 `npm run build` 后生成 `dist/sw.js`（基于 dist 输出文件列表生成 precache）
- CI：新增 Lighthouse 回归门禁（`.lighthouserc.json` + `.github/workflows/lighthouse.yml`），自动产出 `.lighthouseci` 报告 artifact
- 测试：新增 `tests/generate-dist-sw.test.mjs` 覆盖 dist SW 生成逻辑与过滤规则

### 变更
- 构建链路：`scripts/build-ultra.mjs` 增加 dist SW 生成步骤（build → copy → sw → compress）
- 工程守护：`scripts/validate.mjs` 忽略 `.lighthouseci/`（避免本地跑 Lighthouse 后触发校验误报）
- 工程脚本：`package.json` 增加 `npm run lighthouse`，并补齐 `npm run check` 覆盖新增脚本

## [20260112.4] - 2026-01-12

### 新增
- Tooling：新增 `scripts/modules/diagnostics.js` 与 `scripts/modules/command-palette.js`（从 `scripts/main.js` 抽离，按需动态加载）

### 变更
- Runtime：诊断/命令面板改为懒加载 bootstrap（保持 `Ctrl/Cmd+K`、`/` 与 `?health=1` 行为一致，同时降低首屏解析成本）
- 工程守护：`sw.js` precache、`scripts/validate.mjs`、`npm run check` 覆盖新增模块
- 版本：统一缓存穿透版本号 bump 到 `20260112.4`

## [20260112.3] - 2026-01-12

### 新增
- PerfKit：新增 `idle/cancelIdle`（统一封装 `requestIdleCallback` + `setTimeout` fallback），用于薄启动的“非关键模块延后初始化”
- 性能资源提示：全站 HTML 预加载 `assets/icons.svg`（减少首屏 icon sprite 的请求链路）

### 变更
- Runtime 启动顺序：将可观测性/动效/PWA/诊断等非关键模块延后到 idle 执行，降低首屏主线程压力
- 图片解码：Hero/PDP 主图补齐 `decoding="async"`，并对关键图设置 `fetchpriority="high"`（渐进增强）
- 版本：统一缓存穿透版本号 bump 到 `20260112.3`

## [20260112.2] - 2026-01-12

### 新增
- Telemetry：抽离为 `scripts/modules/telemetry.js`（`createTelemetry`），并新增 `tests/telemetry.test.mjs`
- 诊断中心：Telemetry 面板新增“清空队列”，并优先使用 Telemetry API（`getQueue/resolveEndpoint/clearQueue`）

### 变更
- PWA 更新体验：发现新版本 SW 后通过 Toast 提示“刷新”再启用更新（渐进增强；兜底保留自动更新）
- 工程守护：`sw.js` precache、`scripts/validate.mjs`、`npm run check` 覆盖 Telemetry 模块
- 版本：统一缓存穿透版本号 bump 到 `20260112.2`

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
