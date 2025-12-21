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
});
