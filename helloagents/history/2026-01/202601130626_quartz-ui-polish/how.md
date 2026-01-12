# How: quartz-ui-polish

## 总体策略
1. **保持 UI 与逻辑分离**：只改 `styles/*`、动效引擎与 PWA 元信息，不触碰核心业务逻辑、数据接口与后端架构。
2. **动效一致性修复**：在 `scripts/motion.js` 让 spring 更新 transform 时默认“保留未声明分量”，避免 `x/scale/rotate` 被隐式重置。
3. **Quartz Token 补齐**：补充 transition token、同步高对比 glass/bg 与 focus ring，收口视觉语义。
4. **微交互收口**：Header 导航 underline hover、Tabs 指示器 `will-change`、滚动条皮肤等细节统一到 Quartz 动效语言。
5. **theme-color 一致性**：更新 `assets/manifest.webmanifest` 与所有页面 `<meta name="theme-color">` 的默认值，并保持运行时动态更新机制不变。
6. **版本与验证**：bump 到 `20260112.14`，跑完整验证链路，确保零回归。
