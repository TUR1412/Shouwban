# 塑梦潮玩（Shouwban）- 静态电商落地页/多页面示例

一个纯静态（无后端依赖）的手办电商前端示例，包含：
- 首页（Hero + 精选展示 + 品牌理念 + 联系方式）
- 商品列表页 / 分类页 / 搜索结果页
- 商品详情页（含图集、规格、加入购物车）
- 购物车页（本地存储、数量调整、删除）
- 结算页（表单校验、订单摘要、模拟下单）
- 静态内容页（FAQ/隐私政策/服务条款）

> 说明：本项目默认使用 `localStorage` 模拟购物车数据，适合作为「前端原型/落地页」或后续对接真实 API 的模板。

## 目录结构

- `index.html`：首页
- `products.html`：商品列表页（含搜索/排序 UI）
- `category.html`：分类页（通过 `?cat=` 参数）
- `product-detail.html`：商品详情页（通过 `?id=` 参数）
- `cart.html`：购物车页
- `checkout.html`：结算页
- `static-page.html`：静态内容页（通过 `?page=` 参数）
- `styles/`：样式
- `scripts/`：脚本（核心逻辑在 `scripts/main.js`）
- `assets/`：图片/图标等静态资源

## 本地预览（推荐）

由于浏览器安全策略，直接双击打开 `html` 文件可能会导致部分资源或跳转行为异常。建议使用本地静态服务器预览：

### 方式 A：Python（无需额外安装）

在项目根目录执行：

```powershell
pwsh -NoLogo -NoProfile -Command 'cd C:\wook\Shouwban; python -m http.server 5173'
```

然后访问：`http://localhost:5173/index.html`

### 方式 B：VS Code Live Server

安装 Live Server 插件后，右键 `index.html` -> Open with Live Server。

## 原子级自检（推荐）

该仓库提供一个零依赖的校验脚本，用于检查：
- 所有页面是否带缓存版本号（避免“改了没生效”）
- HTML/CSS 引用的本地资源是否存在（避免缺图/404）

在项目根目录执行：

```powershell
pwsh -NoLogo -NoProfile -Command 'cd C:\wook\Shouwban; node scripts\validate.mjs'
```

## 自定义指南（最常见）

- **品牌名/文案**：直接编辑各页面顶部 Logo 与标题区域文案
- **商品数据**：在 `scripts/main.js` 的 `SharedData` 内调整（后续可替换为后端 API）
- **图片资源**：将真实图片放入 `assets/images/`，并在 `SharedData` 中替换对应路径

## 部署

这是纯静态站点，可直接部署到：
- GitHub Pages
- Vercel / Netlify（作为 Static Site）
- 传统 Nginx/Apache 静态目录
