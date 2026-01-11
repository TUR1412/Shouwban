# 变更提案: seo-module-tests

## 背景
项目已补齐 Canonical 与商品页 Product JSON-LD，但 Canonical 逻辑目前以内联形式存在于 `scripts/main.js` 中，缺少可复用与可测试的抽象。

在“保留核心架构、不破坏原逻辑根基”的前提下，本次迭代遵循开闭原则：通过新增独立 SEO 模块并以增量方式接入，提升可维护性与质量守护能力，同时不改动既有业务数据模型与页面渲染链路。

## 目标
- **模块化**：将 Canonical 逻辑抽离为 `scripts/modules/seo.js`，与现有 `modules/*` 体系对齐。
- **可测试**：补齐单元测试覆盖关键 Canonical 行为（去 hash、保留 query、协议过滤、upsert 行为）。
- **一致性**：确保 SW precache 与 `npm run check` 覆盖新增模块，避免离线与工程守护回退。

## 非目标
- 不引入第三方依赖（保持零依赖）。
- 不改变页面业务逻辑与数据结构（仅做 SEO/性能的输出层增强）。

