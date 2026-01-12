# 任务清单: motion-transform-flytocart

目录: `helloagents/history/2026-01/202601130719_motion-transform-flytocart/`

---

## 1. 动效引擎（Motion）
- [√] 1.1 修复 `Motion.animate()` transform 简写：保留未声明分量（x/y/scale/rotate）
- [√] 1.2 transform 简写标量值采用 from→to 逻辑（首帧取 computed，后续取目标值）

## 2. 交互微动效（UXMotion）
- [√] 2.1 `flyToCart` 升级：抛物线轨迹 + 轻微旋转 + 终点缩放收敛
- [√] 2.2 终点反馈：购物车入口轻微 pulse（优先 Motion，降级 WAAPI）

## 3. 文档与知识库
- [√] 3.1 更新 `helloagents/wiki/modules/ui.md`
- [√] 3.2 更新 `helloagents/CHANGELOG.md`
- [√] 3.3 更新 `helloagents/history/index.md`

## 4. 版本与验证
- [√] 4.1 bump 版本号到 `20260112.17`
- [√] 4.2 运行 `npm run verify`
- [√] 4.3 运行 `npm test`
- [√] 4.4 运行 `npm run build`
- [√] 4.5 运行 `npm run budget`
