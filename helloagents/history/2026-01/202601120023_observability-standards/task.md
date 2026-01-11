# Task - Observability Standards

> 缓存穿透统一版本号：`20260111.3` → `20260111.4`

- [√] 新增 `scripts/modules/logger.js`（本地 ring buffer + 可选 console capture）
- [√] 新增 `scripts/modules/error-shield.js`（全局错误捕捉 + Toast action + 详情面板）
- [√] 新增 `scripts/modules/perf-vitals.js`（TTFB/FCP/LCP/CLS/INP/LongTask 采集）
- [√] 集成到 `scripts/main.js`（初始化顺序 + RuntimeContext 注入）
- [√] UI：复用 Glass Dialog 风格完善错误面板样式
- [√] 工程守护：`sw.js` precache、`scripts/validate.mjs`、`package.json` 覆盖新增模块
- [√] DataPortability：白名单补齐 `a11y/sbLogs/sbTelemetryQueue/sbTelemetryEndpoint`
- [√] 新增单测：`tests/logger.test.mjs`
- [√] bump 版本号到 `20260111.4` 并通过 `npm run verify && npm test && npm run test:coverage`
- [ ] 提交并推送到 `origin/master`
