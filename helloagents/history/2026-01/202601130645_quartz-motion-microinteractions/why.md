# Why: quartz-motion-microinteractions

## 背景
在 Quartz UI Reskin 与后续精修完成后，整体视觉基座已稳定，但“系统级质感”的关键仍取决于：
- 模态层（Dialog / Backdrop）的入场与层级表现是否像操作系统一样可信。
- Toast、产品媒体等高频触点是否具备一致的微交互语言（hover / press / loading / 反馈）。
- 动效是否在 60FPS+ 前提下尽可能使用 `transform/opacity`，并可靠尊重减少动效偏好。

## 目标
- 统一微交互：Dialog/Toast/商品媒体形成一致的 Quartz Motion 语言（轻微弹性、克制、高级）。
- 物理直觉：入场动效具备“pop-in + fade-in”层级感，避免生硬硬切。
- 兼容与可访问性：在 `prefers-reduced-motion` 下自动降级，不影响可用性与稳定性。

## 成功标准
- Dialog：打开时卡片有轻微弹性 pop-in，Backdrop 有柔和 fade-in；减少动效时无动画。
- Toast：入场具有轻微缩放与 blur→clear 过渡，且不影响布局与交互。
- Product：产品卡片与 PDP 主图 hover 有轻微 zoom（仅图片），不引起 layout 抖动。
- 工程：`npm run verify` / `npm test` / `npm run build` / `npm run budget` 全部通过，版本号 bump 到 `20260112.15`。
