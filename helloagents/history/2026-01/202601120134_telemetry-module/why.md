# Why - Telemetry Modularization

## 背景
项目已具备 `Logger / ErrorShield / PerfVitals` 等可观测性基座，并在运行时中实现了 `Telemetry`（用户行为埋点，本地队列 + 可选 endpoint flush）。

但当前 `Telemetry` 仍以内联 IIFE 的形式存在于 `scripts/main.js`：
- 可维护性：`main.js` 体积继续膨胀，职责边界变得模糊
- 可测试性：难以在 Node 环境中对队列裁剪、hash、flush 失败分支做稳定单测
- 复用性：诊断中心需要读取队列/清空队列等能力，只能绕过 API 直接读写 localStorage

## 目标
- 在不改变既有功能行为的前提下，将 `Telemetry` 抽离为 `scripts/modules/telemetry.js`：
  - 采用 `createTelemetry(deps, options)` 形式，依赖通过注入传入（保持开闭原则）
  - 保持对外 API 兼容：`init / track / flush / hashQuery`
  - 额外补齐可选能力：`getQueue / clearQueue / resolveEndpoint`（用于诊断中心与调试）
- 补齐单元测试：验证 hash、队列裁剪与 clear 行为（零依赖、无 DOM）
- 工程守护同步升级：`sw.js` precache、`scripts/validate.mjs`、`npm run check` 覆盖新模块

## 约束
- 零运行时依赖、无外部 CDN。
- 默认 local-first：不主动上报；仅在配置 endpoint 时 flush。
- 版本号与缓存穿透强一致（HTML `?v=` 与 `sw.js` CACHE_NAME）。

