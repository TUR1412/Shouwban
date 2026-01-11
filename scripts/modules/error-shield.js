// ErrorShield / Error Boundary (global, progressive)
// - 捕捉 window.onerror / unhandledrejection
// - 本地记录（Logger）+ 可选上报（Telemetry）
// - 用户可见反馈：Toast + 详情面板（dialog）

export function createErrorShield(deps = {}, options = {}) {
  const d = deps && typeof deps === 'object' ? deps : {};
  const opts = options && typeof options === 'object' ? options : {};

  const Toast = d.Toast || null;
  const Logger = d.Logger || null;
  const Telemetry = d.Telemetry || null;
  const DataPortability = d.DataPortability || null;
  const Utils = d.Utils || null;

  const maxErrors = clampInt(opts.maxErrors ?? 20, 5, 80);
  const toastCooldownMs = clampInt(opts.toastCooldownMs ?? 2600, 600, 20000);

  let initialized = false;
  let ui = null;
  let lastToastAt = 0;
  const recent = [];
  const dedupe = new Map();

  function clampInt(raw, min, max) {
    const n = Number.parseInt(String(raw ?? ''), 10);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function safeText(raw, fallback = '') {
    const s = String(raw ?? '').trim();
    return s || fallback;
  }

  function nowIso() {
    try {
      return new Date().toISOString();
    } catch {
      return '';
    }
  }

  function fnv1a32(str) {
    const s = String(str ?? '');
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i += 1) {
      h ^= s.charCodeAt(i);
      // h *= 16777619 (via bit ops)
      h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
    }
    return h >>> 0;
  }

  function hashOf(value, budget = 2000) {
    const s = String(value ?? '').slice(0, budget);
    return fnv1a32(s);
  }

  function getPageName() {
    try {
      return typeof Utils?.getPageName === 'function' ? Utils.getPageName() : '';
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

  function getUserAgent() {
    try {
      return String(globalThis.navigator?.userAgent || '');
    } catch {
      return '';
    }
  }

  function record(entry) {
    const e = entry && typeof entry === 'object' ? entry : null;
    if (!e) return;
    recent.push(e);
    while (recent.length > maxErrors) recent.shift();
  }

  function trackTelemetry(e, kind) {
    try {
      if (!Telemetry || typeof Telemetry.track !== 'function') return;
      const name = kind === 'unhandledrejection' ? 'unhandled_rejection' : 'runtime_error';
      Telemetry.track(name, {
        page: safeText(e.page),
        msgHash: e.messageHash || 0,
        stackHash: e.stackHash || 0,
        source: safeText(e.source),
        lineno: e.lineno || 0,
        colno: e.colno || 0,
        count: e.count || 1,
      });
    } catch {
      // ignore
    }
  }

  function recordLogger(e, kind) {
    try {
      if (!Logger || typeof Logger.error !== 'function') return;
      Logger.error(kind === 'unhandledrejection' ? 'Unhandled rejection' : 'Runtime error', {
        page: e.page,
        href: e.href,
        messageHash: e.messageHash,
        stackHash: e.stackHash,
        source: e.source,
        lineno: e.lineno,
        colno: e.colno,
        count: e.count,
      });
    } catch {
      // ignore
    }
  }

  function shouldToast(signature) {
    const now = Date.now();
    if (now - lastToastAt < toastCooldownMs) return false;
    const prev = dedupe.get(signature) || { count: 0, last: 0 };
    if (now - prev.last < toastCooldownMs) return false;
    lastToastAt = now;
    return true;
  }

  function bumpDedupe(signature) {
    const now = Date.now();
    const prev = dedupe.get(signature) || { count: 0, last: 0 };
    const next = { count: prev.count + 1, last: now };
    dedupe.set(signature, next);
    return next;
  }

  function normalizeErrorLike(err) {
    const e = err && typeof err === 'object' ? err : null;
    const name = safeText(e?.name || '');
    const message = safeText(e?.message || (typeof err === 'string' ? err : ''));
    const stack = safeText(e?.stack || '');
    return { name, message, stack };
  }

  function buildReportText() {
    const list = recent.slice(-10);
    const header = [
      'Shouwban Error Report (local-only)',
      `time: ${nowIso()}`,
      `page: ${getPageName()}`,
      `href: ${getHref()}`,
      `ua: ${getUserAgent()}`,
      '',
    ].join('\n');

    const body = list
      .map((e, idx) => {
        const lines = [
          `#${idx + 1} ${e.kind} · ${e.time}`,
          `source: ${safeText(e.source)}`,
          `msgHash: ${e.messageHash || 0} stackHash: ${e.stackHash || 0}`,
          `loc: ${e.lineno || 0}:${e.colno || 0}`,
          `count: ${e.count || 1}`,
          `rawMessage: ${safeText(e.messageRaw || '')}`,
        ];
        return lines.join('\n');
      })
      .join('\n\n');

    return header + body;
  }

  function ensureUI() {
    if (ui) return ui;

    const canDialog =
      typeof globalThis.HTMLDialogElement !== 'undefined' &&
      typeof globalThis.document?.createElement === 'function';

    if (canDialog) {
      const dialog = document.createElement('dialog');
      dialog.className = 'glass-dialog error-shield-dialog';

      dialog.innerHTML = `
        <form method="dialog" class="glass-dialog__card error-shield__card">
          <header class="glass-dialog__header error-shield__head">
            <h2 class="glass-dialog__title error-shield__title">发生错误</h2>
            <button type="submit" class="error-shield__close" aria-label="关闭">×</button>
          </header>
          <p class="glass-dialog__subtitle error-shield__hint">已捕捉到运行时异常。你可以复制报告、导出备份或重置本地数据后刷新。</p>
          <textarea class="error-shield__report" readonly></textarea>
          <footer class="glass-dialog__actions error-shield__actions">
            <button type="button" class="cta-button-secondary error-shield__btn" data-err-copy>复制报告</button>
            <button type="button" class="cta-button-secondary error-shield__btn" data-err-export>导出备份</button>
            <button type="button" class="cta-button-secondary error-shield__btn error-shield__btn--danger" data-err-reset>重置并刷新</button>
          </footer>
        </form>
      `;

      document.body.appendChild(dialog);

      const reportEl = dialog.querySelector('.error-shield__report');
      const btnCopy = dialog.querySelector('[data-err-copy]');
      const btnExport = dialog.querySelector('[data-err-export]');
      const btnReset = dialog.querySelector('[data-err-reset]');

      function setReport() {
        if (!reportEl) return;
        reportEl.value = buildReportText();
      }

      btnCopy?.addEventListener('click', async () => {
        setReport();
        const text = reportEl?.value || '';
        if (!text) return;
        let ok = false;
        try {
          ok = typeof Utils?.copyText === 'function' ? await Utils.copyText(text) : false;
        } catch {
          ok = false;
        }
        try {
          Toast?.show?.(ok ? '报告已复制' : '复制失败（请手动全选复制）', ok ? 'success' : 'warning', 2200);
        } catch {
          // ignore
        }
      });

      btnExport?.addEventListener('click', () => {
        try {
          DataPortability?.exportBackup?.();
          Toast?.show?.('已开始导出备份（本地下载）', 'success', 2200);
        } catch {
          Toast?.show?.('导出失败（请检查浏览器权限）', 'warning', 2400);
        }
      });

      btnReset?.addEventListener('click', () => {
        const ok = globalThis.confirm
          ? globalThis.confirm('确定要重置本地数据并刷新吗？可先导出备份。')
          : true;
        if (!ok) return;
        try {
          DataPortability?.resetAll?.();
        } catch {
          // ignore
        }
        try {
          globalThis.location?.reload?.();
        } catch {
          // ignore
        }
      });

      ui = {
        kind: 'dialog',
        root: dialog,
        setReport,
        open: () => {
          try {
            setReport();
            if (typeof dialog.showModal === 'function') dialog.showModal();
            else dialog.setAttribute('open', 'open');
          } catch {
            // ignore
          }
        },
      };
      return ui;
    }

    // Fallback: no dialog support -> simple alert
    ui = {
      kind: 'fallback',
      root: null,
      setReport: () => {},
      open: () => {
        try {
          globalThis.alert?.(buildReportText());
        } catch {
          // ignore
        }
      },
    };
    return ui;
  }

  function open() {
    ensureUI().open();
  }

  function capture(err, context = {}) {
    try {
      const ctx = context && typeof context === 'object' ? context : {};
      const source = safeText(ctx.source, 'capture');
      const lineno = Number(ctx.lineno) || 0;
      const colno = Number(ctx.colno) || 0;

      const { name, message, stack } = normalizeErrorLike(err);
      const rawMessage = message || safeText(err, 'Captured error');

      const signature = `cap:${hashOf(name)}:${hashOf(rawMessage)}:${hashOf(stack)}:${hashOf(source)}:${lineno}:${colno}`;
      const meta = bumpDedupe(signature);

      const entry = {
        kind: 'capture',
        time: nowIso(),
        page: safeText(ctx.page, getPageName()),
        href: safeText(ctx.href, getHref()),
        source,
        lineno,
        colno,
        messageRaw: rawMessage,
        messageHash: hashOf(rawMessage),
        stackHash: hashOf(stack),
        count: meta.count,
      };

      record(entry);
      recordLogger(entry, 'error');
      trackTelemetry(entry, 'error');
      return true;
    } catch {
      return false;
    }
  }

  function handleRuntimeError(event) {
    const msg = safeText(event?.message || '');
    const file = safeText(event?.filename || '');
    const lineno = Number(event?.lineno) || 0;
    const colno = Number(event?.colno) || 0;
    const { name, message, stack } = normalizeErrorLike(event?.error || msg);

    const signature = `error:${hashOf(name)}:${hashOf(message)}:${hashOf(stack)}:${hashOf(file)}:${lineno}:${colno}`;
    const meta = bumpDedupe(signature);

    const entry = {
      kind: 'error',
      time: nowIso(),
      page: getPageName(),
      href: getHref(),
      source: file,
      lineno,
      colno,
      messageRaw: msg || message,
      messageHash: hashOf(msg || message),
      stackHash: hashOf(stack),
      count: meta.count,
    };

    record(entry);
    recordLogger(entry, 'error');
    trackTelemetry(entry, 'error');

    if (shouldToast(signature)) {
      try {
        Toast?.show?.({
          title: '发生错误',
          message: '已捕捉到异常，可打开详情或刷新页面。',
          type: 'warning',
          durationMs: 6500,
          actionLabel: '详情',
          onAction: () => open(),
        });
      } catch {
        // ignore
      }
    }
  }

  function handleUnhandledRejection(event) {
    const reason = event?.reason;
    const { name, message, stack } = normalizeErrorLike(reason);

    const signature = `rej:${hashOf(name)}:${hashOf(message)}:${hashOf(stack)}`;
    const meta = bumpDedupe(signature);

    const entry = {
      kind: 'unhandledrejection',
      time: nowIso(),
      page: getPageName(),
      href: getHref(),
      source: 'promise',
      lineno: 0,
      colno: 0,
      messageRaw: message || safeText(reason, 'Unhandled rejection'),
      messageHash: hashOf(message || safeText(reason)),
      stackHash: hashOf(stack),
      count: meta.count,
    };

    record(entry);
    recordLogger(entry, 'unhandledrejection');
    trackTelemetry(entry, 'unhandledrejection');

    if (shouldToast(signature)) {
      try {
        Toast?.show?.({
          title: '发生异常',
          message: '捕捉到未处理的 Promise 拒绝，可打开详情。',
          type: 'warning',
          durationMs: 6500,
          actionLabel: '详情',
          onAction: () => open(),
        });
      } catch {
        // ignore
      }
    }
  }

  function init() {
    if (initialized) return;
    initialized = true;

    try {
      globalThis.addEventListener?.('error', handleRuntimeError);
      globalThis.addEventListener?.('unhandledrejection', handleUnhandledRejection);
    } catch {
      // ignore
    }
  }

  function getRecent() {
    return recent.slice();
  }

  function clear() {
    recent.length = 0;
    dedupe.clear();
    return true;
  }

  return Object.freeze({ init, open, capture, getRecent, clear });
}
