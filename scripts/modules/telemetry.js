// Telemetry / User Behavior Tracking (local-first, progressive)
// - 默认仅本地队列，不上传（可配置 endpoint 后手动/自动 flush）
// - 避免 PII：对用户输入做 hash + 长度统计，不存原文
// - 设计为可注入依赖，便于测试与复用

export function createTelemetry(deps = {}, options = {}) {
  const d = deps && typeof deps === 'object' ? deps : {};
  const opts = options && typeof options === 'object' ? options : {};

  const Utils = d.Utils || null;
  const Http = d.Http || null;

  const queueKey = String(opts.queueKey || 'sbTelemetryQueue');
  const endpointKey = String(opts.endpointKey || 'sbTelemetryEndpoint');
  const maxQueue = clampInt(opts.maxQueue ?? 240, 1, 2000);

  function clampInt(raw, min, max) {
    const n = Number.parseInt(String(raw ?? ''), 10);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function safeText(raw, fallback = '') {
    const s = String(raw ?? '').trim();
    return s || fallback;
  }

  function fnv1a32(str) {
    const s = String(str || '');
    let hash = 0x811c9dc5;
    for (let i = 0; i < s.length; i += 1) {
      hash ^= s.charCodeAt(i);
      // hash *= 16777619 (via shifts)
      hash = (hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)) >>> 0;
    }
    return hash >>> 0;
  }

  function generateId(prefix) {
    try {
      if (Utils && typeof Utils.generateId === 'function') return Utils.generateId(prefix);
    } catch {
      // ignore
    }
    const p = safeText(prefix);
    const base = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    return p ? `${p}${base}` : base;
  }

  function getPageName() {
    try {
      if (Utils && typeof Utils.getPageName === 'function') return String(Utils.getPageName() || '');
    } catch {
      // ignore
    }
    return '';
  }

  function readStorageJSON(key, fallbackValue) {
    try {
      if (Utils && typeof Utils.readStorageJSON === 'function') return Utils.readStorageJSON(key, fallbackValue);
    } catch {
      // ignore
    }
    try {
      const raw = globalThis.localStorage?.getItem?.(String(key || '')) || '';
      if (!raw) return fallbackValue;
      return JSON.parse(raw);
    } catch {
      return fallbackValue;
    }
  }

  function writeStorageJSON(key, value) {
    try {
      if (Utils && typeof Utils.writeStorageJSON === 'function') return Utils.writeStorageJSON(key, value);
    } catch {
      // ignore
    }
    try {
      globalThis.localStorage?.setItem?.(String(key || ''), JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function normalizeStringArray(list) {
    try {
      if (Utils && typeof Utils.normalizeStringArray === 'function') return Utils.normalizeStringArray(list);
    } catch {
      // ignore
    }
    const arr = Array.isArray(list) ? list : [];
    return arr
      .map((x) => String(x ?? '').trim())
      .filter((x) => x.length > 0);
  }

  function getSessionId() {
    const key = 'sbTelemetrySessionId';
    try {
      const cached = globalThis.sessionStorage?.getItem?.(key);
      if (cached) return cached;
    } catch {
      // ignore
    }
    const id = generateId('T');
    try { globalThis.sessionStorage?.setItem?.(key, id); } catch { /* ignore */ }
    return id;
  }

  function readQueue() {
    const list = readStorageJSON(queueKey, []);
    return Array.isArray(list) ? list : [];
  }

  function writeQueue(list) {
    const safe = Array.isArray(list) ? list : [];
    writeStorageJSON(queueKey, safe.slice(-maxQueue));
  }

  function getQueue() {
    return readQueue();
  }

  function clearQueue() {
    writeQueue([]);
    return true;
  }

  function resolveEndpoint() {
    try {
      const meta = globalThis.document?.querySelector?.('meta[name="shouwban-telemetry-endpoint"]');
      const fromMeta = meta?.getAttribute?.('content') || '';
      const fromStorage = globalThis.localStorage?.getItem?.(endpointKey) || '';
      const fromWindow = globalThis.__SHOUWBAN_TELEMETRY__?.endpoint || '';
      const raw = String(fromWindow || fromMeta || fromStorage || '').trim();
      return raw;
    } catch {
      return '';
    }
  }

  function getHref() {
    try { return String(globalThis.location?.href || ''); } catch { return ''; }
  }

  function getReferrer() {
    try { return String(globalThis.document?.referrer || ''); } catch { return ''; }
  }

  function getTheme() {
    try { return String(globalThis.document?.documentElement?.dataset?.theme || ''); } catch { return ''; }
  }

  function baseContext() {
    return {
      ts: Date.now(),
      page: getPageName(),
      href: getHref(),
      ref: getReferrer(),
      sid: getSessionId(),
      theme: getTheme(),
    };
  }

  function track(name, payload = {}, options2 = {}) {
    const eventName = String(name || '').trim();
    if (!eventName) return false;

    const data = payload && typeof payload === 'object' ? payload : {};
    const evt = {
      id: generateId('E'),
      name: eventName,
      ...baseContext(),
      payload: data,
    };

    const queue = readQueue();
    queue.push(evt);
    writeQueue(queue);

    if (options2 && options2.flush === true) {
      flush();
    }
    return true;
  }

  async function flush() {
    const endpoint = resolveEndpoint();
    if (!endpoint) return { ok: false, reason: 'no_endpoint' };

    const events = readQueue();
    if (events.length === 0) return { ok: true, sent: 0 };

    if (!Http || typeof Http.postJSON !== 'function') return { ok: false, reason: 'no_http' };

    const res = await Http.postJSON(
      endpoint,
      { sentAt: Date.now(), events },
      {},
      { retries: 2, baseDelayMs: 280, maxDelayMs: 2200, timeoutMs: 9000 },
    );

    if (res && res.ok) {
      writeQueue([]);
      return { ok: true, sent: events.length };
    }
    return { ok: false, status: Number(res?.status || 0) || 0 };
  }

  function trackPageView() {
    const title = (() => {
      try { return String(globalThis.document?.title || ''); } catch { return ''; }
    })();
    track('page_view', { title });
  }

  function attachGlobalListeners() {
    // 核心状态变化（不存具体数据，只存计数）
    try {
      globalThis.addEventListener?.('cart:changed', () => {
        try {
          const lines = readStorageJSON('cart', []);
          const count = Array.isArray(lines)
            ? lines.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0)
            : 0;
          track('cart_changed', { count: Math.max(0, count) });
        } catch {
          track('cart_changed', { count: 0 });
        }
      });

      globalThis.addEventListener?.('favorites:changed', () => {
        const ids = normalizeStringArray(readStorageJSON('favorites', []));
        track('favorites_changed', { count: ids.length });
      });

      globalThis.addEventListener?.('compare:changed', () => {
        const ids = normalizeStringArray(readStorageJSON('compare', []));
        track('compare_changed', { count: ids.length });
      });
    } catch {
      // ignore
    }

    // 页面生命周期：尽可能 flush
    const flushSoon = () => { flush(); };
    try {
      globalThis.addEventListener?.('pagehide', flushSoon);
    } catch {
      // ignore
    }
    try {
      globalThis.document?.addEventListener?.('visibilitychange', () => {
        try {
          if (globalThis.document?.visibilityState === 'hidden') flushSoon();
        } catch {
          // ignore
        }
      });
    } catch {
      // ignore
    }
  }

  function hashQuery(query) {
    const q = String(query || '').trim();
    return {
      qLen: q.length,
      qHash: q ? fnv1a32(q) : 0,
    };
  }

  function init() {
    trackPageView();
    attachGlobalListeners();
  }

  return Object.freeze({
    init,
    track,
    flush,
    hashQuery,
    getQueue,
    clearQueue,
    resolveEndpoint,
  });
}
