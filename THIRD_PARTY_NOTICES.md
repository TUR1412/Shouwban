# Third-Party Notices

本项目为纯静态站点（含 PWA）。为减少体积与依赖复杂度，仓库内目前不再 vendor 大型第三方动效库：

- `scripts/motion.js` 为**自研轻量动效适配层**（基于浏览器原生 Web Animations API），仅提供本项目所需的 `Motion.animate()` 能力，用于渐进增强微交互。

## 运行时第三方资源

当前版本默认 **不再依赖任何运行时第三方 CDN 资源**（字体/图标均已本地化或使用系统字体栈）。

- 图标：使用本地 SVG Sprite `assets/icons.svg`
- 字体：使用系统字体栈（CSS 变量 `--font-body` / `--font-heading`）

## 开发期工具依赖（devDependencies）

以下依赖仅用于**构建/开发期**（例如生成 `dist/` 极限压缩产物），不会作为运行时依赖被页面从 CDN 加载：

- `vite`：前端构建工具（用于多页面打包、资源处理与开发服务器）
- `terser`：JS 压缩器（用于 `minify: 'terser'` 的极限压缩模式）
