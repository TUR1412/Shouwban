# UI / Styles 模块

## 职责
- 定义视觉变量（颜色、间距、字体栈等）
- 组件样式与响应式布局
- 深色/浅色主题表现
- 玻璃拟态（Glassmorphism）与动效的视觉配合

## 关键文件
- `styles/main.css`：基础变量、布局、组件样式
- `styles/extensions.css`：扩展组件（收藏/对比/订单/对话框/命令面板等）
- `assets/icons.svg`：本地 SVG Sprite（替代外部 Icon CDN）

## 约定
- SVG 图标统一使用 `<svg class="icon"><use ...></use></svg>`，尺寸随 `font-size` 继承
- Footer 社交按钮使用“按钮化”外观（固定尺寸、边框与 hover 状态）

