# 变更历史索引

本文件记录所有已完成变更的索引，便于追溯和查询。

## 索引

| 时间戳 | 功能名称 | 类型 | 状态 | 方案包路径 |
|--------|----------|------|------|------------|
| 202512241900 | singularity-refactor | 重构/增强 | ✅已完成 | `2025-12/202512241900_singularity-refactor/` |
| 202512242220 | ultimate-compression | 重构/优化 | ✅已完成 | `2025-12/202512242220_ultimate-compression/` |
| 202512242309 | hardcore-engine-health | 引擎/性能/诊断 | ✅已完成 | `2025-12/202512242309_hardcore-engine-health/` |
| 202512260005 | infinite-evolution-ui | UI/交互/功能基座 | ✅已完成 | `2025-12/202512260005_infinite-evolution-ui/` |
| 202512291841 | singularity-modular-loader | 重构/增强 | ✅已完成 | `2025-12/202512291841_singularity-modular-loader/` |
| 202512312008 | quark-level-modular-runtime | 重构/性能/PWA | ✅已完成 | `2025-12/202512312008_quark-level-modular-runtime/` |
| 202601112017 | quark-overhaul | 重构/业务/视觉 | ✅已完成 | `2026-01/202601112017_quark-overhaul/` |
| 202601112230 | accessibility-preferences | A11y/体验/守护 | ✅已完成 | `2026-01/202601112230_accessibility-preferences/` |
| 202601112345 | actionable-toast-undo | UI/反馈/购物车 | ✅已完成 | `2026-01/202601112345_actionable-toast-undo/` |
| 202601120023 | observability-standards | Observability/质量 | ✅已完成 | `2026-01/202601120023_observability-standards/` |
| 202601120102 | diagnostics-center | Observability/UI/诊断 | ✅已完成 | `2026-01/202601120102_diagnostics-center/` |
| 202601120134 | telemetry-module | Runtime/Telemetry/守护 | ✅已完成 | `2026-01/202601120134_telemetry-module/` |
| 202601120258 | dist-pwa-lighthouse | PWA/CI/Tooling | ✅已完成 | `2026-01/202601120258_dist-pwa-lighthouse/` |
| 202601120330 | perf-budget-guardrail | Tooling/Perf | ✅已完成 | `2026-01/202601120330_perf-budget-guardrail/` |
| 202601120341 | seo-canonical-structured-data | SEO/性能 | ✅已完成 | `2026-01/202601120341_seo-canonical-structured-data/` |
| 202601120416 | seo-module-tests | SEO/测试/工程守护 | ✅已完成 | `2026-01/202601120416_seo-module-tests/` |
| 202601120524 | seo-rich-results | SEO/富结果/结构化数据 | ✅已完成 | `2026-01/202601120524_seo-rich-results/` |
| 202601120540 | seo-searchaction-breadcrumbs | SEO/SearchAction/面包屑 | ✅已完成 | `2026-01/202601120540_seo-searchaction-breadcrumbs/` |
| 202601120556 | seo-organization-jsonld | SEO/Organization/结构化数据 | ✅已完成 | `2026-01/202601120556_seo-organization-jsonld/` |
| 202601120618 | seo-jsonld-entity-linking | SEO/JSON-LD/实体关联 | ✅已完成 | `2026-01/202601120618_seo-jsonld-entity-linking/` |
| 202601120635 | runtime-error-capture-jsonld-upsert | Runtime/SEO/质量守护 | ✅已完成 | `2026-01/202601120635_runtime-error-capture-jsonld-upsert/` |
| 202601121230 | quartz-ui-reskin | UI/动效/视觉 | ✅已完成 | `2026-01/202601121230_quartz-ui-reskin/` |
| 202601130626 | quartz-ui-polish | UI/动效/视觉 | ✅已完成 | `2026-01/202601130626_quartz-ui-polish/` |
| 202601130645 | quartz-motion-microinteractions | UI/动效/视觉 | ✅已完成 | `2026-01/202601130645_quartz-motion-microinteractions/` |
| 202601130703 | vt-reduced-motion-guardrail | A11y/动效/守护 | ✅已完成 | `2026-01/202601130703_vt-reduced-motion-guardrail/` |
| 202601130719 | motion-transform-flytocart | UI/动效/交互 | ✅已完成 | `2026-01/202601130719_motion-transform-flytocart/` |

## 按月归档

### 2025-12
- [202512241900_singularity-refactor](2025-12/202512241900_singularity-refactor/) - 移除运行时 CDN、引入本地图标与命令面板
- [202512242220_ultimate-compression](2025-12/202512242220_ultimate-compression/) - 去重抽象 + Vite 极限构建链路 + 文档与校验同步
- [202512242309_hardcore-engine-health](2025-12/202512242309_hardcore-engine-health/) - 虚拟滚动 + 二进制存储协议 + 控制台健康全景图
- [202512260005_infinite-evolution-ui](2025-12/202512260005_infinite-evolution-ui/) - 视觉系统（玻璃/渐变/栅格）+ Skeleton/转场 + 多级筛选/预取/埋点/请求层
- [202512291841_singularity-modular-loader](2025-12/202512291841_singularity-modular-loader/) - 按页初始化 + 本地数据导入/导出 + 构建链路熵减（esbuild）
- [202512312008_quark-level-modular-runtime](2025-12/202512312008_quark-level-modular-runtime/) - PageModules 按页代码分割（scripts/pages）+ SW precache 守护 + bump 20251231.1

### 2026-01
- [202601112017_quark-overhaul](2026-01/202601112017_quark-overhaul/) - Runtime 拆分 + 会员/关注/套装/订单旅程/策展 + Neo-Quark 视觉升级
- [202601112230_accessibility-preferences](2026-01/202601112230_accessibility-preferences/) - 无障碍偏好中心 + 动效降级 + PWA/Tooling 守护
- [202601112345_actionable-toast-undo](2026-01/202601112345_actionable-toast-undo/) - Toast 可操作升级（action/关闭）+ 购物车撤销交互
- [202601120023_observability-standards](2026-01/202601120023_observability-standards/) - Logger/ErrorShield/PerfVitals 可观测性基座 + DataPortability 白名单补齐 + 单测
- [202601120102_diagnostics-center](2026-01/202601120102_diagnostics-center/) - 会员中心诊断中心（日志/错误/性能快照/Telemetry）+ Command Palette 入口 + 单测
- [202601120134_telemetry-module](2026-01/202601120134_telemetry-module/) - Telemetry 抽离为独立模块 + 单测 + PWA 更新提示 Toast 化
- [202601120258_dist-pwa-lighthouse](2026-01/202601120258_dist-pwa-lighthouse/) - dist 形态 PWA 同构（生成 dist/sw.js）+ Lighthouse CI 回归门禁
- [202601120330_perf-budget-guardrail](2026-01/202601120330_perf-budget-guardrail/) - dist gzip 体积预算门禁（Performance Budget）+ Lighthouse 串联 budget
- [202601120341_seo-canonical-structured-data](2026-01/202601120341_seo-canonical-structured-data/) - Canonical 兜底 + PDP Product JSON-LD（库存语义）+ 首页 Hero LCP 提示（渐进增强）
- [202601120416_seo-module-tests](2026-01/202601120416_seo-module-tests/) - SEO 模块化（Canonical）+ 单测覆盖 + SW/Check 守护同步
- [202601120524_seo-rich-results](2026-01/202601120524_seo-rich-results/) - Rich Results：PDP BreadcrumbList JSON-LD + PLP ItemList JSON-LD（与 canonical URL 规则一致）
- [202601120540_seo-searchaction-breadcrumbs](2026-01/202601120540_seo-searchaction-breadcrumbs/) - WebSite/SearchAction JSON-LD（站内搜索）+ PLP BreadcrumbList JSON-LD
- [202601120556_seo-organization-jsonld](2026-01/202601120556_seo-organization-jsonld/) - Organization JSON-LD（站点级主体信息）
- [202601120618_seo-jsonld-entity-linking](2026-01/202601120618_seo-jsonld-entity-linking/) - JSON-LD 实体关联（Organization/WebSite/Product 统一 @id）
- [202601120635_runtime-error-capture-jsonld-upsert](2026-01/202601120635_runtime-error-capture-jsonld-upsert/) - PageModules 错误闭环 + 页面 JSON-LD upsert 收敛
- [202601121230_quartz-ui-reskin](2026-01/202601121230_quartz-ui-reskin/) - Quartz UI Reskin（Apple/Vercel）+ Motion.spring 微交互
- [202601130626_quartz-ui-polish](2026-01/202601130626_quartz-ui-polish/) - Quartz UI 精修（High Contrast / Theme Color / Motion.spring transform）
- [202601130645_quartz-motion-microinteractions](2026-01/202601130645_quartz-motion-microinteractions/) - Quartz Motion 微交互升级（Dialog/Toast 物理入场 + Product hover zoom）
- [202601130703_vt-reduced-motion-guardrail](2026-01/202601130703_vt-reduced-motion-guardrail/) - View Transitions 减少动效兜底（html[data-motion="reduce"]）
- [202601130719_motion-transform-flytocart](2026-01/202601130719_motion-transform-flytocart/) - Motion.animate transform 保持分量 + flyToCart 抛物线微交互
