// 状态中心与事件桥接。
// - 统一事件订阅与本地 Atom 存储
// - 保持与 window CustomEvent 兼容
export function createStateHub(deps = {}) {
  const readStorageJSON = typeof deps.readStorageJSON === 'function' ? deps.readStorageJSON : () => null;
  const writeStorageJSON = typeof deps.writeStorageJSON === 'function' ? deps.writeStorageJSON : () => false;
  const dispatchChanged = typeof deps.dispatchChanged === 'function' ? deps.dispatchChanged : () => {};

  const listeners = new Map();

  function normalizeType(type) {
    return String(type || '').trim();
  }

  function on(type, handler) {
    const name = normalizeType(type);
    if (!name || typeof handler !== 'function') return () => {};
    const set = listeners.get(name) || new Set();
    set.add(handler);
    listeners.set(name, set);
    return () => off(name, handler);
  }

  function off(type, handler) {
    const name = normalizeType(type);
    const set = listeners.get(name);
    if (!set || set.size === 0) return false;
    set.delete(handler);
    if (set.size === 0) listeners.delete(name);
    return true;
  }

  function emit(type, detail) {
    const name = normalizeType(type);
    if (!name) return 0;
    const set = listeners.get(name);
    if (!set || set.size === 0) return 0;

    let called = 0;
    set.forEach((fn) => {
      try {
        fn(detail);
        called += 1;
      } catch {
        // 忽略订阅异常
      }
    });
    return called;
  }

  function atom(storageKey, fallbackValue, { scope } = {}) {
    const key = String(storageKey || '').trim();
    const changeScope = String(scope || key).trim();

    function get() {
      return readStorageJSON(key, fallbackValue);
    }

    function set(value, options = {}) {
      const ok = writeStorageJSON(key, value);
      if (!ok) return { ok: false };
      if (!options.silent) dispatchChanged(changeScope);
      return { ok: true };
    }

    function update(updater, options = {}) {
      const fn = typeof updater === 'function' ? updater : (v) => v;
      const next = fn(get());
      return set(next, options);
    }

    function subscribe(handler) {
      if (typeof handler !== 'function') return () => {};
      const eventName = `${changeScope}:changed`;
      const wrapped = () => {
        try { handler(get()); } catch { /* 忽略回调异常 */ }
      };
      try {
        window.addEventListener(eventName, wrapped);
      } catch {
        // 忽略监听异常
      }
      wrapped();
      return () => {
        try { window.removeEventListener(eventName, wrapped); } catch { /* 忽略移除异常 */ }
      };
    }

    return Object.freeze({ key, scope: changeScope, get, set, update, subscribe });
  }

  const StateHub = Object.freeze({ on, off, emit, atom });

  function enhanceDispatch(originalDispatch) {
    const base = typeof originalDispatch === 'function' ? originalDispatch : () => false;
    return (type, detail) => {
      const ok = base(type, detail);
      try { StateHub.emit(type, detail); } catch { /* 忽略派发异常 */ }
      return ok;
    };
  }

  return { StateHub, enhanceDispatch };
}
