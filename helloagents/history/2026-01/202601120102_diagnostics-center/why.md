# Why - Diagnostics Center (Account Observability UI)

## 背景
本项目已补齐行业标准的可观测性基座（`Logger` / `ErrorShield` / `PerfVitals`），但当前仍缺少一个“面向用户/开发者”的可视化入口：
- 无法在页面内快速查看本地日志（`localStorage.sbLogs`）与关键统计
- 无法在不打开 DevTools 的情况下复盘最近的运行时错误摘要（ErrorShield recent）
- 性能埋点已采集，但缺少“可读的快照展示/复制/导出”能力

## 目标
- 在 **不破坏核心架构与业务逻辑根基** 的前提下，以增量扩展方式补齐“诊断中心”：
  - 在 `account.html` 增加 Diagnostics 卡片（本地日志/错误/性能/Telemetry 概览）
  - 复用现有模块：`Logger / ErrorShield / PerfVitals / Telemetry / DataPortability`
  - 提供可执行操作：刷新、复制摘要、导出备份、清空日志/错误、Telemetry flush（可选）
- 对 UI 进行原子级组件化补全（以小组件复用为主，不推翻既有样式体系）
- 工程守护同步升级：校验/预缓存/语法检查覆盖新增与变更点

## 约束
- 零运行时第三方依赖、无外部 CDN。
- 默认 local-first：不主动上报，Telemetry 仅在显式配置 endpoint 后可 flush。
- 版本号与缓存穿透强一致（HTML `?v=` 与 `sw.js` `CACHE_NAME`）。

