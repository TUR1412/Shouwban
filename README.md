# 塑梦潮玩（Shouwban）

![validate](https://github.com/TUR1412/Shouwban/actions/workflows/validate.yml/badge.svg?branch=master)

一个「纯静态、无后端依赖」的手办电商多页面模板：开箱即用、可直接部署到 GitHub Pages / 任意静态托管。

## ✨ 亮点（面向落地页/原型/模板）

- **多页面结构**：首页 / 列表 / 分类 / 详情 / 购物车 / 结算 / 静态内容（FAQ/隐私/条款）
- **本地数据闭环**：购物车 + 收藏（`localStorage`），刷新不丢
- **主题切换**：浅色/深色一键切换（记忆偏好，默认跟随系统）
- **PWA 离线兜底**：Service Worker + `offline.html`（仅在 https/localhost 生效）
- **SEO 基础**：`robots.txt` + `sitemap.xml` + OG/Twitter meta（适配静态托管）
- **原子级自检脚本**：`node scripts/validate.mjs`（零依赖）
- **CI 校验**：GitHub Actions 自动执行 `node --check` + 校验脚本

> 说明：本项目不包含真实支付/订单后端，结算页为模拟下单流程；适合作为前端原型或后续对接真实 API 的模板。

## 📦 目录结构

- `index.html`：首页
- `products.html`：商品列表页（搜索/排序）
- `category.html`：分类页（`?cat=`）
- `product-detail.html`：商品详情页（`?id=`）
- `cart.html`：购物车页
- `checkout.html`：结算页（模拟下单）
- `favorites.html`：收藏页（本地收藏夹）
- `static-page.html`：静态内容页（`?page=faq|privacy|tos`）
- `offline.html`：离线兜底页（PWA）
- `sw.js`：Service Worker（PWA 缓存策略）
- `styles/main.css`：主样式
- `styles/extensions.css`：主题/收藏扩展样式（覆盖式加载，便于独立维护）
- `scripts/main.js`：核心逻辑（数据 + 渲染 + 交互）
- `scripts/validate.mjs`：零依赖校验脚本
- `assets/`：图片 / favicon / manifest 等静态资源

## 🚀 本地预览（推荐）

由于浏览器安全策略，直接双击打开 `html` 文件可能会导致部分资源或跳转行为异常（尤其是 PWA/Service Worker）。建议使用本地静态服务器预览。

### 方式 A：Python（无需额外安装）

在项目根目录执行：

```powershell
pwsh -NoLogo -NoProfile -Command 'python -m http.server 5173'
```

然后访问：`http://localhost:5173/index.html`

### 方式 B：VS Code Live Server

安装 Live Server 插件后，右键 `index.html` -> Open with Live Server。

## ✅ 原子级自检（推荐）

该仓库提供一个零依赖校验脚本，用于检查：
- 全部页面是否带缓存版本号（避免“改了没生效”）
- HTML/CSS 引用的本地资源是否存在（避免缺图/404）
- 是否注入主题脚本、是否包含扩展样式（保证主题/收藏能力完整）
- `robots.txt` / `sitemap.xml` / `sw.js` / `offline.html` 等文件是否齐全

在项目根目录执行：

```powershell
pwsh -NoLogo -NoProfile -Command 'node scripts/validate.mjs'
```

## 🛠️ 二次开发（最常见）

- **品牌名/文案**：直接编辑各页面顶部 Logo 与标题区域文案
- **商品数据**：在 `scripts/main.js` 的 `SharedData` 内调整（后续可替换为后端 API）
- **图片资源**：将真实图片放入 `assets/images/`，并在 `SharedData` 中替换对应路径
- **扩展样式**：优先写在 `styles/extensions.css`，避免改动超大主样式文件

## 🧠 缓存版本号（重要）

静态站点常见“改了没生效”，通常是浏览器缓存或 Service Worker 缓存导致。

- 所有 HTML 引用都带版本号：`styles/main.css?v=...`、`styles/extensions.css?v=...`、`scripts/main.js?v=...`
- `sw.js` 内也包含同一版本号（`CACHE_NAME` + `PRECACHE_URLS`）
- 当你修改 **核心逻辑 / 样式 / PWA 缓存策略** 时，请同步 bump 版本号

## 🌍 部署

这是纯静态站点，可直接部署到：
- GitHub Pages
- Vercel / Netlify（Static Site）
- 传统 Nginx/Apache 静态目录
