# Why: quartz-ui-polish

## 背景
Quartz UI Reskin 已经完成视觉基座，但仍存在一些“像素级细节”与动效一致性问题：
- Spring 动画只更新部分 transform 分量时可能产生跳变（未声明分量被重置）。
- PWA 的 `theme_color` 与页面 `<meta name="theme-color">` 初始值需要统一，保证浏览器 UI 与站点配色一致。
- High Contrast 与通用 token（过渡速度、focus ring、玻璃背景）需要进一步收口，减少主题分叉。

## 目标
- 交互动效：确保微交互在 60FPS+ 的前提下更符合物理直觉（避免 transform 分量突变），并继续尊重减少动效偏好。
- 视觉一致性：补齐 Quartz token 与 High Contrast 表达，统一过渡速度、focus ring 与玻璃背景。
- 体验收口：统一 theme-color（manifest + HTML 默认），让浏览器 UI 与站点配色同步。

## 成功标准
- UI：Header 导航、Tab 指示器、滚动条与焦点态在各主题/高对比模式下层级一致。
- Motion：`Motion.spring()` 仅更新指定分量，不对未声明分量产生突变。
- 工程：`npm run verify` / `npm test` / `npm run build` / `npm run budget` 通过，版本号 bump 到 `20260112.14`。
