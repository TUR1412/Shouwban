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
    return Math.round(n * 100) / 100;
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

  const api = Object.freeze({
    clampInt,
    clampQuantity,
    roundMoney,
    formatCny,
    normalizeStringArray,
  });

  globalThis.ShouwbanCore = api;
})();

