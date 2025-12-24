# 任务清单：202512241900_singularity-refactor

> 缓存穿透统一版本号：`20251224.1`

- [√] 新增本地图标库 `assets/icons.svg`
- [√] 全站 HTML 移除 Google Fonts / Font Awesome CDN
- [√] 全站 HTML `<i class="fa...">` 替换为 `<svg><use ...></use></svg>`
- [√] `scripts/main.js` 统一 SVG 图标输出（`Icons` helper）
- [√] `sw.js` 预缓存包含 `assets/icons.svg`
- [√] 新增命令面板 `Ctrl/Cmd + K`（CommandPalette）
- [√] CSS 扩展：命令面板样式（复用 glass-dialog 体系）
- [√] 校验脚本增加“禁止外部 CDN”守护
- [√] 文档同步：README / THIRD_PARTY_NOTICES / TROUBLESHOOTING / 项目方案书
- [√] 版本号 bump：`20251224.1`（HTML + sw.js）
- [√] 质量验证：`npm run verify` + `npm test` + `npm run test:coverage`

