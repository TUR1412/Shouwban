import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createErrorShield } from '../scripts/modules/error-shield.js';

function captureGlobalListeners() {
  const map = new Map();
  const original = globalThis.addEventListener;

  globalThis.addEventListener = (type, handler) => {
    map.set(String(type || ''), handler);
  };

  return {
    map,
    restore: () => {
      globalThis.addEventListener = original;
    },
  };
}

describe('ErrorShield', () => {
  it('records runtime errors and increments dedupe count', () => {
    const harness = captureGlobalListeners();
    const loggerCalls = [];
    const telemetryCalls = [];

    const Logger = {
      error: (message, detail) => loggerCalls.push({ message, detail }),
    };
    const Telemetry = {
      track: (name, payload) => telemetryCalls.push({ name, payload }),
    };
    const Utils = { getPageName: () => 'test' };

    const shield = createErrorShield({ Logger, Telemetry, Utils });
    shield.init();

    const onError = harness.map.get('error');
    assert.equal(typeof onError, 'function');

    onError({
      message: 'Boom',
      filename: 'a.js',
      lineno: 1,
      colno: 2,
      error: { name: 'Error', message: 'Boom', stack: 'SAME_STACK' },
    });
    onError({
      message: 'Boom',
      filename: 'a.js',
      lineno: 1,
      colno: 2,
      error: { name: 'Error', message: 'Boom', stack: 'SAME_STACK' },
    });

    const recent = shield.getRecent();
    assert.equal(recent.length, 2);
    assert.equal(recent[0].kind, 'error');
    assert.equal(recent[0].count, 1);
    assert.equal(recent[1].count, 2);
    assert.ok(Number(recent[0].messageHash) > 0);

    assert.equal(loggerCalls.length, 2);
    assert.equal(telemetryCalls.length, 2);
    assert.equal(telemetryCalls[0].name, 'runtime_error');

    harness.restore();
  });

  it('records unhandled rejections', () => {
    const harness = captureGlobalListeners();
    const loggerCalls = [];
    const telemetryCalls = [];

    const Logger = {
      error: (message, detail) => loggerCalls.push({ message, detail }),
    };
    const Telemetry = {
      track: (name, payload) => telemetryCalls.push({ name, payload }),
    };
    const Utils = { getPageName: () => 'test' };

    const shield = createErrorShield({ Logger, Telemetry, Utils });
    shield.init();

    const onRej = harness.map.get('unhandledrejection');
    assert.equal(typeof onRej, 'function');

    onRej({ reason: new Error('Nope') });

    const recent = shield.getRecent();
    assert.equal(recent.length, 1);
    assert.equal(recent[0].kind, 'unhandledrejection');
    assert.ok(Number(recent[0].messageHash) > 0);

    assert.equal(loggerCalls.length, 1);
    assert.equal(telemetryCalls.length, 1);
    assert.equal(telemetryCalls[0].name, 'unhandled_rejection');

    harness.restore();
  });

  it('captures handled errors via capture()', () => {
    const loggerCalls = [];
    const telemetryCalls = [];

    const Logger = {
      error: (message, detail) => loggerCalls.push({ message, detail }),
    };
    const Telemetry = {
      track: (name, payload) => telemetryCalls.push({ name, payload }),
    };
    const Utils = { getPageName: () => 'test' };

    const shield = createErrorShield({ Logger, Telemetry, Utils });

    const err = new Error('Boom');

    const ok1 = shield.capture(err, {
      source: 'PageModules',
      page: 'products.html',
    });
    const ok2 = shield.capture(err, {
      source: 'PageModules',
      page: 'products.html',
    });

    assert.equal(ok1, true);
    assert.equal(ok2, true);

    const recent = shield.getRecent();
    assert.equal(recent.length, 2);
    assert.equal(recent[0].kind, 'capture');
    assert.equal(recent[0].source, 'PageModules');
    assert.equal(recent[0].page, 'products.html');
    assert.equal(recent[0].count, 1);
    assert.equal(recent[1].count, 2);

    assert.equal(loggerCalls.length, 2);
    assert.equal(telemetryCalls.length, 2);
    assert.equal(telemetryCalls[0].name, 'runtime_error');
  });

  it('clear empties recent list', () => {
    const harness = captureGlobalListeners();
    const Logger = { error: () => {} };
    const Utils = { getPageName: () => 'test' };

    const shield = createErrorShield({ Logger, Utils });
    shield.init();

    const onError = harness.map.get('error');
    onError({ message: 'Boom', filename: 'a.js', lineno: 1, colno: 2 });

    assert.equal(shield.getRecent().length, 1);
    shield.clear();
    assert.equal(shield.getRecent().length, 0);

    harness.restore();
  });

  it('open does not throw without DOM', () => {
    const Utils = { getPageName: () => 'test' };
    const shield = createErrorShield({ Utils });
    assert.doesNotThrow(() => shield.open());
  });
});
