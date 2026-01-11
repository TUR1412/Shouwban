import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import '../scripts/core.js';

describe('ShouwbanCore', () => {
  it('exposes a frozen API on globalThis', () => {
    assert.ok(globalThis.ShouwbanCore);
    assert.equal(Object.isFrozen(globalThis.ShouwbanCore), true);

    const core = globalThis.ShouwbanCore;
    assert.equal(typeof core.clampInt, 'function');
    assert.equal(typeof core.clampQuantity, 'function');
    assert.equal(typeof core.roundMoney, 'function');
    assert.equal(typeof core.formatCny, 'function');
    assert.equal(typeof core.normalizeStringArray, 'function');
    assert.equal(typeof core.encodeStringArrayBase64, 'function');
    assert.equal(typeof core.decodeStringArrayBase64, 'function');
    assert.equal(typeof core.encodeCartLinesBase64, 'function');
    assert.equal(typeof core.decodeCartLinesBase64, 'function');
  });

  it('clampInt clamps and falls back correctly', () => {
    const { clampInt } = globalThis.ShouwbanCore;

    assert.equal(clampInt('12', { min: 1, max: 99, fallback: 1 }), 12);
    assert.equal(clampInt('0', { min: 1, max: 99, fallback: 1 }), 1);
    assert.equal(clampInt('100', { min: 1, max: 99, fallback: 1 }), 99);
    assert.equal(clampInt('7.9', { min: 1, max: 99, fallback: 1 }), 7);

    assert.equal(clampInt('abc', { min: 1, max: 99, fallback: 5 }), 5);
    assert.equal(clampInt('', { min: 1, max: 99, fallback: 6 }), 6);
    assert.equal(clampInt(undefined, { min: 1, max: 99, fallback: 7 }), 7);

    assert.equal(clampInt('10'), 10);
    assert.equal(clampInt('10', 123), 10);
    assert.equal(clampInt('10', null), 10);
    assert.equal(clampInt('10', { min: Number.NaN, max: Number.NaN, fallback: Number.NaN }), 10);
    assert.equal(clampInt('abc', { min: Number.NaN, max: Number.NaN, fallback: Number.NaN }), 0);
  });

  it('clampQuantity always returns 1..99', () => {
    const { clampQuantity } = globalThis.ShouwbanCore;

    assert.equal(clampQuantity(1), 1);
    assert.equal(clampQuantity('1'), 1);
    assert.equal(clampQuantity(0), 1);
    assert.equal(clampQuantity('0'), 1);
    assert.equal(clampQuantity('99'), 99);
    assert.equal(clampQuantity(99), 99);
    assert.equal(clampQuantity(100), 99);
    assert.equal(clampQuantity('100'), 99);
    assert.equal(clampQuantity('abc'), 1);
  });

  it('roundMoney rounds to 2 decimals and handles non-finite', () => {
    const { roundMoney } = globalThis.ShouwbanCore;

    assert.equal(roundMoney(0), 0);
    assert.equal(roundMoney(12.345), 12.35);
    assert.equal(roundMoney(-1.234), -1.23);
    assert.equal(roundMoney('12.3'), 12.3);

    assert.equal(roundMoney(Number.NaN), 0);
    assert.equal(roundMoney(Number.POSITIVE_INFINITY), 0);
    assert.equal(roundMoney(Number.NEGATIVE_INFINITY), 0);
  });

  it('formatCny formats with currency symbol and rounding', () => {
    const { formatCny } = globalThis.ShouwbanCore;

    assert.equal(formatCny(12), '¥12.00');
    assert.equal(formatCny('12.345'), '¥12.35');
    assert.equal(formatCny('abc'), '¥0.00');
  });

  it('normalizeStringArray trims and drops empty entries', () => {
    const { normalizeStringArray } = globalThis.ShouwbanCore;

    assert.deepEqual(normalizeStringArray(null), []);
    assert.deepEqual(normalizeStringArray(undefined), []);
    assert.deepEqual(normalizeStringArray([]), []);
    assert.deepEqual(normalizeStringArray([' a ', '', '   ', null, 'b', 1, '2  ']), ['a', 'b', '1', '2']);
  });

  it('calculateCartSubtotal sums safely and rounds', () => {
    const { calculateCartSubtotal } = globalThis.ShouwbanCore;

    assert.equal(calculateCartSubtotal(null), 0);
    assert.equal(calculateCartSubtotal(undefined), 0);
    assert.equal(calculateCartSubtotal([]), 0);

    assert.equal(
      calculateCartSubtotal([
        { price: 10, quantity: 2 },
        { price: '12.3', quantity: '3' },
        { price: -1, quantity: 10 }, // ignore negative
        { price: 9, quantity: 0 }, // ignore zero qty
        { price: 9, quantity: 'abc' }, // ignore non-finite qty
        { price: Number.NaN, quantity: 1 }, // ignore non-finite
        'bad',
        null,
      ]),
      56.9,
    );

    assert.equal(calculateCartSubtotal([{ price: 1.005, quantity: 1 }]), 1.01);
  });

  it('calculatePromotionDiscount handles percent/fixed/clamp', () => {
    const { calculatePromotionDiscount } = globalThis.ShouwbanCore;

    assert.equal(calculatePromotionDiscount(100, null), 0);
    assert.equal(calculatePromotionDiscount(100, 'bad'), 0);
    assert.equal(calculatePromotionDiscount(100, { type: 'percent', value: 10 }), 10);
    assert.equal(calculatePromotionDiscount(100, { type: 'percent', value: 0 }), 0);
    assert.equal(calculatePromotionDiscount(100, { type: 'percent', value: 'abc' }), 0);

    assert.equal(calculatePromotionDiscount(100, { type: 'fixed', value: 50 }), 50);
    assert.equal(calculatePromotionDiscount(40, { type: 'fixed', value: 50 }), 40);
    assert.equal(calculatePromotionDiscount(100, { type: 'fixed', value: 0 }), 0);
    assert.equal(calculatePromotionDiscount(100, { type: 'fixed', value: 'abc' }), 0);

    assert.equal(calculatePromotionDiscount(100, { type: 'unknown', value: 50 }), 0);
    assert.equal(calculatePromotionDiscount(100, { value: 50 }), 0);

    assert.equal(calculatePromotionDiscount(12.345, { type: 'percent', value: 10 }), 1.24);
  });

  it('inventory helpers normalize and compute status', () => {
    const { normalizeInventory, getInventoryStatus } = globalThis.ShouwbanCore;

    assert.deepEqual(normalizeInventory(null), { stock: 0, preorder: false, eta: '' });
    assert.deepEqual(normalizeInventory(undefined), { stock: 0, preorder: false, eta: '' });
    assert.deepEqual(normalizeInventory('bad'), { stock: 0, preorder: false, eta: '' });

    assert.deepEqual(
      normalizeInventory({ stock: '3.9', preorder: 1, eta: ' 2026/04 ' }),
      { stock: 3, preorder: true, eta: '2026/04' },
    );
    assert.deepEqual(
      normalizeInventory({ stock: -5, preorder: 0, eta: null }),
      { stock: 0, preorder: false, eta: '' },
    );

    assert.deepEqual(getInventoryStatus({ preorder: true, stock: 0 }), { label: '预售', tone: 'preorder' });
    assert.deepEqual(getInventoryStatus({ preorder: false, stock: 0 }), { label: '缺货', tone: 'out' });
    assert.deepEqual(getInventoryStatus({ preorder: false, stock: 2 }), { label: '仅剩 2 件', tone: 'low' });
    assert.deepEqual(getInventoryStatus({ preorder: false, stock: 10 }), { label: '现货', tone: 'in' });

    assert.deepEqual(getInventoryStatus({ preorder: false, stock: 2 }, { lowStockThreshold: 1 }), { label: '现货', tone: 'in' });
  });

  it('binary codec: string array base64 roundtrip + normalization', () => {
    const { encodeStringArrayBase64, decodeStringArrayBase64 } = globalThis.ShouwbanCore;

    const base64 = encodeStringArrayBase64([' a ', '', null, 'b', 1]);
    assert.equal(typeof base64, 'string');
    assert.deepEqual(decodeStringArrayBase64(base64), ['a', 'b', '1']);

    // Multi-byte varint path: array length >= 128
    const big = Array.from({ length: 130 }, (_, i) => `p${i}`);
    const bigB64 = encodeStringArrayBase64(big);
    const bigDecoded = decodeStringArrayBase64(bigB64);
    assert.equal(bigDecoded.length, 130);
    assert.equal(bigDecoded[0], 'p0');
    assert.equal(bigDecoded[129], 'p129');

    assert.deepEqual(decodeStringArrayBase64(''), []);
    assert.deepEqual(decodeStringArrayBase64('   '), []);
    assert.deepEqual(decodeStringArrayBase64(undefined), []);
  });

  it('binary codec: cart lines base64 roundtrip + clamping', () => {
    const { encodeCartLinesBase64, decodeCartLinesBase64 } = globalThis.ShouwbanCore;

    const base64 = encodeCartLinesBase64([
      { id: 'p1', quantity: 2 },
      { quantity: 3 }, // missing id: drop
      { id: '  ', quantity: 9 }, // drop empty id
      { id: 'p2', quantity: '100' }, // clamp to 99
      'bad',
      null,
    ]);

    const decoded = decodeCartLinesBase64(base64);
    assert.deepEqual(decoded, [
      { id: 'p1', quantity: 2 },
      { id: 'p2', quantity: 99 },
    ]);

    // Non-array input should encode to an empty payload.
    const emptyB64 = encodeCartLinesBase64(null);
    assert.deepEqual(decodeCartLinesBase64(emptyB64), []);
    assert.deepEqual(decodeCartLinesBase64(''), []);
  });

  it('binary codec: btoa/atob fallback path works', () => {
    const { encodeStringArrayBase64, decodeStringArrayBase64 } = globalThis.ShouwbanCore;

    const originalBuffer = globalThis.Buffer;
    const originalBtoa = globalThis.btoa;
    const originalAtob = globalThis.atob;

    try {
      globalThis.btoa = (binary) => originalBuffer.from(binary, 'binary').toString('base64');
      globalThis.atob = (base64) => originalBuffer.from(base64, 'base64').toString('binary');

      globalThis.Buffer = undefined;
      const base64 = encodeStringArrayBase64(['x']);
      assert.deepEqual(decodeStringArrayBase64(base64), ['x']);

      // hasNodeBuffer(): first operand true, second operand false
      globalThis.Buffer = {};
      const base64b = encodeStringArrayBase64(['y']);
      assert.deepEqual(decodeStringArrayBase64(base64b), ['y']);
    } finally {
      globalThis.Buffer = originalBuffer;
      globalThis.btoa = originalBtoa;
      globalThis.atob = originalAtob;
    }
  });

  it('binary codec: fails safely on corrupted payloads and missing base64 impl', () => {
    const { decodeStringArrayBase64, decodeCartLinesBase64, encodeStringArrayBase64 } = globalThis.ShouwbanCore;

    // Corrupted bytes: varint truncated
    assert.deepEqual(decodeStringArrayBase64(Buffer.from([0x80]).toString('base64')), []);
    // Corrupted bytes: varint too long (5 continuation bytes)
    assert.deepEqual(decodeStringArrayBase64(Buffer.from([0x80, 0x80, 0x80, 0x80, 0x80]).toString('base64')), []);
    // Corrupted bytes: string truncated (count=1, len=5 but only 1 byte)
    assert.deepEqual(decodeStringArrayBase64(Buffer.from([0x01, 0x05, 0x41]).toString('base64')), []);
    // Corrupted bytes: cart truncated (count=1, id missing)
    assert.deepEqual(decodeCartLinesBase64(Buffer.from([0x01, 0x03]).toString('base64')), []);

    const originalBuffer = globalThis.Buffer;
    const originalBtoa = globalThis.btoa;
    const originalAtob = globalThis.atob;

    try {
      globalThis.Buffer = undefined;
      globalThis.btoa = undefined;
      globalThis.atob = undefined;

      assert.throws(() => encodeStringArrayBase64(['x']));
      assert.deepEqual(decodeStringArrayBase64('!!'), []);
    } finally {
      globalThis.Buffer = originalBuffer;
      globalThis.btoa = originalBtoa;
      globalThis.atob = originalAtob;
    }
  });
});
