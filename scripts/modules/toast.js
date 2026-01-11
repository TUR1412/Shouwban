// Toast / Feedback
// - 轻量提示：默认短时自动消失
// - 可操作：支持 action（如“撤销”）与手动关闭
// - 事件驱动：允许通过 window.dispatchEvent(new CustomEvent('toast:show', {detail})) 触发

export function createToast(options = {}) {
  const opts = options && typeof options === 'object' ? options : {};
  const maxVisible = clampInt(opts.maxVisible ?? 4, 1, 8);
  const defaultDurationMs = clampInt(opts.defaultDurationMs ?? 2400, 800, 20000);

  const iconByType = Object.freeze({
    success: 'icon-check',
    error: 'icon-x',
    warning: 'icon-shield',
    info: 'icon-bell',
  });

  let container = null;
  let seq = 0;
  const active = new Map();

  function clampInt(raw, min, max) {
    const n = Number.parseInt(String(raw ?? ''), 10);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function normalizeType(raw) {
    const t = String(raw ?? '').trim().toLowerCase();
    if (t === 'success' || t === 'error' || t === 'warning' || t === 'info') return t;
    return 'info';
  }

  function normalizeText(raw, fallback = '') {
    const s = String(raw ?? '').trim();
    return s || fallback;
  }

  function ensureContainer() {
    if (container) return container;
    container = document.querySelector('.toast-container');
    if (container) return container;

    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-relevant', 'additions');
    container.setAttribute('aria-atomic', 'true');
    document.body.appendChild(container);
    return container;
  }

  function createIcon(symbolId) {
    const id = normalizeText(symbolId);
    if (!id) return null;

    const svgNs = 'http://www.w3.org/2000/svg';
    const xlinkNs = 'http://www.w3.org/1999/xlink';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.classList.add('icon');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const use = document.createElementNS(svgNs, 'use');
    const href = `assets/icons.svg#${id}`;
    use.setAttribute('href', href);
    try {
      use.setAttributeNS(xlinkNs, 'href', href);
    } catch {
      // ignore
    }
    svg.appendChild(use);
    return svg;
  }

  function removeOldestIfNeeded() {
    if (active.size < maxVisible) return;
    const first = active.keys().next()?.value;
    if (!first) return;
    dismiss(first);
  }

  function scheduleDismiss(id, durationMs) {
    const entry = active.get(id);
    if (!entry) return;
    if (durationMs === 0 || durationMs === Infinity) return;

    clearTimeout(entry.timerId);
    entry.timerId = window.setTimeout(() => dismiss(id), Math.max(800, durationMs));
    active.set(id, entry);
  }

  function buildToastElement({
    id,
    type,
    title,
    message,
    actionLabel,
    onAction,
    dismissLabel,
  }) {
    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.dataset.toastId = id;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.setAttribute('aria-atomic', 'true');

    const iconWrap = document.createElement('div');
    iconWrap.className = 'toast__icon';
    const icon = createIcon(iconByType[type] || iconByType.info);
    if (icon) iconWrap.appendChild(icon);
    el.appendChild(iconWrap);

    const body = document.createElement('div');
    body.className = 'toast__body';

    const safeTitle = normalizeText(title);
    if (safeTitle) {
      const titleEl = document.createElement('div');
      titleEl.className = 'toast__title';
      titleEl.textContent = safeTitle;
      body.appendChild(titleEl);
    }

    const msgEl = document.createElement('div');
    msgEl.className = 'toast__message';
    msgEl.textContent = normalizeText(message);
    body.appendChild(msgEl);

    el.appendChild(body);

    const actions = document.createElement('div');
    actions.className = 'toast__actions';

    const safeActionLabel = normalizeText(actionLabel);
    const actionFn = typeof onAction === 'function' ? onAction : null;
    if (safeActionLabel && actionFn) {
      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'toast__action';
      actionBtn.textContent = safeActionLabel;
      actionBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          actionFn();
        } catch {
          // ignore
        }
        dismiss(id);
      });
      actions.appendChild(actionBtn);
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'toast__close';
    closeBtn.setAttribute('aria-label', normalizeText(dismissLabel, '关闭提示'));
    const closeIcon = createIcon('icon-x');
    if (closeIcon) closeBtn.appendChild(closeIcon);
    else closeBtn.textContent = '×';
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dismiss(id);
    });
    actions.appendChild(closeBtn);

    el.appendChild(actions);
    return el;
  }

  function normalizeInput(input, type, durationMs) {
    if (input && typeof input === 'object') {
      const obj = input;
      const normalizedType = normalizeType(obj.type ?? type);
      const normalizedMessage = normalizeText(obj.message ?? obj.text ?? obj.content ?? '');
      const normalizedTitle = normalizeText(obj.title ?? '');
      const normalizedDuration = Number(obj.durationMs ?? obj.duration ?? durationMs);
      return {
        id: normalizeText(obj.id ?? ''),
        type: normalizedType,
        title: normalizedTitle,
        message: normalizedMessage,
        durationMs: Number.isFinite(normalizedDuration) ? normalizedDuration : defaultDurationMs,
        actionLabel: normalizeText(obj.actionLabel ?? obj.actionText ?? ''),
        onAction: typeof obj.onAction === 'function' ? obj.onAction : null,
        dismissLabel: normalizeText(obj.dismissLabel ?? ''),
      };
    }

    return {
      id: '',
      type: normalizeType(type),
      title: '',
      message: normalizeText(input ?? ''),
      durationMs: Number.isFinite(Number(durationMs)) ? Number(durationMs) : defaultDurationMs,
      actionLabel: '',
      onAction: null,
      dismissLabel: '',
    };
  }

  function show(input, type = 'info', durationMs = defaultDurationMs) {
    const data = normalizeInput(input, type, durationMs);
    if (!data.message) return null;

    removeOldestIfNeeded();

    const id = data.id || `t-${Date.now().toString(36)}-${(seq += 1).toString(36)}`;
    const root = ensureContainer();

    const toastEl = buildToastElement({
      id,
      type: data.type,
      title: data.title,
      message: data.message,
      actionLabel: data.actionLabel,
      onAction: data.onAction,
      dismissLabel: data.dismissLabel,
    });
    root.appendChild(toastEl);

    const entry = { el: toastEl, timerId: 0 };
    active.set(id, entry);

    requestAnimationFrame(() => toastEl.classList.add('is-visible'));
    scheduleDismiss(id, data.durationMs);
    return id;
  }

  function dismiss(id) {
    const key = normalizeText(id);
    if (!key) return false;
    const entry = active.get(key);
    if (!entry) return false;

    active.delete(key);
    clearTimeout(entry.timerId);

    const el = entry.el;
    el.classList.remove('is-visible');
    const remove = () => {
      try {
        el.remove();
      } catch {
        // ignore
      }
    };

    el.addEventListener('transitionend', remove, { once: true });
    window.setTimeout(remove, 480);
    return true;
  }

  // 允许任意模块通过 Utils.dispatch('toast:show', {...}) 触发全局提示
  try {
    window.addEventListener('toast:show', (event) => {
      const detail = event?.detail;
      if (!detail) return;
      if (typeof detail === 'string') {
        show(detail, 'info', 2200);
        return;
      }
      if (detail && typeof detail === 'object') {
        show(detail);
      }
    });
  } catch {
    // ignore
  }

  return Object.freeze({ show, dismiss });
}

