# 变更提案: dist-pwa-lighthouse

## 需求背景
当前仓库支持两种部署形态：
- **根目录静态部署（推荐演示一致性）**：依赖 HTML/JS/CSS 的 `?v=YYYYMMDD.N` 缓存穿透，并由根目录 `sw.js` 进行预缓存与离线兜底。
- **Vite 构建产物（dist/）**：用于生成更小体积的多页面产物，但 PWA（Service Worker 预缓存策略）与“根目录部署”并非完全同构，导致 dist/ 模式下离线能力与版本控制体验不稳定。

同时，项目已大量投入性能/交互优化（薄启动、懒加载、模块化），但缺少一套“可持续、可回归”的行业标准性能门禁（Lighthouse/关键指标断言），容易在未来迭代中出现性能回退而无法被 CI 及时捕捉。

## 变更内容
1. **dist/ PWA 同构补齐**：在 Vite 构建后自动生成适配 dist 产物的 `dist/sw.js`（按输出文件列表预缓存），使 dist 部署形态也具备稳定的离线兜底与缓存策略。
2. **Lighthouse CI 门禁**：引入 Lighthouse CI 配置与 GitHub Actions 工作流，对关键页面执行性能/可访问性/最佳实践/SEO 的回归检查（以 warn 门槛为主，避免阻断式误伤）。

## 影响范围
- **模块:**
  - Tooling（构建链路 / CI）
  - PWA（dist 部署形态）
- **文件:**
  - `scripts/build-ultra.mjs`、新增 `scripts/generate-dist-sw.mjs`
  - `.github/workflows/*`、`.lighthouserc.json`
  - `helloagents/wiki/modules/pwa.md`、`helloagents/wiki/modules/tooling.md`、`helloagents/CHANGELOG.md`
- **API:** 无外部 API 变更
- **数据:** 无数据模型变更（仅构建产物清单驱动的 SW 预缓存）

## 核心场景

### 需求: dist/ 构建产物也支持离线兜底
**模块:** PWA / Tooling
在 dist/ 模式下，Service Worker 的 precache 应与 dist 输出文件保持一致，避免引用带 `?v=` 的源站资源导致缓存 miss。

#### 场景: dist/ 部署到静态托管
构建后访问站点：
- 首次访问可正常注册 SW
- 断网后导航请求可回退 `offline.html`
- 静态资源可 cache-first / stale-while-revalidate

### 需求: 性能回归可被 CI 捕捉
**模块:** Tooling / CI
对关键页面做 Lighthouse 回归检查，避免薄启动/懒加载/样式变更造成性能/可访问性回退。

#### 场景: PR 合入前的自动回归
在 GitHub Actions 中自动运行：
- 覆盖首页、列表页、详情页、结算页、会员页等关键路径
- 对 performance/a11y/best-practices/seo 进行阈值断言

## 风险评估
- **风险:** dist/ 产物文件名为 hash，若 SW precache 列表生成不稳定，可能导致离线缺失或缓存污染。
  - **缓解:** 生成逻辑按“输出目录真实文件列表”驱动，过滤 `.br/.gz` 预压缩文件并稳定排序；新增单测验证生成结果包含关键页面且不包含压缩副产物。
- **风险:** Lighthouse 在 CI 环境受噪声影响波动，可能造成误报。
  - **缓解:** 门槛先以 `warn` 为主 + `numberOfRuns=1`，并可后续按稳定性逐步收紧阈值。

