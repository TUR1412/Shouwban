import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createTelemetry } from '../scripts/modules/telemetry.js';

function installSessionStorage() {
  const original = globalThis.sessionStorage;
  const store = new Map();

  globalThis.sessionStorage = {
    getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => {
      store.set(String(k), String(v));
    },
    removeItem: (k) => {
      store.delete(String(k));
    },
    clear: () => store.clear(),
  };

  return () => {
    globalThis.sessionStorage = original;
  };
}

describe('Telemetry', () => {
  it('hashQuery uses stable fnv1a32', () => {
    const t = createTelemetry({ Utils: {} });
    const h = t.hashQuery('hello');
    assert.equal(h.qLen, 5);
    assert.equal(h.qHash, 1335831723);
  });

  it('track stores a ring buffer and trims to maxQueue', () => {
    const restoreSession = installSessionStorage();

    const storage = {};
    const counters = new Map();
    const Utils = {
      generateId: (prefix) => {
        const key = String(prefix || '');
        const next = (counters.get(key) || 0) + 1;
        counters.set(key, next);
        return `${key}${next}`;
      },
      getPageName: () => 'test',
      readStorageJSON: (key, fallbackValue) => {
        const k = String(key || '');
        return Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : fallbackValue;
      },
      writeStorageJSON: (key, value) => {
        storage[String(key || '')] = value;
        return true;
      },
    };

    const t = createTelemetry({ Utils }, { maxQueue: 3 });
    assert.equal(t.track('evt', { i: 1 }), true);
    assert.equal(t.track('evt', { i: 2 }), true);
    assert.equal(t.track('evt', { i: 3 }), true);
    assert.equal(t.track('evt', { i: 4 }), true);
    assert.equal(t.track('evt', { i: 5 }), true);

    const q = t.getQueue();
    assert.equal(q.length, 3);
    assert.equal(q[0].id, 'E3');
    assert.equal(q[2].id, 'E5');

    restoreSession();
  });

  it('clearQueue empties stored queue', () => {
    const restoreSession = installSessionStorage();

    const storage = {};
    const Utils = {
      generateId: () => 'E1',
      getPageName: () => 'test',
      readStorageJSON: (key, fallbackValue) => {
        const k = String(key || '');
        return Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : fallbackValue;
      },
      writeStorageJSON: (key, value) => {
        storage[String(key || '')] = value;
        return true;
      },
    };

    const t = createTelemetry({ Utils }, { maxQueue: 5 });
    t.track('evt', { a: 1 });
    assert.equal(t.getQueue().length, 1);
    t.clearQueue();
    assert.equal(t.getQueue().length, 0);

    restoreSession();
  });

  it('flush returns no_endpoint when endpoint is not configured', async () => {
    const restoreSession = installSessionStorage();

    const storage = {};
    const Utils = {
      generateId: () => 'E1',
      getPageName: () => 'test',
      readStorageJSON: (key, fallbackValue) => {
        const k = String(key || '');
        return Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : fallbackValue;
      },
      writeStorageJSON: (key, value) => {
        storage[String(key || '')] = value;
        return true;
      },
    };

    const t = createTelemetry({ Utils }, { maxQueue: 5 });
    t.track('evt', { a: 1 });
    const r = await t.flush();
    assert.equal(r.ok, false);
    assert.equal(r.reason, 'no_endpoint');

    restoreSession();
  });

  it('flush sends and clears queue when endpoint is present', async () => {
    const restoreSession = installSessionStorage();

    const originalConfig = globalThis.__SHOUWBAN_TELEMETRY__;
    globalThis.__SHOUWBAN_TELEMETRY__ = { endpoint: 'https://example.com/t' };

    const storage = {};
    const counters = new Map();
    const Utils = {
      generateId: (prefix) => {
        const key = String(prefix || '');
        const next = (counters.get(key) || 0) + 1;
        counters.set(key, next);
        return `${key}${next}`;
      },
      getPageName: () => 'test',
      readStorageJSON: (key, fallbackValue) => {
        const k = String(key || '');
        return Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : fallbackValue;
      },
      writeStorageJSON: (key, value) => {
        storage[String(key || '')] = value;
        return true;
      },
    };

    const Http = {
      postJSON: async () => ({ ok: true, status: 200 }),
    };

    const t = createTelemetry({ Utils, Http }, { maxQueue: 10 });
    t.track('evt', { a: 1 });
    t.track('evt', { a: 2 });

    const r = await t.flush();
    assert.equal(r.ok, true);
    assert.equal(r.sent, 2);
    assert.equal(t.getQueue().length, 0);

    globalThis.__SHOUWBAN_TELEMETRY__ = originalConfig;
    restoreSession();
  });
});

