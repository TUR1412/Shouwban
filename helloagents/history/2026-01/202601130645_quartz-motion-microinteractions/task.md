# 任务清单: quartz-motion-microinteractions

目录: `helloagents/history/2026-01/202601130645_quartz-motion-microinteractions/`

---

## 1. Quartz Motion 微交互
- [√] 1.1 Dialog 入场：`glass-dialog` 卡片 pop-in（含轻微 overshoot）
- [√] 1.2 Backdrop 入场：更深遮罩 + blur/saturate，并提供 fade-in
- [√] 1.3 Toast 入场：轻微缩放 + blur→clear，统一 motion token，并在 `prefers-reduced-motion` 下自动降级
- [√] 1.4 Product media：产品卡片与 PDP 主图 hover zoom（仅图片，避免 layout 抖动）

## 2. 版本与验证
- [√] 2.1 bump 版本号到 `20260112.15`
- [√] 2.2 运行 `npm run verify`
- [√] 2.3 运行 `npm test`
- [√] 2.4 运行 `npm run build`
- [√] 2.5 运行 `npm run budget`

## 3. 文档与知识库
- [√] 3.1 更新 `helloagents/wiki/modules/ui.md`
- [√] 3.2 更新 `helloagents/CHANGELOG.md`
- [√] 3.3 更新 `helloagents/history/index.md`
