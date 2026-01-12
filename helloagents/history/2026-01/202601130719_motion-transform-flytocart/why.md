# Why: motion-transform-flytocart

## 背景
站点已形成“CSS 视觉基座 + JS 渐进增强动效”的组合，但在高频交互（hover/press/微交互）叠加时仍存在两类可感知的不一致：

1) **transform 叠加冲突**
- `Cinematic` 的点击反馈使用 `Motion.animate({ scale })`。
- 若目标元素同时存在 CSS `transform`（例如 hover 的 `translateY(-1px)`），旧实现会把未声明的 transform 分量重置为默认值（x/y=0, scale=1, rotate=0），导致 hover/press 叠加时出现“跳一下”的违和感。

2) **flyToCart 物理直觉不足**
- 现有 `flyToCart` 采用直线位移 + 缩放，整体已经顺滑，但“抛掷”语义不够强，缺少到达终点的确认反馈。

## 目标
- **动效引擎一致性**：让 `Motion.animate()` 的 transform 简写具备“保留未声明分量”的能力，并对标量值提供 from→to 语义，确保 hover/press 等叠加微交互不打架。
- **交互可信度**：让 `flyToCart` 更符合物理直觉（抛物线轨迹），并在终点增加轻微 pulse 完成反馈闭环。
- **严格 UI 与逻辑分离**：不改任何业务逻辑、数据接口与后端架构，仅改动动效层实现与版本号。

## 成功标准
- 交互：hover + 点击反馈叠加时不再出现 transform 突变。
- 体验：`flyToCart` 更“像真的”，且在减少动效偏好下自动关闭。
- 工程：`npm run verify` / `npm test` / `npm run build` / `npm run budget` 通过，版本号 bump 到 `20260112.17`。
