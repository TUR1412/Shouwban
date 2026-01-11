# 变更提案: perf-budget-guardrail

## 需求背景
项目已集成一系列性能与工程化优化（薄启动、按页模块化、预压缩、Lighthouse CI 回归门禁），但仍缺少一个“可被机器稳定执行”的**性能体积预算（Performance Budget）**守护层：

- 仅依赖 Lighthouse 分数会受环境波动影响，且难以直接定位回退来源（例如主入口 JS/CSS 体积悄然上涨）。
- `npm run build` 已生成 `.br/.gz` 预压缩文件，但目前仅输出统计信息，没有“阈值断言”，无法在 CI 阻断体积回退。

因此需要补齐一个零依赖的预算脚本：以 dist 产物为 SSOT，面向关键入口文件（main JS/CSS、index HTML）进行 gzip 预算断言，从而让性能回归更可控、可解释、可持续。

## 变更内容
1. **新增性能预算脚本**：提供 `scripts/perf-budget.mjs`，读取 `dist/` 产物并对关键文件的 gzip 大小进行阈值检查（失败则退出非 0）。
2. **npm 脚本接入**：新增 `npm run budget`，并将 `npm run lighthouse` 串联 `build → budget → lhci`，在 CI 中形成“先预算、再跑 Lighthouse”的双门禁。

## 影响范围
- **模块:** Tooling / CI / 性能守护
- **文件:**
  - `scripts/perf-budget.mjs`
  - `package.json`
  - `README.md`
  - `helloagents/wiki/modules/tooling.md`
  - `helloagents/CHANGELOG.md`
- **API:** 无
- **数据:** 无

## 核心场景

### 需求: 体积回归可被稳定捕捉
**模块:** Tooling / CI
对 dist 产物的关键入口 gzip 体积设置预算，避免主入口 JS/CSS 在无感情况下变大。

#### 场景: CI 阻断体积回退
当 `dist/assets/*main*.js.gz` 或 `dist/assets/*main*.css.gz` 超出预算：
- CI 失败并明确输出“哪个文件超过预算 + 超出多少”
- 便于定位回退来源并快速修复

### 需求: 本地无需 Chrome 也能跑预算
**模块:** Tooling
在本机无 Chrome/Chromium 的情况下仍可执行 `npm run budget`，用于快速判断体积是否回退。

## 风险评估
- **风险:** 预算阈值过紧导致正常迭代频繁报警。
  - **缓解:** 预算设置为“略高于当前基线”的合理 buffer；并允许后续根据真实业务增长逐步调整。
- **风险:** dist 文件名含 hash，脚本选择目标文件不稳定。
  - **缓解:** 通过“选择 assets 下最大 gzip 的 JS/CSS 文件”作为主入口预算对象，并在输出中打印文件名以便追踪。

