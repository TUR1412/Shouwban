// Accessibility / Preferences
// - 静态站点：通过 data-* 与 CSS var 实现“无障碍偏好”落地
// - 存储：localStorage key = "a11y"
export function createAccessibility(deps = {}) {
  const readStorageJSON = typeof deps.readStorageJSON === 'function' ? deps.readStorageJSON : () => null;
  const writeStorageJSON = typeof deps.writeStorageJSON === 'function' ? deps.writeStorageJSON : () => false;
  const dispatchChanged = typeof deps.dispatchChanged === 'function' ? deps.dispatchChanged : () => {};

  const storageKey = 'a11y';
  const defaults = Object.freeze({
    reduceMotion: false,
    highContrast: false,
    fontScale: 1,
  });

  function clampNumber(raw, { min, max, fallback }) {
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function normalizeFontScale(raw) {
    // 允许范围：1.00 ~ 1.25（与 UI 滑杆 100% ~ 125% 对齐）
    const n = clampNumber(raw, { min: 1, max: 1.25, fallback: 1 });
    return Math.round(n * 100) / 100;
  }

  function normalizeSettings(raw) {
    const obj = raw && typeof raw === 'object' ? raw : {};
    return {
      reduceMotion: Boolean(obj.reduceMotion),
      highContrast: Boolean(obj.highContrast),
      fontScale: normalizeFontScale(obj.fontScale),
    };
  }

  function get() {
    const raw = readStorageJSON(storageKey, defaults);
    return normalizeSettings(raw);
  }

  function apply(settings) {
    const next = normalizeSettings(settings);
    try {
      const root = document.documentElement;

      if (next.reduceMotion) root.dataset.motion = 'reduce';
      else delete root.dataset.motion;

      if (next.highContrast) root.dataset.contrast = 'high';
      else delete root.dataset.contrast;

      root.style.setProperty('--a11y-font-scale', String(next.fontScale));
    } catch {
      // ignore
    }
    return next;
  }

  function set(settings, { silent = false } = {}) {
    const next = normalizeSettings(settings);
    writeStorageJSON(storageKey, next);
    apply(next);
    if (!silent) dispatchChanged('a11y');
    return next;
  }

  function update(patch, { silent = false } = {}) {
    const current = get();
    const obj = patch && typeof patch === 'object' ? patch : {};
    return set({ ...current, ...obj }, { silent });
  }

  function init() {
    apply(get());
  }

  return Object.freeze({ storageKey, get, set, update, apply, init });
}

