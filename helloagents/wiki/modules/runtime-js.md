# Runtime JS 模块

## 职责
- 页面交互初始化（Header/Theme/Cart/Checkout/Orders 等）
- 数据读写与跨标签同步（`localStorage` + `storage` event）
- 渐进增强动效与视图过渡
- 统一图标输出（SVG Sprite）

## 关键文件
- `scripts/main.js`：主脚本（包含多个 IIFE 模块 + App.init）
- `scripts/core.js`：可测试的纯函数集合（金额、数量、折扣等）
- `scripts/motion.js`：Motion-lite（WAAPI）

## 图标约定
- JS 内部生成按钮/卡片时，统一使用 `Icons.svgHtml('icon-xxx')`
- 收藏态切换：`icon-heart` ↔ `icon-heart-filled`

## 命令面板
- 快捷键：`Ctrl/Cmd + K` 或 `/`
- 目标：减少鼠标操作成本，提供“商业软件级”的效率交互

