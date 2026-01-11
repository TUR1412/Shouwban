# Task - Diagnostics Center

> 缓存穿透统一版本号：`20260111.4` → `20260112.1`

- [√] UI：`account.html` 增加“诊断中心”卡片（KPI/面板/操作）
- [√] 交互：`scripts/pages/account.js` 接入 Logger/ErrorShield/PerfVitals/Telemetry
- [√] 快捷入口：`scripts/main.js` CommandPalette 增加“诊断中心/错误报告”命令
- [√] 样式：`styles/extensions.css` 补齐诊断中心原子组件样式（含 dark theme）
- [√] 测试：新增 `tests/error-shield.test.mjs` 与 `tests/perf-vitals.test.mjs`
- [√] 工程守护：通过 `npm run verify`（`check/validate`）确保版本一致性与资源完整性
- [√] bump 版本号到 `20260112.1` 并通过 `npm run verify && npm test && npm run test:coverage`
- [√] 提交并推送到 `origin/master`（Standard Push，commit: `1693e04`）
