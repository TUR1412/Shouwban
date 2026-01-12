# 任务清单: quartz-ui-polish

目录: `helloagents/history/2026-01/202601130626_quartz-ui-polish/`

---

## 1. 动效一致性（Motion）
- [√] 1.1 修复 `Motion.spring()`：仅更新指定 transform 分量时保留其他分量
- [√] 1.2 确保 respects `prefers-reduced-motion` 与 `html[data-motion="reduce"]`（无新增回归）

## 2. Quartz 视觉精修
- [√] 2.1 高对比模式：对齐 `--glass-bg` 与 `--focus-ring`
- [√] 2.2 补齐 `--transition-fast/--transition-base`
- [√] 2.3 Header 导航 underline hover 微交互
- [√] 2.4 Tabs 指示器补充 `will-change`，滚动条皮肤统一

## 3. PWA / Theme Color
- [√] 3.1 更新 `assets/manifest.webmanifest` 的 `theme_color/background_color`
- [√] 3.2 更新所有页面 `<meta name="theme-color">` 默认值到 `#0A84FF`

## 4. 文档与知识库
- [√] 4.1 更新 `helloagents/wiki/modules/ui.md`
- [√] 4.2 更新 `helloagents/CHANGELOG.md`
- [√] 4.3 更新 `helloagents/history/index.md`

## 5. 版本与验证
- [√] 5.1 bump 版本号到 `20260112.14`
- [√] 5.2 运行 `npm run verify`
- [√] 5.3 运行 `npm test`
- [√] 5.4 运行 `npm run build`
- [√] 5.5 运行 `npm run budget`
