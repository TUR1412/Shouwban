# How: motion-transform-flytocart

## 总体策略
1. **Motion.animate transform 保持分量**
   - 在 `scripts/motion.js` 的 keyframes 归一化阶段读取目标元素当前 transform 分量（x/y/scale/rotate）。
   - 对 `x/y/scale/rotate` 的简写：
     - **未声明** → 复用当前分量（避免隐式重置）。
     - **标量值** → 首帧使用当前值、后续帧使用目标值（对齐项目里其他属性的 from→to 逻辑）。

2. **flyToCart 抛物线 + 终点反馈**
   - 在 `scripts/main.js` 的 `UXMotion.flyToCart()` 里使用 4 段关键帧：
     - 中段向上抬升（lift），形成抛物线语义。
     - 结合轻微旋转（spin）与缩放，增强“飞入”动势。
   - 动画结束后对购物车入口执行一次轻微 pulse（优先 `Motion.animate`，无则降级为 WAAPI）。

3. **版本与验证**
   - bump 到 `20260112.17`，并跑完整验证链路确保零回归。

## 影响范围
- 仅动效层与交互视觉层（`scripts/motion.js`、`scripts/main.js`），不触碰核心业务流程与数据契约。
