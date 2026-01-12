# How: vt-reduced-motion-guardrail

## 总体策略
1. **UI 与逻辑分离**：仅修改 `styles/extensions.css` 的 View Transitions（CSS）层，不更改核心业务逻辑与数据契约。
2. **减少动效兜底**：
   - 对 `html[data-motion="reduce"]` 取消 CSS 声明的 `view-transition-name`（如 Logo / Summary）。
   - 覆盖 View Transition pseudo-elements（`::view-transition-*`）的动画，使其不再执行。
3. **渐进增强**：所有改动仅影响支持 View Transitions 的浏览器；不支持的浏览器无行为变化。
4. **版本与验证**：bump 到 `20260112.16`，跑完整验证链路确保零回归。

## 关键落点
- `styles/extensions.css`：`@supports (view-transition-name: none)` 内新增对 `html[data-motion="reduce"]` 的 View Transitions 兜底覆盖。
