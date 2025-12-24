# 技术设计: ultimate-compression（去重抽象 + 极限构建链路）

## 技术方案

### 核心技术
- **运行时：** 原生 HTML/CSS/JS（无运行时第三方依赖）
- **构建期（可选）：** Vite + terser（devDependencies）
- **预压缩：** Node.js `zlib`（brotli/gzip）

### 实现要点
1. **去重抽象（Runtime）**
   - 在 `scripts/main.js` 的 `Utils` 中新增：
     - `dispatch(type, detail?)`
     - `dispatchChanged(scope, detail?)`（统一 `scope:changed`）
     - `generateId(prefix?)`
     - `copyText(value)`（安全上下文优先 + textarea fallback）
   - 删除各模块内重复实现，统一调用 `Utils`，减少重复分支与回归面。

2. **构建链路（Tooling）**
   - `vite.config.mjs`：
     - 多页面输入（14 个 HTML）
     - `minify: 'terser'` + `passes: 3` + `drop_console/drop_debugger`（以体积为优先）
   - `scripts/build-ultra.mjs`：
     - 执行 Vite build（输出 `dist/`）
     - 执行 `postbuildCopyStatic()`：补齐运行时“字符串路径引用”的静态资源（`assets/icons.svg`、`assets/images/*`、`robots.txt`、`sitemap.xml`）
     - 执行 `compressDist()`：生成 `.br` / `.gz` 预压缩文件
   - `scripts/validate.mjs`：
     - 忽略 dist/build/out 等目录，避免构建产物影响原子级自检
     - 强制 runtime 脚本使用 `type="module"`，保证 Vite 构建可用

## 架构决策 ADR

### ADR-001: HTML runtime 脚本统一升级为 `type="module"`
**上下文:** Vite 对非模块脚本无法进行 bundling/minify；同时需要保证“源站直接部署”与“可选构建链路”一致可用。  
**决策:** 14 个页面的 `scripts/motion.js` / `scripts/core.js` / `scripts/main.js` 全部升级为模块脚本。  
**理由:**  
- 使 Vite 构建链路天然可用（无需复制 HTML 或引入额外模板/插件）  
- 对现有代码侵入小（脚本本身不依赖全局 var 输出）  
**替代方案:** 保留经典脚本 + 构建时注入 module entry  
- 拒绝原因：Vite 的 HTML transform 阶段不足以改变 bundling 入口判定，易产生“构建成功但 dist 不可运行”的隐性风险  
**影响:**  
- `file://` 直接打开页面可能受限（现代浏览器对 module script 有更严格的安全策略）  
- 需要文档明确推荐使用本地静态服务器预览（Python/Vite/http-server）

## 安全与性能
- **安全：**
  - `Utils.escapeHtml()` 保持用于渲染路径的防注入策略不变
  - 构建脚本不引入密钥、不会触达生产服务
- **性能：**
  - 重复逻辑收敛降低 bundle 体积与分支数
  - Vite + terser 极限压缩，叠加 brotli/gzip 预压缩，提升传输效率

## 测试与部署
- **测试/校验：**
  - `npm run verify`（结构/版本/引用/规则）
  - `npm test`、`npm run test:coverage`（core.js 100% 覆盖率）
  - `npm run build`（Vite build + postbuild copy + 预压缩）
- **部署：**
  - 直接静态部署（仓库根目录）仍是默认推荐（含 PWA）
  - `dist/` 作为“极限构建产物”，可用于支持预压缩分发的静态托管（需自行配置发布目录）

