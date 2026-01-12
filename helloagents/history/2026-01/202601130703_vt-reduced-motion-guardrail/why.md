# Why: vt-reduced-motion-guardrail

## 背景
项目已引入 Cross-Document View Transitions（MPA）与共享元素（Logo / 商品 / 摘要卡片）的页面连续性动效。

此前导航过渡的关闭条件主要依赖系统 `prefers-reduced-motion`，但用户也可以通过站内无障碍偏好中心设置 `html[data-motion="reduce"]` 来显式减少动效。

如果 View Transitions 在 `html[data-motion="reduce"]` 仍然运行，会造成“用户明确选择减少动效，但导航仍有转场”的体验违背。

## 目标
- 在不破坏现有业务逻辑、数据接口与后端架构的前提下，补齐 View Transitions 的减少动效兜底。
- 当 `html[data-motion="reduce"]` 时：取消共享元素命名，并关闭 View Transition pseudo-elements 动画，使导航过渡“即时/无动效”。

## 成功标准
- 用户设置 `html[data-motion="reduce"]` 后，跨页导航不再出现 View Transition 动效。
- `npm run verify` / `npm test` / `npm run build` / `npm run budget` 全部通过，版本号 bump 到 `20260112.16`。
