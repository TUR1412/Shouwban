# 任务清单: perf-budget-guardrail

目录: `helloagents/plan/202601120330_perf-budget-guardrail/`

---

## 1. 性能预算脚本
- [√] 1.1 新增 `scripts/perf-budget.mjs`：读取 dist gzip 体积并执行预算断言，验证 why.md#需求-体积回归可被稳定捕捉-场景-ci-阻断体积回退
- [√] 1.2 更新 `package.json`：新增 `npm run budget`，并将 `npm run lighthouse` 串联 `build → budget → lhci`

## 2. 文档更新
- [√] 2.1 更新 `README.md`：补齐预算脚本使用方式（本机无 Chrome 也可跑）
- [√] 2.2 更新 `helloagents/wiki/modules/tooling.md`：补齐预算守护说明
- [√] 2.3 更新 `helloagents/CHANGELOG.md`：记录本次变更（可写入 Unreleased 或新版本）

## 3. 安全检查
- [√] 3.1 执行安全检查（按G9：无敏感信息、无生产连接、无危险命令）

## 4. 验证
- [√] 4.1 运行 `npm run verify`
- [√] 4.2 运行 `npm test`
- [√] 4.3 运行 `npm run build` + `npm run budget`
