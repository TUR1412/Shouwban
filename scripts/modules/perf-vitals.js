// PerfVitals / Performance Telemetry (local-first, progressive)
// - 采集核心指标：TTFB / FCP / LCP / CLS / INP(近似) / LongTask(近似)
// - 上报策略：默认本地 Logger 记录；可选 Telemetry.track 入队（由 Telemetry 决定是否 flush）
// - 约束：零依赖，不阻塞主线程（尽量 buffered + 轻处理）

export function createPerfVitals(deps = {}, options = {}) {
  const d = deps && typeof deps === 'object' ? deps : {};
  const opts = options && typeof options === 'object' ? options : {};

  const Logger = d.Logger || null;
  const Telemetry = d.Telemetry || null;
  const Utils = d.Utils || null;

  const sampleRate = clampNumber(opts.sampleRate ?? 1, 0, 1, 1);
  const reportOnce = opts.reportOnce !== false;

  let initialized = false;
  let reported = false;
  const state = {
    nav: null,
    ttfbMs: null,
    fcpMs: null,
    lcpMs: null,
    cls: 0,
    inpMs: null,
    longTaskCount: 0,
    longTaskMaxMs: 0,
    longTaskTotalMs: 0,
  };

  const observers = [];

  function clampNumber(raw, min, max, fallback) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function safeRound(n) {
    const x = Number(n);
    return Number.isFinite(x) ? Math.round(x) : null;
  }

  function getPageName() {
    try {
      return typeof Utils?.getPageName === 'function' ? String(Utils.getPageName() || '') : '';
    } catch {
      return '';
    }
  }

  function getHref() {
    try {
      return String(globalThis.location?.href || '');
    } catch {
      return '';
    }
  }

  function supports(type) {
    try {
      if (typeof globalThis.PerformanceObserver === 'undefined') return false;
      const list = globalThis.PerformanceObserver.supportedEntryTypes || [];
      return Array.isArray(list) && list.includes(type);
    } catch {
      return false;
    }
  }

  function pickNavTiming() {
    try {
      const nav = (performance.getEntriesByType?.('navigation') || [])[0] || null;
      if (!nav) return null;
      return nav;
    } catch {
      return null;
    }
  }

  function computeTTFB(nav) {
    if (!nav) return null;
    const v = Number(nav.responseStart);
    return Number.isFinite(v) ? v : null;
  }

  function observePaint() {
    if (!supports('paint')) return;
    try {
      const obs = new PerformanceObserver((list) => {
        const entries = list.getEntries?.() || [];
        entries.forEach((e) => {
          if (e.name === 'first-contentful-paint') {
            const v = Number(e.startTime);
            if (Number.isFinite(v)) state.fcpMs = v;
          }
        });
      });
      obs.observe({ type: 'paint', buffered: true });
      observers.push(obs);
    } catch {
      // ignore
    }
  }

  function observeLCP() {
    if (!supports('largest-contentful-paint')) return;
    try {
      const obs = new PerformanceObserver((list) => {
        const entries = list.getEntries?.() || [];
        const last = entries.length > 0 ? entries[entries.length - 1] : null;
        const v = Number(last?.startTime);
        if (Number.isFinite(v)) state.lcpMs = v;
      });
      obs.observe({ type: 'largest-contentful-paint', buffered: true });
      observers.push(obs);
    } catch {
      // ignore
    }
  }

  function observeCLS() {
    if (!supports('layout-shift')) return;
    try {
      const obs = new PerformanceObserver((list) => {
        const entries = list.getEntries?.() || [];
        entries.forEach((e) => {
          const value = Number(e.value);
          if (!Number.isFinite(value)) return;
          // Ignore shifts after user input (web-vitals guidance)
          if (e.hadRecentInput) return;
          state.cls += value;
        });
      });
      obs.observe({ type: 'layout-shift', buffered: true });
      observers.push(obs);
    } catch {
      // ignore
    }
  }

  function observeINP() {
    // INP: 需要 event entries（Chromium / 新版）
    if (!supports('event')) return;
    try {
      const obs = new PerformanceObserver((list) => {
        const entries = list.getEntries?.() || [];
        entries.forEach((e) => {
          // interactionId > 0 表示可聚合交互（浏览器实现差异）
          const id = Number(e.interactionId || 0);
          if (!(id > 0)) return;
          const dur = Number(e.duration);
          if (!Number.isFinite(dur)) return;
          state.inpMs = state.inpMs == null ? dur : Math.max(state.inpMs, dur);
        });
      });
      obs.observe({ type: 'event', buffered: true, durationThreshold: 40 });
      observers.push(obs);
    } catch {
      // ignore
    }
  }

  function observeLongTasks() {
    if (!supports('longtask')) return;
    try {
      const obs = new PerformanceObserver((list) => {
        const entries = list.getEntries?.() || [];
        entries.forEach((e) => {
          const dur = Number(e.duration) || 0;
          state.longTaskCount += 1;
          state.longTaskTotalMs += dur;
          state.longTaskMaxMs = Math.max(state.longTaskMaxMs, dur);
        });
      });
      obs.observe({ type: 'longtask', buffered: true });
      observers.push(obs);
    } catch {
      // ignore
    }
  }

  function disconnect() {
    observers.splice(0).forEach((obs) => {
      try {
        obs.disconnect();
      } catch {
        // ignore
      }
    });
  }

  function snapshot() {
    const clsRounded = Math.round(state.cls * 1000) / 1000;
    return {
      page: getPageName(),
      href: getHref(),
      time: (() => {
        try {
          return new Date().toISOString();
        } catch {
          return '';
        }
      })(),
      ttfbMs: safeRound(state.ttfbMs),
      fcpMs: safeRound(state.fcpMs),
      lcpMs: safeRound(state.lcpMs),
      cls: Number.isFinite(clsRounded) ? clsRounded : null,
      inpMs: safeRound(state.inpMs),
      longTaskCount: state.longTaskCount,
      longTaskMaxMs: safeRound(state.longTaskMaxMs),
      longTaskTotalMs: safeRound(state.longTaskTotalMs),
    };
  }

  function shouldSample() {
    const r = clampNumber(sampleRate, 0, 1, 1);
    if (r >= 1) return true;
    if (r <= 0) return false;
    return Math.random() < r;
  }

  function report(reason = 'auto') {
    if (reportOnce && reported) return false;
    reported = true;

    const data = snapshot();
    try {
      Logger?.info?.('PerfVitals', { reason, ...data });
    } catch {
      // ignore
    }
    try {
      Telemetry?.track?.('perf_vitals', { reason, ...data });
    } catch {
      // ignore
    }
    return true;
  }

  function init() {
    if (initialized) return;
    initialized = true;
    if (!shouldSample()) return;

    state.nav = pickNavTiming();
    state.ttfbMs = computeTTFB(state.nav);

    observePaint();
    observeLCP();
    observeCLS();
    observeINP();
    observeLongTasks();

    // 页面隐藏/离开时输出一次快照
    try {
      const flushSoon = () => {
        report('pagehide');
        disconnect();
      };
      globalThis.addEventListener?.('pagehide', flushSoon, { once: true });
      globalThis.document?.addEventListener?.(
        'visibilitychange',
        () => {
          if (globalThis.document?.visibilityState === 'hidden') flushSoon();
        },
        { passive: true },
      );
    } catch {
      // ignore
    }
  }

  return Object.freeze({ init, snapshot, report });
}

