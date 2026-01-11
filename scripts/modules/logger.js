// Logger / Monitoring (local-first)
// - 零依赖：仅使用 localStorage（可用时）做 ring buffer
// - 目标：为 ErrorShield / PerfVitals / Telemetry 提供统一的“本地可观测性”基座
// - 约定：默认不 monkeypatch console；如需可调用 attachConsoleCapture()

export function createLogger(deps = {}, options = {}) {
  const d = deps && typeof deps === 'object' ? deps : {};
  const opts = options && typeof options === 'object' ? options : {};

  const readStorageJSON =
    typeof d.readStorageJSON === 'function' ? d.readStorageJSON : () => null;
  const writeStorageJSON =
    typeof d.writeStorageJSON === 'function' ? d.writeStorageJSON : () => false;
  const removeStorage =
    typeof d.removeStorage === 'function' ? d.removeStorage : () => false;
  const dispatchChanged =
    typeof d.dispatchChanged === 'function' ? d.dispatchChanged : () => {};
  const getPageName =
    typeof d.getPageName === 'function' ? d.getPageName : () => '';
  const getHref =
    typeof d.getHref === 'function'
      ? d.getHref
      : () => {
          try {
            return String(globalThis.location?.href || '');
          } catch {
            return '';
          }
        };

  const storageKey = String(opts.storageKey || 'sbLogs');
  const maxEntries = clampInt(opts.maxEntries ?? 220, 1, 2000);

  const levels = Object.freeze({
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
  });

  function clampInt(raw, min, max) {
    const n = Number.parseInt(String(raw ?? ''), 10);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function normalizeLevel(raw) {
    const key = String(raw ?? '').trim().toLowerCase();
    if (key === 'debug' || key === 'info' || key === 'warn' || key === 'error')
      return key;
    return 'info';
  }

  function safeText(raw, fallback = '') {
    const s = String(raw ?? '').trim();
    return s || fallback;
  }

  function safeJsonClone(value, budget = 6000) {
    // 目标：避免存入循环引用/超大对象导致 localStorage 失败
    // 策略：JSON.stringify + 长度预算；失败则降级为 string
    try {
      const json = JSON.stringify(value);
      if (typeof json !== 'string') return null;
      if (json.length > budget) return { truncated: true, length: json.length };
      return JSON.parse(json);
    } catch {
      try {
        const s = String(value);
        return s.length > budget ? s.slice(0, budget) : s;
      } catch {
        return null;
      }
    }
  }

  function readRaw() {
    const raw = readStorageJSON(storageKey, []);
    return Array.isArray(raw) ? raw : [];
  }

  function writeRaw(list, { silent = false } = {}) {
    const arr = Array.isArray(list) ? list : [];
    const trimmed =
      arr.length > maxEntries ? arr.slice(arr.length - maxEntries) : arr;
    const ok = writeStorageJSON(storageKey, trimmed);
    if (!silent) dispatchChanged('logs');
    return ok;
  }

  function getEntries() {
    return readRaw();
  }

  function clear() {
    const ok = removeStorage(storageKey);
    dispatchChanged('logs');
    return ok;
  }

  function append(entry, { silent = false } = {}) {
    const list = readRaw();
    list.push(entry);
    return writeRaw(list, { silent });
  }

  function buildEntry(level, message, detail) {
    const l = normalizeLevel(level);
    const msg = safeText(message);
    if (!msg) return null;
    return {
      ts: Date.now(),
      level: l,
      levelValue: levels[l] || 20,
      page: safeText(getPageName()),
      href: safeText(getHref()),
      message: msg,
      detail: typeof detail === 'undefined' ? null : safeJsonClone(detail),
    };
  }

  function log(level, message, detail, options2 = {}) {
    const o = options2 && typeof options2 === 'object' ? options2 : {};
    const entry = buildEntry(level, message, detail);
    if (!entry) return false;
    return append(entry, { silent: Boolean(o.silent) });
  }

  function debug(message, detail, options2) {
    return log('debug', message, detail, options2);
  }
  function info(message, detail, options2) {
    return log('info', message, detail, options2);
  }
  function warn(message, detail, options2) {
    return log('warn', message, detail, options2);
  }
  function error(message, detail, options2) {
    return log('error', message, detail, options2);
  }

  function attachConsoleCapture({ includeDebug = false } = {}) {
    // 可选能力：捕捉 console 输出，帮助排查线上环境（不建议默认启用）
    const w = globalThis;
    const c = w && w.console ? w.console : null;
    if (!c) return () => {};

    const orig = {
      debug: c.debug?.bind(c),
      log: c.log?.bind(c),
      info: c.info?.bind(c),
      warn: c.warn?.bind(c),
      error: c.error?.bind(c),
    };

    function wrap(method, level) {
      const fn = orig[method];
      if (typeof fn !== 'function') return;
      c[method] = (...args) => {
        try {
          const text = args
            .map((x) => {
              try {
                if (typeof x === 'string') return x;
                return JSON.stringify(x);
              } catch {
                return String(x);
              }
            })
            .join(' ');
          const l = level;
          if (l === 'debug' && !includeDebug) {
            // skip
          } else {
            log(l, text, { source: 'console', method, argsCount: args.length }, { silent: true });
          }
        } catch {
          // ignore
        }
        return fn(...args);
      };
    }

    wrap('debug', 'debug');
    wrap('log', 'info');
    wrap('info', 'info');
    wrap('warn', 'warn');
    wrap('error', 'error');

    return () => {
      try {
        if (typeof orig.debug === 'function') c.debug = orig.debug;
        if (typeof orig.log === 'function') c.log = orig.log;
        if (typeof orig.info === 'function') c.info = orig.info;
        if (typeof orig.warn === 'function') c.warn = orig.warn;
        if (typeof orig.error === 'function') c.error = orig.error;
      } catch {
        // ignore
      }
    };
  }

  return Object.freeze({
    storageKey,
    maxEntries,
    levels,
    getEntries,
    clear,
    log,
    debug,
    info,
    warn,
    error,
    attachConsoleCapture,
  });
}
