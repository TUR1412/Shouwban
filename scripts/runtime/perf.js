// 性能工具箱。
// - 提供 raf 节流与轻量缓存
// - 适配无依赖静态站点
export function createPerfKit() {
  function rafThrottle(fn) {
    if (typeof fn !== 'function') return () => {};
    let rafId = 0;
    let lastArgs = null;
    return function throttled(...args) {
      lastArgs = args;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        try { fn.apply(this, lastArgs || []); } catch { /* 忽略执行异常 */ }
        lastArgs = null;
      });
    };
  }

  function memoize(fn, resolver) {
    const cache = new Map();
    const getKey = typeof resolver === 'function' ? resolver : (...args) => JSON.stringify(args);
    return function memoized(...args) {
      const key = getKey(...args);
      if (cache.has(key)) return cache.get(key);
      const value = fn.apply(this, args);
      cache.set(key, value);
      return value;
    };
  }

  function nextFrame() {
    return new Promise((resolve) => requestAnimationFrame(() => resolve()));
  }

  function batchAppend(container, elements) {
    const host = container && container.nodeType === 1 ? container : null;
    if (!host) return;
    const list = Array.isArray(elements) ? elements : [];
    const frag = document.createDocumentFragment();
    list.forEach((el) => {
      if (el && el.nodeType === 1) frag.appendChild(el);
    });
    host.appendChild(frag);
  }

  return Object.freeze({ rafThrottle, memoize, nextFrame, batchAppend });
}
