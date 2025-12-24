# Changelog

本文件记录项目所有重要变更。
格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循项目既有的“缓存穿透版本号”风格（`YYYYMMDD.N`）。

## [Unreleased]

## [20251224.1] - 2025-12-24

### 新增
- 本地 SVG Sprite 图标库：`assets/icons.svg`（替代运行时外部 Icon CDN）
- 命令面板：`Ctrl/Cmd + K` 打开（快速跳转/搜索/复制链接/切换主题）

### 变更
- 全站移除运行时第三方 CDN（字体/图标），改为系统字体栈 + 本地图标
- 校验脚本增加“禁止外部 CDN”守护规则（避免回归）

### 修复
- `scripts/main.js` 中遗留的 Font Awesome 图标注入与切换逻辑，统一迁移到 SVG Sprite

