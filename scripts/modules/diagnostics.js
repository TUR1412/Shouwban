// Diagnostics / System Health Panorama (Console)
// - 输出 FPS / LongTask / 内存趋势 / DOM 节点数 等关键信号
// - 默认不启用（零开销），由 scripts/main.js 进行懒加载
export function createDiagnostics() {
  const state = {
    running: false,
    rafId: 0,
    frameCount: 0,
    lastFrameTs: 0,
    lastFpsTs: 0,
    fps: 0,
    frameDeltaAvg: 0,
    frameDeltaMax: 0,
    longTaskCount: 0,
    longTaskTotal: 0,
    longTaskMax: 0,
    lagAvg: 0,
    lagMax: 0,
    lagTimer: 0,
    lastLagTs: 0,
    memSamples: [],
    watchTimer: 0,
    observers: [],
  };

  function now() {
    try {
      return performance && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    } catch {
      return Date.now();
    }
  }

  function safeRound(n) {
    const x = Number(n);
    return Number.isFinite(x) ? Math.round(x) : 0;
  }

  function getMemory() {
    // performance.memory: Chromium-only (non-standard)
    try {
      const m = performance && performance.memory ? performance.memory : null;
      if (!m) return null;
      const used = Number(m.usedJSHeapSize);
      const total = Number(m.totalJSHeapSize);
      const limit = Number(m.jsHeapSizeLimit);
      if (!Number.isFinite(used)) return null;
      return {
        usedMB: Math.round(used / 1024 / 1024),
        totalMB: Number.isFinite(total) ? Math.round(total / 1024 / 1024) : 0,
        limitMB: Number.isFinite(limit) ? Math.round(limit / 1024 / 1024) : 0,
      };
    } catch {
      return null;
    }
  }

  function sampleMemory() {
    const m = getMemory();
    if (!m) return;
    const ts = Date.now();
    state.memSamples.push({ ts, usedMB: m.usedMB });
    // Keep last ~5 minutes (1 sample / 5s)
    const cutoff = ts - 5 * 60 * 1000;
    while (state.memSamples.length > 0 && state.memSamples[0].ts < cutoff) {
      state.memSamples.shift();
    }
  }

  function frameLoop(ts) {
    state.rafId = 0;
    if (!state.running) return;

    const t = Number(ts) || now();
    if (state.lastFrameTs > 0) {
      const delta = t - state.lastFrameTs;
      state.frameDeltaAvg = state.frameDeltaAvg
        ? state.frameDeltaAvg * 0.9 + delta * 0.1
        : delta;
      state.frameDeltaMax = Math.max(state.frameDeltaMax, delta);
    }
    state.lastFrameTs = t;
    state.frameCount += 1;

    if (!state.lastFpsTs) state.lastFpsTs = t;
    const elapsed = t - state.lastFpsTs;
    if (elapsed >= 1000) {
      state.fps = Math.round((state.frameCount * 1000) / elapsed);
      state.frameCount = 0;
      state.lastFpsTs = t;
      state.frameDeltaMax = 0;
    }

    state.rafId = requestAnimationFrame(frameLoop);
  }

  function startFrameLoop() {
    if (state.rafId) return;
    state.lastFrameTs = 0;
    state.lastFpsTs = 0;
    state.frameCount = 0;
    state.rafId = requestAnimationFrame(frameLoop);
  }

  function startEventLoopLag() {
    if (state.lagTimer) return;
    state.lastLagTs = Date.now();
    state.lagTimer = window.setInterval(() => {
      const nowTs = Date.now();
      const expected = state.lastLagTs + 500;
      const lag = Math.max(0, nowTs - expected);
      state.lastLagTs = nowTs;
      state.lagAvg = state.lagAvg ? state.lagAvg * 0.9 + lag * 0.1 : lag;
      state.lagMax = Math.max(state.lagMax, lag);
      sampleMemory();
    }, 500);
  }

  function startLongTaskObserver() {
    try {
      if (typeof PerformanceObserver === 'undefined') return;
      const supported = PerformanceObserver.supportedEntryTypes || [];
      if (!supported.includes('longtask')) return;

      const obs = new PerformanceObserver((list) => {
        const entries = list.getEntries ? list.getEntries() : [];
        entries.forEach((e) => {
          const dur = Number(e.duration) || 0;
          state.longTaskCount += 1;
          state.longTaskTotal += dur;
          state.longTaskMax = Math.max(state.longTaskMax, dur);
        });
      });
      obs.observe({ type: 'longtask', buffered: true });
      state.observers.push(obs);
    } catch {
      // ignore
    }
  }

  function stopObservers() {
    const list = Array.isArray(state.observers) ? state.observers : [];
    list.forEach((obs) => {
      try { obs.disconnect(); } catch { /* ignore */ }
    });
    state.observers = [];
  }

  function start() {
    if (state.running) return;
    state.running = true;
    startFrameLoop();
    startEventLoopLag();
    startLongTaskObserver();
  }

  function stop() {
    state.running = false;
    if (state.rafId) {
      try { cancelAnimationFrame(state.rafId); } catch { /* ignore */ }
      state.rafId = 0;
    }
    if (state.lagTimer) {
      try { clearInterval(state.lagTimer); } catch { /* ignore */ }
      state.lagTimer = 0;
    }
    state.lagMax = 0;
    stopObservers();
    unwatch();
  }

  function snapshot() {
    const mem = getMemory();
    const usedMB = mem?.usedMB ?? null;
    const domNodes = (() => {
      try {
        return document.getElementsByTagName('*').length;
      } catch {
        return 0;
      }
    })();

    const url = (() => {
      try { return window.location.href; } catch { return ''; }
    })();

    return {
      url,
      time: new Date().toISOString(),
      fps: state.fps,
      frameMsAvg: safeRound(state.frameDeltaAvg),
      longTaskCount: state.longTaskCount,
      longTaskMaxMs: safeRound(state.longTaskMax),
      eventLoopLagAvgMs: safeRound(state.lagAvg),
      eventLoopLagMaxMs: safeRound(state.lagMax),
      domNodes,
      heapUsedMB: usedMB,
    };
  }

  function print(options = {}) {
    const opts = options && typeof options === 'object' ? options : {};
    const s = snapshot();
    const title = `系统健康全景图 · FPS ${s.fps} · LongTask ${s.longTaskCount}`;

    try {
      if (opts.clear) console.clear();
    } catch {
      // ignore
    }

    console.groupCollapsed(title);
    console.table(s);

    if (Array.isArray(state.memSamples) && state.memSamples.length >= 2) {
      const first = state.memSamples[0];
      const last = state.memSamples[state.memSamples.length - 1];
      const delta = Number(last.usedMB) - Number(first.usedMB);
      const durationSec = Math.max(
        1,
        Math.round((last.ts - first.ts) / 1000),
      );
      console.log(
        `内存趋势（${durationSec}s）：${first.usedMB}MB → ${last.usedMB}MB（Δ ${delta}MB）`,
      );
    } else if (s.heapUsedMB == null) {
      console.log('内存：当前浏览器不支持 performance.memory（无法采样 JS Heap）。');
    }

    console.log('提示：在商品列表页添加 ?stress=100000&health=1 可验证“虚拟滚动 + 监控”。');
    console.groupEnd();
  }

  function watch(options = {}) {
    const opts = options && typeof options === 'object' ? options : {};
    const intervalMs = Math.max(1000, Number(opts.intervalMs) || 5000);
    const clear = Boolean(opts.clear);

    start();
    if (state.watchTimer) {
      try { clearInterval(state.watchTimer); } catch { /* ignore */ }
      state.watchTimer = 0;
    }

    state.watchTimer = window.setInterval(() => print({ clear }), intervalMs);
    print({ clear });
  }

  function unwatch() {
    if (!state.watchTimer) return;
    try { clearInterval(state.watchTimer); } catch { /* ignore */ }
    state.watchTimer = 0;
  }

  function shouldAutoStart() {
    try {
      const url = new URL(window.location.href);
      const v = url.searchParams.get('health');
      return v === '1' || v === 'true';
    } catch {
      return false;
    }
  }

  function init() {
    // Expose as an opt-in dev tool
    try {
      if (!globalThis.ShouwbanDiagnostics) globalThis.ShouwbanDiagnostics = api;
    } catch {
      // ignore
    }

    if (shouldAutoStart()) {
      watch({ intervalMs: 5000, clear: false });
    }
  }

  const api = { init, start, stop, snapshot, print, watch, unwatch };
  return api;
}

