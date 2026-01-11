# Shouwban · 塑梦潮玩

一个以“手办收藏体验”为核心的高质感前端样板：保留原有架构逻辑，升级为更强的会员、关注、套装与订单旅程体系，并完成未来感 UI 视觉重塑。

---

## 中文版

### 核心亮点
- 会员体系进阶：积分 → 等级 → 权益闭环（折扣、包邮门槛、专属权益）。
- 关注中心：收藏 / 降价 / 到货提醒统一视图，趋势记录贯穿详情页。
- 套装策略：组合购推荐 + 套装折扣 + 购物车一键移除。
- 订单旅程：时间轴 + 售后入口，完整还原下单生命周期。
- 智能策展：基于浏览、收藏、品类偏好形成“策展式推荐”。
- 视觉重塑：玻璃拟态 + 霓虹质感 + 未来感渐变背景。

### 主要能力矩阵
- 商品侧：库存状态、预售提示、价格趋势记录、组合购推荐。
- 购物侧：套装折扣、会员折扣、智能推荐、库存校验。
- 会员侧：等级卡片、积分动画、会员权益与优惠贯通。
- 订单侧：旅程时间轴、售后记录、订单再购。

### 快速开始
1. 安装依赖：`npm install`
2. 本地开发：`npm run dev`
3. 构建产物：`npm run build`

### 校验与测试
- 结构校验：`npm run validate`
- 完整校验：`npm run verify`
- 语法检查：`npm run check`

### 目录概览
- `scripts/main.js`：核心业务逻辑与模块聚合
- `scripts/runtime/`：运行时内核（state / storage / perf）
- `scripts/pages/`：按页面拆分的交互逻辑
- `styles/`：基础样式与扩展视觉体系
- `sw.js`：PWA 缓存与离线策略

---

## English

### Highlights
- Membership upgrades: points → tiers → benefits (discounts, shipping perks, exclusive perks).
- Watch Center: favorites + price alerts + restock alerts in a single dashboard.
- Bundling strategy: bundle recommendations, bundle discounting, one-click removal.
- Order Journey: visual timeline + after-sales records for the full lifecycle.
- Smart Curation: preference-aware recommendations driven by behavior.
- Visual overhaul: glassmorphism, neon accents, future-facing gradients.

### Capability Matrix
- Product: inventory signals, preorder, price-trend logging, bundle recommendations.
- Cart: bundle discounts, member discounts, smart recs, inventory-aware validation.
- Account: tier cards, animated points, benefits wiring.
- Orders: journey timeline, after-sales entry, rebuy flow.

### Quick Start
1. Install: `npm install`
2. Dev: `npm run dev`
3. Build: `npm run build`

### Validation
- Structure: `npm run validate`
- Full verify: `npm run verify`
- Syntax check: `npm run check`

### Structure
- `scripts/main.js`: core logic & modules
- `scripts/runtime/`: runtime kernels (state / storage / perf)
- `scripts/pages/`: page-level logic
- `styles/`: base styles + extension theme
- `sw.js`: PWA caching & offline strategy
