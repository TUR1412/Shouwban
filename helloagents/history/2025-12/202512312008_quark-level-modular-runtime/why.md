# 方案说明（Why）：Quark-Level Modular Runtime（按页代码分割）

## 1. 背景

当前项目以纯静态多页（MPA）形态提供接近“商业级”交互体验，但运行时脚本 `scripts/main.js` 仍是单体承载：模块数量多、职责跨度大、文件体量高（维护成本与回归风险随迭代放大）。

同时，项目已具备：
- 多页面路由与按页初始化（逻辑层面）
- 纯函数核心库（`scripts/core.js`）与测试保障
- 强构建链路（`npm run verify` / `npm run build`）

因此，本次演进聚焦“把逻辑上的模块化，落到物理模块与加载策略上”，为后续 UI/UX 的持续进化提供更稳固的结构与更低的性能成本。

## 2. 目标（Goals）

### 2.1 架构目标
- 将重型页面模块从 `scripts/main.js` 抽离到独立文件，并通过 **按页动态加载（dynamic import）** 实现真正的代码分割。
- 保持“仓库根目录直接静态部署模式”的可用性（含 `?v=YYYYMMDD.N` 缓存版本策略），同时不破坏 Vite 极限构建链路。
- 保持对现有 SSOT（`helloagents/wiki/*`）的同步更新，确保“文档即事实”。

### 2.2 产品/体验目标（UI/UX）
- 降低非当前页面模块的解析/编译/执行成本，缩短首屏主线程占用时间（更快可交互）。
- 保持交互一致性：Theme / Header / Toast / Prefetch / Skeleton 等基础体验不因重构而退化。
- 为下一轮“视觉革命（Design System + 微交互）”留出可持续扩展的模块边界。

### 2.3 工程目标
- 明确模块边界与依赖方向：基础模块（全站） vs 页面模块（按页） vs 非关键模块（空闲初始化）。
- 提升可维护性：降低单文件修改冲突；为后续增加页面/功能提供更低成本的扩展点。

## 3. 非目标（Non-goals）
- 不引入大型前端框架（React/Vue/Svelte 等），保持“零依赖静态站”定位。
- 不接入真实后端/支付/鉴权；订单与用户数据仍以本地数据模型为主（Demo/原型友好）。
- 不改变既有 URL/页面结构（避免 SEO 与链接回归）。

## 4. 成功标准（Acceptance Criteria）
- `npm run verify`、`npm test` 通过；`npm run build` 可正常产出（即使 PWA 以“根目录部署”为主）。
- `scripts/main.js` 体量显著下降，页面模块按需加载（非当前页面不下载/不执行其模块）。
- `sw.js` 的预缓存清单覆盖新增页面模块，离线场景下行为不退化（根目录部署模式）。
- `helloagents/wiki/modules/runtime-js.md`、`helloagents/wiki/modules/pwa.md`、`helloagents/CHANGELOG.md` 同步更新并与代码一致。

## 5. 风险与对策

### 5.1 风险：动态 import 与缓存版本策略冲突
- **风险点：** 页面模块被浏览器缓存，版本 bump 后可能出现“主脚本已更新但页面模块仍旧”的错配。
- **对策：** 为根目录静态部署模式保留 `?v=` 缓存版本注入策略；同时更新 `sw.js` 预缓存列表，确保同版本资源一致。

### 5.2 风险：模块拆分导致初始化顺序/依赖回归
- **风险点：** Page module 依赖基础模块（Header/Store/SharedData 等），若加载顺序错误会出现空指针或 UI 缺失。
- **对策：** 在 `App.init()` 中先完成全站基础模块初始化，再按页动态加载并带错误兜底（Toast + Console warning）。

### 5.3 风险：构建链路（Vite）与根目录部署的“双路径”兼容
- **风险点：** Vite 需要静态可分析 import；而根目录部署需要 runtime 拼接版本 query。
- **对策：** 在 loader 中使用“Vite 可分析的静态 import（构建路径）”与“运行时带版本 query 的 import（根目录路径）”双分支策略，并隔离在单点实现中。

