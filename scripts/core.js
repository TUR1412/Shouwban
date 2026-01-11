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

  function hasNodeBuffer() {
    return typeof Buffer !== 'undefined' && typeof Buffer.from === 'function';
  }

  function bytesToBase64(bytes) {
    if (hasNodeBuffer()) {
      return Buffer.from(bytes).toString('base64');
    }

    if (typeof btoa === 'function') {
      const chunkSize = 0x8000;
      let binary = '';
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      return btoa(binary);
    }

    throw new Error('Base64 encode is not supported in this runtime.');
  }

  function base64ToBytes(value) {
    const base64 = String(value ?? '').trim();
    if (!base64) return new Uint8Array();

    if (hasNodeBuffer()) {
      return Uint8Array.from(Buffer.from(base64, 'base64'));
    }

    if (typeof atob === 'function') {
      const binary = atob(base64);
      const out = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        out[i] = binary.charCodeAt(i);
      }
      return out;
    }

    throw new Error('Base64 decode is not supported in this runtime.');
  }

  function pushVarint(out, value) {
    // uint32 varint: enough for our use cases (counts/qty/byte lengths).
    // 输入约定：应为非负整数；内部通过 >>>0 做无分支 uint32 归一化。
    let v = Math.floor(Number(value)) >>> 0;

    while (v >= 0x80) {
      out.push((v & 0x7f) | 0x80);
      v = Math.floor(v / 128);
    }
    out.push(v);
  }

  function readVarint(bytes, offset) {
    let pos = Number(offset) || 0;
    let result = 0;
    let shift = 0;

    for (let i = 0; i < 5; i += 1) {
      if (pos >= bytes.length) throw new Error('Varint truncated.');
      const b = bytes[pos++];
      result |= (b & 0x7f) << shift;
      if ((b & 0x80) === 0) return { value: result >>> 0, offset: pos };
      shift += 7;
    }

    throw new Error('Varint too long.');
  }

  function pushBytes(out, bytes) {
    for (let i = 0; i < bytes.length; i += 1) out.push(bytes[i]);
  }

  function pushString(out, value) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(String(value));
    pushVarint(out, bytes.length);
    pushBytes(out, bytes);
  }

  function readString(bytes, offset) {
    const rLen = readVarint(bytes, offset);
    const len = rLen.value;
    const start = rLen.offset;
    const end = start + len;
    if (end > bytes.length) throw new Error('String truncated.');
    const decoder = new TextDecoder();
    const value = decoder.decode(bytes.subarray(start, end));
    return { value, offset: end };
  }

  function packStringArray(value) {
    const list = normalizeStringArray(value);
    const out = [];
    pushVarint(out, list.length);
    for (const item of list) pushString(out, item);
    return Uint8Array.from(out);
  }

  function unpackStringArray(bytes) {
    if (bytes.length === 0) return [];

    let offset = 0;
    const head = readVarint(bytes, offset);
    const count = head.value;
    offset = head.offset;

    const out = [];
    for (let i = 0; i < count; i += 1) {
      const r = readString(bytes, offset);
      offset = r.offset;
      out.push(r.value);
    }
    return out;
  }

  function normalizeCartLines(value) {
    if (!Array.isArray(value)) return [];
    const out = [];

    value.forEach((raw) => {
      if (!raw || typeof raw !== 'object') return;
      const id = String(raw.id ?? '').trim();
      if (!id) return;
      out.push({ id, quantity: clampQuantity(raw.quantity) });
    });

    return out;
  }

  function packCartLines(value) {
    const lines = normalizeCartLines(value);
    const out = [];
    pushVarint(out, lines.length);
    for (const line of lines) {
      pushString(out, line.id);
      pushVarint(out, line.quantity);
    }
    return Uint8Array.from(out);
  }

  function unpackCartLines(bytes) {
    if (bytes.length === 0) return [];

    let offset = 0;
    const head = readVarint(bytes, offset);
    const count = head.value;
    offset = head.offset;

    const out = [];
    for (let i = 0; i < count; i += 1) {
      const rId = readString(bytes, offset);
      offset = rId.offset;
      const rQty = readVarint(bytes, offset);
      offset = rQty.offset;
      out.push({ id: rId.value, quantity: clampQuantity(rQty.value) });
    }
    return out;
  }

  function encodeStringArrayBase64(value) {
    const bytes = packStringArray(value);
    return bytesToBase64(bytes);
  }

  function decodeStringArrayBase64(value) {
    try {
      return unpackStringArray(base64ToBytes(value));
    } catch {
      return [];
    }
  }

  function encodeCartLinesBase64(value) {
    const bytes = packCartLines(value);
    return bytesToBase64(bytes);
  }

  function decodeCartLinesBase64(value) {
    try {
      return unpackCartLines(base64ToBytes(value));
    } catch {
      return [];
    }
  }

  function normalizeInventory(raw) {
    const obj = raw && typeof raw === 'object' ? raw : {};
    const stock = Math.max(0, Math.floor(Number(obj.stock) || 0));
    const preorder = Boolean(obj.preorder);
    const eta = typeof obj.eta === 'string' ? obj.eta.trim() : '';
    return { stock, preorder, eta };
  }

  function getInventoryStatus(info, options) {
    const opts = options && typeof options === 'object' ? options : {};
    const lowStockThreshold = Number.isFinite(opts.lowStockThreshold)
      ? opts.lowStockThreshold
      : 3;
    const data = normalizeInventory(info);
    if (data.preorder) return { label: '预售', tone: 'preorder' };
    if (data.stock <= 0) return { label: '缺货', tone: 'out' };
    if (data.stock <= lowStockThreshold) {
      return { label: `仅剩 ${data.stock} 件`, tone: 'low' };
    }
    return { label: '现货', tone: 'in' };
  }

  const api = Object.freeze({
    clampInt,
    clampQuantity,
    roundMoney,
    formatCny,
    normalizeStringArray,
    calculateCartSubtotal,
    calculatePromotionDiscount,
    encodeStringArrayBase64,
    decodeStringArrayBase64,
    encodeCartLinesBase64,
    decodeCartLinesBase64,
    normalizeInventory,
    getInventoryStatus,
  });

  globalThis.ShouwbanCore = api;
})();
