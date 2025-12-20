# 塑梦潮玩（Shouwban）

[![validate](https://github.com/TUR1412/Shouwban/actions/workflows/validate.yml/badge.svg?branch=master)](https://github.com/TUR1412/Shouwban/actions/workflows/validate.yml)

一个「纯静态、无后端依赖」的手办电商多页面模板：开箱即用，可直接部署到 GitHub Pages 或任意静态托管。

<p align="center">
  <img src="assets/images/hero-placeholder.svg" width="880" alt="塑梦潮玩（Shouwban）预览图">
</p>

## 目录

- [预览](#预览)
- [快速开始](#快速开始)
- [亮点](#亮点)
- [体验与视觉升级](#体验与视觉升级)
- [页面与路由](#页面与路由)
- [目录结构（核心）](#目录结构核心)
- [本地预览（推荐）](#本地预览推荐)
- [原子级自检（推荐）](#原子级自检推荐)
- [缓存版本号（重要）](#缓存版本号重要)
- [PWA 调试（开发时常用）](#pwa-调试开发时常用)
- [故障排查](#故障排查)
- [部署](#部署)
- [二次开发（最常见）](#二次开发最常见)
- [安全](#安全)
- [迭代记录](#迭代记录)
- [贡献](#贡献)

## 预览

- GitHub Pages（需在仓库 `Settings -> Pages` 开启）：`https://tur1412.github.io/Shouwban/`
- 本地预览：见下方「本地预览」

## 快速开始

```powershell
pwsh -NoLogo -NoProfile -Command 'npm run verify'
```

```powershell
pwsh -NoLogo -NoProfile -Command 'python -m http.server 5173'
```

访问：`http://localhost:5173/index.html`

## 亮点

- 2025 Quark UI 体系：Bento Grid + 玻璃拟态 + 极光背景 + 影院级分层
- 策展 Tab：热门/最新/限定一键切换，记忆偏好不丢
- 快速加购：列表/推荐卡片一键入车 + 庆祝动效反馈
- 购物车拖拽排序：调整收藏展示顺序，立刻写回本地
- 购物车推荐：同系列/同品类智能补齐
- PDP 增强：评分与状态标签即时展示
- 视图切换：网格/列表一键切换，偏好记忆不丢
- 筛选计数：热门/限定/预售即时显示数量
- 筛选重置：一键恢复默认筛选与排序
- 筛选状态条：当前筛选/排序/视图一眼可见
- 多页面结构：首页 / 列表 / 分类 / 详情 / 购物车 / 结算 / 收藏 / 静态内容
- 本地数据闭环：购物车 + 收藏（`localStorage`），刷新不丢；多标签页自动同步
- 搜索联想：顶部搜索即输即提示，支持键盘选择直达详情
- 最近浏览：首页自动复盘最近查看的商品，快速回到灵感现场
- 结算草稿：收货信息本地自动保存，支持一键清空
- Bento 高亮区：模块化展示品牌核心能力，视觉更聚焦
- 结果统计：列表/分类/搜索标题实时显示商品数量
- 细节标识：新品/优惠角标 + 滚动进度条，让浏览更有节奏
- PWA 快捷入口：安装后可直达收藏、购物车与商品列表
- 主题切换：浅色/深色一键切换（记忆偏好，默认跟随系统）
- PWA 离线兜底：Service Worker + `offline.html`（仅在 https/localhost 生效）
- 离线体验增强：离线页状态提示 + 一键重试；慢网/断网优先回退缓存
- SEO 基础：`robots.txt` + `sitemap.xml` + OG/Twitter meta + Product JSON-LD（详情页）
- 可访问性：ESC 一键关闭搜索/菜单/下拉；计数徽标具备 `aria-live`
- 体验增强：返回顶部按钮；详情页一键复制链接；购物车一键清空
- 安全基线：动态文本 HTML 转义 + 关键渲染使用安全 DOM API，降低注入风险
- 原子级自检脚本：`node scripts/validate.mjs`（零依赖）+ 版本一致性强校验
- 工程化防线：CI 自动执行 `node --check` + 校验脚本；PR/Issue 模板内置自检清单

> 说明：本项目不包含真实支付/订单后端，结算页为模拟下单流程；适合作为前端原型或后续对接真实 API 的模板。

## 体验与视觉升级

- **Bento 布局 + 双栏 Hero**：信息结构化，关键价值更聚焦。
- **玻璃拟态 & 极光背景**：层级更清晰，保持 WCAG AA 对比度。
- **策展动效**：Tab 指示器顺滑切换，内容分段进入视野。
- **庆祝反馈**：收藏/加购带有轻量 confetti 与 Toast。

## 页面与路由

| 页面 | 文件 | 路由/参数 |
| --- | --- | --- |
| 首页 | `index.html` | `/index.html` |
| 商品列表 | `products.html` | `/products.html` |
| 分类页 | `category.html` | `/category.html?cat=...` |
| 商品详情 | `product-detail.html` | `/product-detail.html?id=...` |
| 购物车 | `cart.html` | `/cart.html` |
| 结算（模拟） | `checkout.html` | `/checkout.html` |
| 收藏夹 | `favorites.html` | `/favorites.html` |
| 静态内容 | `static-page.html` | `/static-page.html?page=faq\|privacy\|tos` |
| 离线页 | `offline.html` | PWA fallback |
| 404 | `404.html` | 静态托管兜底页 |

## 目录结构（核心）

- `styles/main.css`：主样式
- `styles/extensions.css`：主题/收藏扩展样式（覆盖式加载，便于独立维护）
- `scripts/main.js`：核心逻辑（数据 + 渲染 + 交互）
- `scripts/validate.mjs`：零依赖校验脚本
- `sw.js`：Service Worker（PWA 缓存策略）
- `assets/`：图片 / favicon / manifest 等静态资源

## 本地预览（推荐）

由于浏览器安全策略，直接双击打开 `html` 文件可能会导致部分资源或跳转行为异常（尤其是 PWA/Service Worker）。建议使用本地静态服务器预览。

### 方式 A：Python（无需额外依赖）

在项目根目录执行：

```powershell
pwsh -NoLogo -NoProfile -Command 'python -m http.server 5173'
```

然后访问：`http://localhost:5173/index.html`

### 方式 B：Node.js（可选）

```powershell
pwsh -NoLogo -NoProfile -Command 'npx --yes http-server . -p 5173 -c-1'
```

## 原子级自检（推荐）

该仓库提供一个零依赖校验脚本，用于检查：

- 全部页面是否带缓存版本号（避免“改了没生效”）
- 版本号是否统一（HTML 与 `sw.js` 必须一致，避免“更新了但缓存没更新”）
- HTML/CSS 引用的本地资源是否存在（避免缺图/404）
- 是否注入主题脚本、是否包含扩展样式（保证主题/收藏能力完整）
- `robots.txt` / `sitemap.xml` / `sw.js` / `offline.html` 等关键文件是否齐全
- `styles/main.css` 是否存在误拼接重复段（防止样式体积异常增长）

在项目根目录执行：

```powershell
pwsh -NoLogo -NoProfile -Command 'node scripts/validate.mjs'
```

也可以使用 `npm` 脚本（零依赖，无需安装依赖包）：

```powershell
pwsh -NoLogo -NoProfile -Command 'npm run verify'
```

## 缓存版本号（重要）

静态站点常见“改了没生效”，通常是浏览器缓存或 Service Worker 缓存导致。

- 所有 HTML 引用都带版本号：`styles/main.css?v=...`、`styles/extensions.css?v=...`、`scripts/main.js?v=...`
- `sw.js` 内也包含同一版本号（`CACHE_NAME` + `PRECACHE_URLS`）
- 当你修改核心逻辑 / 样式 / PWA 缓存策略时，请同步 bump 版本号

### 一键 bump 版本号（推荐）

仓库提供了一个零依赖脚本用于统一更新版本号：

```powershell
pwsh -NoLogo -NoProfile -Command 'node scripts/bump-version.mjs 20251220.5000'
```

或使用 `npm`：

```powershell
pwsh -NoLogo -NoProfile -Command 'npm run bump:version -- 20251220.5000'
```

运行后建议执行：`npm run verify` 确认一致性。

## PWA 调试（开发时常用）

如果你需要临时禁用 Service Worker（避免缓存干扰）：

- Chrome：DevTools -> Application -> Service Workers -> Unregister
- 或者清理站点数据（Application -> Clear storage）

## 故障排查

常见问题（缓存 / SW / file:// 限制）：见 `TROUBLESHOOTING.md`。

## 部署

这是纯静态站点，可直接部署到：

- GitHub Pages
- Vercel / Netlify（Static Site）
- 传统 Nginx/Apache 静态目录

### GitHub Pages（最常见）

1. `Settings` -> `Pages`
2. `Build and deployment` -> `Source` 选择 `Deploy from a branch`
3. Branch 选择 `master` / Folder 选择 `/ (root)`
4. 保存后等待部署完成

## 二次开发（最常见）

- 品牌名/文案：直接编辑各页面顶部 Logo 与标题区域文案
- 商品数据：在 `scripts/main.js` 的 `SharedData` 内调整（后续可替换为后端 API）
- 图片资源：将真实图片放入 `assets/images/`，并在 `SharedData` 中替换对应路径
- 扩展样式：优先写在 `styles/extensions.css`，避免改动超大主样式文件

## 安全

安全边界与漏洞披露方式：见 `SECURITY.md`。

## 迭代记录

夸克级 6000 次迭代记录：见 `QUARK_ITERATIONS.md`。

## 贡献

见 `CONTRIBUTING.md`。
