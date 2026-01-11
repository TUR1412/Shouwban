# 任务清单: Quark Overhaul 夸克级重构与业务进化

目录: `helloagents/plan/202601112017_quark-overhaul/`

---

## 1. Runtime 模块化与性能
- [√] 1.1 在 `scripts/runtime/storage.js` 与 `scripts/main.js` 中引入 schema 迁移与存储封装，验证 why.md#需求-运行时模块化与性能迭代-runtime-refactor-场景-模块化拆分与性能循环
- [√] 1.2 在 `scripts/runtime/state.js` 与 `scripts/main.js` 中拆分 StateHub/事件中心并集中注入依赖，验证 why.md#需求-运行时模块化与性能迭代-runtime-refactor-场景-模块化拆分与性能循环
- [√] 1.3 在 `scripts/runtime/perf.js` 与 `scripts/main.js` 中落地热点缓存/批量渲染/节流策略，验证 why.md#需求-运行时模块化与性能迭代-runtime-refactor-场景-模块化拆分与性能循环

## 2. 库存与预售节奏
- [√] 2.1 在 `scripts/core.js` 与 `scripts/main.js` 中实现库存/预售规则与校验，验证 why.md#需求-库存与预售节奏-inventory-pulse-场景-低库存与预售提示
- [√] 2.2 在 `product-detail.html` 与 `products.html` 中补齐库存/预售 UI 展示结构，验证 why.md#需求-库存与预售节奏-inventory-pulse-场景-低库存与预售提示
- [√] 2.3 在 `styles/extensions.css` 中新增库存状态组件样式与徽标体系，验证 why.md#需求-库存与预售节奏-inventory-pulse-场景-低库存与预售提示

## 3. 组合购与套装优惠
- [√] 3.1 在 `scripts/main.js` 与 `scripts/pages/product-detail.js` 中实现套装选择与折扣计算，验证 why.md#需求-组合购与套装优惠-bundle-deals-场景-一键加入套装
- [√] 3.2 在 `cart.html` 与 `scripts/pages/cart.js` 中支持套装项拆分/取消与价格展示，验证 why.md#需求-组合购与套装优惠-bundle-deals-场景-一键加入套装
  > 备注: 购物车逻辑位于 `scripts/main.js` 的 Cart 模块，仓库未单独拆出 `scripts/pages/cart.js`。

## 4. 会员等级与权益
- [√] 4.1 在 `account.html` 与 `scripts/pages/account.js` 中展示会员等级与权益，验证 why.md#需求-会员等级与权益-loyalty-tiers-场景-结算展示会员权益
- [√] 4.2 在 `checkout.html` 与 `scripts/pages/checkout.js` 中接入会员折扣/免邮规则，验证 why.md#需求-会员等级与权益-loyalty-tiers-场景-结算展示会员权益

## 5. 订单追踪与售后
- [√] 5.1 在 `orders.html` 与 `scripts/pages/orders.js` 中实现订单时间轴与售后入口，验证 why.md#需求-订单追踪与售后-order-journey-场景-订单详情时间轴
- [√] 5.2 在 `order-success.html` 与 `scripts/pages/order-success.js` 中写入初始状态与回跳入口，验证 why.md#需求-订单追踪与售后-order-journey-场景-订单详情时间轴

## 6. 关注中心与价格趋势
- [√] 6.1 在 `account.html` 与 `scripts/pages/account.js` 中实现关注中心 UI 与管理操作，验证 why.md#需求-关注中心与价格趋势-watch-center-场景-关注中心统一管理
- [√] 6.2 在 `scripts/main.js` 与 `scripts/core.js` 中实现价格趋势记录与解析，验证 why.md#需求-关注中心与价格趋势-watch-center-场景-关注中心统一管理

## 7. 智能策展推荐
- [√] 7.1 在 `scripts/pages/homepage.js` 与 `scripts/main.js` 中实现智能策展推荐注入，验证 why.md#需求-智能策展推荐-smart-curation-场景-首页与详情联动推荐
- [√] 7.2 在 `scripts/pages/product-detail.js` 与 `product-detail.html` 中输出联动推荐模块，验证 why.md#需求-智能策展推荐-smart-curation-场景-首页与详情联动推荐

## 8. 视觉系统重塑
- [√] 8.1 在 `styles/main.css` 与 `styles/extensions.css` 中升级视觉 Token 与组件层级，验证 why.md#需求-视觉系统重塑-visual-system-场景-全站视觉一致性升级
- [√] 8.2 在 `index.html`、`products.html` 与 `product-detail.html` 中调整关键布局结构，验证 why.md#需求-视觉系统重塑-visual-system-场景-全站视觉一致性升级
  > 备注: 结构调整集中在首页与 PDP，PLP 以样式升级为主以避免破坏筛选布局。

## 9. PWA 与工具链一致性
- [√] 9.1 在 `sw.js` 与 `scripts/validate.mjs` 中更新预缓存清单与校验规则，验证 why.md#需求-运行时模块化与性能迭代-runtime-refactor-场景-模块化拆分与性能循环
- [√] 9.2 在 `scripts/bump-version.mjs` 与 `scripts/validate.mjs` 中补齐新模块的版本号替换与校验路径，验证 why.md#需求-运行时模块化与性能迭代-runtime-refactor-场景-模块化拆分与性能循环

## 10. 文档与知识库更新
- [√] 10.1 重制 `README.md`（双语、结构化、示例与指引更新），验证 why.md#需求-视觉系统重塑-visual-system-场景-全站视觉一致性升级
- [√] 10.2 更新 `helloagents/wiki/modules/ui.md` 与 `helloagents/wiki/modules/runtime-js.md`，同步本次架构与业务变化

## 11. 安全检查
- [√] 11.1 执行安全检查（按G9: 输入验证、敏感信息处理、权限控制、EHRB风险规避）

## 12. 测试
- [√] 12.1 执行 `npm run verify` 与 `npm test`，记录关键场景检查结果
