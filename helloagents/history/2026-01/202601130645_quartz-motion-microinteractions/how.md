# How: quartz-motion-microinteractions

## 总体策略
1. **UI 与逻辑分离**：只改 `styles/extensions.css`（Quartz 覆写区），不触碰核心业务逻辑/数据接口/后端架构。
2. **性能优先**：微交互以 `transform/opacity` 为主，避免触发布局与重排；必要时使用 `will-change`（仅在 hover 态）。
3. **动效降级**：对 `prefers-reduced-motion` 做显式降级；用户显式 `html[data-motion="reduce"]` 保持为最高优先级兜底。
4. **模态层收口**：
   - Backdrop：统一为更深的遮罩 + 更强 blur/saturate，以强化层级。
   - Card：打开时用 keyframes 实现轻微 overshoot 的 pop-in（渐进增强）。
5. **高频触点精修**：
   - Toast：更“系统级”的入场（轻微缩放/模糊到清晰），并统一到 Quartz motion token。
   - Product media：产品卡片与 PDP 主图 hover 只对图片做轻微 zoom + 饱和度微调。

## 影响范围
- 仅视觉与动效层（CSS），不修改任何业务流程与数据契约。
