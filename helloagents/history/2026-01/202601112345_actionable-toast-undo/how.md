# How - Actionable Toast & Undo

## 方案概述
1. 新增 `scripts/modules/toast.js`：
   - 导出 `createToast()`，返回 `{ show, dismiss }`。
   - 兼容既有调用：`Toast.show(message, type, durationMs)`。
   - 扩展能力：`Toast.show({ message, type, durationMs, actionLabel, onAction })` 支持 action。
   - 继续支持事件驱动：监听 `toast:show`，兼容 `{message|text|content, type, durationMs}`。

2. 在 `scripts/main.js` 中：
   - 引入 `createToast` 并创建全局 `Toast` 实例。
   - 保持 RuntimeContext 注入字段名不变（仍为 `Toast`），页面模块无需改动。

3. UI 样式升级：
   - 调整 `styles/main.css` 的 Toast 样式为结构化布局（icon/body/actions）。
   - Toast 背景/边框基于 `--glass-surface/--glass-border`，自动适配 Neo-Quark 与暗色主题。

4. 购物车撤销：
   - 清空购物车：confirm 后清空，Toast 提供“撤销”恢复快照。
   - 移除单品：Toast 提供“撤销”恢复移除前快照。

5. 工程守护：
   - `sw.js` precache 增加 `scripts/modules/toast.js?v=...`。
   - `scripts/validate.mjs`：required/expected 列表补齐模块。
   - `package.json`：`npm run check` 覆盖新增模块。

