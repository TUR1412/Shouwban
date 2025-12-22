/* Core Utilities (Runtime + Tests)
   - 纯函数、零 DOM 依赖
   - 通过 globalThis.ShouwbanCore 暴露给前端主脚本使用
*/

(function () {
  'use strict';

  function clampInt(raw, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const min = Number.isFinite(opts.min) ? opts.min : 0;
    const max = Number.isFinite(opts.max) ? opts.max : Number.POSITIVE_INFINITY;
    const fallback = Number.isFinite(opts.fallback) ? opts.fallback : min;

    const n = Number.parseInt(String(raw ?? ''), 10);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function clampQuantity(raw) {
    return clampInt(raw, { min: 1, max: 99, fallback: 1 });
  }

  function roundMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;

    // 避免浮点误差：让 1.005 -> 1.01 这类金额舍入更稳定
    // 负数使用对称处理，避免 Math.round 在负数时向 +∞ 的“偏置”
    const factor = 100;
    if (n >= 0) return Math.round((n + Number.EPSILON) * factor) / factor;
    return -Math.round((-n + Number.EPSILON) * factor) / factor;
  }

  function formatCny(value) {
    return `¥${roundMoney(value).toFixed(2)}`;
  }

  function normalizeStringArray(value) {
    if (!Array.isArray(value)) return [];
    return value
      .map((x) => String(x ?? '').trim())
      .filter((x) => x.length > 0);
  }

  function calculateCartSubtotal(items) {
    const list = Array.isArray(items) ? items : [];
    const sum = list.reduce((acc, item) => {
      if (!item || typeof item !== 'object') return acc;
      const price = Number(item.price);
      const qty = Number(item.quantity);
      if (!Number.isFinite(price) || price < 0) return acc;
      if (!Number.isFinite(qty) || qty <= 0) return acc;
      return acc + price * qty;
    }, 0);
    return roundMoney(sum);
  }

  function calculatePromotionDiscount(subtotal, promo) {
    const s = roundMoney(subtotal);
    if (!promo || typeof promo !== 'object') return 0;

    const type = String(promo.type ?? '').trim();
    const value = Number(promo.value);

    let discount = 0;
    if (type === 'percent') {
      const pct = value;
      if (Number.isFinite(pct) && pct > 0) {
        discount = (s * pct) / 100;
      }
    } else if (type === 'fixed') {
      const fixed = value;
      if (Number.isFinite(fixed) && fixed > 0) {
        discount = fixed;
      }
    } else {
      discount = 0;
    }

    discount = Math.max(0, Math.min(s, roundMoney(discount)));
    return discount;
  }

  const api = Object.freeze({
    clampInt,
    clampQuantity,
    roundMoney,
    formatCny,
    normalizeStringArray,
    calculateCartSubtotal,
    calculatePromotionDiscount,
  });

  globalThis.ShouwbanCore = api;
})();
