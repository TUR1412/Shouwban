# How - Observability Standards

## 1) Logger（本地日志）
- 新增 `scripts/modules/logger.js`
  - `createLogger(deps, { storageKey, maxEntries })`
  - 使用 `readStorageJSON/writeStorageJSON/removeStorage` 作为注入点，避免直接依赖 `localStorage`（便于测试）
  - 默认不 monkeypatch `console`；如需可调用 `attachConsoleCapture()`（可选）

## 2) ErrorShield（错误边界）
- 新增 `scripts/modules/error-shield.js`
  - 监听 `window.error` 与 `unhandledrejection`
  - 记录：写入 Logger（本地追溯）
  - 可选上报：调用 `Telemetry.track()` 入队（是否 flush 由 Telemetry endpoint 决定）
  - 用户反馈：Toast（支持 action → “详情”）+ `dialog.glass-dialog` 详情面板

## 3) PerfVitals（性能埋点）
- 新增 `scripts/modules/perf-vitals.js`
  - `PerformanceObserver`（buffered）采集 `paint / LCP / CLS / event(INP近似) / longtask`
  - `pagehide / visibilitychange(hidden)` 时输出一次快照：
    - Logger.info(PerfVitals)
    - Telemetry.track('perf_vitals', payload)

## 4) 集成与守护
- `scripts/main.js`
  - 通过 import + 实例化方式接入 `Logger / ErrorShield / PerfVitals`
  - `App.init()` 早期初始化：优先捕捉异常与性能数据
  - `PageModules.createRuntimeContext()` 注入新模块（保持兼容）
- `sw.js` / `scripts/validate.mjs` / `package.json`
  - 将新增模块加入 precache/校验/语法检查覆盖范围
- `DataPortability`（`scripts/main.js`）
  - 白名单补齐：`a11y`、`sbLogs`、`sbTelemetryQueue`、`sbTelemetryEndpoint`

## 5) 测试
- 新增 `tests/logger.test.mjs`（无 DOM、零依赖）验证 ring buffer 与大对象保护策略

