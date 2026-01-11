# 任务清单: dist-pwa-lighthouse

目录: `helloagents/plan/202601120258_dist-pwa-lighthouse/`

---

## 1. dist PWA 同构
- [√] 1.1 新增 `scripts/generate-dist-sw.mjs`：根据 `dist/` 输出生成 `dist/sw.js`，验证 why.md#需求-dist-构建产物也支持离线兜底-场景-dist-部署到静态托管
- [√] 1.2 在 `scripts/build-ultra.mjs` 中接入 dist SW 生成步骤，确保 `npm run build` 输出包含 `dist/sw.js`
- [√] 1.3 新增 `tests/generate-dist-sw.test.mjs`，覆盖生成逻辑与过滤规则

## 2. Lighthouse CI 回归门禁
- [√] 2.1 新增 `.lighthouserc.json`（关键页面 URL + 断言阈值），验证 why.md#需求-性能回归可被-ci-捕捉-场景-pr-合入前的自动回归
- [√] 2.2 新增 `.github/workflows/lighthouse.yml`，在 CI 运行 `lhci autorun`
- [√] 2.3 更新 `package.json`：补齐 `check` 覆盖新增脚本，并提供本地 `npm run lighthouse`（可选）

## 3. 安全检查
- [√] 3.1 执行安全检查（按G9：避免敏感信息硬编码、仅同源缓存策略、无生产连接）

## 4. 文档更新
- [√] 4.1 更新 `helloagents/wiki/modules/pwa.md`：dist 形态 PWA 行为说明与新生成器
- [√] 4.2 更新 `helloagents/wiki/modules/tooling.md`：补齐 Lighthouse CI 工作流说明
- [√] 4.3 更新 `README.md`：补齐 dist/ PWA 与 Lighthouse CI 的使用说明
- [√] 4.4 更新 `helloagents/CHANGELOG.md`：新增版本条目与变更摘要

## 5. 测试
- [√] 5.1 运行 `npm run verify`
- [√] 5.2 运行 `npm test`
- [√] 5.3 运行 `npm run test:coverage`
