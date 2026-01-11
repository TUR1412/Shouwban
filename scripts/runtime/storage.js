// 存储工具箱：统一 schema 迁移与结构化读写。
// - 提供 schema 迁移与统一读写封装
// - 保持零依赖与静态站点兼容
export function createStorageKit(deps = {}) {
  const readJSON = typeof deps.readStorageJSON === 'function' ? deps.readStorageJSON : () => null;
  const writeJSON = typeof deps.writeStorageJSON === 'function' ? deps.writeStorageJSON : () => false;
  const remove = typeof deps.removeStorage === 'function' ? deps.removeStorage : () => false;
  const dispatchChanged = typeof deps.dispatchChanged === 'function' ? deps.dispatchChanged : () => {};

  const schemaKey = 'sbSchemaVersion';
  const targetVersion = 2;

  const defaultMembership = {
    tier: 'rookie',
    points: 0,
    updatedAt: new Date().toISOString(),
  };

  const defaultWatchCenter = {
    restockAlerts: [],
    priceAlerts: [],
  };

  function getSchemaVersion() {
    const raw = readJSON(schemaKey, 0);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  function setSchemaVersion(v) {
    writeJSON(schemaKey, Number(v) || 0);
  }

  function ensureKey(key, fallback) {
    const current = readJSON(key, null);
    if (current !== null && typeof current !== 'undefined') return current;
    writeJSON(key, fallback);
    return fallback;
  }

  function migrate(fromVersion) {
    const from = Number(fromVersion) || 0;
    if (from < 1) {
      ensureKey('sbMembership', defaultMembership);
      ensureKey('sbWatchCenter', defaultWatchCenter);
      ensureKey('sbPriceHistory', {});
      ensureKey('sbBundleCart', []);
      ensureKey('sbOrderTimeline', {});
    }
    if (from < 2) {
      ensureKey('sbInventoryOverrides', {});
    }
  }

  function ensureSchema() {
    const current = getSchemaVersion();
    if (current >= targetVersion) return { version: current, migrated: false };
    migrate(current);
    setSchemaVersion(targetVersion);
    return { version: targetVersion, migrated: true };
  }

  function getMembership() {
    const raw = readJSON('sbMembership', defaultMembership);
    const obj = raw && typeof raw === 'object' ? raw : {};
    return {
      tier: String(obj.tier || 'rookie'),
      points: Number.isFinite(Number(obj.points)) ? Number(obj.points) : 0,
      updatedAt: String(obj.updatedAt || new Date().toISOString()),
    };
  }

  function setMembership(next) {
    const obj = next && typeof next === 'object' ? next : {};
    const value = {
      tier: String(obj.tier || 'rookie'),
      points: Number.isFinite(Number(obj.points)) ? Number(obj.points) : 0,
      updatedAt: String(obj.updatedAt || new Date().toISOString()),
    };
    writeJSON('sbMembership', value);
    dispatchChanged('membership');
    return value;
  }

  function getBundleCart() {
    const raw = readJSON('sbBundleCart', []);
    return Array.isArray(raw) ? raw : [];
  }

  function setBundleCart(list) {
    const safe = Array.isArray(list) ? list : [];
    writeJSON('sbBundleCart', safe);
    dispatchChanged('bundlecart');
    return safe;
  }

  function getOrderTimeline() {
    const raw = readJSON('sbOrderTimeline', {});
    return raw && typeof raw === 'object' ? raw : {};
  }

  function setOrderTimeline(map) {
    const safe = map && typeof map === 'object' ? map : {};
    writeJSON('sbOrderTimeline', safe);
    dispatchChanged('orderTimeline');
    return safe;
  }

  function getPriceHistory() {
    const raw = readJSON('sbPriceHistory', {});
    return raw && typeof raw === 'object' ? raw : {};
  }

  function pushPricePoint(productId, price) {
    const id = String(productId || '').trim();
    if (!id) return null;
    const p = Number(price);
    if (!Number.isFinite(p)) return null;
    const history = getPriceHistory();
    const list = Array.isArray(history[id]) ? history[id] : [];
    const next = [...list, { ts: new Date().toISOString(), price: p }].slice(-16);
    history[id] = next;
    writeJSON('sbPriceHistory', history);
    dispatchChanged('pricehistory');
    return next;
  }

  function resetAll() {
    remove(schemaKey);
    remove('sbMembership');
    remove('sbWatchCenter');
    remove('sbPriceHistory');
    remove('sbBundleCart');
    remove('sbOrderTimeline');
    remove('sbInventoryOverrides');
  }

  return Object.freeze({
    ensureSchema,
    getSchemaVersion,
    setSchemaVersion,
    getMembership,
    setMembership,
    getBundleCart,
    setBundleCart,
    getOrderTimeline,
    setOrderTimeline,
    getPriceHistory,
    pushPricePoint,
    resetAll,
  });
}
