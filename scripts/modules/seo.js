// SEO Helpers (canonical / structured data)
// - 渐进增强：任何异常都不影响主流程
// - 设计目标：可测试（依赖注入），避免对 DOM 的硬依赖

export function createSeo(deps = {}, options = {}) {
  const d = deps && typeof deps === 'object' ? deps : {};
  const opts = options && typeof options === 'object' ? options : {};

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

  const getDocument =
    typeof d.getDocument === 'function'
      ? d.getDocument
      : () => {
          try {
            return globalThis.document;
          } catch {
            return null;
          }
        };

  const allowedProtocols =
    Array.isArray(opts.allowedProtocols) && opts.allowedProtocols.length > 0
      ? opts.allowedProtocols
      : ['https:', 'http:'];

  function canonicalizeHref(rawHref, baseHref = '') {
    try {
      const href = String(rawHref ?? '').trim();
      if (!href) return '';

      const base = String(baseHref ?? '').trim();
      const url = base ? new URL(href, base) : new URL(href);
      if (!allowedProtocols.includes(url.protocol)) return '';

      url.hash = '';
      return url.toString();
    } catch {
      return '';
    }
  }

  function ensureCanonical() {
    try {
      const href = canonicalizeHref(getHref(), getHref());
      if (!href) return false;

      const doc = getDocument();
      if (!doc) return false;

      const head =
        doc.head ||
        (typeof doc.getElementsByTagName === 'function'
          ? doc.getElementsByTagName('head')?.[0]
          : null);
      if (!head) return false;

      const find = typeof head.querySelector === 'function' ? head.querySelector.bind(head) : null;
      const link = find ? find('link[rel="canonical"]') : null;
      if (link) {
        if (typeof link.setAttribute === 'function') link.setAttribute('href', href);
        else link.href = href;
        return true;
      }

      if (typeof doc.createElement !== 'function') return false;
      const created = doc.createElement('link');
      if (!created) return false;

      if (typeof created.setAttribute === 'function') {
        created.setAttribute('rel', 'canonical');
        created.setAttribute('href', href);
      } else {
        created.rel = 'canonical';
        created.href = href;
      }

      if (typeof head.appendChild === 'function') head.appendChild(created);
      return true;
    } catch {
      return false;
    }
  }

  return { canonicalizeHref, ensureCanonical };
}

