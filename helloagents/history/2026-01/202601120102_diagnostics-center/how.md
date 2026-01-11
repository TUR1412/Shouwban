# How - Diagnostics Center

## 1) 诊断中心 UI（Account Page）
- 在 `account.html` 增量增加“诊断中心”卡片：
  - KPI 概览：日志条数/最近错误数/Telemetry 队列长度/Endpoint 状态
  - 面板：性能快照（PerfVitals.snapshot）、最近错误（ErrorShield.getRecent）、本地日志（Logger.getEntries）
  - 操作：刷新、复制摘要、导出备份（DataPortability.exportBackup）、清空日志/错误、Telemetry flush（可选）

## 2) 交互逻辑（account.js）
- 在 `scripts/pages/account.js` 内通过 `init(ctx)` 注入运行时依赖（开闭原则）：
  - 新增对 `Logger / ErrorShield / PerfVitals` 的使用（来自 RuntimeContext）
  - 监听 `logs:changed` 事件做轻量刷新（避免频繁重绘）
  - 所有输出默认做截断/去敏，避免在 UI 中泄漏不必要细节

## 3) Command Palette 快捷入口
- 在 `scripts/main.js` 的 CommandPalette base commands 中新增：
  - 打开“诊断中心”（跳转到 `account.html#diagnostics`）
  - 打开“错误报告”（`ErrorShield.open()`，如果可用）

## 4) 样式与原子化组件补齐
- 在 `styles/extensions.css` 中为诊断中心新增一组可复用的小组件样式（atoms/molecules）：
  - KPI 卡片 / monospace code pill / 列表行 / 表格布局
  - 兼容 dark theme 的玻璃底色与边框

## 5) 测试与守护
- 增补单测覆盖（Node 原生 test）：
  - `ErrorShield`：dedupe/记录/导出报告字符串的健壮性（不依赖 DOM）
  - `PerfVitals`：snapshot 结构与采样边界（以可注入依赖模拟为主）
- 同步 `scripts/validate.mjs`、`package.json` 的 `check` 覆盖范围（如有新增模块/页面）
- bump 统一版本号并跑 `npm run verify && npm test && npm run test:coverage`

