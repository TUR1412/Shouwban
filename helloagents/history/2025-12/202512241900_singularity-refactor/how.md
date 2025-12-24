# 技术设计：Singularity Refactor

## 方案概述
通过本地 SVG Sprite 替换 Font Awesome、移除 Google Fonts，并在 JS 层提供统一的 Icon Helper；在 UI 层新增命令面板（复用 glass-dialog 视觉体系）。

## 关键实现

### 1) 本地图标（SVG Sprite）
- 新增：`assets/icons.svg`
- HTML 静态图标：用 `<svg class="icon"><use href="assets/icons.svg#icon-xxx"></use></svg>` 替换 `<i class="fa...">`
- JS 动态图标：新增 `Icons.svgHtml()` / `Icons.createSvg()` / `Icons.setSvgUse()`，替换原先注入的 `<i class="fa...">`

### 2) PWA 预缓存更新
- `sw.js` 追加 `assets/icons.svg` 到 `PRECACHE_URLS`，保证离线可用

### 3) 校验与守护
- `scripts/validate.mjs` 增加“禁止外部 CDN”规则，避免未来回归

### 4) 命令面板（Cmd/Ctrl+K）
- 新增模块：`CommandPalette`
- 交互：
  - `Ctrl/Cmd + K` 打开
  - `/` 快捷打开（不在输入框时）
  - ↑↓ 选择、回车执行、Esc 关闭
- 功能：
  - 页面跳转（首页/商品/购物车/收藏/对比/订单/会员中心）
  - 切换主题
  - 复制当前链接
  - 输入关键词可生成“搜索商品：{query}”

## 架构决策 ADR

### ADR-001：移除运行时 CDN，改用本地图标 + 系统字体
- **状态**：✅已采纳
- **动机**：减少外链不确定性、提升离线能力与隐私；降低首屏请求数
- **代价**：需要维护本地图标集合；字体从外链变为系统字体栈（视觉需通过 CSS 收敛）

