import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createLogger } from '../scripts/modules/logger.js';

describe('Logger', () => {
  it('stores a ring buffer in storage and trims to maxEntries', () => {
    const store = new Map();
    const events = [];
    const deps = {
      readStorageJSON: (key, fallback) => (store.has(key) ? store.get(key) : fallback),
      writeStorageJSON: (key, value) => {
        store.set(key, value);
        return true;
      },
      removeStorage: (key) => {
        store.delete(key);
        return true;
      },
      dispatchChanged: (scope) => events.push(scope),
      getPageName: () => 'index.html',
      getHref: () => 'https://example.test/index.html',
    };

    const logger = createLogger(deps, { storageKey: 'sbLogs', maxEntries: 3 });

    logger.info('A');
    logger.warn('B');
    logger.error('C');
    logger.debug('D');

    const entries = logger.getEntries();
    assert.equal(entries.length, 3);
    assert.equal(entries[0].message, 'B');
    assert.equal(entries[1].message, 'C');
    assert.equal(entries[2].message, 'D');
    assert.equal(entries[0].page, 'index.html');
    assert.equal(entries[0].href, 'https://example.test/index.html');

    assert.ok(events.includes('logs'));
  });

  it('clamps oversized detail payloads to avoid storage failures', () => {
    const store = new Map();
    const deps = {
      readStorageJSON: (key, fallback) => (store.has(key) ? store.get(key) : fallback),
      writeStorageJSON: (key, value) => {
        store.set(key, value);
        return true;
      },
      removeStorage: (key) => {
        store.delete(key);
        return true;
      },
      dispatchChanged: () => {},
      getPageName: () => 'products.html',
      getHref: () => 'https://example.test/products.html',
    };

    const logger = createLogger(deps, { storageKey: 'sbLogs', maxEntries: 10 });
    const huge = 'x'.repeat(8000);
    logger.info('Huge detail', { huge });

    const entry = logger.getEntries()[0];
    assert.equal(entry.message, 'Huge detail');
    assert.equal(typeof entry.detail, 'object');
    assert.equal(entry.detail.truncated, true);
    assert.equal(typeof entry.detail.length, 'number');
  });

  it('clear removes stored entries', () => {
    const store = new Map();
    const deps = {
      readStorageJSON: (key, fallback) => (store.has(key) ? store.get(key) : fallback),
      writeStorageJSON: (key, value) => {
        store.set(key, value);
        return true;
      },
      removeStorage: (key) => {
        store.delete(key);
        return true;
      },
      dispatchChanged: () => {},
      getPageName: () => 'index.html',
      getHref: () => 'https://example.test/index.html',
    };

    const logger = createLogger(deps, { storageKey: 'sbLogs', maxEntries: 10 });
    logger.info('Once');
    assert.equal(logger.getEntries().length, 1);
    logger.clear();
    assert.equal(logger.getEntries().length, 0);
  });
});

