# How - Telemetry Modularization

## 1) 新增模块：`scripts/modules/telemetry.js`
- 抽象为 `createTelemetry(deps, options)`：
  - `deps.Utils`：提供 `generateId / readStorageJSON / writeStorageJSON / getPageName`
  - `deps.Http`：提供 `postJSON`（用于 flush）
  - 所有 DOM / storage 访问均包裹 try/catch，保证 Node 环境可测试
- 默认行为保持一致：队列键 `sbTelemetryQueue`、endpoint 键 `sbTelemetryEndpoint`、最大队列 `240`

## 2) 集成：`scripts/main.js`
- 顶部 import 新模块（带 `?v=`）
- 用 `const Telemetry = createTelemetry({ Utils, Http });` 替换原 IIFE
- 保持调用点不变（搜索埋点、page_view、perf_vitals 等）

## 3) 诊断中心增强（Account）
- 优先通过 `Telemetry.getQueue()` / `Telemetry.resolveEndpoint()` 获取数据（若存在）
- 允许清空队列：`Telemetry.clearQueue()`（或兜底删除 localStorage key）

## 4) PWA / Guardrails
- `scripts/validate.mjs` 增加 telemetry 模块引用校验
- `package.json` 的 `npm run check` 覆盖 `scripts/modules/telemetry.js`
- `sw.js` precache 覆盖新模块

## 5) 单测
- 新增 `tests/telemetry.test.mjs`：
  - hashQuery 的稳定性
  - track 入队与 maxQueue 裁剪
  - clearQueue 清空

