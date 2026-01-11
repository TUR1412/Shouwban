# 技术设计: perf-budget-guardrail

## 技术方案
### 核心技术
- Node.js（零第三方依赖）
- 以 `dist/` 产物为 SSOT（与 Vite build + compressDist 链路一致）

### 实现要点
1. **预算输入来源**
   - `npm run build` 会生成 `dist/` 以及对应的 `.gz/.br` 预压缩文件（由 `scripts/compress-dist.mjs` 负责）。
   - 预算脚本只读取 `.gz` 文件的体积（更贴近常见 CDN/gzip 传输成本）。

2. **预算目标文件选择策略**
   - `dist/assets/` 下选择 **gzip 体积最大的 `.js.gz`** 作为主入口 JS（通常对应 main bundle）。
   - `dist/assets/` 下选择 **gzip 体积最大的 `.css.gz`** 作为主入口 CSS。
   - 同时检查 `dist/index.html.gz`（入口 HTML）以控制 head/meta 膨胀。

3. **阈值设计**
   - 阈值以当前基线为参考，留出 buffer：
     - main JS gzip：≤ 60 KB
     - main CSS gzip：≤ 25 KB
     - index HTML gzip：≤ 12 KB

4. **输出与失败策略**
   - 输出每个预算项的：文件名、gzip 大小、阈值、结论（OK/EXCEEDED）。
   - 任一预算超出则退出码为 1（用于 CI 阻断）。

## 安全与性能
- **安全:** 仅对本地 `dist/` 文件做读取与数值计算，不涉及网络、密钥或外部服务。
- **性能:** 脚本只扫描 `dist/assets/` 与 `dist/index.html.gz`，运行开销极低（适合作为 CI 门禁）。

## 测试与部署
- **测试:** 使用现有 `npm run build` 与 `npm run budget` 验证；预算脚本为纯 Node 逻辑，不引入额外测试依赖。
- **部署:** 无运行时部署变更；仅影响构建与 CI 流程。

