# 变更提案: ultimate-compression（去重抽象 + 极限构建链路）

## 需求背景
当前仓库已实现「运行时零 CDN、零第三方运行时依赖」与基础的原子级校验能力，但仍存在：

1. **重复逻辑分散**：剪贴板复制、事件分发、ID 生成等逻辑在多个模块内重复实现，增加维护成本与回归风险。
2. **缺少“极限构建”选项**：虽可直接静态部署，但在追求更小产物与更强 tree-shaking/minify 的场景下缺少可选构建链路。
3. **自洽性不足**：校验脚本未显式约束构建链路所需的 HTML 约定；构建产物目录（dist）也会影响校验扫描范围。

## 变更内容
1. **重复逻辑收敛到 Utils：**
   - 统一剪贴板复制：`Utils.copyText()`
   - 统一事件分发：`Utils.dispatch()` / `Utils.dispatchChanged()`
   - 统一 ID 生成：`Utils.generateId(prefix)`
2. **引入 Vite 极限构建链路（开发期工具）：**
   - `vite.config.mjs`（多页面输入 + terser 极限压缩）
   - `scripts/build-ultra.mjs`（构建 + 静态文件补齐 + 预压缩）
   - `scripts/compress-dist.mjs`（brotli/gzip 预压缩）
   - `scripts/postbuild-copy.mjs`（补齐运行时字符串引用的静态资源）
3. **HTML 运行时脚本升级为模块脚本：**
   - 全站 `scripts/motion.js` / `scripts/core.js` / `scripts/main.js` 统一使用 `type="module"`，保证可被 Vite 构建链路处理。
4. **原子级自检增强：**
   - `scripts/validate.mjs` 忽略构建产物目录（dist/build/out 等）
   - 校验脚本增加 `type="module"` 约束，防止回归导致构建链路失效

## 影响范围
- **模块：**
  - Runtime JS（`scripts/main.js`）
  - Tooling（`scripts/validate.mjs` / `vite.config.mjs` / 构建脚本）
  - HTML 页面（14 个页面脚本标签）
- **文件：**
  - `scripts/main.js`
  - `scripts/validate.mjs`
  - `scripts/build-ultra.mjs`
  - `scripts/compress-dist.mjs`
  - `scripts/postbuild-copy.mjs`
  - `vite.config.mjs`
  - `*.html`（运行时脚本标签）
  - `sw.js`（缓存版本号同步 bump）
  - `package.json`
- **API：** 无（纯静态站点）
- **数据：** 无（localStorage schema 不变）

## 核心场景

### 需求: 去重抽象
**模块:** Runtime JS

#### 场景: 复制链接 / 复制订单号
- 预期结果：所有复制逻辑统一走 `Utils.copyText()`，并保持“安全上下文优先 + 旧浏览器 fallback”的行为一致。

#### 场景: 模块状态变更广播
- 预期结果：所有 `*:changed` 广播统一走 `Utils.dispatchChanged()`，降低跨模块同步回归概率。

### 需求: 极限构建链路
**模块:** Tooling

#### 场景: 生成极限压缩产物
- 操作：执行 `npm run build`
- 预期结果：
  - `dist/` 产物生成（包含压缩后的 HTML/CSS/JS）
  - `dist/` 内补齐运行时使用的 `assets/icons.svg` 与 `assets/images/*`（避免 bundle 后资源缺失）
  - 同目录生成 `.br` / `.gz` 预压缩文件，便于 Nginx/Netlify 等直接开启预压缩分发

## 风险评估
- **风险:** 全站脚本切换为 `type="module"` 后，直接双击打开 `file://` 可能无法加载模块脚本
  - **缓解:** README 明确推荐使用本地静态服务器预览；校验脚本约束保持模块脚本一致性
- **风险:** Vite 构建产物与源站 Service Worker 机制不同步（dist 默认不内置可用 SW）
  - **缓解:** README 明确区分“直接静态部署（含 PWA）”与“Vite 极限构建（偏体积/性能）”两种模式

