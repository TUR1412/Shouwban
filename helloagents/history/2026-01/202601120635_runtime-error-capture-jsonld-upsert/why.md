# 变更提案: runtime-error-capture-jsonld-upsert

## 背景
项目当前具备：
- 全站 SEO 模块（`scripts/modules/seo.js`）：Canonical + 站点级 JSON-LD（WebSite/Organization）
- 页面级结构化数据：PDP/PLP 在各自页面模块内直接 `document.createElement('script')` 写入 JSON-LD
- 全局错误边界：`ErrorShield` 负责捕捉 `window.onerror` / `unhandledrejection` 并记录到 Logger/Telemetry

但仍存在两个“行业标准”缺口：
1. **PageModules 动态 import 失败未进入错误闭环**：目前仅 `console.warn` + Toast，不会进入 ErrorShield 的本地记录/Telemetry 队列，导致诊断中心缺少关键故障面包屑。
2. **页面级 JSON-LD 写入逻辑分散**：PDP/PLP 自己实现 upsert/URL 规范化/undefined 清理，与 `Seo.upsertJsonLd()` 的既有能力重复，增加维护成本，也更容易引入细微不一致。

## 目标
- 增量扩展 ErrorShield：新增 `capture()` API，用于将“被捕获但不会抛出”的异常纳入同一记录与监控链路
- 让 PageModules 的动态 import 失败进入 ErrorShield（渐进增强，不影响 UI 提示）
- 让 PDP/PLP 的 JSON-LD 写入优先复用 `Seo.upsertJsonLd()` 与 URL 规范化能力（保持原输出语义不变）

## 非目标
- 不改变既有页面渲染/交互逻辑
- 不引入第三方依赖/SDK
- 不推翻现有模块边界（保持“核心架构不被破坏”的前提下做增量扩展）

