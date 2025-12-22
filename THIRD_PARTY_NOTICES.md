# Third-Party Notices

本项目为纯静态站点（含 PWA）。为减少体积与依赖复杂度，仓库内目前不再 vendor 大型第三方动效库：

- `scripts/motion.js` 为**自研轻量动效适配层**（基于浏览器原生 Web Animations API），仅提供本项目所需的 `Motion.animate()` 能力，用于渐进增强微交互。

以下为仍在运行时使用的第三方资源（非 vendor）：

## Font Awesome（CDN / cdnjs）

- 用途：图标字体/图标 CSS（页面中的 `<i class="fas ...">` 等）
- 引入方式：各 HTML 通过 cdnjs 引入 `font-awesome/6.0.0/css/all.min.css`（含 SRI/Integrity）
- 许可：请参考 Font Awesome 官方许可说明（本仓库未提交其文件）

