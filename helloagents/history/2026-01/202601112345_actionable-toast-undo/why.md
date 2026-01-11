# Why - Actionable Toast & Undo

## 背景
当前项目的 Toast（全局轻量提示）实现内联在 `scripts/main.js` 中，虽然能覆盖大多数反馈场景，但存在以下痛点：
- **可维护性**：Toast 与主入口耦合，后续迭代（样式结构/交互能力/无障碍）会继续膨胀 `main.js`。
- **可操作性不足**：对“清空购物车 / 移除商品”等带有破坏性的交互，提示仅能告知结果，缺少“撤销”入口。
- **主题一致性**：Toast 的视觉基座在暗色/Neo-Quark 体系下存在进一步统一空间（复用 `--glass-*` token）。

## 目标
- 在不破坏现有 API（`Toast.show(message, type, durationMs)`）与既有业务逻辑的前提下：
  - 将 Toast 抽离为 `scripts/modules/toast.js` 模块，降低 `scripts/main.js` 耦合。
  - 升级 Toast 为“可操作反馈”：支持 action（如“撤销”）与手动关闭。
  - 为购物车的关键破坏性操作提供撤销能力（清空/移除）。

## 约束
- **保留核心架构**：仍保持 MPA + 按页模块加载 + RuntimeContext 注入。
- **零运行时依赖**：不引入外部库/CDN。
- **PWA 一致性**：新增模块需进入 `sw.js` precache，并由 `scripts/validate.mjs` 守护。

