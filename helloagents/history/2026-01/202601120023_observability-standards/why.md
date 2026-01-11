# Why - Observability Standards (Logger / ErrorShield / PerfVitals)

## 背景
作为“纯静态站点 + 本地数据驱动”的电商体验样板，本项目已经具备较完整的业务流与 UI 体系，
但在行业标准的“可观测性（Observability）”维度仍缺少可复用的通用基座：
- **错误边界（Error Boundary）**：异常发生时缺少统一捕捉、用户可见提示与诊断出口。
- **日志监控（Logging）**：缺少可追溯的本地日志缓冲区，难以复盘线上问题。
- **性能埋点（Perf Telemetry）**：缺少 Web Vitals 级指标采集与输出（用于自检与后续对接后端监控）。

## 目标
- 严格遵循“保留核心架构、不破坏原逻辑根基”与开闭原则：
  - 通过新增模块扩展能力，而非推翻既有实现。
- 增量补齐行业标准模块：
  - `Logger`：本地 ring buffer 日志（可导出、可清空）。
  - `ErrorShield`：全局错误捕捉 + Toast 提示 + 详情面板。
  - `PerfVitals`：TTFB/FCP/LCP/CLS/INP(近似)/LongTask(近似) 的采集与输出。
- 工程守护同步升级：
  - 新增模块纳入 `sw.js` precache、`scripts/validate.mjs`、`npm run check`。
  - 数据可迁移补齐：备份白名单覆盖 `a11y` 与本地日志/埋点键。

## 约束
- 零运行时依赖、无外部 CDN。
- PWA 版本号与 HTML `?v=` 强一致。
- UI 采用渐进增强，错误面板复用现有 Glass Dialog 体系。

