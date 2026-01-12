# How: quartz-ui-reskin

## 总体策略
1. **仅在视觉层改动**：优先在 `styles/extensions.css` 追加 Quartz Token 与关键组件覆写，避免影响核心运行时逻辑。
2. **动效渐进增强**：在 `scripts/motion.js` 增量扩展 `Motion.spring()`（WAAPI），支持不兼容浏览器与减少动效偏好自动降级。
3. **关键交互落点**：首页策展 Tabs 指示器优先使用 `Motion.spring()`，并在缺失时回退到 `Motion.animate()` / CSS transition。
4. **文档同步**：重制双语 README，并同步更新 UI 模块知识库与 Changelog。

## 关键实现点
- **Quartz Token**：新增中性背景、玻璃面、阴影层级、动效曲线、统一 focus ring。
- **表单一致性**：输入/下拉控件统一圆角、边框与玻璃背景，提升“系统级”质感。
- **性能友好**：交互动效优先使用 `transform/opacity`，减少 layout 相关动画。

