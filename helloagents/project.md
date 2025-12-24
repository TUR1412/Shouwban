# 项目技术约定

## 技术栈
- **形态**：纯静态站点（多页面 HTML / CSS / JS）+ PWA（Service Worker）
- **前端运行时**：浏览器原生能力（无运行时第三方依赖）
- **Node.js（仅用于校验/脚本）**：用于 `npm run verify` / `npm test` 等

## 代码与架构约定
- **可维护性优先**：公共能力收敛在 `scripts/core.js`（纯函数，可测试）与 `scripts/main.js`（DOM/交互/模块化）
- **渐进增强**：动效基于 WAAPI（`scripts/motion.js`），并尊重 `prefers-reduced-motion`
- **缓存穿透**：HTML 通过 `?v=YYYYMMDD.N` 统一版本号；Service Worker 使用同一版本作为 `CACHE_NAME`
- **零运行时 CDN**：图标使用本地 `assets/icons.svg`；字体使用系统字体栈（CSS 变量）

## 安全与隐私
- **默认本地化**：购物车/收藏/对比/订单/地址簿/积分等存储在 `localStorage`
- **安全边界**：无后端、无真实支付；生产化需自行完成鉴权、接口安全、隐私合规与 CSP/安全响应头

## 测试与校验
- **结构校验**：`node scripts/validate.mjs`（资源引用、版本号一致性、SW 预缓存覆盖等）
- **单元测试**：`node --test`（目前覆盖 `scripts/core.js`，要求 100% 覆盖率）

