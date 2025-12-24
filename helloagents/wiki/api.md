# API 手册（站内约定）

> 本项目为纯静态站点，无后端 HTTP API。这里记录“站内 JS 约定接口”（全局对象、模块入口与事件）。

## 1) 全局对象（运行时）

### `globalThis.ShouwbanCore`
由 `scripts/core.js` 暴露的纯函数集合（被单测覆盖）。

- `clampInt(raw, {min,max,fallback})`
- `clampQuantity(raw)`：返回 `1..99`
- `roundMoney(value)`：金额稳定舍入（避免浮点误差）
- `formatCny(value)`：格式化为 `¥12.34`
- `normalizeStringArray(value)`：清洗字符串数组
- `calculateCartSubtotal(items)`：计算购物车小计
- `calculatePromotionDiscount(subtotal, promo)`：计算优惠折扣

### `globalThis.Motion`
由 `scripts/motion.js` 提供的轻量动效层：
- `Motion.animate(element, keyframes, options)`：基于 WAAPI 的渐进增强

## 2) 事件（CustomEvent）

> 各模块通过 `window.dispatchEvent(new CustomEvent(...))` 做轻量解耦。

- `favorites:changed`
- `compare:changed`
- `orders:changed`
- `promo:changed`
- `shipping:changed`

