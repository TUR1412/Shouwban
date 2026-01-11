# Task - Telemetry Modularization

> 缓存穿透统一版本号：`20260112.1` → `20260112.2`（计划）

- [√] 新增 `scripts/modules/telemetry.js`（createTelemetry）
- [√] `scripts/main.js`：抽离 Telemetry IIFE，改为 import + 实例化
- [√] `scripts/pages/account.js`：诊断中心优先使用 Telemetry API（并补齐清空队列）
- [√] 工程守护：更新 `sw.js` / `scripts/validate.mjs` / `package.json check`
- [√] 测试：新增 `tests/telemetry.test.mjs`
- [√] bump 版本号到 `20260112.2` 并通过 `npm run verify && npm test && npm run test:coverage`
- [ ] 提交并推送到 `origin/master`（Standard Push）
