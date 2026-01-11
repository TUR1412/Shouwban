# 实施方案: runtime-error-capture-jsonld-upsert

## 方案概述
1. ErrorShield 增量扩展
   - 在 `scripts/modules/error-shield.js` 增加 `capture(err, context)`：
     - 生成与 `window.onerror` 相同的数据结构（hash + dedupe + recent）
     - 复用既有 `Logger` 与 `Telemetry` 写入逻辑
     - 默认不额外弹 Toast（避免与业务提示重复）

2. PageModules 失败闭环
   - 在 `scripts/main.js` 的 PageModules 动态 import catch 中调用：
     - `ErrorShield.capture(err, { source: 'PageModules', page })`
   - 保留原 Toast 提示（用户仍可感知功能模块加载失败）

3. JSON-LD 写入收敛
   - 将 `Seo` 注入到 PageModules runtime context
   - PDP/PLP 的 JSON-LD upsert 优先使用：
     - `Seo.upsertJsonLd(id, data)`（统一 upsert 与 undefined 清理）
     - `Seo.canonicalizeHref()`（在 http(s) 下统一去 hash、构造绝对 URL）
   - 对非 http(s) 场景保持回退路径（不破坏本地 file:// 预览体验）

4. 测试与文档同步
   - 扩展 `tests/error-shield.test.mjs` 覆盖 `capture()` 的记录与 Telemetry 行为
   - 更新 `helloagents/wiki/modules/seo.md`（说明页面级 JSON-LD 复用 SEO 模块与实体链接约定）
   - 更新 `helloagents/CHANGELOG.md` 与 `helloagents/history/index.md`

## 风险与缓解
- 风险：JSON-LD URL 规范化变化导致输出差异  
  缓解：保持“http(s) 下 canonicalize、非 http(s) 回退”的策略；结构字段保持不变。
- 风险：新增 ErrorShield API 被误用导致过量记录  
  缓解：`capture()` 默认不弹 Toast，且沿用 dedupe/限长队列策略。

