# Changelog

本文件记录项目所有重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循项目既有的“缓存穿透版本号”风格（`YYYYMMDD.N`）。

## [Unreleased]

## [20251224.3] - 2025-12-24

### 新增
- VirtualScroll：零依赖窗口级虚拟滚动引擎 + 商品列表压测模式（`products.html?stress=100000`）
- Diagnostics：控制台“系统健康全景图”（FPS/LongTask/事件循环延迟/内存趋势）
- 二进制协议编解码（`scripts/core.js`）：为高频键提供 base64+二进制存储能力（SB_A1 / SB_C1）

### 变更
- `Utils.readStorageJSON()` / `Utils.writeStorageJSON()`：热路径键自动使用二进制前缀协议（向后兼容 JSON）
- `Cart.normalizeCartItems()`：允许仅存储 `{id, quantity}`，运行时自动从 `SharedData` 补齐价格/名称/图片
- `SharedData.getProductById()`：支持压测 ID（`__S` 后缀）映射回基础商品

### 安全
- 说明：不提供“运行态自脱壳/反逆向”类机制；敏感数据请在服务端保密并最小化前端暴露面

## [20251224.2] - 2025-12-24

### 新增
- Vite 极限构建链路（devDependencies）：支持多页面打包 + terser 压缩 + brotli/gzip 预压缩（输出到 `dist/`）
- postbuild 静态文件补齐：确保 `dist/` 具备运行时所需的 `assets/icons.svg` 与 `assets/images/*`（避免字符串路径引用导致资源缺失）

### 变更
- Runtime 去重抽象：剪贴板复制/事件分发/ID 生成统一收敛到 `Utils`
- HTML 运行时脚本统一升级为 `type="module"`（保证构建链路自洽）
- 校验脚本忽略构建产物目录，并强制 module 脚本约束，防止回归

## [20251224.1] - 2025-12-24

### 新增
- 本地 SVG Sprite 图标库：`assets/icons.svg`（替代运行时外部 Icon CDN）
- 命令面板：`Ctrl/Cmd + K` 打开（快速跳转/搜索/复制链接/切换主题）

### 变更
- 全站移除运行时第三方 CDN（字体/图标），改为系统字体栈 + 本地图标
- 校验脚本增加“禁止外部 CDN”守护规则（避免回归）

### 修复
- `scripts/main.js` 中遗留的 Font Awesome 图标注入与切换逻辑，统一迁移到 SVG Sprite
