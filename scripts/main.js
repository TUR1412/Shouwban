// Main JavaScript for the figurine e-commerce website
import { createStateHub } from './runtime/state.js?v=20260112.5';
import { createStorageKit } from './runtime/storage.js?v=20260112.5';
import { createPerfKit } from './runtime/perf.js?v=20260112.5';
import { createAccessibility } from './modules/accessibility.js?v=20260112.5';
import { createToast } from './modules/toast.js?v=20260112.5';
import { createLogger } from './modules/logger.js?v=20260112.5';
import { createErrorShield } from './modules/error-shield.js?v=20260112.5';
import { createPerfVitals } from './modules/perf-vitals.js?v=20260112.5';
import { createTelemetry } from './modules/telemetry.js?v=20260112.5';

// ==============================================
// Utility Functions
// ==============================================
const Utils = {
    // Throttle function to limit the rate of function execution
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },
    // Debounce function to delay function execution
    debounce: (func, delay) => {
        let timeoutId;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(context, args), delay);
        }
    },
    // Normalize current page name for both http(s) & file:// usage
    getPageNameFromPath: (pathname) => {
        const safePath = typeof pathname === 'string' ? pathname : '';
        const parts = safePath.split('/').filter(Boolean);
        const last = parts.length > 0 ? parts[parts.length - 1] : '';
        if (!last) return 'index.html';
        // 目录路径（如 /repo/ 或 /repo）也视为首页
        if (!last.includes('.')) return 'index.html';
        return last;
    },
    getPageName: () => {
        try {
            return Utils.getPageNameFromPath(window.location.pathname);
        } catch {
            return 'index.html';
        }
    },

    // Escape HTML to avoid XSS when data is later sourced from APIs
    escapeHtml: (value) => {
        const s = String(value ?? '');
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // Safe JSON parse helper (never throws)
    safeJsonParse: (raw, fallback) => {
        try {
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    },

    // localStorage helpers (never throw)
    readStorageJSON: (key, fallback) => {
        const storageKey = String(key || '');
        if (!storageKey) return fallback;

        try {
            const raw = localStorage.getItem(storageKey);
            if (typeof raw !== 'string' || raw.length === 0) return fallback;

            // Protocol-aware storage (backward compatible JSON):
            // - SB_A1: string[] (favorites / compare / recentlyViewed)
            // - SB_C1: cart lines ({id, quantity}[])
            if (raw.startsWith('SB_A1:')) {
                const payload = raw.slice('SB_A1:'.length);
                const decoder = globalThis.ShouwbanCore?.decodeStringArrayBase64;
                if (typeof decoder === 'function') {
                    const decoded = decoder(payload);
                    if (Array.isArray(decoded)) return decoded;
                }
            }

            if (raw.startsWith('SB_C1:')) {
                const payload = raw.slice('SB_C1:'.length);
                const decoder = globalThis.ShouwbanCore?.decodeCartLinesBase64;
                if (typeof decoder === 'function') {
                    const decoded = decoder(payload);
                    if (Array.isArray(decoded)) return decoded;
                }
            }

            return Utils.safeJsonParse(raw, fallback);
        } catch {
            return fallback;
        }
    },
    writeStorageJSON: (key, value) => {
        const storageKey = String(key || '');
        if (!storageKey) return false;

        try {
            // Prefer binary codecs for hot-path keys to reduce storage churn.
            if (storageKey === 'favorites' || storageKey === 'compare' || storageKey === 'recentlyViewed') {
                const ids = Utils.normalizeStringArray(value);
                const encoder = globalThis.ShouwbanCore?.encodeStringArrayBase64;
                if (typeof encoder === 'function') {
                    const payload = encoder(ids);
                    if (payload) {
                        localStorage.setItem(storageKey, `SB_A1:${payload}`);
                        return true;
                    }
                }
            }

            if (storageKey === 'cart') {
                const lines = Array.isArray(value)
                    ? value.map((item) => ({ id: item?.id, quantity: item?.quantity }))
                    : [];
                const encoder = globalThis.ShouwbanCore?.encodeCartLinesBase64;
                if (typeof encoder === 'function') {
                    const payload = encoder(lines);
                    if (payload) {
                        localStorage.setItem(storageKey, `SB_C1:${payload}`);
                        return true;
                    }
                }
            }

            localStorage.setItem(storageKey, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },
    removeStorage: (key) => {
        try {
            localStorage.removeItem(String(key || ''));
            return true;
        } catch {
            return false;
        }
    },
    normalizeStringArray: (value) => {
        return globalThis.ShouwbanCore.normalizeStringArray(value);
    },

    prefersReducedMotion: () => {
        try {
            const root = document && document.documentElement ? document.documentElement : null;
            if (root?.dataset?.motion === 'reduce') return true;
        } catch {
            // ignore
        }
        try {
            return Boolean(
                window.matchMedia &&
                window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            );
        } catch {
            return false;
        }
    },

    dispatch: (type, detail) => {
        const name = String(type || '').trim();
        if (!name) return false;
        try {
            const event =
                typeof detail === 'undefined'
                    ? new CustomEvent(name)
                    : new CustomEvent(name, { detail });
            window.dispatchEvent(event);
            return true;
        } catch {
            return false;
        }
    },

    dispatchChanged: (scope, detail) => {
        const key = String(scope || '').trim();
        if (!key) return false;
        return Utils.dispatch(`${key}:changed`, detail);
    },

    generateId: (prefix) => {
        try {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                return window.crypto.randomUUID();
            }
        } catch {
            // ignore
        }

        const p = String(prefix || '').trim();
        const base = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
        return p ? `${p}${base}` : base;
    },

    copyText: async (value) => {
        const text = String(value || '');
        if (!text) return false;

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch {
            // ignore and fallback
        }

        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', 'true');
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const ok = document.execCommand && document.execCommand('copy');
            textarea.remove();
            return Boolean(ok);
        } catch {
            return false;
        }
    },
};

// ==============================================
// Runtime Kits（State/Storage/Perf）
// ==============================================
const Perf = createPerfKit();
const StorageKit = createStorageKit(Utils);
const StateHub = (() => {
    const { StateHub: hub, enhanceDispatch } = createStateHub(Utils);
    Utils.dispatch = enhanceDispatch(Utils.dispatch);
    return hub;
})();
const Accessibility = createAccessibility(Utils);
const Logger = createLogger(Utils, { storageKey: 'sbLogs', maxEntries: 240 });

// ==============================================
// Local Icon System (SVG Sprite)
// - Replace external icon CDN (Font Awesome) with a self-hosted sprite.
// - Keep markup small + accessible.
// ==============================================
const Icons = {
    spritePath: 'assets/icons.svg',

    href: (symbolId) => `${Icons.spritePath}#${String(symbolId || '').trim()}`,

    svgHtml: (symbolId, { className = 'icon', ariaHidden = true } = {}) => {
        const href = Icons.href(symbolId);
        const safeClass = String(className || 'icon').trim() || 'icon';
        const aria = ariaHidden ? ' aria-hidden="true"' : '';
        return `<svg class="${safeClass}"${aria} focusable="false"><use href="${href}" xlink:href="${href}"></use></svg>`;
    },

    createSvg: (symbolId, { className = 'icon', ariaHidden = true } = {}) => {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', String(className || 'icon').trim() || 'icon');
        svg.setAttribute('focusable', 'false');
        if (ariaHidden) svg.setAttribute('aria-hidden', 'true');

        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        const href = Icons.href(symbolId);
        use.setAttribute('href', href);
        use.setAttribute('xlink:href', href);
        svg.appendChild(use);
        return svg;
    },

    setSvgUse: (svgEl, symbolId) => {
        const svg = svgEl && svgEl.querySelector ? svgEl : null;
        if (!svg) return;
        const use = svg.querySelector('use');
        if (!use) return;
        const href = Icons.href(symbolId);
        use.setAttribute('href', href);
        use.setAttribute('xlink:href', href);
    },
};

// ==============================================
// Virtual Scroll Engine (Zero Dependency)
// - Window-based virtualization for ultra large lists
// - Keeps DOM surface small, scroll updates in rAF
// - Designed for 100k+ items (fixed row height/stride)
// ==============================================
const VirtualScroll = (function() {
    const MAX_SCROLL_PX = 30000000; // ~30M px: conservative cross-browser safety

    function clampInt(value, min, max) {
        const n = Number.parseInt(String(value ?? ''), 10);
        if (!Number.isFinite(n)) return min;
        return Math.min(max, Math.max(min, n));
    }

    function toNumber(value, fallback) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
    }

    function getScrollY() {
        return Number(window.scrollY || window.pageYOffset || 0);
    }

    function mountList({
        container,
        itemCount,
        getItem,
        renderItem,
        itemHeight = 248,
        gap = 16,
        overscan = 8,
        maxPoolSize = 180,
        onItemRendered,
    } = {}) {
        const host = container && container.nodeType === 1 ? container : null;
        if (!host) return null;
        const count = clampInt(itemCount, 0, Number.MAX_SAFE_INTEGER);
        if (count <= 0) {
            host.innerHTML = '';
            host.classList.remove('is-virtualized');
            return null;
        }

        const getter = typeof getItem === 'function' ? getItem : () => null;
        const renderer = typeof renderItem === 'function' ? renderItem : () => {};
        const cbRendered = typeof onItemRendered === 'function' ? onItemRendered : null;

        const rowH = Math.max(80, toNumber(itemHeight, 248));
        const rowGap = Math.max(0, toNumber(gap, 16));
        const stride = rowH + rowGap;
        const extra = clampInt(overscan, 0, 40);
        const poolCap = clampInt(maxPoolSize, 20, 500);

        // Auto-destroy previous mount (if any)
        try {
            if (typeof host.__vscrollDestroy === 'function') host.__vscrollDestroy();
        } catch {
            // ignore
        }

        host.classList.add('is-virtualized');
        host.dataset.virtual = '1';
        host.setAttribute('aria-live', 'polite');
        host.setAttribute('role', 'list');
        host.style.position = 'relative';
        host.style.display = 'block';

        host.innerHTML = '';

        const spacer = document.createElement('div');
        spacer.className = 'vscroll__spacer';
        spacer.setAttribute('aria-hidden', 'true');
        host.appendChild(spacer);

        const layer = document.createElement('div');
        layer.className = 'vscroll__layer';
        layer.style.position = 'absolute';
        layer.style.left = '0';
        layer.style.top = '0';
        layer.style.right = '0';
        layer.style.willChange = 'transform';
        host.appendChild(layer);

        let destroyed = false;
        let rafId = 0;
        let pool = [];

        const totalPx = count * stride;
        const scaledTotalPx = Math.min(MAX_SCROLL_PX, totalPx);
        const scale = totalPx > 0 ? totalPx / scaledTotalPx : 1;
        spacer.style.height = `${scaledTotalPx}px`;

        function ensurePoolSize() {
            const viewportH = Math.max(200, Number(window.innerHeight) || 800);
            const visibleRows = Math.ceil(viewportH / stride) + 1;
            const target = Math.min(poolCap, Math.max(20, visibleRows + extra * 2));
            if (pool.length === target) return;

            if (pool.length > target) {
                const remove = pool.splice(target);
                remove.forEach((el) => el.remove());
                return;
            }

            while (pool.length < target) {
                const row = document.createElement('div');
                row.className = 'vscroll__item';
                row.setAttribute('role', 'listitem');
                row.style.position = 'absolute';
                row.style.left = '0';
                row.style.right = '0';
                row.style.height = `${rowH}px`;
                row.style.willChange = 'transform';
                row.dataset.vIndex = '';
                layer.appendChild(row);
                pool.push(row);
            }
        }

        function update() {
            rafId = 0;
            if (destroyed) return;
            ensurePoolSize();

            const rect = host.getBoundingClientRect();
            const hostTop = rect.top + getScrollY();
            const viewportTop = getScrollY();
            const viewportH = Math.max(200, Number(window.innerHeight) || 800);

            // Map window scroll -> list scroll space (supports scaled huge lists)
            const localPx = Math.max(0, viewportTop - hostTop);
            const scaledPx = Math.min(scaledTotalPx, Math.max(0, localPx));
            const actualPx = scaledPx * scale;

            const first = clampInt(Math.floor(actualPx / stride) - extra, 0, count);
            const visible = Math.ceil(viewportH / stride) + 1 + extra * 2;
            const last = clampInt(first + visible, 0, count);

            for (let i = 0; i < pool.length; i += 1) {
                const index = first + i;
                const el = pool[i];
                if (index >= last) {
                    el.style.display = 'none';
                    continue;
                }

                el.style.display = '';
                const y = (index * stride) / scale;
                el.style.transform = `translate3d(0, ${Math.round(y)}px, 0)`;

                const prev = el.dataset.vIndex;
                const next = String(index);
                if (prev !== next) {
                    el.dataset.vIndex = next;
                    const item = getter(index);
                    renderer(el, item, index);
                    if (cbRendered) cbRendered(el, item, index);
                }
            }
        }

        function schedule() {
            if (destroyed) return;
            if (rafId) return;
            rafId = window.requestAnimationFrame(update);
        }

        const onScroll = () => schedule();
        const onResize = () => schedule();

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);

        schedule();

        const destroy = () => {
            if (destroyed) return;
            destroyed = true;
            try { window.removeEventListener('scroll', onScroll); } catch { /* ignore */ }
            try { window.removeEventListener('resize', onResize); } catch { /* ignore */ }
            try { if (rafId) window.cancelAnimationFrame(rafId); } catch { /* ignore */ }
            rafId = 0;
            pool = [];
            try { host.innerHTML = ''; } catch { /* ignore */ }
            try { host.classList.remove('is-virtualized'); } catch { /* ignore */ }
            try { delete host.dataset.virtual; } catch { /* ignore */ }
            try { delete host.__vscrollDestroy; } catch { /* ignore */ }
        };

        host.__vscrollDestroy = destroy;
        return { destroy, update: schedule };
    }

    function destroy(container) {
        const host = container && container.nodeType === 1 ? container : null;
        if (!host) return;
        try {
            if (typeof host.__vscrollDestroy === 'function') host.__vscrollDestroy();
        } catch {
            // ignore
        }
    }

    return { mountList, destroy };
})();

// ==============================================
// Pricing / Shipping Helpers
// ==============================================
const Pricing = (function() {
    const regions = [
        { value: 'cn-east', label: '华东', baseShipping: 12, freeOver: 399 },
        { value: 'cn-north', label: '华北', baseShipping: 12, freeOver: 399 },
        { value: 'cn-south', label: '华南', baseShipping: 14, freeOver: 399 },
        { value: 'cn-central', label: '华中', baseShipping: 13, freeOver: 399 },
        { value: 'cn-west', label: '西部/偏远', baseShipping: 18, freeOver: 499 },
        { value: 'cn-northeast', label: '东北', baseShipping: 15, freeOver: 399 },
        { value: 'hmt', label: '港澳台/海外（示例）', baseShipping: 28, freeOver: 699 },
    ];

    function roundMoney(value) {
        return globalThis.ShouwbanCore.roundMoney(value);
    }

    function formatCny(value) {
        return globalThis.ShouwbanCore.formatCny(value);
    }

    function getRegion(value) {
        const key = String(value || '').trim();
        return regions.find((r) => r.value === key) || regions[0];
    }

    function calculateShipping({ subtotal = 0, discount = 0, region = 'cn-east', promotion = null, membership = null } = {}) {
        const s = roundMoney(subtotal);
        const d = roundMoney(discount);
        const merch = Math.max(0, s - d);
        const r = getRegion(region);

        // Promotion: free shipping
        if (promotion && promotion.type === 'freeship') return 0;

        // Empty cart should not charge shipping
        if (merch <= 0) return 0;

        const member = membership && typeof membership === 'object' ? membership : null;
        if (member && member.freeShipping === true) return 0;
        const memberFreeOver = Number(member?.freeOver);
        const freeOverDelta = Number(member?.freeOverDelta) || 0;
        const freeOver = Number.isFinite(memberFreeOver)
            ? Math.max(0, memberFreeOver)
            : Math.max(0, r.freeOver - freeOverDelta);

        // Threshold-based free shipping
        if (merch >= freeOver) return 0;

        return roundMoney(r.baseShipping);
    }

    return {
        regions,
        roundMoney,
        formatCny,
        getRegion,
        calculateShipping,
    };
})();

// ==============================================
// UXMotion / Micro-interactions (Progressive Enhancement)
// ==============================================
const UXMotion = (function() {
    function canAnimate() {
        return !Utils.prefersReducedMotion();
    }

    function withViewTransition(update) {
        if (typeof update !== 'function') return;
        if (!canAnimate()) {
            update();
            return;
        }

        try {
            if (document && typeof document.startViewTransition === 'function') {
                document.startViewTransition(() => update());
                return;
            }
        } catch {
            // ignore
        }

        update();
    }

    function flyToCart(sourceElement) {
        if (!canAnimate()) return;
        if (!sourceElement || typeof sourceElement.getBoundingClientRect !== 'function') return;

        const targetLink =
            document.querySelector('.header__actions a[href="cart.html"]') ||
            document.querySelector('a.header__action-link[href="cart.html"]');
        if (!targetLink || typeof targetLink.getBoundingClientRect !== 'function') return;

        const from = sourceElement.getBoundingClientRect();
        const to = targetLink.getBoundingClientRect();
        if (!from.width || !from.height) return;

        // Clone visual
        const clone = (() => {
            const img = sourceElement.tagName?.toLowerCase() === 'img'
                ? sourceElement
                : sourceElement.querySelector?.('img') || null;

            if (img && img.cloneNode) {
                const c = img.cloneNode(true);
                c.removeAttribute('loading');
                c.removeAttribute('decoding');
                c.style.width = `${Math.max(32, Math.min(from.width, 120))}px`;
                c.style.height = 'auto';
                c.style.borderRadius = '14px';
                c.style.background = 'rgba(255,255,255,0.6)';
                c.style.border = '1px solid rgba(0,0,0,0.06)';
                c.style.boxShadow = '0 20px 60px rgba(0,0,0,0.18)';
                return c;
            }

            const dot = document.createElement('div');
            dot.style.width = '22px';
            dot.style.height = '22px';
            dot.style.borderRadius = '999px';
            dot.style.background = 'rgba(var(--color-primary-rgb), 0.85)';
            dot.style.boxShadow = '0 16px 40px rgba(31,111,235,0.35)';
            return dot;
        })();

        const layer = document.createElement('div');
        layer.style.position = 'fixed';
        layer.style.left = '0';
        layer.style.top = '0';
        layer.style.width = '100%';
        layer.style.height = '100%';
        layer.style.pointerEvents = 'none';
        layer.style.zIndex = '9999';

        const wrapper = document.createElement('div');
        wrapper.style.position = 'fixed';
        wrapper.style.left = `${from.left + from.width / 2}px`;
        wrapper.style.top = `${from.top + from.height / 2}px`;
        wrapper.style.transform = 'translate(-50%, -50%)';
        wrapper.appendChild(clone);

        layer.appendChild(wrapper);
        document.body.appendChild(layer);

        const dx = (to.left + to.width / 2) - (from.left + from.width / 2);
        const dy = (to.top + to.height / 2) - (from.top + from.height / 2);

        const keyframes = [
            { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, filter: 'blur(0px)' },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.18)`, opacity: 0.2, filter: 'blur(0.6px)' },
        ];

        const duration = 560;
        try {
            const anim = wrapper.animate(keyframes, {
                duration,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'forwards',
            });
            anim.onfinish = () => layer.remove();
        } catch {
            // Fallback: cleanup without animation
            setTimeout(() => layer.remove(), duration);
        }
    }

    function tweenNumber(element, toValue, options = {}) {
        if (!element) return;
        const { duration = 320, formatter = (n) => String(n) } = options;
        const to = Number(toValue);
        if (!Number.isFinite(to)) {
            element.textContent = formatter(0);
            element.dataset.tweenValue = '0';
            return;
        }

        // Reduced motion: set immediately
        if (!canAnimate()) {
            element.textContent = formatter(to);
            element.dataset.tweenValue = String(to);
            return;
        }

        const from = Number(element.dataset.tweenValue);
        const start = Number.isFinite(from) ? from : to;

        element.dataset.tweenValue = String(start);

        const t0 = performance.now();
        const tick = (now) => {
            const p = Math.min(1, (now - t0) / Math.max(1, duration));
            const eased = 1 - Math.pow(1 - p, 3);
            const current = start + (to - start) * eased;
            element.textContent = formatter(current);
            element.dataset.tweenValue = String(current);
            if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    function tweenMoney(element, amount, options = {}) {
        const prefix = options.prefix || '';
        const round = (n) => Pricing.roundMoney(n);
        tweenNumber(element, round(amount), {
            duration: options.duration || 360,
            formatter: (n) => `${prefix}${Pricing.formatCny(round(n))}`,
        });
    }

    return { withViewTransition, flyToCart, tweenNumber, tweenMoney };
})();

// ==============================================
// Cinematic UI (Motion.dev / Framer 系动效库渐进增强)
// ==============================================
const Cinematic = (function() {
    function canAnimate() {
        return !Utils.prefersReducedMotion();
    }

    function getMotionLib() {
        try {
            return globalThis.Motion || null;
        } catch {
            return null;
        }
    }

    function isMotionReady() {
        const lib = getMotionLib();
        return Boolean(lib && typeof lib.animate === 'function' && canAnimate());
    }

    function markMotionActive() {
        try {
            if (!isMotionReady()) return;
            document.documentElement.dataset.motion = 'on';
        } catch {
            // ignore
        }
    }

    function cancelRunningAnimations(element) {
        if (!element || typeof element.getAnimations !== 'function') return;
        try {
            element.getAnimations().forEach((a) => a.cancel());
        } catch {
            // ignore
        }
    }

    function animate(element, keyframes, options) {
        const lib = getMotionLib();
        if (!lib || typeof lib.animate !== 'function' || !element) return null;
        try {
            return lib.animate(element, keyframes, options);
        } catch {
            return null;
        }
    }

    function shimmerOnce(element, options = {}) {
        if (!element) return false;
        if (!canAnimate()) return false;
        if (typeof element.animate !== 'function') return false;

        const host = element.closest?.('button, a') || element;
        if (!host || typeof host.getBoundingClientRect !== 'function') return false;
        if (host.dataset && host.dataset.cinematicShimmer === '1') return false;

        const rect = host.getBoundingClientRect();
        if (!rect.width || !rect.height) return false;

        const durationMs = Math.max(260, Number(options.durationMs) || 560);
        const inset = Math.max(10, Math.min(rect.height * 0.45, 18));
        const barWidth = Math.max(80, Math.min(rect.width * 0.55, 240));

        const layer = document.createElement('span');
        layer.setAttribute('aria-hidden', 'true');
        layer.style.position = 'absolute';
        layer.style.inset = `-${Math.round(inset)}px`;
        layer.style.pointerEvents = 'none';
        layer.style.borderRadius = 'inherit';
        layer.style.overflow = 'hidden';
        layer.style.zIndex = '1';

        const bar = document.createElement('span');
        bar.style.position = 'absolute';
        bar.style.top = '-20%';
        bar.style.bottom = '-20%';
        bar.style.width = `${Math.round(barWidth)}px`;
        bar.style.left = '0';
        bar.style.background =
            'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.55), rgba(255,255,255,0))';
        bar.style.filter = 'blur(0.2px)';
        bar.style.transform = 'translateX(0) skewX(-20deg)';

        layer.appendChild(bar);

        try {
            const cs = getComputedStyle(host);
            if (cs.position === 'static') host.style.position = 'relative';
            host.appendChild(layer);
        } catch {
            return false;
        }

        // Prevent pointer hit-tests from overlay, and keep DOM clean
        host.dataset.cinematicShimmer = '1';
        window.setTimeout(() => {
            try { delete host.dataset.cinematicShimmer; } catch { /* ignore */ }
        }, Math.max(0, durationMs + 80));

        const startX = -barWidth - rect.width * 0.25;
        const endX = rect.width + barWidth + rect.width * 0.25;

        try {
            const anim = bar.animate(
                [
                    { transform: `translateX(${startX}px) skewX(-20deg)`, opacity: 0 },
                    { transform: `translateX(${rect.width * 0.15}px) skewX(-20deg)`, opacity: 1 },
                    { transform: `translateX(${endX}px) skewX(-20deg)`, opacity: 0 },
                ],
                {
                    duration: durationMs,
                    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    fill: 'both',
                },
            );
            anim.onfinish = () => layer.remove();
        } catch {
            window.setTimeout(() => layer.remove(), durationMs);
        }

        return true;
    }

    function pulse(element, options = {}) {
        if (!element) return false;
        if (!isMotionReady()) return false;

        const scale = Number.isFinite(options.scale) ? options.scale : 1.06;
        const duration = Number.isFinite(options.duration) ? options.duration : 0.28;

        cancelRunningAnimations(element);
        element.style.willChange = 'transform';
        animate(
            element,
            { scale: [1, scale, 1] },
            { duration, easing: [0.22, 1, 0.36, 1] },
        )?.finished?.finally?.(() => {
            element.style.willChange = '';
        });
        return true;
    }

    function toggleDisplay(element, show, options = {}) {
        if (!element) return false;

        const display = String(options.display || 'flex');
        const y = Number.isFinite(options.y) ? options.y : 10;
        const duration = Number.isFinite(options.duration) ? options.duration : 0.26;
        const blur = Number.isFinite(options.blur) ? options.blur : 8;

        const next = show ? '1' : '0';
        if (element.dataset && element.dataset.cinematicVisible === next) {
            element.style.display = show ? display : 'none';
            return true;
        }
        if (element.dataset) element.dataset.cinematicVisible = next;

        if (!isMotionReady()) {
            element.style.display = show ? display : 'none';
            return false;
        }

        cancelRunningAnimations(element);

        if (show) {
            element.style.display = display;
            element.style.opacity = '0';
            element.style.transform = `translateY(${y}px)`;
            element.style.filter = `blur(${blur}px)`;
            element.style.willChange = 'transform, opacity, filter';
            requestAnimationFrame(() => {
                animate(
                    element,
                    { opacity: [0, 1], y: [y, 0], filter: [`blur(${blur}px)`, 'blur(0px)'] },
                    { duration, easing: [0.22, 1, 0.36, 1] },
                )?.finished?.finally?.(() => {
                    element.style.opacity = '';
                    element.style.transform = '';
                    element.style.filter = '';
                    element.style.willChange = '';
                });
            });
            return true;
        }

        element.style.willChange = 'transform, opacity, filter';
        animate(
            element,
            { opacity: [1, 0], y: [0, y], filter: ['blur(0px)', `blur(${blur}px)`] },
            { duration: Math.max(0.18, duration - 0.06), easing: [0.4, 0, 0.2, 1] },
        )?.finished?.finally?.(() => {
            element.style.display = 'none';
            element.style.opacity = '';
            element.style.transform = '';
            element.style.filter = '';
            element.style.willChange = '';
        });
        return true;
    }

    function staggerEnter(elements, options = {}) {
        if (!isMotionReady()) return false;
        const list = Array.from(elements || []).filter(Boolean);
        if (!list.length) return false;

        const y = Number.isFinite(options.y) ? options.y : 10;
        const blur = Number.isFinite(options.blur) ? options.blur : 10;
        const duration = Number.isFinite(options.duration) ? options.duration : 0.32;
        const stagger = Number.isFinite(options.stagger) ? options.stagger : 0.035;
        const maxStaggerItems = Number.isFinite(options.maxStaggerItems) ? options.maxStaggerItems : 12;

        list.forEach((el, index) => {
            if (!el) return;
            if (el.dataset && el.dataset.cinematicEntered === '1') return;
            if (el.dataset) el.dataset.cinematicEntered = '1';

            const delay = Math.min(index, maxStaggerItems) * stagger;
            cancelRunningAnimations(el);

            el.style.opacity = '0.001';
            el.style.transform = `translateY(${y}px)`;
            el.style.filter = `blur(${blur}px)`;
            el.style.willChange = 'transform, opacity, filter';

            requestAnimationFrame(() => {
                animate(
                    el,
                    { opacity: [0.001, 1], y: [y, 0], filter: [`blur(${blur}px)`, 'blur(0px)'] },
                    { duration, delay, easing: [0.22, 1, 0.36, 1] },
                )?.finished?.finally?.(() => {
                    el.style.opacity = '';
                    el.style.transform = '';
                    el.style.filter = '';
                    el.style.willChange = '';
                });
            });
        });

        return true;
    }

    function enhanceFadeInUp(root, options = {}) {
        if (!root || !root.querySelectorAll) return false;
        if (!isMotionReady()) return false;
        if (!('IntersectionObserver' in window)) return false;

        const items = Array.from(root.querySelectorAll('.fade-in-up:not(.is-visible)'));
        if (!items.length) return false;

        const y = Number.isFinite(options.y) ? options.y : 18;
        const blur = Number.isFinite(options.blur) ? options.blur : 12;
        const duration = Number.isFinite(options.duration) ? options.duration : 0.42;
        const stagger = Number.isFinite(options.stagger) ? options.stagger : 0.035;
        const maxStaggerItems = Number.isFinite(options.maxStaggerItems) ? options.maxStaggerItems : 14;

        const observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const el = entry.target;
                    obs.unobserve(el);
                    if (!el || (el.dataset && el.dataset.cinematicReveal === '1')) return;
                    if (el.dataset) el.dataset.cinematicReveal = '1';

                    // Disable CSS transition for this reveal; Motion takes over
                    el.style.transitionDelay = '0ms';
                    el.style.transition = 'none';
                    el.classList.add('is-visible');

                    const index = Number.parseInt(String(el.dataset.cinematicIndex ?? ''), 10);
                    const delayIndex = Number.isFinite(index) ? index : 0;
                    const delay = Math.min(delayIndex, maxStaggerItems) * stagger;

                    el.style.opacity = '0';
                    el.style.transform = `translateY(${y}px)`;
                    el.style.filter = `blur(${blur}px)`;
                    el.style.willChange = 'transform, opacity, filter';

                    requestAnimationFrame(() => {
                        animate(
                            el,
                            { opacity: [0, 1], y: [y, 0], filter: [`blur(${blur}px)`, 'blur(0px)'] },
                            { duration, delay, easing: [0.22, 1, 0.36, 1] },
                        )?.finished?.finally?.(() => {
                            el.style.opacity = '';
                            el.style.transform = '';
                            el.style.filter = '';
                            el.style.willChange = '';
                            el.style.transition = '';
                            el.style.transitionDelay = '';
                        });
                    });
                });
            },
            { threshold: 0.12 },
        );

        items.forEach((el, index) => {
            if (!el) return;
            if (el.dataset) el.dataset.cinematicIndex = String(index);
            observer.observe(el);
        });

        return true;
    }

    function bindHoverLift() {
        if (!isMotionReady()) return;

        const selector = '.account-card, .address-card, .alert-row, .summary-item, .order-success__panel, .order-success__item';
        const lifted = new WeakSet();

        const shouldIgnore = (event) => {
            const pt = String(event?.pointerType || '');
            if (pt && pt !== 'mouse') return true;
            return false;
        };

        const getCard = (event) => {
            const target = event?.target;
            return target?.closest?.(selector) || null;
        };

        document.addEventListener(
            'pointerover',
            (event) => {
                if (shouldIgnore(event)) return;
                const el = getCard(event);
                if (!el) return;
                const related = event.relatedTarget;
                if (related && el.contains(related)) return;
                if (lifted.has(el)) return;
                lifted.add(el);
                cancelRunningAnimations(el);
                el.style.willChange = 'transform';
                animate(el, { y: [0, -3], scale: [1, 1.01] }, { duration: 0.18, easing: [0.22, 1, 0.36, 1] });
            },
            { passive: true },
        );

        document.addEventListener(
            'pointerout',
            (event) => {
                if (shouldIgnore(event)) return;
                const el = getCard(event);
                if (!el) return;
                const related = event.relatedTarget;
                if (related && el.contains(related)) return;
                if (!lifted.has(el)) return;
                lifted.delete(el);
                cancelRunningAnimations(el);
                el.style.willChange = 'transform';
                animate(el, { y: [-3, 0], scale: [1.01, 1] }, { duration: 0.22, easing: [0.22, 1, 0.36, 1] })?.finished?.finally?.(() => {
                    el.style.willChange = '';
                });
            },
            { passive: true },
        );
    }

    function toggleBlock(element, options = {}) {
        if (!element) return false;
        if (!isMotionReady()) return false;

        const open = options.open === true;
        const className = options.className || 'is-open';
        const y = Number.isFinite(options.y) ? options.y : -10;
        const duration = Number.isFinite(options.duration) ? options.duration : 0.28;

        cancelRunningAnimations(element);

        if (open) {
            element.classList.add(className);
            element.style.opacity = '0';
            element.style.transform = `translateY(${y}px)`;
            element.style.willChange = 'transform, opacity';
            requestAnimationFrame(() => {
                animate(
                    element,
                    { opacity: [0, 1], y: [y, 0], filter: ['blur(6px)', 'blur(0px)'] },
                    { duration, easing: [0.22, 1, 0.36, 1] },
                )?.finished?.finally?.(() => {
                    element.style.opacity = '';
                    element.style.transform = '';
                    element.style.filter = '';
                    element.style.willChange = '';
                });
            });
            return true;
        }

        // Close: animate out, then remove class
        element.style.willChange = 'transform, opacity';
        animate(
            element,
            { opacity: [1, 0], y: [0, y], filter: ['blur(0px)', 'blur(6px)'] },
            { duration: Math.max(0.18, duration - 0.06), easing: [0.4, 0, 0.2, 1] },
        )?.finished?.finally?.(() => {
            element.classList.remove(className);
            element.style.opacity = '';
            element.style.transform = '';
            element.style.filter = '';
            element.style.willChange = '';
        });
        return true;
    }

    function bindTapFeedback() {
        if (!isMotionReady()) return;

        const isInteractive = (el) => {
            if (!el) return false;
            if (el.matches?.('button, a')) return true;
            if (el.classList?.contains?.('header__action-link')) return true;
            return false;
        };

        const getTarget = (event) => {
            const t = event?.target;
            const el = t?.closest?.('button, a, .header__action-link');
            if (!isInteractive(el)) return null;
            if (el.matches?.('[aria-disabled=\"true\"], [disabled]')) return null;
            return el;
        };

        document.addEventListener(
            'pointerdown',
            (event) => {
                const el = getTarget(event);
                if (!el) return;
                cancelRunningAnimations(el);
                el.style.willChange = 'transform';
                animate(el, { scale: [1, 0.98] }, { duration: 0.12, easing: [0.22, 1, 0.36, 1] })?.finished?.finally?.(() => {
                    el.style.willChange = '';
                });
            },
            { passive: true },
        );

        document.addEventListener(
            'pointerup',
            (event) => {
                const el = getTarget(event);
                if (!el) return;
                cancelRunningAnimations(el);
                el.style.willChange = 'transform';
                animate(el, { scale: [0.98, 1] }, { duration: 0.18, easing: [0.22, 1, 0.36, 1] })?.finished?.finally?.(() => {
                    el.style.willChange = '';
                });
            },
            { passive: true },
        );
    }

    function pageEnter() {
        if (!isMotionReady()) return;

        try {
            const headerLogo = document.querySelector('.header__logo');
            if (headerLogo) {
                animate(headerLogo, { opacity: [0, 1], y: [-10, 0], filter: ['blur(8px)', 'blur(0px)'] }, { duration: 0.42 });
            }

            const actionLinks = Array.from(document.querySelectorAll('.header__actions .header__action-link'));
            actionLinks.slice(0, 6).forEach((el, i) => {
                animate(el, { opacity: [0, 1], y: [-8, 0] }, { duration: 0.28, delay: i * 0.03 });
            });

            const title =
                document.querySelector('.hero__title') ||
                document.querySelector('.page-title') ||
                document.querySelector('main h1');
            if (title) {
                animate(title, { opacity: [0, 1], y: [12, 0], filter: ['blur(10px)', 'blur(0px)'] }, { duration: 0.46, delay: 0.04 });
            }
        } catch {
            // ignore
        }
    }

    function init() {
        markMotionActive();
        pageEnter();
        bindTapFeedback();
        bindHoverLift();
    }

    return { init, toggleBlock, toggleDisplay, pulse, shimmerOnce, staggerEnter, enhanceFadeInUp };
})();

// ==============================================
// Cross-Document View Transitions (MPA)
// - 目标：实现“共享元素变形飞入”的页面连续性（类似 LayoutId 效果）
// - 渐进增强：仅在支持 View Transition 且未开启 reduced-motion 时启用
// ==============================================
const ViewTransitions = (function() {
    const storageKey = 'vt:lastProductId';
    const names = {
        image: 'vt-product-image',
        title: 'vt-product-title',
        price: 'vt-product-price',
    };

    function canUse() {
        try {
            if (Utils.prefersReducedMotion()) return false;
            if (!globalThis.CSS || typeof globalThis.CSS.supports !== 'function') return false;
            return Boolean(globalThis.CSS.supports('view-transition-name', 'vt-test'));
        } catch {
            return false;
        }
    }

    function getUrl(href) {
        try {
            return new URL(href, window.location.href);
        } catch {
            return null;
        }
    }

    function parseProductIdFromUrl(url) {
        try {
            if (!url) return '';
            if (!/product-detail\.html$/i.test(url.pathname)) return '';
            return String(url.searchParams.get('id') || '').trim();
        } catch {
            return '';
        }
    }

    function setName(element, name) {
        if (!element) return;
        try {
            element.style.viewTransitionName = name;
        } catch {
            // ignore
        }
    }

    function clearName(element) {
        if (!element) return;
        try {
            element.style.viewTransitionName = '';
        } catch {
            // ignore
        }
    }

    function storeLastProductId(id) {
        const key = String(id || '').trim();
        if (!key) return;
        try {
            sessionStorage.setItem(storageKey, key);
        } catch {
            // ignore
        }
    }

    function peekLastProductId() {
        try {
            return String(sessionStorage.getItem(storageKey) || '').trim();
        } catch {
            return '';
        }
    }

    function clearLastProductId() {
        try {
            sessionStorage.removeItem(storageKey);
        } catch {
            // ignore
        }
    }

    function applyNamesToProductCard(card) {
        if (!card) return false;

        const img = card.querySelector('.product-card__image img') || null;
        const title = card.querySelector('.product-card__title a') || null;
        const price = card.querySelector('.product-card__price') || null;

        if (img) setName(img, names.image);
        if (title) setName(title, names.title);
        if (price) setName(price, names.price);

        return Boolean(img || title || price);
    }

    function prepareProductLinkForNavigation(anchor, productId) {
        if (!canUse()) return false;
        if (!anchor) return false;

        const card = anchor.closest?.('.product-card') || null;
        if (!card) return false;

        // 清理本卡片上可能残留的命名（例如重复点击）
        try {
            clearName(card.querySelector('.product-card__image img'));
            clearName(card.querySelector('.product-card__title a'));
            clearName(card.querySelector('.product-card__price'));
        } catch {
            // ignore
        }

        const ok = applyNamesToProductCard(card);
        if (ok) {
            storeLastProductId(productId);
            if (typeof Cinematic !== 'undefined') {
                Cinematic.pulse?.(card, { scale: 1.01, duration: 0.22 });
            }
        }
        return ok;
    }

    function bindLinkPreparation() {
        document.addEventListener(
            'click',
            (event) => {
                if (!event || event.defaultPrevented) return;
                if (event.button !== 0) return;
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

                const anchor = event.target?.closest?.('a[href]');
                if (!anchor) return;
                const target = (anchor.getAttribute('target') || '').trim();
                if (target && target !== '_self') return;
                if (anchor.hasAttribute('download')) return;

                const url = getUrl(anchor.getAttribute('href') || anchor.href);
                if (!url) return;
                if (url.origin !== window.location.origin) return;

                const productId = parseProductIdFromUrl(url);
                if (!productId) return;

                prepareProductLinkForNavigation(anchor, productId);
            },
            { capture: true },
        );
    }

    function restoreLastProductCard(root) {
        if (!canUse()) return false;
        const ref = String(document.referrer || '').trim();
        if (ref) {
            const refUrl = getUrl(ref);
            const fromPdp = Boolean(refUrl && refUrl.origin === window.location.origin && /product-detail\.html$/i.test(refUrl.pathname));
            if (!fromPdp) {
                clearLastProductId();
                return false;
            }
        }

        const id = peekLastProductId();
        if (!id) return false;

        const scope = root && root.querySelectorAll ? root : document;
        const safeId = (() => {
            try {
                if (globalThis.CSS && typeof globalThis.CSS.escape === 'function') return globalThis.CSS.escape(id);
            } catch {
                // ignore
            }
            return String(id).replace(/\"/g, '\\"');
        })();
        const card = scope.querySelector(`.product-card[data-product-id="${safeId}"]`);
        if (!card) return false;

        const ok = applyNamesToProductCard(card);
        if (ok && typeof Cinematic !== 'undefined') {
            Cinematic.pulse?.(card, { scale: 1.015, duration: 0.26 });
        }
        if (ok) clearLastProductId();
        return ok;
    }

    function applyPdpTargetNames() {
        if (!canUse()) return false;
        const pdp = document.querySelector('.pdp-main');
        if (!pdp) return false;

        const url = getUrl(window.location.href);
        const productId = parseProductIdFromUrl(url);
        if (!productId) return false;

        const stored = peekLastProductId();
        if (stored && stored !== productId) {
            clearLastProductId();
            return false;
        }
        if (!stored || stored !== productId) return false;

        const img = document.getElementById('main-product-image');
        const title = pdp.querySelector('.product-info-pdp__title');
        const price = pdp.querySelector('.product-info-pdp__price .price-value');

        if (img) setName(img, names.image);
        if (title) setName(title, names.title);
        if (price) setName(price, names.price);

        return Boolean(img || title || price);
    }

    // 让目标页在首帧就具备匹配的 view-transition-name（提升跨页命中率）
    applyPdpTargetNames();

    function init() {
        bindLinkPreparation();
    }

    return { init, restoreLastProductCard };
})();

// ==============================================
// Navigation Transitions (WAAPI Fallback)
// - 若浏览器不支持跨文档 View Transition，则对站内跳转提供“离场动画”
// - 避免干扰：支持 View Transition 时完全交给 CSS @view-transition
// ==============================================
const NavigationTransitions = (function() {
    let layer = null;
    let locked = false;

    function canUseNative() {
        try {
            if (!globalThis.CSS || typeof globalThis.CSS.supports !== 'function') return false;
            return Boolean(globalThis.CSS.supports('view-transition-name', 'vt-test'));
        } catch {
            return false;
        }
    }

    function canAnimate() {
        if (Utils.prefersReducedMotion()) return false;
        const motion = globalThis.Motion;
        if (motion && typeof motion.animate === 'function') return true;
        return typeof Element !== 'undefined' && typeof Element.prototype.animate === 'function';
    }

    function ensureLayer() {
        if (layer) return layer;
        layer = document.querySelector('.nav-transition-layer');
        if (layer) return layer;

        layer = document.createElement('div');
        layer.className = 'nav-transition-layer';
        layer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(layer);
        return layer;
    }

    function animate(el, keyframes, options) {
        const motion = globalThis.Motion;
        if (motion && typeof motion.animate === 'function') {
            return motion.animate(el, keyframes, options);
        }
        try {
            return el.animate(keyframes, options);
        } catch {
            return null;
        }
    }

    function playExit() {
        if (!canAnimate()) return Promise.resolve();
        const el = ensureLayer();
        if (!el) return Promise.resolve();

        try {
            el.getAnimations?.().forEach((a) => a.cancel());
        } catch {
            // ignore
        }

        el.style.opacity = '0';
        el.style.transform = 'translate3d(0, 0, 0) scale(1)';

        const anim = animate(
            el,
            { opacity: [0, 1], transform: ['translate3d(0, 8px, 0) scale(1)', 'translate3d(0, 0, 0) scale(1.02)'] },
            { duration: 0.32, easing: [0.22, 1, 0.36, 1], fill: 'both' },
        );
        if (anim && anim.finished) return anim.finished.catch(() => {});

        // Fallback: immediate
        el.style.opacity = '1';
        return Promise.resolve();
    }

    function getUrl(href) {
        try {
            return new URL(href, window.location.href);
        } catch {
            return null;
        }
    }

    function isSameDocumentNavigation(url) {
        try {
            if (!url) return false;
            const current = new URL(window.location.href);
            // 仅 hash 变化：交给浏览器默认行为
            return url.origin === current.origin && url.pathname === current.pathname && url.search === current.search;
        } catch {
            return false;
        }
    }

    function shouldHandleAnchor(anchor, event) {
        if (!anchor || !event) return false;
        if (event.defaultPrevented) return false;
        if (event.button !== 0) return false;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

        const target = String(anchor.getAttribute('target') || '').trim();
        if (target && target !== '_self') return false;
        if (anchor.hasAttribute('download')) return false;

        const href = anchor.getAttribute('href') || anchor.href;
        if (!href) return false;
        const url = getUrl(href);
        if (!url) return false;
        if (url.origin !== window.location.origin) return false;
        if (isSameDocumentNavigation(url) && url.hash) return false;
        return true;
    }

    function init() {
        // 支持 View Transition 的浏览器：使用 CSS @view-transition(navigation:auto)
        if (canUseNative()) return;
        if (!canAnimate()) return;

        document.addEventListener(
            'click',
            async (event) => {
                if (locked) return;
                const anchor = event.target?.closest?.('a[href]');
                if (!shouldHandleAnchor(anchor, event)) return;
                const url = getUrl(anchor.getAttribute('href') || anchor.href);
                if (!url) return;

                locked = true;
                event.preventDefault();
                try {
                    await playExit();
                } finally {
                    window.location.href = url.href;
                }
            },
            { capture: true },
        );
    }

    return { init };
})();

// ==============================================
// HTTP Client (Retry + Cache)
// - 为未来 API 对接准备：统一错误重试、超时、GET 缓存
// - 当前主要用于埋点上报 / 预取（可选）
// ==============================================
const Http = (function() {
    const memoryCache = new Map();

    function now() {
        return Date.now();
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function jitter(ms) {
        const n = Number(ms);
        if (!Number.isFinite(n) || n <= 0) return 0;
        return Math.round(n * (0.85 + Math.random() * 0.3));
    }

    function normalizeMethod(method) {
        return String(method || 'GET').trim().toUpperCase() || 'GET';
    }

    function normalizeUrl(url) {
        try {
            return new URL(String(url || ''), window.location.href).toString();
        } catch {
            return '';
        }
    }

    function cacheGet(key) {
        const entry = memoryCache.get(key);
        if (!entry) return null;
        if (!Number.isFinite(entry.expiresAt) || entry.expiresAt <= now()) {
            memoryCache.delete(key);
            return null;
        }
        return entry;
    }

    function cacheSet(key, value, ttlMs) {
        const ttl = Number(ttlMs);
        if (!Number.isFinite(ttl) || ttl <= 0) return false;
        memoryCache.set(key, { expiresAt: now() + ttl, ...value });
        return true;
    }

    function shouldRetryStatus(status) {
        const s = Number(status);
        if (!Number.isFinite(s)) return false;
        return s === 429 || (s >= 500 && s <= 599);
    }

    async function request(url, options = {}, config = {}) {
        const href = normalizeUrl(url);
        if (!href) return { ok: false, status: 0, error: 'invalid_url' };

        const opts = options && typeof options === 'object' ? options : {};
        const cfg = config && typeof config === 'object' ? config : {};

        const method = normalizeMethod(opts.method);
        const isGet = method === 'GET';

        const timeoutMs = Number.isFinite(Number(cfg.timeoutMs)) ? Number(cfg.timeoutMs) : 9000;
        const retries = Number.isFinite(Number(cfg.retries)) ? Math.max(0, Math.min(4, Number(cfg.retries))) : 2;
        const baseDelayMs = Number.isFinite(Number(cfg.baseDelayMs)) ? Math.max(60, Number(cfg.baseDelayMs)) : 260;
        const maxDelayMs = Number.isFinite(Number(cfg.maxDelayMs)) ? Math.max(baseDelayMs, Number(cfg.maxDelayMs)) : 2000;
        const cacheTtlMs = isGet && Number.isFinite(Number(cfg.cacheTtlMs)) ? Math.max(0, Number(cfg.cacheTtlMs)) : 0;
        const cacheKey = isGet ? String(cfg.cacheKey || `${method}:${href}`) : '';

        if (isGet && cacheTtlMs > 0) {
            const cached = cacheGet(cacheKey);
            if (cached) {
                return {
                    ok: true,
                    status: 200,
                    cached: true,
                    url: href,
                    headers: cached.headers || {},
                    text: cached.text || '',
                };
            }
        }

        for (let attempt = 0; attempt <= retries; attempt += 1) {
            const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
            const timer = timeoutMs > 0
                ? setTimeout(() => {
                    try { controller?.abort?.(); } catch { /* ignore */ }
                }, timeoutMs)
                : null;

            try {
                const res = await fetch(href, { ...opts, method, signal: controller?.signal });
                const status = res?.status || 0;

                const headers = {};
                try {
                    res?.headers?.forEach?.((value, key) => {
                        headers[String(key || '').toLowerCase()] = String(value ?? '');
                    });
                } catch {
                    // ignore
                }

                const text = await res.text();
                const ok = Boolean(res && res.ok);

                if (ok) {
                    if (isGet && cacheTtlMs > 0) {
                        cacheSet(cacheKey, { text, headers }, cacheTtlMs);
                    }
                    return { ok: true, status, url: href, headers, text };
                }

                const retryable = shouldRetryStatus(status);
                if (!retryable || attempt >= retries) {
                    return { ok: false, status, url: href, headers, text };
                }
            } catch (error) {
                if (attempt >= retries) {
                    return { ok: false, status: 0, url: href, error: String(error?.message || error || 'network_error') };
                }
            } finally {
                if (timer) clearTimeout(timer);
            }

            const backoff = Math.min(maxDelayMs, baseDelayMs * (2 ** attempt));
            await sleep(jitter(backoff));
        }

        return { ok: false, status: 0, url: href, error: 'unknown' };
    }

    async function getJSON(url, options = {}, config = {}) {
        const res = await request(url, { ...options, method: 'GET' }, config);
        if (!res.ok) return { ...res, data: null };
        try {
            const data = JSON.parse(res.text || 'null');
            return { ...res, data };
        } catch {
            return { ...res, ok: false, error: 'invalid_json', data: null };
        }
    }

    async function postJSON(url, body, options = {}, config = {}) {
        const headers = { ...(options.headers || {}) };
        if (!headers['Content-Type'] && !headers['content-type']) {
            headers['Content-Type'] = 'application/json; charset=utf-8';
        }
        const payload = JSON.stringify(body ?? {});
        return request(
            url,
            { ...options, method: 'POST', headers, body: payload },
            config,
        );
    }

    return { request, getJSON, postJSON };
})();

// ==============================================
// Prefetch Engine (Search Prefetch / Hover Prefetch)
// - 基于 <link rel="prefetch/preload">，无依赖
// - 自动避开 save-data/弱网场景，避免占用带宽
// ==============================================
const Prefetch = (function() {
    const seen = new Set();
    const maxLinks = 48;

    function canPrefetch() {
        try {
            const conn = navigator?.connection;
            const saveData = Boolean(conn?.saveData);
            const effectiveType = String(conn?.effectiveType || '').toLowerCase();
            if (saveData) return false;
            if (effectiveType === '2g' || effectiveType === 'slow-2g') return false;
        } catch {
            // ignore
        }
        return true;
    }

    function schedule(task) {
        const fn = typeof task === 'function' ? task : null;
        if (!fn) return;
        try {
            if (typeof Perf !== 'undefined' && Perf && typeof Perf.idle === 'function') {
                Perf.idle(() => fn(), { timeout: 1200 });
                return;
            }
        } catch {
            // ignore
        }
        try {
            if (typeof requestIdleCallback === 'function') {
                requestIdleCallback(() => fn(), { timeout: 1200 });
                return;
            }
        } catch {
            // ignore
        }
        setTimeout(() => fn(), 120);
    }

    function injectLink({ rel, href, as } = {}) {
        const safeRel = String(rel || '').trim();
        const safeHref = String(href || '').trim();
        if (!safeRel || !safeHref) return false;
        if (seen.size >= maxLinks) return false;

        const key = `${safeRel}:${safeHref}:${String(as || '')}`;
        if (seen.has(key)) return false;
        seen.add(key);

        try {
            const link = document.createElement('link');
            link.rel = safeRel;
            link.href = safeHref;
            if (as) link.as = String(as);
            document.head.appendChild(link);
            return true;
        } catch {
            return false;
        }
    }

    function prefetchUrl(href, options = {}) {
        if (!canPrefetch()) return;
        const opts = options && typeof options === 'object' ? options : {};
        const rel = opts.rel || 'prefetch';
        const as = opts.as;
        const url = (() => {
            try { return new URL(String(href || ''), window.location.href).toString(); } catch { return ''; }
        })();
        if (!url) return;

        schedule(() => injectLink({ rel, href: url, as }));
    }

    function prefetchProduct(product) {
        const id = String(product?.id || product || '').trim();
        if (!id) return;
        prefetchUrl(`product-detail.html?id=${encodeURIComponent(id)}`, { rel: 'prefetch' });

        const image = product?.images && product.images[0] ? String(product.images[0].thumb || product.images[0].large || '').trim() : '';
        if (image) {
            prefetchUrl(image, { rel: 'preload', as: 'image' });
        }
    }

    function prefetchSearch(query) {
        const q = String(query || '').trim();
        if (!q) return;
        prefetchUrl(`products.html?query=${encodeURIComponent(q)}`, { rel: 'prefetch' });
    }

    return { prefetchUrl, prefetchProduct, prefetchSearch };
})();

// ==============================================
// Telemetry (User Behavior Tracking)
// - 默认仅本地队列，不上传（可配置 endpoint 后自动上报）
// - 避免 PII：对用户输入做 hash + 长度统计，不存原文
// ==============================================
const Telemetry = createTelemetry({ Utils, Http });

// ==============================================
// Perf Vitals (Performance Telemetry)
// ==============================================
const PerfVitals = createPerfVitals({ Logger, Telemetry, Utils });

// ==============================================
// Header Module
// ==============================================
const Header = (function() {
    const headerElement = document.querySelector('.header');
    const navigation = headerElement?.querySelector('.header__navigation');
    const menuToggle = headerElement?.querySelector('.header__menu-toggle');
    const dropdownItems = headerElement?.querySelectorAll('.header__nav-item--dropdown');
    const searchToggle = headerElement?.querySelector('.header__action-link[aria-label="搜索"]');
    const searchBar = headerElement?.querySelector('.header__search-bar');
    const searchContainer = searchBar?.querySelector('.container');
    const searchInput = searchBar?.querySelector('.header__search-input');
    const searchClearBtn = searchBar?.querySelector('.header__search-clear');
    const searchForm = searchBar?.querySelector('form');
    const searchSubmitBtn = searchBar?.querySelector('.header__search-submit');
    const navLinks = headerElement?.querySelectorAll('.header__nav-link:not(.header__dropdown-toggle)'); // Exclude dropdown toggle itself
    const dropdownLinks = headerElement?.querySelectorAll('.header__dropdown-item a');
    const allNavLinks = Array.from(navLinks || []).concat(Array.from(dropdownLinks || []));

    const scrollThreshold = 50;
    let searchSuggestionsBox = null;
    let activeSuggestionIndex = -1;

    function getBreakpointMd() {
        try {
            const raw = getComputedStyle(document.documentElement).getPropertyValue('--breakpoint-md') || '768px';
            const v = raw.trim();
            return v || '768px';
        } catch {
            return '768px';
        }
    }

    function isDesktopNav() {
        return window.matchMedia(`(min-width: ${getBreakpointMd()})`).matches;
    }

    function isMobileNav() {
        return window.matchMedia(`(max-width: ${getBreakpointMd()})`).matches;
    }

    function handleScroll() {
        if (!headerElement) return;
        if (window.scrollY > scrollThreshold) {
            headerElement.classList.add('header--scrolled');
        } else {
            headerElement.classList.remove('header--scrolled');
        }
    }

    function toggleMobileMenu() {
        if (!navigation || !menuToggle) return;
        const nextOpen = !navigation.classList.contains('is-open');
        if (nextOpen) {
            const animated = typeof Cinematic !== 'undefined' && Cinematic.toggleBlock
                ? Cinematic.toggleBlock(navigation, { open: true, className: 'is-open', y: -12 })
                : false;
            if (!animated) navigation.classList.add('is-open');
        } else {
            const animated = typeof Cinematic !== 'undefined' && Cinematic.toggleBlock
                ? Cinematic.toggleBlock(navigation, { open: false, className: 'is-open', y: -12 })
                : false;
            if (!animated) navigation.classList.remove('is-open');
        }
        menuToggle.setAttribute('aria-expanded', nextOpen);
        // Toggle icon (example)
        // menuToggle.innerHTML = isOpen ? '&times;' : '&#9776;';
    }

    function closeMobileMenu() {
        if (!navigation || !menuToggle || !navigation.classList.contains('is-open')) return;
        const animated = typeof Cinematic !== 'undefined' && Cinematic.toggleBlock
            ? Cinematic.toggleBlock(navigation, { open: false, className: 'is-open', y: -12 })
            : false;
        if (!animated) navigation.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        // menuToggle.innerHTML = '&#9776;';
    }

    function closeSearch() {
        if (!searchBar || !searchToggle) return;
        if (!searchBar.classList.contains('is-open')) return;
        const animated = typeof Cinematic !== 'undefined' && Cinematic.toggleBlock
            ? Cinematic.toggleBlock(searchBar, { open: false, className: 'is-open', y: -10 })
            : false;
        if (!animated) searchBar.classList.remove('is-open');
        searchToggle.setAttribute('aria-expanded', 'false');
        searchBar.setAttribute('aria-hidden', 'true');
        clearSearchSuggestions();
    }

    function toggleSearch() {
        if (!searchBar || !searchInput || !searchToggle) return;
        const nextOpen = !searchBar.classList.contains('is-open');
        if (nextOpen) {
            const animated = typeof Cinematic !== 'undefined' && Cinematic.toggleBlock
                ? Cinematic.toggleBlock(searchBar, { open: true, className: 'is-open', y: -10 })
                : false;
            if (!animated) searchBar.classList.add('is-open');
        } else {
            const animated = typeof Cinematic !== 'undefined' && Cinematic.toggleBlock
                ? Cinematic.toggleBlock(searchBar, { open: false, className: 'is-open', y: -10 })
                : false;
            if (!animated) searchBar.classList.remove('is-open');
        }

        searchToggle.setAttribute('aria-expanded', nextOpen);
        searchBar.setAttribute('aria-hidden', nextOpen ? 'false' : 'true');
        if (nextOpen) {
            closeMobileMenu();
            closeAllDropdowns();
            searchInput.focus();
            updateSearchClearButton();
            // Optional: Change search icon to close icon
        } else {
            clearSearchSuggestions();
            // Optional: Change close icon back to search icon
        }
    }

    function handleSearchSubmit(event) {
        event.preventDefault(); // Prevent default form submission
        const searchTerm = searchInput?.value.trim();
        if (searchTerm) {
            try {
                if (typeof Telemetry !== 'undefined' && Telemetry.track && Telemetry.hashQuery) {
                    const h = Telemetry.hashQuery(searchTerm);
                    Telemetry.track('search_submit', { ...h }, { flush: true });
                }
            } catch {
                // ignore
            }

            try {
                if (typeof Prefetch !== 'undefined' && Prefetch.prefetchSearch) {
                    Prefetch.prefetchSearch(searchTerm);
                }
            } catch {
                // ignore
            }

            // Redirect to products page with search query
            window.location.href = `products.html?query=${encodeURIComponent(searchTerm)}`;
        } else {
            // Optional: Add feedback if search term is empty
            searchInput?.focus();
        }
        // Close the search bar after submission (optional)
        // if (searchBar?.classList.contains('is-open')) {
        //     toggleSearch();
        // }
    }

    function updateSearchClearButton() {
        if (!searchClearBtn || !searchInput) return;
        const hasValue = searchInput.value.trim().length > 0;
        searchClearBtn.classList.toggle('is-visible', hasValue);
        searchClearBtn.setAttribute('aria-hidden', hasValue ? 'false' : 'true');
    }

    function ensureSearchSuggestions() {
        if (!searchContainer) return null;
        if (searchSuggestionsBox) return searchSuggestionsBox;
        searchSuggestionsBox = searchContainer.querySelector('.header__search-suggestions');
        if (!searchSuggestionsBox) {
            searchSuggestionsBox = document.createElement('div');
            searchSuggestionsBox.className = 'header__search-suggestions';
            searchSuggestionsBox.id = 'header-search-suggestions';
            searchSuggestionsBox.setAttribute('role', 'listbox');
            searchSuggestionsBox.setAttribute('aria-label', '搜索建议');
            searchContainer.appendChild(searchSuggestionsBox);
        }
        return searchSuggestionsBox;
    }

    function clearSearchSuggestions() {
        const box = ensureSearchSuggestions();
        if (!box) return;
        box.innerHTML = '';
        box.classList.remove('is-visible');
        activeSuggestionIndex = -1;
        if (searchInput) searchInput.setAttribute('aria-expanded', 'false');
        if (searchInput) searchInput.removeAttribute('aria-activedescendant');
        updateSearchClearButton();
    }

    function getSearchSuggestions(query) {
        const q = String(query || '').trim().toLowerCase();
        if (!q) return [];
        if (typeof SharedData === 'undefined' || !SharedData.getAllProducts) return [];
        const all = SharedData.getAllProducts() || [];
        return all
            .filter((item) => {
                const name = String(item?.name || '').toLowerCase();
                const series = String(item?.series || '').toLowerCase();
                return name.includes(q) || series.includes(q);
            })
            .slice(0, 6);
    }

    function setActiveSuggestion(index) {
        const box = ensureSearchSuggestions();
        if (!box) return;
        const items = Array.from(box.querySelectorAll('.header__search-suggestion'));
        if (items.length === 0) return;
        const clamped = Math.max(0, Math.min(index, items.length - 1));
        items.forEach((el, i) => {
            const isActive = i === clamped;
            el.classList.toggle('is-active', isActive);
            el.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        activeSuggestionIndex = clamped;
        const activeId = items[clamped]?.id;
        if (searchInput && activeId) {
            searchInput.setAttribute('aria-activedescendant', activeId);
        }
    }

    function buildHighlightedText(text, query) {
        const fragment = document.createDocumentFragment();
        const raw = String(text || '');
        const q = String(query || '').trim();
        if (!q) {
            fragment.appendChild(document.createTextNode(raw));
            return fragment;
        }
        const lower = raw.toLowerCase();
        const lowerQ = q.toLowerCase();
        const idx = lower.indexOf(lowerQ);
        if (idx === -1) {
            fragment.appendChild(document.createTextNode(raw));
            return fragment;
        }
        const before = raw.slice(0, idx);
        const match = raw.slice(idx, idx + q.length);
        const after = raw.slice(idx + q.length);
        if (before) fragment.appendChild(document.createTextNode(before));
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = match;
        fragment.appendChild(mark);
        if (after) fragment.appendChild(document.createTextNode(after));
        return fragment;
    }

    function renderSearchSuggestions(suggestions) {
        const box = ensureSearchSuggestions();
        if (!box) return;
        box.innerHTML = '';
        if (searchInput) searchInput.removeAttribute('aria-activedescendant');

        if (!suggestions || suggestions.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'search-suggestions__empty';
            empty.textContent = '暂无匹配的手办';
            box.appendChild(empty);
            box.classList.add('is-visible');
            if (searchInput) searchInput.setAttribute('aria-expanded', 'true');
            activeSuggestionIndex = -1;
            return;
        }

        // 实时搜索预提取：预取搜索页 + Top 建议详情页/首图（弱网/save-data 自动跳过）
        try {
            const q = searchInput?.value || '';
            Prefetch?.prefetchSearch?.(q);
            suggestions.slice(0, 2).forEach((item) => Prefetch?.prefetchProduct?.(item));
        } catch {
            // ignore
        }

        suggestions.forEach((item, index) => {
            const link = document.createElement('a');
            link.className = 'header__search-suggestion';
            link.setAttribute('role', 'option');
            link.setAttribute('aria-selected', 'false');
            link.id = `search-suggestion-${index + 1}`;
            link.dataset.index = String(index);

            const id = String(item?.id || '').trim();
            link.href = id ? `product-detail.html?id=${encodeURIComponent(id)}` : 'products.html';

            const textWrap = document.createElement('div');
            textWrap.className = 'header__search-suggestion-text';

            const name = document.createElement('span');
            const query = searchInput?.value || '';
            name.appendChild(buildHighlightedText(String(item?.name || '未命名手办'), query));
            textWrap.appendChild(name);

            const series = String(item?.series || '').trim();
            const category = String(item?.category?.name || '').trim();
            if (series || category) {
                const seriesEl = document.createElement('small');
                const line = series || category;
                seriesEl.appendChild(buildHighlightedText(line, query));
                textWrap.appendChild(seriesEl);
            }

            const price = document.createElement('span');
            price.textContent =
                typeof item?.price === 'number' ? `￥${item.price.toFixed(2)}` : '价格待定';

            link.appendChild(textWrap);
            link.appendChild(price);
            link.addEventListener('click', () => {
                try {
                    const q = searchInput?.value || '';
                    const h = Telemetry?.hashQuery?.(q) || { qLen: 0, qHash: 0 };
                    const pid = String(item?.id || '').trim();
                    Telemetry?.track?.('search_suggestion_click', { ...h, productId: pid, index: index + 1 }, { flush: true });
                } catch {
                    // ignore
                }
                clearSearchSuggestions();
            });
            link.addEventListener('mouseenter', () => {
                try { Prefetch?.prefetchProduct?.(item); } catch { /* ignore */ }
            });

            box.appendChild(link);
        });

        const hint = document.createElement('div');
        hint.className = 'search-suggestions__hint';
        hint.textContent = '↑↓ 选择，回车进入详情';
        box.appendChild(hint);

        box.classList.add('is-visible');
        if (searchInput) searchInput.setAttribute('aria-expanded', 'true');
        activeSuggestionIndex = -1;
        updateSearchClearButton();
    }

    function handleSearchInput() {
        const value = searchInput?.value || '';
        const suggestions = getSearchSuggestions(value);
        if (!value.trim()) {
            clearSearchSuggestions();
            return;
        }
        renderSearchSuggestions(suggestions);
    }

    function handleSearchKeydown(event) {
        const box = ensureSearchSuggestions();
        if (!box || !box.classList.contains('is-visible')) return;
        const items = Array.from(box.querySelectorAll('.header__search-suggestion'));
        if (items.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            const next = activeSuggestionIndex + 1 >= items.length ? 0 : activeSuggestionIndex + 1;
            setActiveSuggestion(next);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            const next = activeSuggestionIndex - 1 < 0 ? items.length - 1 : activeSuggestionIndex - 1;
            setActiveSuggestion(next);
        } else if (event.key === 'Enter') {
            if (activeSuggestionIndex >= 0) {
                event.preventDefault();
                items[activeSuggestionIndex].click();
            }
        } else if (event.key === 'Escape') {
            if (searchInput && searchInput.value) {
                searchInput.value = '';
            }
            clearSearchSuggestions();
        }
    }

    function handleDropdown(dropdownItem, show) {
        const menu = dropdownItem.querySelector('.header__dropdown-menu');
        const toggle = dropdownItem.querySelector('.header__dropdown-toggle');
        if (menu) {
            if (show) {
                dropdownItem.classList.add('is-open');
                toggle?.setAttribute('aria-expanded', 'true');
                menu.setAttribute('aria-hidden', 'false');
                menu.style.display = 'block'; // Necessary for transition
                // Force reflow for transition
                void menu.offsetWidth;
                menu.style.opacity = '1';
                menu.style.visibility = 'visible';
                menu.style.transform = 'translateY(0)';
            } else {
                dropdownItem.classList.remove('is-open');
                toggle?.setAttribute('aria-expanded', 'false');
                menu.setAttribute('aria-hidden', 'true');
                menu.style.opacity = '0';
                menu.style.visibility = 'hidden';
                menu.style.transform = 'translateY(10px)';
                 // Reset display after transition (optional but good practice)
                 // setTimeout(() => { if (!dropdownItem.classList.contains('is-open')) menu.style.display = 'none'; }, 300); // Match transition duration
            }
        }
    }

    function closeAllDropdowns() {
        if (!dropdownItems || dropdownItems.length === 0) return;
        dropdownItems.forEach((item) => handleDropdown(item, false));
    }

    function handleGlobalKeydown(event) {
        if (!event || event.key !== 'Escape') return;

        const shouldCloseSearch = Boolean(searchBar?.classList.contains('is-open'));
        const shouldCloseMenu = Boolean(navigation?.classList.contains('is-open'));
        const shouldCloseDropdowns =
            Boolean(dropdownItems && Array.from(dropdownItems).some((item) => item.classList.contains('is-open')));

        if (!shouldCloseSearch && !shouldCloseMenu && !shouldCloseDropdowns) return;

        // 统一拦截一次默认行为，避免在某些浏览器里触发“退出全屏”等副作用
        event.preventDefault();

        if (shouldCloseSearch) {
            closeSearch();
            searchToggle?.focus();
        }

        if (shouldCloseDropdowns) closeAllDropdowns();

        if (shouldCloseMenu) {
            closeMobileMenu();
            menuToggle?.focus();
        }
    }

    function setActiveLink() {
        const currentUrl = new URL(window.location.href);
        const currentPage = Utils.getPageNameFromPath(currentUrl.pathname);
        const currentSearch = currentUrl.search || '';
        const currentHash = currentUrl.hash || '';

        // 先清理状态
        headerElement?.querySelectorAll('a[aria-current]').forEach((a) => a.removeAttribute('aria-current'));
        allNavLinks.forEach(link => {
            link.classList.remove('header__nav-link--active');
            link.closest('.header__nav-item--dropdown')?.classList.remove('header__nav-link--active');
        });

        const cartLink = headerElement?.querySelector('.header__action-link[href="cart.html"]');
        cartLink?.classList.remove('header__action-link--active');

        const favLink = headerElement?.querySelector('.header__action-link[href="favorites.html"]');
        favLink?.classList.remove('header__action-link--active');

        // 评分选择最佳匹配（兼容 http(s) 与 file://）
        let bestMatch = null;
        let bestScore = -1;

        allNavLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href === '#') return;

            let linkUrl;
            try {
                linkUrl = new URL(href, currentUrl);
            } catch {
                return;
            }

            const linkPage = Utils.getPageNameFromPath(linkUrl.pathname);
            if (linkPage !== currentPage) return;

            const linkSearch = linkUrl.search || '';
            const linkHash = linkUrl.hash || '';

            let score = 10; // page match
            if (linkSearch && linkSearch === currentSearch) score += 20;
            if (linkHash && linkHash === currentHash) score += 15;
            if (!linkSearch && !currentSearch) score += 5;
            if (!linkHash && !currentHash) score += 5;

            if (score > bestScore) {
                bestScore = score;
                bestMatch = link;
            }
        });

        // 分类相关页面：优先高亮“手办分类”入口
        if (['category.html', 'products.html', 'product-detail.html'].includes(currentPage)) {
            const dropdownToggle = headerElement?.querySelector('.header__dropdown-toggle[href="products.html"]');
            if (dropdownToggle) bestMatch = dropdownToggle;
        }

        if (bestMatch) {
            bestMatch.classList.add('header__nav-link--active');
            bestMatch.closest('.header__nav-item--dropdown')?.classList.add('header__nav-link--active');
            bestMatch.setAttribute('aria-current', 'page');
        }

        // 购物车页：高亮购物车图标
        if (currentPage === 'cart.html' && cartLink) {
            cartLink.classList.add('header__action-link--active');
            cartLink.setAttribute('aria-current', 'page');
        }

        // 收藏页：高亮收藏图标
        if (currentPage === 'favorites.html' && favLink) {
            favLink.classList.add('header__action-link--active');
            favLink.setAttribute('aria-current', 'page');
        }
    }

    function addEventListeners() {
        if (menuToggle) {
            menuToggle.addEventListener('click', toggleMobileMenu);
        }

        if (searchToggle) {
            searchToggle.addEventListener('click', toggleSearch);
        }

        // Close mobile menu when clicking a nav link
        navigation?.querySelectorAll('.header__nav-link:not(.header__dropdown-toggle), .header__dropdown-item a').forEach(link => {
             link.addEventListener('click', closeMobileMenu);
        });

        // Close menus if clicking outside
        document.addEventListener('click', (event) => {
            if (!headerElement) return;
            const isClickInsideHeader = headerElement.contains(event.target);
            const isClickInsideSearch = searchBar?.contains(event.target);

            if (!isClickInsideSearch) {
                clearSearchSuggestions();
            }

            if (!isClickInsideHeader) {
                closeMobileMenu();
                closeSearch();
                closeAllDropdowns();
            }
        });

        // Keyboard: ESC closes search/menu/dropdowns (可访问性增强)
        document.addEventListener('keydown', handleGlobalKeydown);

        // Dropdown handling (Desktop hover, Mobile click can be added)
         dropdownItems.forEach((item, index) => {
             const toggle = item.querySelector('.header__dropdown-toggle');
             const menu = item.querySelector('.header__dropdown-menu');
             if (toggle) {
                 toggle.setAttribute('aria-haspopup', 'true');
                 toggle.setAttribute('aria-expanded', item.classList.contains('is-open') ? 'true' : 'false');
                 if (menu) {
                     // Ensure deterministic id for aria-controls (stable across reloads)
                     if (!menu.id) menu.id = `header-dropdown-${index + 1}`;
                     toggle.setAttribute('aria-controls', menu.id);
                     menu.setAttribute('aria-hidden', item.classList.contains('is-open') ? 'false' : 'true');
                 }

                 // Keyboard: allow opening submenu without sacrificing "Enter to navigate"
                 toggle.addEventListener('keydown', (e) => {
                     if (!e) return;
                     if (e.key === 'ArrowDown' || e.key === ' ') {
                         e.preventDefault();
                         const currentlyOpen = item.classList.contains('is-open');
                         dropdownItems.forEach(otherItem => {
                             if (otherItem !== item) handleDropdown(otherItem, false);
                         });
                         handleDropdown(item, !currentlyOpen);
                         const firstLink = item.querySelector('.header__dropdown-menu a');
                         if (!currentlyOpen) firstLink?.focus?.();
                     }
                 });
             }

             // Desktop hover
             if (isDesktopNav()) {
                item.addEventListener('mouseenter', () => handleDropdown(item, true));
                item.addEventListener('mouseleave', () => handleDropdown(item, false));
             }
             // Mobile Click (Toggle)
             if (toggle) {
                 toggle.addEventListener('click', (e) => {
                     // Prevent default link behavior only if menu needs toggling on mobile
                     if (isMobileNav()) {
                          e.preventDefault();
                          const currentlyOpen = item.classList.contains('is-open');
                          // Close other open dropdowns first
                          dropdownItems.forEach(otherItem => {
                              if (otherItem !== item) handleDropdown(otherItem, false);
                          });
                          // Toggle current dropdown
                          handleDropdown(item, !currentlyOpen);
                     }
                 });
             }
        });

        // Throttle scroll event listener
        window.addEventListener('scroll', Utils.throttle(handleScroll, 100), { passive: true });

        // Add listener for search form submission
        if (searchForm) { // Check if the form element exists
            searchForm.addEventListener('submit', handleSearchSubmit);
        } else if (searchSubmitBtn) {
             // Fallback: If no form, listen to button click
             searchSubmitBtn.addEventListener('click', handleSearchSubmit);
        }

        // Optional: Allow Enter key in search input to trigger submit
         if (searchInput) {
             const debouncedSuggest = Utils.debounce(handleSearchInput, 160);
             searchInput.addEventListener('input', debouncedSuggest);
             searchInput.addEventListener('focus', handleSearchInput);
             searchInput.addEventListener('keydown', handleSearchKeydown);
             searchInput.addEventListener('keypress', (event) => {
                 if (event.key === 'Enter' && activeSuggestionIndex < 0) {
                     handleSearchSubmit(event);
                 }
             });
         }

        if (searchClearBtn && searchInput) {
            searchClearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearSearchSuggestions();
                searchInput.focus();
                updateSearchClearButton();
            });
        }
    }

    function init() {
        if (!headerElement) return;
        if (searchBar) {
            if (!searchBar.id) searchBar.id = 'header-search-bar';
            searchBar.setAttribute('aria-hidden', searchBar.classList.contains('is-open') ? 'false' : 'true');
            searchToggle?.setAttribute('aria-controls', searchBar.id);
        }
        if (searchClearBtn) {
            searchClearBtn.setAttribute('aria-hidden', 'true');
        }
        const suggestionBox = ensureSearchSuggestions();
        if (searchInput && suggestionBox) {
            if (!suggestionBox.id) suggestionBox.id = 'header-search-suggestions';
            searchInput.setAttribute('aria-controls', suggestionBox.id);
            searchInput.setAttribute('aria-autocomplete', 'list');
            searchInput.setAttribute('aria-expanded', 'false');
            searchInput.setAttribute('role', 'combobox');
            searchInput.setAttribute('aria-haspopup', 'listbox');
        }
        handleScroll(); // Initial check
        setActiveLink(); // Set active link on load
        addEventListeners();
    }

    return {
         init: init,
         updateCartCount: function(count) { // Expose function to update cart count
              const cartCountElement = headerElement?.querySelector('.header__cart-count');
              if (cartCountElement) {
                  const safeCount = Number(count) || 0;
                  cartCountElement.style.display = safeCount > 0 ? 'inline-block' : 'none';
                  if (safeCount > 0) {
                      UXMotion.tweenNumber(cartCountElement, safeCount, {
                          duration: 260,
                          formatter: (n) => String(Math.max(0, Math.round(n))),
                      });
                  } else {
                      cartCountElement.textContent = '0';
                      cartCountElement.dataset.tweenValue = '0';
                  }
                  cartCountElement.setAttribute('aria-live', 'polite');
                  cartCountElement.setAttribute('aria-label', `购物车商品数量：${safeCount}`);
              }
          }
     };
})();

// ==============================================
// Smooth Scrolling Module
// ==============================================
const SmoothScroll = (function() {
    function init() {
        const currentUrl = new URL(window.location.href);
        const currentPage = Utils.getPageNameFromPath(currentUrl.pathname);

        // 兼容：
        // - href="#about"
        // - href="index.html#about"
        document.querySelectorAll('a[href*="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (!href || href === '#') return;

                let linkUrl;
                try {
                    linkUrl = new URL(href, currentUrl);
                } catch {
                    return;
                }

                const linkPage = Utils.getPageNameFromPath(linkUrl.pathname);
                if (linkPage !== currentPage) return;

                const hash = linkUrl.hash;
                if (!hash || hash.length < 2) return;

                try {
                    const targetElement = document.querySelector(hash);
                    if (!targetElement) return;
                    e.preventDefault();
                    const headerOffset = document.querySelector('.header')?.offsetHeight || 0;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset - 10; // 10px buffer
                    window.scrollTo({ top: offsetPosition, behavior: Utils.prefersReducedMotion() ? 'auto' : 'smooth' });
                } catch (error) {
                    console.warn(`SmoothScroll: selector failed: ${hash}`, error);
                }
            });
        });
    }

    return { init: init };
})();

// ==============================================
// Scroll Progress Indicator
// ==============================================
const ScrollProgress = (function() {
    const bar = document.querySelector('.scroll-progress');

    function update() {
        if (!bar) return;
        const doc = document.documentElement;
        const max = Math.max(0, doc.scrollHeight - window.innerHeight);
        const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
        bar.style.width = `${Math.min(100, Math.max(0, progress)).toFixed(2)}%`;
    }

    function init() {
        if (!bar) return;
        update();
        window.addEventListener('scroll', Utils.throttle(update, 50), { passive: true });
        window.addEventListener('resize', Utils.throttle(update, 100));
    }

    return { init };
})();

// ==============================================
// Back To Top (Injected Button)
// ==============================================
const BackToTop = (function() {
    let button = null;

    function ensureButton() {
        if (button) return button;
        if (!document.body) return null;

        button = document.createElement('button');
        button.type = 'button';
        button.className = 'back-to-top';
        button.setAttribute('aria-label', '返回顶部');
        button.innerHTML = Icons.svgHtml('icon-arrow-up');
        document.body.appendChild(button);
        return button;
    }

    function updateVisibility() {
        const el = ensureButton();
        if (!el) return;
        const visible = window.scrollY > 520;
        el.classList.toggle('is-visible', visible);
    }

    function scrollToTop() {
        try {
            window.scrollTo({ top: 0, behavior: Utils.prefersReducedMotion() ? 'auto' : 'smooth' });
        } catch {
            window.scrollTo(0, 0);
        }
    }

    function init() {
        const el = ensureButton();
        if (!el) return;

        updateVisibility();
        window.addEventListener('scroll', Utils.throttle(updateVisibility, 120), { passive: true });
        el.addEventListener('click', scrollToTop);
    }

    return { init };
})();

// ==============================================
// Intersection Observer Animations Module
// ==============================================
const ScrollAnimations = (function() {
    function init(root, options) {
        const scope = root && root.querySelectorAll ? root : document;
        const animatedElements = scope.querySelectorAll('.fade-in-up:not(.is-visible)');
        if (!animatedElements.length) return;

        const opts = options && typeof options === 'object' ? options : {};
        const y = Number.isFinite(opts.y) ? opts.y : 18;
        const blur = Number.isFinite(opts.blur) ? opts.blur : 14;
        const duration = Number.isFinite(opts.duration) ? opts.duration : 0.44;
        const stagger = Number.isFinite(opts.stagger) ? opts.stagger : 0.032;
        const maxStaggerItems = Number.isFinite(opts.maxStaggerItems) ? opts.maxStaggerItems : 14;

        // 可访问性：减少动态效果时直接显示（避免眩晕/不适）
        if (Utils.prefersReducedMotion()) {
            animatedElements.forEach((element) => {
                element.style.transitionDelay = '0ms';
                element.classList.add('is-visible');
            });
            return;
        }

        // Cinematic 增强：用 Motion 取代 CSS transition（更顺滑，blur 更自然）
        if (typeof Cinematic !== 'undefined' && Cinematic.enhanceFadeInUp) {
            const ok = Cinematic.enhanceFadeInUp(scope, { y, blur, duration, stagger, maxStaggerItems });
            if (ok) return;
        }

        if (animatedElements.length > 0 && "IntersectionObserver" in window) {
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1 // Trigger when 10% visible
            });

            animatedElements.forEach((element, index) => {
                // Basic staggered delay, capped to avoid excessive delays on long lists
                const delay = Math.min(index, 10) * 50;
                element.style.transitionDelay = `${delay}ms`;
                observer.observe(element);
            });
        } else {
            // Fallback for older browsers or no elements
            animatedElements.forEach(element => element.classList.add('is-visible'));
        }
    }

    return { init: init };
})();

// ==============================================
// Lazy Loading Module
// ==============================================
const LazyLoad = (function() {
    const fallbackSrc = 'assets/images/placeholder-lowquality.svg';
    let observer = null;

    function loadImage(img) {
        if (!img || img.tagName !== 'IMG') return;
        if (img.dataset && img.dataset.lazyLoaded === '1') return;
        if (!img.dataset || !img.dataset.src) return;

        const nextSrc = img.dataset.src;
        try { img.dataset.lazyLoaded = '1'; } catch { /* ignore */ }

        img.onload = () => {
            img.classList.add('loaded');
            img.classList.remove('lazyload');
        };
        img.onerror = () => {
            console.error(`Failed to load image: ${nextSrc}`);
            img.classList.add('error');
            img.classList.remove('lazyload');
            img.src = fallbackSrc;
        };
        img.src = nextSrc;
    }

    function ensureObserver() {
        if (observer) return observer;
        if (!("IntersectionObserver" in window)) return null;

        observer = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    const img = entry.target;
                    loadImage(img);
                    try { obs.unobserve(img); } catch { /* ignore */ }
                });
            },
            {
                threshold: 0.01,
                rootMargin: '0px 0px 100px 0px', // Load 100px before viewport
            },
        );
        return observer;
    }

    function init(root) {
        const scope = root && root.querySelectorAll ? root : document;
        const lazyImages = scope.querySelectorAll('img.lazyload');
        if (!lazyImages.length) return;

        const obs = ensureObserver();
        if (obs) {
            lazyImages.forEach((img) => {
                if (!img || !img.dataset || !img.dataset.src) return;
                if (img.dataset.lazyObserved === '1') return;
                img.dataset.lazyObserved = '1';
                try { obs.observe(img); } catch { /* ignore */ }
            });
            return;
        }

        // Fallback: immediate load
        lazyImages.forEach((img) => loadImage(img));
    }

    return { init: init };
})();

// ==============================================
// Global Image Fallback
// ==============================================
const ImageFallback = (function() {
    const fallbackSrc = 'assets/images/placeholder-lowquality.svg';

    function handle(event) {
        const target = event?.target;
        if (!target || target.tagName !== 'IMG') return;
        if (target.dataset && target.dataset.fallbackApplied === '1') return;
        target.dataset.fallbackApplied = '1';
        target.classList.add('error');
        if (target.src !== fallbackSrc) {
            target.src = fallbackSrc;
        }
    }

    function init() {
        document.addEventListener('error', handle, true);
    }

    return { init };
})();

// ==============================================
// Skeleton Screen Module
// - 用于“首屏/慢渲染”占位，提升感知性能
// - 仅在需要时挂载，不影响实际数据渲染
// ==============================================
const Skeleton = (function() {
    function escapeAttr(value) {
        return Utils.escapeHtml(String(value ?? ''));
    }

    function createProductCardSkeletonHTML({ index = 0 } = {}) {
        const id = `skeleton-${index + 1}`;
        const aria = `aria-hidden="true" data-skeleton="1" data-skeleton-id="${escapeAttr(id)}"`;
        return `
          <div class="product-card skeleton skeleton-card fade-in-up" ${aria}>
              <div class="product-card__image skeleton-card__media"></div>
              <div class="product-card__content skeleton-card__content">
                  <div class="skeleton-line" style="width: 72%"></div>
                  <div class="skeleton-line" style="width: 52%"></div>
                  <div class="skeleton-line" style="width: 36%"></div>
              </div>
          </div>
        `;
    }

    function mountGrid(grid, { count = 8 } = {}) {
        const host = grid && grid.nodeType === 1 ? grid : null;
        if (!host) return false;
        if (host.dataset && host.dataset.skeletonMounted === '1') return true;

        const n = Math.max(1, Math.min(24, Number(count) || 8));
        try { host.dataset.skeletonMounted = '1'; } catch { /* ignore */ }
        host.innerHTML = Array.from({ length: n }, (_, i) => createProductCardSkeletonHTML({ index: i })).join('');

        // 保持现有动效/懒加载体系一致
        try {
            if (typeof ScrollAnimations !== 'undefined' && ScrollAnimations.init) ScrollAnimations.init(host);
        } catch {
            // ignore
        }
        return true;
    }

    function clear(grid) {
        const host = grid && grid.nodeType === 1 ? grid : null;
        if (!host) return false;
        if (!host.dataset || host.dataset.skeletonMounted !== '1') return false;

        try { delete host.dataset.skeletonMounted; } catch { /* ignore */ }
        // 不主动清空 innerHTML：由调用方渲染真实内容覆盖
        return true;
    }

    async function withGridSkeleton(grid, task, { count = 8 } = {}) {
        const host = grid && grid.nodeType === 1 ? grid : null;
        const fn = typeof task === 'function' ? task : null;
        if (!host || !fn) return;

        mountGrid(host, { count });
        // 让浏览器先绘制一帧 skeleton，再进行重渲染（更接近真实“骨架屏”）
        await new Promise((r) => requestAnimationFrame(() => r()));
        try {
            fn();
        } finally {
            clear(host);
        }
    }

    return { mountGrid, clear, withGridSkeleton };
})();

// ==============================================
// Toast / Feedback Module (轻量提示，不依赖外部库)
// ==============================================
const Toast = createToast();

// ==============================================
// Celebration / Confetti Module
// ==============================================
const Celebration = (function() {
    const palette = ['#1f6feb', '#ffb454', '#22d3ee', '#a78bfa', '#f472b6'];

    function fire(target, { count = 14 } = {}) {
        if (Utils.prefersReducedMotion()) return;
        const rect = target?.getBoundingClientRect?.();
        const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

        const burst = document.createElement('div');
        burst.className = 'confetti-burst';
        burst.style.position = 'fixed';
        burst.style.left = `${x}px`;
        burst.style.top = `${y}px`;
        burst.style.width = '0';
        burst.style.height = '0';

        for (let i = 0; i < count; i += 1) {
            const piece = document.createElement('span');
            piece.className = 'confetti-piece';
            piece.style.background = palette[i % palette.length];
            const angle = Math.random() * Math.PI * 2;
            const distance = 24 + Math.random() * 28;
            piece.style.setProperty('--confetti-x', `${Math.cos(angle) * distance}px`);
            piece.style.setProperty('--confetti-y', `${Math.sin(angle) * distance + 24}px`);
            piece.style.left = '0';
            piece.style.top = '0';
            burst.appendChild(piece);
        }

        document.body.appendChild(burst);
        window.setTimeout(() => burst.remove(), 1000);
    }

    return { fire };
})();

// ==============================================
// Theme Module (Light/Dark/Genesis, persisted)
// ==============================================
const Theme = (function() {
    const storageKey = 'theme'; // 'light' | 'dark' | 'genesis' | null(跟随系统)

    function normalizeTheme(value) {
        const v = String(value ?? '').trim().toLowerCase();
        if (v === 'light' || v === 'dark' || v === 'genesis') return v;
        return null;
    }

    function getStoredTheme() {
        try {
            return normalizeTheme(localStorage.getItem(storageKey));
        } catch {
            return null;
        }
    }

    function getSystemTheme() {
        try {
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } catch {
            return 'light';
        }
    }

    function getResolvedTheme() {
        return getStoredTheme() || getSystemTheme();
    }

    function getActiveThemeFromDom() {
        try {
            const root = document.documentElement;
            if (root?.dataset?.variant === 'genesis') return 'genesis';
            const base = root?.dataset?.theme;
            return base === 'dark' || base === 'light' ? base : null;
        } catch {
            return null;
        }
    }

    function readCssVar(name) {
        try {
            const v = getComputedStyle(document.documentElement).getPropertyValue(name);
            const s = String(v || '').trim();
            return s || null;
        } catch {
            return null;
        }
    }

    function setMetaThemeColor(theme) {
        const meta = document.querySelector('meta[name="theme-color"]');        
        if (!meta) return;

        const active = normalizeTheme(theme) || getSystemTheme();

        // 避免“写死颜色”导致 UI 与当前主题/配色不一致：从 CSS 变量动态读取
        const next = active === 'dark'
            ? (readCssVar('--color-background-darker') || readCssVar('--color-background-dark') || '#0B1220')
            : (readCssVar('--color-primary') || (active === 'genesis' ? '#8B5CF6' : '#1F6FEB'));

        meta.setAttribute('content', next);
    }

    function getThemeLabel(theme) {
        const active = normalizeTheme(theme) || 'light';
        if (active === 'dark') return '深色';
        if (active === 'genesis') return 'Genesis';
        return '浅色';
    }

    function getNextTheme(theme) {
        const active = normalizeTheme(theme) || 'light';
        if (active === 'light') return 'dark';
        if (active === 'dark') return 'genesis';
        return 'light';
    }

    function updateToggleUI(theme) {
        const btn = document.querySelector('.header__theme-toggle');      
        if (!btn) return;

        const active = normalizeTheme(theme) || getSystemTheme();
        const next = getNextTheme(active);

        const pressed = active === 'dark' ? 'true' : (active === 'genesis' ? 'mixed' : 'false');
        btn.setAttribute('aria-pressed', pressed);
        btn.setAttribute('aria-label', `切换主题：${getThemeLabel(active)} → ${getThemeLabel(next)}`);
        btn.setAttribute('title', `切换主题：${getThemeLabel(active)} → ${getThemeLabel(next)}`);

        const icon = next === 'dark' ? 'icon-moon' : (next === 'genesis' ? 'icon-star-filled' : 'icon-sun');
        btn.innerHTML = Icons.svgHtml(icon);
    }

    function applyTheme(theme, { persist = false } = {}) {
        const active = normalizeTheme(theme) || getSystemTheme();
        const base = active === 'genesis' ? 'dark' : active;

        document.documentElement.dataset.theme = base;
        if (active === 'genesis') {
            document.documentElement.dataset.variant = 'genesis';
        } else {
            try { delete document.documentElement.dataset.variant; } catch { /* ignore */ }
        }

        setMetaThemeColor(active);
        updateToggleUI(active);

        if (persist) {
            try { localStorage.setItem(storageKey, active); } catch { /* ignore */ }
        }
    }

    function toggleTheme() {
        const current = getActiveThemeFromDom() || getResolvedTheme();
        const next = getNextTheme(current);
        applyTheme(next, { persist: true });
        if (typeof Toast !== 'undefined' && Toast.show) {
            Toast.show(
                next === 'dark' ? '已切换深色模式' : (next === 'genesis' ? '已切换 Genesis 主题' : '已切换浅色模式'),
                'info',
                1600,
            );
        }
    }

    function init() {
        // 由 head 内联脚本提前设置 data-theme，避免闪烁；这里负责补齐 UI 状态与监听
        const theme = getActiveThemeFromDom() || getResolvedTheme();
        applyTheme(theme, { persist: false });

        const btn = document.querySelector('.header__theme-toggle');
        if (btn) btn.addEventListener('click', toggleTheme);

        // 当未设置手动偏好时，跟随系统变化
        try {
            const mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
            if (!mql) return;
            const onChange = () => {
                const stored = getStoredTheme();
                if (stored) return;
                applyTheme(getSystemTheme(), { persist: false });
            };
            if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange);
            else if (typeof mql.addListener === 'function') mql.addListener(onChange);
        } catch {
            // ignore
        }
    }

    return { init, applyTheme, toggleTheme, getResolvedTheme };
})();

// ==============================================
// Favorites / Wishlist Module (localStorage)
// ==============================================
const Favorites = (function() {
    const storageKey = 'favorites'; // string[] of product IDs

    function getIds() {
        const parsed = Utils.readStorageJSON(storageKey, []);
        return Utils.normalizeStringArray(parsed);
    }

    function setIds(ids) {
        const clean = Array.from(new Set(Utils.normalizeStringArray(ids)));
        Utils.writeStorageJSON(storageKey, clean);
        return clean;
    }

    function isFavorite(id) {
        if (!id) return false;
        return getIds().includes(id);
    }

    function updateHeaderCount(idsOrCount) {
        const el = document.querySelector('.header__fav-count');
        if (!el) return;

        const count = Array.isArray(idsOrCount) ? idsOrCount.length : Number(idsOrCount) || 0;
        el.style.display = count > 0 ? 'inline-block' : 'none';
        if (count > 0) {
            UXMotion.tweenNumber(el, count, { duration: 240, formatter: (n) => String(Math.max(0, Math.round(n))) });
        } else {
            el.textContent = '0';
            el.dataset.tweenValue = '0';
        }
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-label', `收藏数量：${count}`);
    }

    function applyButtonState(btn, active) {
        if (!btn) return;
        const isActive = Boolean(active);
        btn.classList.toggle('is-favorite', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        btn.setAttribute('aria-label', isActive ? '取消收藏' : '加入收藏');

        const iconSvg = btn.querySelector('svg');
        if (iconSvg) {
            Icons.setSvgUse(iconSvg, isActive ? 'icon-heart-filled' : 'icon-heart');
        }
    }

    function syncButtons(root = document) {
        if (!root || !root.querySelectorAll) return;
        const ids = getIds();
        const idSet = new Set(ids);
        root.querySelectorAll('.favorite-btn[data-product-id]').forEach((btn) => {
            const productId = btn.dataset.productId;
            applyButtonState(btn, idSet.has(productId));
        });
    }

    function toggle(id) {
        if (!id) return false;
        const current = new Set(getIds());
        const has = current.has(id);
        if (has) current.delete(id);
        else current.add(id);
        const next = setIds(Array.from(current));
        updateHeaderCount(next);
        Utils.dispatchChanged('favorites');
        return !has;
    }

    function handleClick(event) {
        const btn = event.target?.closest?.('.favorite-btn');
        if (!btn) return;
        const id = btn.dataset.productId;
        if (!id) return;

        event.preventDefault();
        event.stopPropagation();

        const nowActive = toggle(id);
        applyButtonState(btn, nowActive);
        if (nowActive && typeof Celebration !== 'undefined' && Celebration.fire) {
            Celebration.fire(btn);
        }
        if (typeof Cinematic !== 'undefined') {
            Cinematic.pulse?.(btn, { scale: nowActive ? 1.12 : 1.06, duration: 0.24 });
            if (nowActive) Cinematic.shimmerOnce?.(btn, { durationMs: 520 });
        }
        if (typeof Toast !== 'undefined' && Toast.show) {
            Toast.show(nowActive ? '已加入收藏' : '已取消收藏', nowActive ? 'success' : 'info', 1600);
        }
    }

    function init() {
        updateHeaderCount(getIds());
        document.addEventListener('click', handleClick);
        syncButtons(document);
    }

    return { init, getIds, setIds, isFavorite, toggle, syncButtons, updateHeaderCount };
})();

// ==============================================
// Compare Module (localStorage)
// ==============================================
const Compare = (function() {
    const storageKey = 'compare'; // string[] of product IDs
    const maxItems = 3;

    function ensureHeaderEntry() {
        const actions = document.querySelector('.header__actions');
        if (!actions) return;
        if (actions.querySelector('.header__compare-link')) return;

        const link = document.createElement('a');
        link.href = 'compare.html';
        link.className = 'header__action-link header__compare-link';
        link.setAttribute('aria-label', '对比');
        link.innerHTML =
            `${Icons.svgHtml('icon-scale')}<span class="header__compare-count" aria-label="对比数量" style="display:none;">0</span>`;

        const themeToggle = actions.querySelector('.header__theme-toggle');
        if (themeToggle) actions.insertBefore(link, themeToggle);
        else actions.appendChild(link);
    }

    function getIds() {
        return Utils.normalizeStringArray(Utils.readStorageJSON(storageKey, []));
    }

    function updateHeaderCount(idsOrCount) {
        const el = document.querySelector('.header__compare-count');
        if (!el) return;
        const count = Array.isArray(idsOrCount) ? idsOrCount.length : Number(idsOrCount) || 0;
        el.style.display = count > 0 ? 'inline-block' : 'none';
        if (count > 0) {
            UXMotion.tweenNumber(el, count, { duration: 240, formatter: (n) => String(Math.max(0, Math.round(n))) });
        } else {
            el.textContent = '0';
            el.dataset.tweenValue = '0';
        }
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-label', `对比数量：${count}`);
    }

    function setIds(ids, options = {}) {
        const clean = Array.from(new Set(Utils.normalizeStringArray(ids))).slice(0, maxItems);
        Utils.writeStorageJSON(storageKey, clean);
        updateHeaderCount(clean);
        if (!options.silent) Utils.dispatchChanged('compare');
        return clean;
    }

    function clearAll() {
        setIds([]);
    }

    function isCompared(id) {
        const key = String(id || '').trim();
        if (!key) return false;
        return getIds().includes(key);
    }

    function applyButtonState(btn, active) {
        if (!btn) return;
        const isActive = Boolean(active);
        btn.classList.toggle('is-compared', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        btn.setAttribute('aria-label', isActive ? '取消对比' : '加入对比');
    }

    function syncButtons(root = document) {
        if (!root || !root.querySelectorAll) return;
        const ids = getIds();
        const idSet = new Set(ids);
        root.querySelectorAll('.product-card__compare[data-product-id], .compare-btn[data-product-id]').forEach((btn) => {
            const productId = btn.dataset.productId;
            applyButtonState(btn, idSet.has(productId));
        });
    }

    function toggle(id) {
        const key = String(id || '').trim();
        if (!key) return { active: false, blocked: false };

        const current = getIds();
        const exists = current.includes(key);
        if (exists) {
            const next = current.filter((x) => x !== key);
            setIds(next);
            return { active: false, blocked: false };
        }

        if (current.length >= maxItems) {
            return { active: false, blocked: true };
        }

        const next = [key, ...current].slice(0, maxItems);
        setIds(next);
        return { active: true, blocked: false };
    }

    function handleClick(event) {
        const btn = event.target?.closest?.('.product-card__compare, .compare-btn');
        if (!btn) return;
        const id = btn.dataset.productId;
        if (!id) return;

        event.preventDefault();
        event.stopPropagation();

        const result = toggle(id);
        if (result.blocked) {
            if (typeof Toast !== 'undefined' && Toast.show) {
                Toast.show(`最多只能对比 ${maxItems} 件商品`, 'info', 1800);
            }
            return;
        }

        applyButtonState(btn, result.active);
        if (result.active && typeof Celebration !== 'undefined' && Celebration.fire) {
            Celebration.fire(btn);
        }
        if (typeof Cinematic !== 'undefined') {
            Cinematic.pulse?.(btn, { scale: result.active ? 1.1 : 1.04, duration: 0.22 });
            if (result.active) Cinematic.shimmerOnce?.(btn, { durationMs: 520 });
        }
        if (typeof Toast !== 'undefined' && Toast.show) {
            Toast.show(result.active ? '已加入对比' : '已移出对比', result.active ? 'success' : 'info', 1500);
        }
    }

    function init() {
        ensureHeaderEntry();
        updateHeaderCount(getIds());
        document.addEventListener('click', handleClick);
        syncButtons(document);
    }

    return { init, getIds, setIds, clear: clearAll, isCompared, toggle, syncButtons, updateHeaderCount };
})();

// ==============================================
// Promotion / Coupon Module (localStorage)
// ==============================================
const Promotion = (function() {
    const storageKey = 'promotion';

    const knownPromos = [
        { code: 'SHOUWBAN10', type: 'percent', value: 10, label: '全场 9 折' },
        { code: 'NEW50', type: 'fixed', value: 50, minSubtotal: 299, label: '新人立减 ¥50（满¥299）' },
        { code: 'FREESHIP', type: 'freeship', value: 0, label: '免运费' },
    ];

    function normalizeCode(raw) {
        return String(raw || '').trim().toUpperCase();
    }

    function getCartSubtotalFromStorage() {
        const raw = Utils.readStorageJSON('cart', []);
        return globalThis.ShouwbanCore.calculateCartSubtotal(raw);
    }

    function get() {
        const data = Utils.readStorageJSON(storageKey, null);
        if (!data || typeof data !== 'object') return null;
        const code = normalizeCode(data.code);
        const type = String(data.type || '').trim();
        const value = Number(data.value);
        const label = String(data.label || '').trim();
        if (!code || !type || !Number.isFinite(value)) return null;
        return { code, type, value, label };
    }

    function set(promo) {
        if (!promo) {
            Utils.removeStorage(storageKey);
            Utils.dispatchChanged('promo');
            return null;
        }

        const payload = {
            code: normalizeCode(promo.code),
            type: promo.type,
            value: promo.value,
            label: promo.label || '',
            appliedAt: new Date().toISOString(),
        };
        Utils.writeStorageJSON(storageKey, payload);
        Utils.dispatchChanged('promo');
        return get();
    }

    function clear() {
        set(null);
    }

    function calculateDiscount(subtotal, promo = get()) {
        return globalThis.ShouwbanCore.calculatePromotionDiscount(subtotal, promo);
    }

    function validateAndResolve(code) {
        const normalized = normalizeCode(code);
        if (!normalized) return { ok: false, message: '请输入优惠码。' };

        const promo = knownPromos.find((p) => p.code === normalized);
        if (!promo) return { ok: false, message: '优惠码无效或已过期。' };

        const subtotal = getCartSubtotalFromStorage();
        const minSubtotal = Number(promo.minSubtotal);
        if (Number.isFinite(minSubtotal) && minSubtotal > 0 && subtotal < minSubtotal) {
            return { ok: false, message: `该优惠码需满 ${Pricing.formatCny(minSubtotal)} 才可使用。` };
        }

        return { ok: true, promo };
    }

    function apply(code) {
        const r = validateAndResolve(code);
        if (!r.ok) return r;
        set(r.promo);
        return { ok: true, message: `已应用：${r.promo.label || r.promo.code}` };
    }

    function bindPromoBlocks() {
        const blocks = document.querySelectorAll('[data-promo]');
        if (!blocks || blocks.length === 0) return;

        const refresh = () => {
            const promo = get();
            blocks.forEach((block) => {
                const input = block.querySelector('[data-promo-input]');
                const feedback = block.querySelector('[data-promo-feedback]');
                const clearBtn = block.querySelector('[data-promo-clear]');
                if (input) input.value = promo?.code || '';
                if (feedback) feedback.textContent = promo ? `当前：${promo.label || promo.code}` : '未使用优惠码';
                if (clearBtn) clearBtn.style.display = promo ? 'inline-flex' : 'none';
            });
        };

        const applyFromBlock = (block, triggerEl) => {
            const input = block.querySelector('[data-promo-input]');
            const feedback = block.querySelector('[data-promo-feedback]');
            const code = input ? input.value : '';
            const r = apply(code);
            if (feedback) feedback.textContent = r.ok ? r.message : r.message;
            if (typeof Cinematic !== 'undefined') {
                if (r.ok) {
                    Cinematic.shimmerOnce?.(triggerEl || block, { durationMs: 620 });
                    Cinematic.pulse?.(feedback || triggerEl || block, { scale: 1.04, duration: 0.22 });
                } else {
                    Cinematic.pulse?.(input || triggerEl || block, { scale: 1.02, duration: 0.18 });
                }
            }
            if (typeof Toast !== 'undefined' && Toast.show) {
                Toast.show(r.message, r.ok ? 'success' : 'info', 2000);
            }
        };

        blocks.forEach((block) => {
            const applyBtn = block.querySelector('[data-promo-apply]');
            const clearBtn = block.querySelector('[data-promo-clear]');
            const input = block.querySelector('[data-promo-input]');

            applyBtn?.addEventListener?.('click', () => applyFromBlock(block, applyBtn));
            clearBtn?.addEventListener?.('click', () => {
                clear();
                if (typeof Cinematic !== 'undefined') {
                    Cinematic.shimmerOnce?.(clearBtn || block, { durationMs: 520 });
                    Cinematic.pulse?.(clearBtn || block, { scale: 1.05, duration: 0.22 });
                }
                if (typeof Toast !== 'undefined' && Toast.show) {
                    Toast.show('已清除优惠码', 'info', 1600);
                }
            });
            input?.addEventListener?.('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    applyFromBlock(block, input);
                }
            });
        });

        refresh();
        try {
            window.addEventListener('promo:changed', refresh);
        } catch {
            // ignore
        }
    }

    function init() {
        bindPromoBlocks();
        try {
            window.addEventListener('promo:changed', () => {
                Cart?.refresh?.();
                Checkout?.refresh?.();
            });
        } catch {
            // ignore
        }
    }

    return { init, get, set, clear, apply, calculateDiscount };
})();

// ==============================================
// Shipping Region (localStorage)
// ==============================================
const ShippingRegion = (function() {
    const storageKey = 'shippingRegion';

    function get() {
        const raw = Utils.readStorageJSON(storageKey, null);
        const key = typeof raw === 'string' ? raw : String(raw || '').trim();
        return Pricing.getRegion(key).value;
    }

    function set(value, options = {}) {
        const next = Pricing.getRegion(value).value;
        Utils.writeStorageJSON(storageKey, next);
        if (!options.silent) Utils.dispatchChanged('shipping');
        return next;
    }

    function fillSelect(selectEl) {
        if (!selectEl) return;
        if (selectEl.dataset.shippingRegionReady === '1') return;
        selectEl.innerHTML = Pricing.regions
            .map((r) => `<option value="${Utils.escapeHtml(r.value)}">${Utils.escapeHtml(r.label)}</option>`)
            .join('');
        selectEl.dataset.shippingRegionReady = '1';
    }

    function syncAllSelects() {
        const selects = document.querySelectorAll('select[data-shipping-region]');
        if (!selects || selects.length === 0) return;
        const current = get();
        selects.forEach((sel) => {
            fillSelect(sel);
            sel.value = current;
        });
    }

    function init() {
        syncAllSelects();

        document.addEventListener('change', (event) => {
            const sel = event.target?.closest?.('select[data-shipping-region]');
            if (!sel) return;
            set(sel.value);
        });

        try {
            window.addEventListener('shipping:changed', () => {
                syncAllSelects();
                Cart?.refresh?.();
                Checkout?.refresh?.();
            });
        } catch {
            // ignore
        }
    }

    return { init, get, set, syncAllSelects };
})();

// ==============================================
// Orders (localStorage)
// ==============================================
const Orders = (function() {
    const storageKey = 'orders'; // array of order objects
    const maxOrders = 20;

    function ensureHeaderEntry() {
        const actions = document.querySelector('.header__actions');
        if (!actions) return;
        if (actions.querySelector('.header__orders-link')) return;

        const link = document.createElement('a');
        link.href = 'orders.html';
        link.className = 'header__action-link header__orders-link';
        link.setAttribute('aria-label', '订单');
        link.innerHTML =
            `${Icons.svgHtml('icon-receipt')}<span class="header__orders-count" aria-label="订单数量" style="display:none;">0</span>`;

        const compareLink = actions.querySelector('.header__compare-link');
        const themeToggle = actions.querySelector('.header__theme-toggle');
        if (compareLink) actions.insertBefore(link, compareLink);
        else if (themeToggle) actions.insertBefore(link, themeToggle);
        else actions.appendChild(link);
    }

    function updateHeaderCount(ordersOrCount) {
        const el = document.querySelector('.header__orders-count');
        if (!el) return;
        const count = Array.isArray(ordersOrCount) ? ordersOrCount.length : Number(ordersOrCount) || 0;
        el.style.display = count > 0 ? 'inline-block' : 'none';
        if (count > 0) {
            UXMotion.tweenNumber(el, count, { duration: 240, formatter: (n) => String(Math.max(0, Math.round(n))) });
        } else {
            el.textContent = '0';
            el.dataset.tweenValue = '0';
        }
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-label', `订单数量：${count}`);
    }

    function getAll() {
        const raw = Utils.readStorageJSON(storageKey, []);
        if (!Array.isArray(raw)) return [];
        return raw.filter((x) => x && typeof x === 'object');
    }

    function saveAll(list) {
        const safe = Array.isArray(list) ? list.slice(0, maxOrders) : [];
        Utils.writeStorageJSON(storageKey, safe);
        updateHeaderCount(safe);
        Utils.dispatchChanged('orders');
        return safe;
    }

    function normalizeAddress(address) {
        const addr = address && typeof address === 'object' ? address : {};
        const name = String(addr.name || '').trim().slice(0, 40);
        const phone = String(addr.phone || '').trim().slice(0, 30);
        const detail = String(addr.address || '').trim().slice(0, 160);
        return { name, phone, address: detail };
    }

    function normalizeItems(items) {
        const list = Array.isArray(items) ? items : [];
        return list
            .map((item) => {
                if (!item || typeof item !== 'object') return null;
                const id = String(item.id || '').trim();
                if (!id) return null;
                const name = String(item.name || '').trim() || '[手办名称]';
                const series = String(item.series || '').trim();
                const image = String(item.image || 'assets/images/figurine-1.svg').trim();
                const price = Number(item.price);
                const quantity = Number.parseInt(item.quantity, 10);
                const safePrice = Number.isFinite(price) && price >= 0 ? price : 0;
                const safeQty = Number.isFinite(quantity) && quantity > 0 ? Math.min(99, quantity) : 1;
                return { id, name, series, image, price: safePrice, quantity: safeQty };
            })
            .filter(Boolean);
    }

    function calcSubtotal(items) {
        const list = normalizeItems(items);
        return Pricing.roundMoney(list.reduce((sum, i) => sum + i.price * i.quantity, 0));
    }

    function create({ items, shippingAddress, paymentMethod, region, rewards } = {}) {
        const safeItems = normalizeItems(items);
        const subtotal = calcSubtotal(safeItems);
        const promo = Promotion.get();
        const discount = Promotion.calculateDiscount(subtotal, promo);
        const bundleInfo = typeof BundleDeals !== 'undefined' && BundleDeals.calculateDiscount
            ? BundleDeals.calculateDiscount(safeItems)
            : { discount: 0, bundles: [] };
        const bundleDiscount = Number(bundleInfo?.discount) || 0;
        const memberBenefits = typeof Rewards !== 'undefined' && Rewards.getTierBenefits
            ? Rewards.getTierBenefits(Rewards.getPoints?.() || 0)
            : null;
        const memberDiscount = typeof Rewards !== 'undefined' && Rewards.calcTierDiscount
            ? Rewards.calcTierDiscount(Math.max(0, subtotal - discount - bundleDiscount))
            : 0;

        const pointsUsedRaw = Number.parseInt(String(rewards?.pointsUsed ?? ''), 10);
        const pointsUsed = Number.isFinite(pointsUsedRaw) && pointsUsedRaw > 0 ? Math.min(9999999, pointsUsedRaw) : 0;
        const rewardsDiscountRaw = Number(rewards?.discount);
        const rewardsDiscount = Number.isFinite(rewardsDiscountRaw) && rewardsDiscountRaw > 0 ? Pricing.roundMoney(rewardsDiscountRaw) : 0;

        const shipRegion = Pricing.getRegion(region || ShippingRegion.get()).value;
        const shipping = Pricing.calculateShipping({
            subtotal,
            discount: discount + rewardsDiscount + bundleDiscount + memberDiscount,
            region: shipRegion,
            promotion: promo,
            membership: memberBenefits,
        });
        const total = Pricing.roundMoney(Math.max(0, subtotal - discount - rewardsDiscount - bundleDiscount - memberDiscount) + shipping);

        const order = {
            id: Utils.generateId('ORD-'),
            createdAt: new Date().toISOString(),
            status: 'processing',
            paymentMethod: String(paymentMethod || '').trim(),
            region: shipRegion,
            promotion: promo ? { code: promo.code, type: promo.type, value: promo.value, label: promo.label } : null,
            pricing: { subtotal, discount, bundleDiscount, memberDiscount, rewardsDiscount, pointsUsed, shipping, total, currency: 'CNY' },
            membership: memberBenefits
                ? { tier: memberBenefits.id, label: memberBenefits.label, discountPercent: memberBenefits.discountPercent }
                : null,
            bundle: bundleInfo?.bundles || [],
            shippingAddress: normalizeAddress(shippingAddress),
            items: safeItems,
        };

        const next = [order, ...getAll()].slice(0, maxOrders);
        saveAll(next);
        Utils.writeStorageJSON('lastOrderId', order.id);
        try { OrderJourney?.seed?.(order); } catch { /* 忽略订单旅程异常 */ }
        return order;
    }

    function getById(id) {
        const key = String(id || '').trim();
        if (!key) return null;
        return getAll().find((o) => String(o?.id || '').trim() === key) || null;
    }

    function remove(id) {
        const key = String(id || '').trim();
        if (!key) return false;
        const next = getAll().filter((o) => String(o?.id || '').trim() !== key);
        saveAll(next);
        return true;
    }

    function clearAll() {
        Utils.removeStorage(storageKey);
        updateHeaderCount(0);
        Utils.dispatchChanged('orders');
    }

    function init() {
        ensureHeaderEntry();
        updateHeaderCount(getAll());
        try {
            window.addEventListener('orders:changed', () => updateHeaderCount(getAll()));
        } catch {
            // ignore
        }
    }

    return { init, getAll, getById, create, remove, clear: clearAll, updateHeaderCount };
})();

// ==============================================
// 订单旅程（时间轴 + 售后）
// ==============================================
const OrderJourney = (function() {
    const steps = [
        { key: 'placed', label: '已下单', offsetHours: 0 },
        { key: 'paid', label: '已支付', offsetHours: 0.4 },
        { key: 'packed', label: '已配货', offsetHours: 6 },
        { key: 'shipped', label: '已发货', offsetHours: 20 },
        { key: 'delivered', label: '已签收', offsetHours: 72 },
    ];

    function buildTimeline(createdAt) {
        const base = Number(Date.parse(createdAt)) || Date.now();
        return steps.map((step) => ({
            key: step.key,
            label: step.label,
            ts: new Date(base + step.offsetHours * 3600 * 1000).toISOString(),
        }));
    }

    function getMap() {
        return StorageKit.getOrderTimeline();
    }

    function saveMap(map) {
        return StorageKit.setOrderTimeline(map);
    }

    function seed(order) {
        const id = String(order?.id || '').trim();
        if (!id) return null;
        const map = getMap();
        if (!map[id]) {
            map[id] = {
                orderId: id,
                createdAt: order?.createdAt || new Date().toISOString(),
                timeline: buildTimeline(order?.createdAt),
                afterSales: [],
            };
            saveMap(map);
        }
        return map[id];
    }

    function get(orderId) {
        const id = String(orderId || '').trim();
        if (!id) return null;
        const map = getMap();
        return map[id] || null;
    }

    function getProgress(orderId) {
        const record = get(orderId);
        const list = Array.isArray(record?.timeline) ? record.timeline : [];
        const now = Date.now();
        return list.map((item) => {
            const ts = Date.parse(item.ts || '');
            const done = Number.isFinite(ts) ? now >= ts : false;
            return { ...item, done };
        });
    }

    function addAfterSales(orderId, payload) {
        const id = String(orderId || '').trim();
        if (!id) return null;
        const map = getMap();
        const record = map[id] || { orderId: id, timeline: buildTimeline(new Date().toISOString()), afterSales: [] };
        const list = Array.isArray(record.afterSales) ? record.afterSales : [];
        const reason = String(payload?.reason || '').trim().slice(0, 120);
        const type = String(payload?.type || '售后申请');
        list.unshift({ id: Utils.generateId('AS-'), type, reason, createdAt: new Date().toISOString() });
        record.afterSales = list.slice(0, 6);
        map[id] = record;
        saveMap(map);
        Utils.dispatchChanged('orderJourney');
        return record;
    }

    return { seed, get, getProgress, addAfterSales };
})();

// ==============================================
// Rewards / Loyalty Points (localStorage)
// - 目标：提升复购与转化（积分抵扣 + 会员权益）
// ==============================================
const Rewards = (function() {
    const storageKey = 'rewards';
    const tiers = [
        {
            id: 'rookie',
            label: '启航',
            minPoints: 0,
            discountPercent: 0,
            freeOverDelta: 0,
            perks: ['基础积分', '新品提醒'],
        },
        {
            id: 'spark',
            label: '星耀',
            minPoints: 1200,
            discountPercent: 2,
            freeOverDelta: 100,
            perks: ['积分加速', '会员专享折扣', '优先预售'],
        },
        {
            id: 'nova',
            label: '极光',
            minPoints: 5000,
            discountPercent: 5,
            freeOverDelta: 180,
            perks: ['专属折扣', '优先预售', '专属客服'],
        },
    ];

    function normalizePoints(value) {
        const n = Number.parseInt(String(value ?? ''), 10);
        if (!Number.isFinite(n) || n < 0) return 0;
        return Math.min(9999999, n);
    }

    function getState() {
        const raw = Utils.readStorageJSON(storageKey, null);
        const points = normalizePoints(raw?.points ?? raw);
        return { points };
    }

    function saveState(state, options = {}) {
        const next = { points: normalizePoints(state?.points) };
        Utils.writeStorageJSON(storageKey, next);
        updateHeaderBadge(next.points);
        try {
            const tier = resolveTier(next.points);
            StorageKit?.setMembership?.({
                tier: tier.id,
                points: next.points,
                updatedAt: new Date().toISOString(),
            });
        } catch {
            // 忽略会员同步异常
        }
        if (!options.silent) Utils.dispatchChanged('rewards');
        return next;
    }

    function formatPoints(value) {
        const n = normalizePoints(value);
        if (n >= 10000) return `${Math.round(n / 1000)}k`;
        if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\\.0$/, '')}k`;
        return String(n);
    }

    function ensureHeaderEntry() {
        const actions = document.querySelector('.header__actions');
        if (!actions) return;
        if (actions.querySelector('.header__account-link')) return;

        const link = document.createElement('a');
        link.href = 'account.html';
        link.className = 'header__action-link header__account-link';
        link.setAttribute('aria-label', '会员中心');
        link.innerHTML =
            `${Icons.svgHtml('icon-user')}<span class="header__account-badge" aria-label="可用积分" style="display:none;">0</span>`;

        const cartLink = actions.querySelector('a[href="cart.html"]');
        if (cartLink) actions.insertBefore(link, cartLink);
        else actions.appendChild(link);
    }

    function updateHeaderBadge(pointsOrState) {
        ensureHeaderEntry();
        const el = document.querySelector('.header__account-badge');
        if (!el) return;

        const points = normalizePoints(typeof pointsOrState === 'object' ? pointsOrState?.points : pointsOrState);
        el.style.display = points > 0 ? 'inline-block' : 'none';
        el.setAttribute('aria-label', `可用积分：${points}`);
        el.setAttribute('aria-live', 'polite');

        if (points > 0) {
            UXMotion.tweenNumber(el, points, { duration: 260, formatter: (n) => formatPoints(n) });
        } else {
            el.textContent = '0';
            el.dataset.tweenValue = '0';
        }
    }

    function getPoints() {
        return getState().points;
    }

    function resolveTier(points) {
        const p = normalizePoints(points);
        const sorted = tiers.slice().sort((a, b) => b.minPoints - a.minPoints);
        return sorted.find((t) => p >= t.minPoints) || tiers[0];
    }

    function getTier() {
        return resolveTier(getPoints());
    }

    function getTierBenefits(points) {
        const tier = resolveTier(points);
        return {
            ...tier,
            freeOverDelta: Number(tier.freeOverDelta) || 0,
        };
    }

    function setPoints(points, options = {}) {
        return saveState({ points }, options).points;
    }

    function addPoints(delta, options = {}) {
        const d = normalizePoints(delta);
        const current = getPoints();
        return saveState({ points: current + d }, options).points;
    }

    function consumePoints(delta, options = {}) {
        const d = normalizePoints(delta);
        const current = getPoints();
        return saveState({ points: Math.max(0, current - d) }, options).points;
    }

    function calcDiscountByPoints(points) {
        const p = normalizePoints(points);
        return Pricing.roundMoney(p / 100); // 1 积分 = ¥0.01
    }

    function calcEarnedPoints(merchTotal) {
        const n = Number(merchTotal);
        if (!Number.isFinite(n) || n <= 0) return 0;
        // 规则：每消费 ¥1 返 1 积分（约等于 1% 返利）
        return normalizePoints(Math.floor(n));
    }

    function calcTierDiscount(merchTotal, pointsOverride) {
        const merch = Pricing.roundMoney(merchTotal);
        if (merch <= 0) return 0;
        const tier = getTierBenefits(typeof pointsOverride === 'number' ? pointsOverride : getPoints());
        const pct = Number(tier.discountPercent) || 0;
        if (pct <= 0) return 0;
        return Pricing.roundMoney(Math.max(0, (merch * pct) / 100));
    }

    function init() {
        ensureHeaderEntry();
        updateHeaderBadge(getState().points);
    }

    return {
        init,
        getState,
        getPoints,
        setPoints,
        addPoints,
        consumePoints,
        calcDiscountByPoints,
        calcEarnedPoints,
        calcTierDiscount,
        getTier,
        getTierBenefits,
        updateHeaderBadge,
    };
})();

// ==============================================
// Address Book (localStorage)
// - 目标：降低填写摩擦，提高下单转化
// ==============================================
const AddressBook = (function() {
    const storageKey = 'addressBook';
    const maxItems = 24;

    function normalizeEntry(raw) {
        const obj = raw && typeof raw === 'object' ? raw : {};
        const id = String(obj.id || '').trim() || Utils.generateId('ADDR-');
        const label = String(obj.label || '').trim().slice(0, 30);
        const name = String(obj.name || '').trim().slice(0, 40);
        const phone = String(obj.phone || '').trim().slice(0, 30);
        const address = String(obj.address || '').trim().slice(0, 160);
        const region = Pricing.getRegion(String(obj.region || '')).value;
        const isDefault = Boolean(obj.isDefault);
        const updatedAt = String(obj.updatedAt || new Date().toISOString());
        return { id, label, name, phone, address, region, isDefault, updatedAt };
    }

    function getAll() {
        const raw = Utils.readStorageJSON(storageKey, []);
        const list = Array.isArray(raw) ? raw : [];
        const normalized = list.map(normalizeEntry);
        // 默认地址优先，其次按更新时间倒序
        normalized.sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            return String(b.updatedAt).localeCompare(String(a.updatedAt));
        });
        return normalized.slice(0, maxItems);
    }

    function saveAll(list, options = {}) {
        const safe = (Array.isArray(list) ? list : []).map(normalizeEntry).slice(0, maxItems);
        // 保证最多一个默认地址
        let hasDefault = false;
        const fixed = safe.map((x) => {
            if (!x.isDefault) return x;
            if (!hasDefault) {
                hasDefault = true;
                return x;
            }
            return { ...x, isDefault: false };
        });
        Utils.writeStorageJSON(storageKey, fixed);
        if (!options.silent) Utils.dispatchChanged('addressbook');
        return fixed;
    }

    function getById(id) {
        const key = String(id || '').trim();
        if (!key) return null;
        return getAll().find((x) => x.id === key) || null;
    }

    function getDefault() {
        return getAll().find((x) => x.isDefault) || null;
    }

    function upsert(entry, options = {}) {
        const next = normalizeEntry(entry);
        const list = getAll();
        const idx = list.findIndex((x) => x.id === next.id);
        if (idx >= 0) {
            list[idx] = { ...list[idx], ...next, updatedAt: new Date().toISOString() };
        } else {
            list.unshift({ ...next, updatedAt: new Date().toISOString() });
        }
        if (next.isDefault) {
            list.forEach((x) => {
                x.isDefault = x.id === next.id;
            });
        }
        return saveAll(list, options);
    }

    function remove(id, options = {}) {
        const key = String(id || '').trim();
        if (!key) return false;
        const list = getAll();
        const next = list.filter((x) => x.id !== key);
        saveAll(next, options);
        return true;
    }

    function setDefault(id, options = {}) {
        const key = String(id || '').trim();
        if (!key) return false;
        const list = getAll();
        let changed = false;
        list.forEach((x) => {
            const next = x.id === key;
            if (x.isDefault !== next) changed = true;
            x.isDefault = next;
        });
        if (changed) saveAll(list, options);
        return changed;
    }

    function fillSelect(selectEl, options = {}) {
        if (!selectEl) return;
        const list = getAll();
        const includeEmpty = options.includeEmpty !== false;
        const currentDefault = getDefault();

        const items = [];
        if (includeEmpty) items.push('<option value="">选择常用地址（可选）</option>');
        list.forEach((x) => {
            const labelParts = [];
            if (x.label) labelParts.push(x.label);
            if (x.name) labelParts.push(x.name);
            if (x.phone) labelParts.push(x.phone);
            const title = labelParts.length > 0 ? labelParts.join(' · ') : '常用地址';
            const desc = x.address ? ` - ${x.address}` : '';
            items.push(`<option value="${Utils.escapeHtml(x.id)}">${Utils.escapeHtml(`${title}${desc}`)}</option>`);
        });

        selectEl.innerHTML = items.join('');
        if (currentDefault && !selectEl.value) {
            selectEl.value = currentDefault.id;
        }
    }

    function applyToCheckoutForm(entry, checkoutForm) {
        const e = entry && typeof entry === 'object' ? entry : null;
        if (!e || !checkoutForm) return false;

        const nameInput = checkoutForm.querySelector('#name');
        const phoneInput = checkoutForm.querySelector('#phone');
        const addressInput = checkoutForm.querySelector('#address');
        const regionSelect = checkoutForm.querySelector('#region');

        if (nameInput) nameInput.value = String(e.name || '');
        if (phoneInput) phoneInput.value = String(e.phone || '');
        if (addressInput) addressInput.value = String(e.address || '');
        if (regionSelect) regionSelect.value = Pricing.getRegion(String(e.region || '')).value;

        return true;
    }

    function init() {
        // 暂无全局绑定；由 Checkout / AccountPage 负责具体交互
        try {
            window.addEventListener('addressbook:changed', () => {
                // 触发结算页重绘（如果存在）
                Checkout?.refresh?.();
            });
        } catch {
            // ignore
        }
    }

    return {
        init,
        getAll,
        getById,
        getDefault,
        upsert,
        remove,
        setDefault,
        fillSelect,
        applyToCheckoutForm,
    };
})();

// ==============================================
// Price Alerts (localStorage)
// - 目标：刺激转化/召回（降价触发提示 + 提醒中心管理）
// ==============================================
const PriceAlerts = (function() {
    const storageKey = 'priceAlerts';
    const cooldownHours = 12;

    let dialogEl = null;
    let dialogProductId = null;

    function normalizeAlert(raw) {
        const obj = raw && typeof raw === 'object' ? raw : {};
        const productId = String(obj.productId || '').trim();
        if (!productId) return null;
        const targetPrice = Number(obj.targetPrice);
        const safeTarget = Number.isFinite(targetPrice) && targetPrice >= 0 ? Pricing.roundMoney(targetPrice) : 0;
        const enabled = obj.enabled !== false;
        const createdAt = String(obj.createdAt || new Date().toISOString());
        const lastNotifiedAt = String(obj.lastNotifiedAt || '');
        return { productId, targetPrice: safeTarget, enabled, createdAt, lastNotifiedAt };
    }

    function getAll() {
        const raw = Utils.readStorageJSON(storageKey, []);
        const list = Array.isArray(raw) ? raw : [];
        return list.map(normalizeAlert).filter(Boolean);
    }

    function saveAll(list, options = {}) {
        const safe = (Array.isArray(list) ? list : []).map(normalizeAlert).filter(Boolean);
        Utils.writeStorageJSON(storageKey, safe);
        if (!options.silent) Utils.dispatchChanged('pricealerts');
        return safe;
    }

    function getByProductId(productId) {
        const key = String(productId || '').trim();
        if (!key) return null;
        return getAll().find((x) => x.productId === key) || null;
    }

    function isWatching(productId) {
        return Boolean(getByProductId(productId));
    }

    function set(productId, targetPrice) {
        const key = String(productId || '').trim();
        if (!key) return null;
        const list = getAll();
        const next = normalizeAlert({ productId: key, targetPrice, enabled: true, createdAt: new Date().toISOString() });
        const idx = list.findIndex((x) => x.productId === key);
        if (idx >= 0) list[idx] = { ...list[idx], ...next, createdAt: list[idx].createdAt || next.createdAt };
        else list.unshift(next);
        saveAll(list);
        return next;
    }

    function remove(productId) {
        const key = String(productId || '').trim();
        if (!key) return false;
        const list = getAll();
        const next = list.filter((x) => x.productId !== key);
        saveAll(next);
        return true;
    }

    function update(productId, patch) {
        const key = String(productId || '').trim();
        if (!key) return null;
        const list = getAll();
        const idx = list.findIndex((x) => x.productId === key);
        if (idx < 0) return null;
        list[idx] = normalizeAlert({ ...list[idx], ...(patch || {}), productId: key }) || list[idx];
        saveAll(list);
        return list[idx];
    }

    function ensureDialog() {
        if (dialogEl) return dialogEl;
        if (!('HTMLDialogElement' in window)) return null;

        const dialog = document.createElement('dialog');
        dialog.className = 'glass-dialog price-alert-dialog';
        dialog.setAttribute('aria-label', '降价提醒设置');
        dialog.innerHTML = `
            <form method="dialog" class="glass-dialog__card">
                <div class="glass-dialog__header">
                    <h3 class="glass-dialog__title">降价提醒</h3>
                    <p class="glass-dialog__subtitle text-muted">设置目标价，达到后将提示你（本地模拟）。</p>
                </div>
                <div class="glass-dialog__body">
                    <div class="glass-dialog__row">
                        <span class="text-muted">商品</span>
                        <span class="glass-dialog__product" data-pa-product>—</span>
                    </div>
                    <div class="glass-dialog__row">
                        <label class="glass-dialog__label" for="pa-target">目标价</label>
                        <input id="pa-target" class="glass-dialog__input" type="number" inputmode="decimal" min="0" step="0.01" data-pa-target placeholder="例如 299.00" required>
                    </div>
                    <div class="glass-dialog__hint text-muted" data-pa-hint>—</div>
                </div>
                <div class="glass-dialog__actions">
                    <button value="cancel" class="cta-button-secondary" type="button" data-pa-cancel>取消</button>
                    <button value="confirm" class="cta-button" type="submit">保存提醒</button>
                </div>
            </form>
        `;

        document.body.appendChild(dialog);
        const cancelBtn = dialog.querySelector('[data-pa-cancel]');
        cancelBtn?.addEventListener?.('click', () => {
            try { dialog.close('cancel'); } catch { /* ignore */ }
        });

        dialog.addEventListener('close', () => {
            const action = String(dialog.returnValue || '');
            if (action !== 'confirm') return;
            const input = dialog.querySelector('[data-pa-target]');
            const value = Number(input?.value);
            if (!dialogProductId || !Number.isFinite(value) || value < 0) return;
            const next = set(dialogProductId, value);
            if (typeof Toast !== 'undefined' && Toast.show && next) {
                Toast.show(`已设置降价提醒：目标价 ${Pricing.formatCny(next.targetPrice)}`, 'success', 2000);
            }
        });

        dialogEl = dialog;
        return dialogEl;
    }

    function openDialog(productId) {
        const key = String(productId || '').trim();
        if (!key) return false;
        const product = SharedData?.getProductById?.(key);
        if (!product) {
            Toast?.show?.('商品信息加载失败', 'info', 1600);
            return false;
        }

        const currentPrice = typeof product.price === 'number' ? product.price : Number(product.price) || 0;
        const existing = getByProductId(key);

        const dialog = ensureDialog();
        if (!dialog) {
            // Fallback：系统 prompt（尽量少用，但保证可用）
            const suggested = existing ? existing.targetPrice : currentPrice;
            const raw = window.prompt(`设置“${product.name}”降价提醒目标价（当前价：${Pricing.formatCny(currentPrice)}）`, String(suggested));
            if (raw == null) return false;
            const v = Number(raw);
            if (!Number.isFinite(v) || v < 0) {
                Toast?.show?.('请输入有效的目标价格', 'info', 1600);
                return false;
            }
            set(key, v);
            Toast?.show?.(`已设置降价提醒：目标价 ${Pricing.formatCny(Pricing.roundMoney(v))}`, 'success', 2000);
            return true;
        }

        dialogProductId = key;
        const productEl = dialog.querySelector('[data-pa-product]');
        const input = dialog.querySelector('[data-pa-target]');
        const hint = dialog.querySelector('[data-pa-hint]');
        if (productEl) productEl.textContent = String(product.name || key);
        if (input) input.value = String(existing ? existing.targetPrice : Pricing.roundMoney(currentPrice));
        if (hint) hint.textContent = `当前价：${Pricing.formatCny(currentPrice)}，达到目标价将提示你。`;

        try {
            dialog.showModal();
            if (typeof Cinematic !== 'undefined' && Cinematic.toggleBlock) {
                // dialog 自带展示，这里仅做轻量入场加成
                const card = dialog.querySelector('.glass-dialog__card');
                if (card && globalThis.Motion?.animate && !Utils.prefersReducedMotion()) {
                    globalThis.Motion.animate(card, { opacity: [0, 1], y: [14, 0], filter: ['blur(10px)', 'blur(0px)'] }, { duration: 0.32 });
                }
            }
            input?.focus?.();
        } catch {
            // ignore
        }
        return true;
    }

    function syncButtons(root) {
        const scope = root && root.querySelectorAll ? root : document;
        const buttons = scope.querySelectorAll('[data-price-alert][data-product-id]');
        if (!buttons.length) return;

        const byId = new Map(getAll().map((x) => [x.productId, x]));
        buttons.forEach((btn) => {
            const id = btn.dataset.productId;
            const hit = id ? byId.get(id) : null;
            btn.classList.toggle('is-active', Boolean(hit));
            btn.setAttribute('aria-pressed', hit ? 'true' : 'false');
            const label = hit ? '已提醒' : '降价提醒';
            const textEl = btn.querySelector?.('.alert-btn__text, .product-card__alert-text');
            if (textEl) textEl.textContent = label;
            else btn.textContent = label;
        });
    }

    function checkAndNotify() {
        const list = getAll();
        if (!list.length) return;
        if (!SharedData?.getProductById) return;

        const now = Date.now();
        const cooldownMs = 1000 * 60 * 60 * cooldownHours;
        let touched = false;

        list.forEach((a) => {
            if (!a.enabled) return;
            const product = SharedData.getProductById(a.productId);
            if (!product) return;
            const price = typeof product.price === 'number' ? product.price : Number(product.price) || 0;
            if (!Number.isFinite(price)) return;
            if (price > a.targetPrice) return;

            const last = Date.parse(a.lastNotifiedAt || '');
            if (Number.isFinite(last) && (now - last) < cooldownMs) return;

            touched = true;
            a.lastNotifiedAt = new Date().toISOString();
            Toast?.show?.(`降价提醒：${String(product.name || '').trim() || '商品'} 已降至 ${Pricing.formatCny(price)}`, 'success', 2600);
        });

        if (touched) saveAll(list, { silent: true });
    }

    function bind() {
        document.addEventListener('click', (event) => {
            const btn = event.target?.closest?.('[data-price-alert][data-product-id]');
            if (!btn) return;
            event.preventDefault();
            event.stopPropagation();
            const id = btn.dataset.productId;
            if (!id) return;
            openDialog(id);
        });

        try {
            window.addEventListener('pricealerts:changed', () => syncButtons(document));
        } catch {
            // ignore
        }

        // 重新回到前台时检查一次（模拟价格变化触发）
        try {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') checkAndNotify();
            });
        } catch {
            // ignore
        }
    }

    function init() {
        bind();
        syncButtons(document);
        checkAndNotify();
    }

    return {
        init,
        getAll,
        getByProductId,
        isWatching,
        set,
        remove,
        update,
        openDialog,
        syncButtons,
        checkAndNotify,
    };
})();

// ==============================================
// 关注中心（到货/降价/趋势）
// ==============================================
const WatchCenter = (function() {
    const storageKey = 'sbWatchCenter';

    function normalizeState(raw) {
        const obj = raw && typeof raw === 'object' ? raw : {};
        return {
            restockAlerts: Utils.normalizeStringArray(obj.restockAlerts || []),
            priceAlerts: Utils.normalizeStringArray(obj.priceAlerts || []),
        };
    }

    function getState() {
        return normalizeState(Utils.readStorageJSON(storageKey, {}));
    }

    function saveState(state) {
        const next = normalizeState(state);
        Utils.writeStorageJSON(storageKey, next);
        Utils.dispatchChanged('watchcenter');
        return next;
    }

    function isRestockWatching(productId) {
        const id = String(productId || '').trim();
        if (!id) return false;
        return getState().restockAlerts.includes(id);
    }

    function toggleRestock(productId) {
        const id = String(productId || '').trim();
        if (!id) return null;
        const state = getState();
        const exists = state.restockAlerts.includes(id);
        const next = exists
            ? state.restockAlerts.filter((x) => x !== id)
            : [id, ...state.restockAlerts];
        saveState({ ...state, restockAlerts: next });
        return !exists;
    }

    function getTrend(productId) {
        const id = String(productId || '').trim();
        if (!id) return { delta: 0, direction: 'flat' };
        const history = StorageKit.getPriceHistory()[id] || [];
        if (history.length < 2) return { delta: 0, direction: 'flat' };
        const start = Number(history[0]?.price) || 0;
        const end = Number(history[history.length - 1]?.price) || 0;
        const delta = Pricing.roundMoney(end - start);
        const direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
        return { delta, direction };
    }

    function getUnifiedList() {
        const favIds = typeof Favorites !== 'undefined' && Favorites.getIds
            ? Favorites.getIds()
            : Utils.normalizeStringArray(Utils.readStorageJSON('favorites', []));
        const priceAlertIds = (PriceAlerts?.getAll?.() || []).map((a) => a.productId);
        const restockIds = getState().restockAlerts;
        const allIds = Array.from(new Set([...favIds, ...priceAlertIds, ...restockIds]));

        return allIds
            .map((id) => {
                const product = SharedData?.getProductById?.(id);
                if (!product) return null;
                const trend = getTrend(id);
                return {
                    id,
                    product,
                    isFavorite: favIds.includes(id),
                    hasPriceAlert: priceAlertIds.includes(id),
                    hasRestock: restockIds.includes(id),
                    trend,
                };
            })
            .filter(Boolean);
    }

    function init() {
        try {
            window.addEventListener('pricealerts:changed', () => Utils.dispatchChanged('watchcenter'));
            window.addEventListener('favorites:changed', () => Utils.dispatchChanged('watchcenter'));
            window.addEventListener('pricehistory:changed', () => Utils.dispatchChanged('watchcenter'));
        } catch {
            // 忽略监听异常
        }
    }

    return { init, getState, isRestockWatching, toggleRestock, getUnifiedList, getTrend };
})();

// ==============================================
// Data Portability / Backup (localStorage)
// - 导出/导入/重置：帮助用户迁移本地模拟数据
// - 仅操作本地 localStorage，不进行网络上传
// ==============================================
const DataPortability = (function() {
    const backupSchema = 'shouwban.backup.v1';

    const keyWhitelist = Object.freeze([
        // UX / settings
        'theme',
        'a11y',
        'shippingRegion',
        'pwaInstallDismissedAt',

        // Core flows
        'cart',
        'promotion',
        'checkoutDraft',
        'orders',

        // Personalization
        'favorites',
        'compare',
        'recentlyViewed',

        // Membership
        'rewards',
        'useRewardsPoints',
        'sbMembership',

        // Address / alerts
        'addressBook',
        'priceAlerts',
        'sbWatchCenter',
        'sbPriceHistory',
        'sbBundleCart',
        'sbOrderTimeline',
        'sbInventoryOverrides',

        // Listing preferences
        'plpSort',
        'plpFilter',
        'plpViewMode',
        'plpFiltersV2',

        // Optional: local telemetry queue/config (if present)
        'sbTelemetryQueue',
        'sbTelemetryEndpoint',
        // Optional: local logs
        'sbLogs',
    ]);

    function safeNowIso() {
        try {
            return new Date().toISOString();
        } catch {
            return '';
        }
    }

    function formatDateForFile(isoString) {
        const iso = String(isoString || '');
        if (!iso) return 'unknown-date';
        return iso.replace(/[:.]/g, '').replace('T', '-').replace('Z', '');
    }

    function downloadText(filename, text) {
        const name = String(filename || '').trim() || 'shouwban-backup.json';
        const payload = String(text ?? '');

        try {
            const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.rel = 'noopener';
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            a.remove();
            try { URL.revokeObjectURL(url); } catch { /* ignore */ }
            return true;
        } catch {
            return false;
        }
    }

    function buildExportObject() {
        const out = {
            schema: backupSchema,
            createdAt: safeNowIso(),
            origin: (() => {
                try { return String(window.location.origin || ''); } catch { return ''; }
            })(),
            userAgent: (() => {
                try { return String(navigator.userAgent || ''); } catch { return ''; }
            })(),
            keys: {},
        };

        // Export raw strings to preserve SB_* binary prefixes and avoid re-encoding.
        try {
            keyWhitelist.forEach((k) => {
                const key = String(k || '').trim();
                if (!key) return;
                const value = localStorage.getItem(key);
                if (typeof value === 'string') out.keys[key] = value;
            });
        } catch {
            // ignore
        }

        return out;
    }

    function validateImportObject(data) {
        if (!data || typeof data !== 'object') return { ok: false, error: '备份文件格式不正确（不是对象）。' };
        if (String(data.schema || '') !== backupSchema) return { ok: false, error: '备份文件 schema 不匹配。' };
        if (!data.keys || typeof data.keys !== 'object') return { ok: false, error: '备份文件缺少 keys 字段。' };

        const keys = data.keys;
        const allowed = new Set(keyWhitelist);
        const accepted = {};

        for (const rawKey of Object.keys(keys)) {
            const key = String(rawKey || '').trim();
            if (!key || !allowed.has(key)) continue;
            const value = keys[rawKey];
            if (typeof value !== 'string') continue;
            accepted[key] = value;
        }

        const acceptedCount = Object.keys(accepted).length;
        if (acceptedCount === 0) return { ok: false, error: '备份文件中未发现可导入的数据键。' };

        return { ok: true, accepted };
    }

    function applyImport(accepted) {
        if (!accepted || typeof accepted !== 'object') return false;
        try {
            Object.keys(accepted).forEach((k) => {
                localStorage.setItem(k, String(accepted[k] ?? ''));
            });
            return true;
        } catch {
            return false;
        }
    }

    function resetAll() {
        const ok = window.confirm(
            '确定要清空本机浏览器中保存的所有示例数据吗？\\n\\n将清空：购物车/收藏/对比/订单/积分/地址簿/降价提醒/筛选偏好等。',
        );
        if (!ok) return false;

        try {
            keyWhitelist.forEach((k) => {
                try { localStorage.removeItem(String(k || '')); } catch { /* ignore */ }
            });
        } catch {
            // ignore
        }

        Toast?.show?.('已清空本地数据，将刷新页面…', 'success', 1600);
        setTimeout(() => {
            try { window.location.reload(); } catch { /* ignore */ }
        }, 380);
        return true;
    }

    function exportBackup() {
        const data = buildExportObject();
        const json = JSON.stringify(data, null, 2);
        const stamp = formatDateForFile(data.createdAt);
        const filename = `shouwban-backup-${stamp}.json`;
        const ok = downloadText(filename, json);
        Toast?.show?.(ok ? '备份已导出（本地下载）' : '导出失败，请检查浏览器权限', ok ? 'success' : 'error', 1800);
        return ok;
    }

    async function importBackupFromFile(file) {
        const f = file;
        if (!f) return false;

        const name = String(f.name || '').trim();
        const tooLarge = typeof f.size === 'number' && f.size > 2 * 1024 * 1024;
        if (tooLarge) {
            Toast?.show?.('备份文件过大（>2MB），已拒绝导入。', 'error', 2200);
            return false;
        }

        try {
            const text = await f.text();
            const parsed = Utils.safeJsonParse(text, null);
            const r = validateImportObject(parsed);
            if (!r.ok) {
                Toast?.show?.(r.error || '备份文件不可导入。', 'error', 2200);
                return false;
            }

            const keyCount = Object.keys(r.accepted).length;
            const ok = window.confirm(`检测到可导入数据键：${keyCount} 个。\\n\\n导入将覆盖当前本机数据。是否继续？`);
            if (!ok) return false;

            const applied = applyImport(r.accepted);
            if (!applied) {
                Toast?.show?.('导入失败：无法写入本地存储。', 'error', 2200);
                return false;
            }

            Toast?.show?.(`导入成功（${keyCount} 项），将刷新页面…`, 'success', 1800);
            setTimeout(() => {
                try { window.location.reload(); } catch { /* ignore */ }
            }, 520);

            return true;
        } catch {
            Toast?.show?.(`导入失败：无法读取文件 ${name ? `(${name})` : ''}`, 'error', 2400);
            return false;
        }
    }

    return {
        exportBackup,
        importBackupFromFile,
        resetAll,
    };
})();

// ==============================================
// Error Shield / Error Boundary (global)
// ==============================================
const ErrorShield = createErrorShield({ Toast, Logger, Telemetry, DataPortability, Utils });

// ==============================================
// Service Worker Module (PWA offline support)
// ==============================================
const ServiceWorker = (function() {
    function canRegister() {
        try {
            if (!('serviceWorker' in navigator)) return false;
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            return window.location.protocol === 'https:' || isLocalhost;
        } catch {
            return false;
        }
    }

    async function init() {
        if (!canRegister()) return;
        try {
            const registration = await navigator.serviceWorker.register('sw.js');
            // 更新策略（渐进增强）：提示用户刷新，避免强制 reload 造成状态丢失
            const hadController = Boolean(navigator.serviceWorker.controller);
            let shouldReload = false;
            let didPrompt = false;

            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!hadController) return; // 首次安装：不自动刷新
                if (!shouldReload) return;  // 未确认更新：不刷新
                window.location.reload();
            });

            const promptUpdate = (worker) => {
                if (!worker) return;
                if (!hadController) return;
                if (didPrompt) return;
                didPrompt = true;

                const runUpdate = () => {
                    try {
                        shouldReload = true;
                        worker.postMessage({ type: 'SKIP_WAITING' });
                    } catch {
                        // ignore
                    }
                };

                try {
                    if (typeof Toast !== 'undefined' && Toast.show) {
                        Toast.show({
                            title: '发现新版本',
                            message: '点击刷新以启用最新资源与离线缓存。',
                            type: 'info',
                            durationMs: 7000,
                            actionLabel: '刷新',
                            onAction: () => runUpdate(),
                        });
                        return;
                    }
                } catch {
                    // ignore
                }

                // Fallback：无 Toast UI 时，保持旧行为（自动更新）。
                runUpdate();
            };

            // 如果已经处于 waiting，提示用户更新
            if (registration.waiting) promptUpdate(registration.waiting);

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        promptUpdate(newWorker);
                    }
                });
            });
        } catch (e) {
            console.warn('ServiceWorker 注册失败（可忽略）:', e);
        }
    }

    return { init };
})();

// ==============================================
// PWA Install Prompt Helper (beforeinstallprompt)
// ==============================================
const PWAInstall = (function() {
    const dismissedKey = 'pwaInstallDismissedAt';
    const cooldownDays = 14;

    let deferredPrompt = null;
    let installBtn = null;

    function isDismissedRecently() {
        const raw = Utils.readStorageJSON(dismissedKey, null);
        const t = Date.parse(String(raw || ''));
        if (!Number.isFinite(t)) return false;
        return (Date.now() - t) < (1000 * 60 * 60 * 24 * cooldownDays);
    }

    function markDismissed() {
        Utils.writeStorageJSON(dismissedKey, new Date().toISOString());
    }

    function ensureButton() {
        const actions = document.querySelector('.header__actions');
        if (!actions) return null;

        installBtn = actions.querySelector('.header__install-link');
        if (installBtn) return installBtn;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'header__action-link header__install-link';
        btn.setAttribute('aria-label', '安装应用');
        btn.title = '安装为桌面应用（PWA）';
        btn.style.display = 'none';
        btn.innerHTML = Icons.svgHtml('icon-download');

        const themeToggle = actions.querySelector('.header__theme-toggle');
        if (themeToggle) actions.insertBefore(btn, themeToggle);
        else actions.appendChild(btn);

        installBtn = btn;
        return installBtn;
    }

    function setVisible(visible) {
        const btn = ensureButton();
        if (!btn) return;
        btn.style.display = visible ? 'inline-flex' : 'none';
    }

    async function handleInstallClick() {
        if (!deferredPrompt) return;
        try {
            deferredPrompt.prompt();
            const choice = await deferredPrompt.userChoice;
            const outcome = choice?.outcome || 'dismissed';
            if (outcome !== 'accepted') {
                markDismissed();
                if (typeof Toast !== 'undefined' && Toast.show) {
                    Toast.show('已稍后再说，可随时从菜单重新安装', 'info', 2200);
                }
            } else if (typeof Toast !== 'undefined' && Toast.show) {
                Toast.show('安装已触发：可从桌面/应用列表打开', 'success', 2400);
            }
        } catch {
            // ignore
        } finally {
            deferredPrompt = null;
            setVisible(false);
        }
    }

    function init() {
        const btn = ensureButton();
        btn?.addEventListener?.('click', handleInstallClick);

        window.addEventListener('beforeinstallprompt', (event) => {
            // Chrome/Edge only; requires secure context
            try { event.preventDefault(); } catch { /* ignore */ }
            deferredPrompt = event;
            if (!isDismissedRecently()) setVisible(true);
        });

        window.addEventListener('appinstalled', () => {
            deferredPrompt = null;
            setVisible(false);
            if (typeof Toast !== 'undefined' && Toast.show) {
                Toast.show('应用已安装', 'success', 1800);
            }
        });
    }

    return { init };
})();

// ==============================================
// Shared Data (Simulated)
// ==============================================
const SharedData = (function() {
    const rawProducts = [
        // Scale Figures
        { 
            id: 'P001', 
            name: '初音未来 魔法未来 2023 Ver.', 
            category: { name: '比例手办', key: 'scale' }, 
            series: 'Character Vocal Series 01 初音未来', 
            price: 899.00, 
            originalPrice: 999.00, 
            description: '<p>以魔法未来2023主视觉形象为原型制作的1/7比例手办登场！由 LAM 绘制的充满活力的初音未来形象立体化。</p><p>服装细节、带有层次感的发型以及充满跃动感的姿态都经过精心制作。敬请将充满庆典氛围的特别版初音未来带回家吧！</p>', 
            specs: [ 
                { label: '制造商', value: 'Good Smile Company' }, 
                { label: '分类', value: '1/7比例手办' }, 
                { label: '发售日期', value: '2024/08' }, 
                { label: '原型制作', value: 'カタハライタシ' }, 
                { label: '材质', value: '塑料制' }, 
                { label: '尺寸', value: '全高约250mm' } 
            ], 
            images: [ 
                { thumb: 'assets/images/figurine-1.svg', large: 'assets/images/figurine-1.svg', alt: '初音未来 魔法未来 2023 正面图' },
                { thumb: 'assets/images/figurine-2.svg', large: 'assets/images/figurine-2.svg', alt: '初音未来 魔法未来 2023 侧面图' },
                { thumb: 'assets/images/figurine-3.svg', large: 'assets/images/figurine-3.svg', alt: '初音未来 魔法未来 2023 背面图' },
                { thumb: 'assets/images/figurine-4.svg', large: 'assets/images/figurine-4.svg', alt: '初音未来 魔法未来 2023 特写图' }
            ],
            dateAdded: '2024-01-15' // Keep dateAdded for sorting
        },
        { 
            id: 'P002', 
            name: '艾尔登法环 梅琳娜', 
            category: { name: '比例手办', key: 'scale' }, 
            series: '艾尔登法环', 
            price: 750.00, 
            description: '<p>《艾尔登法环》中的关键角色，引导褪色者前进的防火女梅琳娜，以优雅的姿态手办化。</p>', 
            specs: [
                { label: '制造商', value: 'Max Factory' }, 
                { label: '比例', value: '1/7' }, 
                { label: '材质', value: 'PVC & ABS' }
            ], 
            images: [
                { thumb: 'assets/images/figurine-2.svg', large: 'assets/images/figurine-2.svg', alt: '梅琳娜 正面' }
            ],
            dateAdded: '2024-01-10'
        },
        { 
            id: 'P006', // Match ID from original listing data
            name: '莱莎的炼金工房 莱莎琳·斯托特', 
            category: { name: '比例手办', key: 'scale' }, 
            series: '莱莎的炼金工房', 
            price: 920.00, 
            description: '<p>《莱莎的炼金工房～常暗女王与秘密藏身处～》中的主角「莱莎琳‧斯托特」化身为比例模型！</p>', 
            specs: [
                { label: '制造商', value: 'Good Smile Company' },
                { label: '比例', value: '1/7' },
                { label: '发售日期', value: '2021/11' } 
            ],
            images: [
                { thumb: 'assets/images/figurine-6.svg', large: 'assets/images/figurine-6.svg', alt: '莱莎琳·斯托特' } // Using placeholder as large for now
            ],
            dateAdded: '2023-12-20'
        },
        // Nendoroids
        { 
            id: 'P003', 
            name: '粘土人 孤独摇滚 后藤一里', 
            category: { name: '粘土人', key: 'nendoroid' }, 
            series: '孤独摇滚！', 
            price: 320.00, 
            description: '<p>来自超人气动画《孤独摇滚！》，主角"小孤独"后藤一里化身为粘土人登场！附带多种表情和配件，再现剧中的各种名场面吧！</p>', 
            specs: [
                { label: '制造商', value: 'Good Smile Company' }, 
                { label: '系列', value: '粘土人' }, 
                { label: '尺寸', value: '全高约100mm' }
            ], 
            images: [
                { thumb: 'assets/images/figurine-3.svg', large: 'assets/images/figurine-3.svg', alt: '后藤一里 粘土人' }
            ],
            dateAdded: '2024-02-01'
        },
        { 
            id: 'P007', 
            name: '粘土人 间谍过家家 阿尼亚·福杰', 
            category: { name: '粘土人', key: 'nendoroid' }, 
            series: '间谍过家家', 
            price: 299.00, 
            description: '<p>出自电视动画《SPY×FAMILY 间谍过家家》，「阿尼亚·福杰」化身为粘土人！</p>', 
            specs: [
                { label: '制造商', value: 'Good Smile Arts Shanghai' },
                { label: '系列', value: '粘土人' },
                { label: '尺寸', value: '全高约100mm' }
            ],
            images: [
                { thumb: 'assets/images/figurine-1.svg', large: 'assets/images/figurine-1.svg', alt: '阿尼亚·福杰 粘土人' }
            ],
            dateAdded: '2023-11-05'
        },
         { 
            id: 'P008', 
            name: '粘土人 电锯人 帕瓦', 
            category: { name: '粘土人', key: 'nendoroid' }, 
            series: '电锯人', 
            price: 310.00, 
            description: '<p>出自电视动画《链锯人》，「帕瓦」化身为粘土人登场！</p>', 
             specs: [
                { label: '制造商', value: 'Good Smile Company' },
                { label: '系列', value: '粘土人' },
                { label: '尺寸', value: '全高约100mm' }
            ],
             images: [
                 { thumb: 'assets/images/figurine-2.svg', large: 'assets/images/figurine-2.svg', alt: '帕瓦 粘土人' }
            ],
             dateAdded: '2024-01-25' 
        },
        // Figma
         { 
            id: 'P004', 
            name: 'figma 鬼灭之刃 灶门炭治郎 DX版', 
            category: { name: 'Figma', key: 'figma' }, 
            series: '鬼灭之刃', 
            price: 580.00, 
             description: '<p>出自电视动画《鬼灭之刃》，主角「灶门炭治郎」化身为figma可动模型再次登场！DX版追加丰富配件。</p>', 
             specs: [
                 { label: '制造商', value: 'Max Factory' },
                 { label: '系列', value: 'figma' },
                 { label: '尺寸', value: '全高约135mm' }
            ],
             images: [
                 { thumb: 'assets/images/figurine-4.svg', large: 'assets/images/figurine-4.svg', alt: '灶门炭治郎 figma' }
            ],
             dateAdded: '2023-10-15' 
        },
         { 
            id: 'P009', 
            name: 'figma 赛马娘 Pretty Derby 东海帝皇', 
            category: { name: 'Figma', key: 'figma' }, 
            series: '赛马娘 Pretty Derby', 
            price: 550.00, 
             description: '<p>出自游戏《赛马娘Pretty Derby》，不屈的赛马娘「东海帝皇」化身为figma模型登场！</p>', 
             specs: [
                 { label: '制造商', value: 'Max Factory' },
                 { label: '系列', value: 'figma' },
                 { label: '尺寸', value: '全高约130mm' }
            ],
             images: [
                 { thumb: 'assets/images/figurine-3.svg', large: 'assets/images/figurine-3.svg', alt: '东海帝皇 figma' }
            ],
             dateAdded: '2024-02-10' 
        },
        // Other
         { 
            id: 'P005', 
            name: 'POP UP PARADE hololive 噶呜·古拉', 
            category: { name: '其他手办', key: 'other' }, 
            series: 'hololive production', 
            price: 250.00, 
             description: '<p>「POP UP PARADE」是全新的模型系列商品，让人不禁手滑订购的亲民价格、方便摆饰的全高17～18cm尺寸、短期内发售等，拥有令模型粉丝开心的各项特点。</p>', 
             specs: [
                 { label: '制造商', value: 'Good Smile Company' },
                 { label: '系列', value: 'POP UP PARADE' },
                 { label: '尺寸', value: '全高约160mm' }
            ],
             images: [
                 { thumb: 'assets/images/figurine-5.svg', large: 'assets/images/figurine-5.svg', alt: '噶呜·古拉 POP UP PARADE' }
            ],
             dateAdded: '2023-09-30' 
        },
         { 
            id: 'P010', 
            name: 'MODEROID PUI PUI 天竺鼠车车', 
            category: { name: '其他手办', key: 'other' }, 
            series: 'PUI PUI 天竺鼠车车', 
            price: 180.00, 
             description: '<p>出自超人气定格动画《PUI PUI 天竺鼠车车》，天竺鼠车车们化身为组装模型！</p>', 
             specs: [
                 { label: '制造商', value: 'Good Smile Company' },
                 { label: '系列', value: 'MODEROID' },
                 { label: '分类', value: '组装模型' }
            ],
             images: [
                 { thumb: 'assets/images/figurine-4.svg', large: 'assets/images/figurine-4.svg', alt: '天竺鼠车车 MODEROID' }
            ],
             dateAdded: '2023-11-20' 
        }
    ];

    const allProducts = rawProducts.map((product, index) => {
        const rating = Number.isFinite(Number(product.rating))
            ? Number(product.rating)
            : Number((4.6 + (index % 4) * 0.1).toFixed(1));
        const reviewCount = Number.isFinite(Number(product.reviewCount))
            ? Number(product.reviewCount)
            : 120 + index * 27;
        const rarity = typeof product.rarity === 'string' ? product.rarity : (index % 3 === 0 ? '限定' : '常规');
        const status = typeof product.status === 'string' ? product.status : (index % 4 === 0 ? '预售' : '现货');
        const tags = Array.isArray(product.tags) ? [...product.tags] : [];

        if (rarity === '限定' && !tags.includes('limited')) tags.push('limited');
        if (status === '预售' && !tags.includes('preorder')) tags.push('preorder');
        if (rating >= 4.8 && !tags.includes('hot')) tags.push('hot');

        const dateAdded = product.dateAdded
            ? product.dateAdded
            : new Date(2024, 0, 1 + index * 18).toISOString().slice(0, 10);
        const rawInventory = product.inventory && typeof product.inventory === 'object' ? product.inventory : null;
        const baseStock = Math.max(0, 4 + (index * 3) % 12);
        const preorder = status === '预售' || Boolean(rawInventory?.preorder);
        const stock = Number.isFinite(Number(rawInventory?.stock))
            ? Math.max(0, Math.floor(Number(rawInventory.stock)))
            : (preorder ? 0 : baseStock);
        const eta = typeof rawInventory?.eta === 'string'
            ? rawInventory.eta
            : (preorder ? '2026/04' : '');
        const inventory = { stock, preorder, eta };

        return {
            ...product,
            rating,
            reviewCount,
            rarity,
            status,
            tags,
            dateAdded,
            inventory,
        };
    });

    // 预构建索引：避免每次查找都 O(n) 扫描 / 重建 Map
    const productMap = new Map(allProducts.map((item) => [String(item.id || '').trim(), item]));

    const categoryNames = {
        scale: '比例手办',
        nendoroid: '粘土人',
        figma: 'Figma',
        other: '其他手办',
        all: '所有手办'
    };

    function normalizeProductId(raw) {
        const key = String(raw || '').trim();
        if (!key) return '';
        // 压测/虚拟列表会生成形如 "P001__S12345" 的 ID：运行时统一映射回基础商品
        const stressPos = key.indexOf('__S');
        if (stressPos > 0) return key.slice(0, stressPos);
        return key;
    }

    function getProductById(id) {
        const key = normalizeProductId(id);
        if (!key) return null;
        return productMap.get(key) || null;
    }

    function getProductsByIds(ids) {
        const list = Array.isArray(ids) ? ids : [];
        if (list.length === 0) return [];
        return list.map((id) => getProductById(id)).filter(Boolean);
    }

    function getCurationProducts(key) {
        const list = [...allProducts];
        if (key === 'hot') {
            return list.filter((p) => p.tags?.includes('hot')).slice(0, 6);
        }
        if (key === 'new') {
            return list
                .sort((a, b) => Date.parse(b.dateAdded || '') - Date.parse(a.dateAdded || ''))
                .slice(0, 6);
        }
        if (key === 'limited') {
            return list.filter((p) => p.tags?.includes('limited')).slice(0, 6);
        }
        return list.slice(0, 6);
    }

    return {
        getAllProducts: () => allProducts,
        getCategoryName: (key) => categoryNames[key] || key, // Helper to get category name
        getProductById,
        getProductsByIds,
        getCurationProducts
    };
})();

// ==============================================
// Inventory Pulse（库存/预售状态）
// ==============================================
const InventoryPulse = (function() {
    const lowStockThreshold = 3;

    function normalize(raw) {
        const helper = globalThis.ShouwbanCore?.normalizeInventory;
        if (typeof helper === 'function') return helper(raw);
        const obj = raw && typeof raw === 'object' ? raw : {};
        const stock = Math.max(0, Math.floor(Number(obj.stock) || 0));
        const preorder = Boolean(obj.preorder);
        const eta = typeof obj.eta === 'string' ? obj.eta.trim() : '';
        return { stock, preorder, eta };
    }

    function getOverrides() {
        const raw = Utils.readStorageJSON('sbInventoryOverrides', {});
        return raw && typeof raw === 'object' ? raw : {};
    }

    function getInfo(productOrId) {
        const id = typeof productOrId === 'string' ? productOrId : String(productOrId?.id || '');
        const product = typeof productOrId === 'object'
            ? productOrId
            : (SharedData?.getProductById?.(id) || null);
        const base = normalize(product?.inventory);
        const overrides = getOverrides();
        const override = overrides && typeof overrides === 'object' ? overrides[id] : null;
        if (!override) return base;
        return { ...base, ...normalize(override) };
    }

    function getStatus(info) {
        const helper = globalThis.ShouwbanCore?.getInventoryStatus;
        if (typeof helper === 'function') {
            const base = helper(info, { lowStockThreshold });
            const data = normalize(info);
            if (base.tone === 'out') return { ...base, label: '暂时缺货' };
            if (base.tone === 'low') return { ...base, label: `库存紧张 · 仅剩 ${data.stock} 件` };
            if (base.tone === 'in') return { ...base, label: '现货充足' };
            return base;
        }
        const data = normalize(info);
        if (data.preorder) return { label: '预售', tone: 'preorder' };
        if (data.stock <= 0) return { label: '暂时缺货', tone: 'out' };
        if (data.stock <= lowStockThreshold) return { label: `库存紧张 · 仅剩 ${data.stock} 件`, tone: 'low' };
        return { label: '现货充足', tone: 'in' };
    }

    function canAdd(productOrId, quantity, currentQty = 0) {
        const info = getInfo(productOrId);
        const qty = Math.max(1, Math.floor(Number(quantity) || 1));
        const current = Math.max(0, Math.floor(Number(currentQty) || 0));
        if (info.preorder) {
            return { ok: true, available: info.stock || 99, preorder: true };
        }
        if (info.stock <= 0) return { ok: false, available: 0, reason: '暂时缺货' };
        if (qty + current > info.stock) {
            return { ok: false, available: info.stock, reason: `库存仅剩 ${info.stock} 件` };
        }
        return { ok: true, available: info.stock };
    }

    return { getInfo, getStatus, canAdd, lowStockThreshold };
})();

// ==============================================
// Bundle Deals（组合购/套装优惠）
// ==============================================
const BundleDeals = (function() {
    const bundles = [
        {
            id: 'BND-STARTER',
            title: '入坑双人组',
            subtitle: '热门角色搭配，立减 8%',
            items: ['P001', 'P003'],
            discountType: 'percent',
            discountValue: 8,
        },
        {
            id: 'BND-TRAVEL',
            title: '旅行搭档套装',
            subtitle: '冒险主题组合，立减 ¥60',
            items: ['P002', 'P004'],
            discountType: 'fixed',
            discountValue: 60,
        },
        {
            id: 'BND-COLLECTOR',
            title: '收藏家三件套',
            subtitle: '限时组合，立减 10%',
            items: ['P006', 'P007', 'P009'],
            discountType: 'percent',
            discountValue: 10,
        },
    ];

    function getAll() {
        return bundles.slice();
    }

    function getById(id) {
        const key = String(id || '').trim();
        return bundles.find((b) => b.id === key) || null;
    }

    function getBundlesForProduct(productId) {
        const id = String(productId || '').trim();
        if (!id) return [];
        return bundles.filter((b) => Array.isArray(b.items) && b.items.includes(id));
    }

    function getBundleCart() {
        return StorageKit.getBundleCart();
    }

    function setBundleCart(list) {
        return StorageKit.setBundleCart(list);
    }

    function syncWithCart(cart) {
        const list = Array.isArray(cart) ? cart : [];
        const ids = new Set(list.map((item) => item.id));
        const current = getBundleCart();
        const next = current.filter((entry) => ids.has(entry.productId));
        if (next.length !== current.length) setBundleCart(next);
        return next;
    }

    function getBundleIdForProduct(productId) {
        const id = String(productId || '').trim();
        if (!id) return '';
        const current = getBundleCart();
        const hit = current.find((entry) => entry.productId === id);
        return hit ? hit.bundleId : '';
    }

    function addBundle(bundleId) {
        const bundle = getById(bundleId);
        if (!bundle) return { ok: false, reason: '未找到套装' };
        const items = Array.isArray(bundle.items) ? bundle.items : [];
        const added = [];
        items.forEach((id) => {
            const product = SharedData?.getProductById?.(id);
            if (product && Cart?.addItem) {
                Cart.addItem(product, 1);
                added.push(id);
            }
        });
        if (added.length === 0) return { ok: false, reason: '套装商品不可用' };

        const now = new Date().toISOString();
        const current = getBundleCart().filter((entry) => entry.bundleId !== bundleId);
        const next = [
            ...current,
            ...added.map((productId) => ({ bundleId, productId, ts: now })),
        ];
        setBundleCart(next);
        return { ok: true, added, bundle };
    }

    function removeBundle(bundleId) {
        const key = String(bundleId || '').trim();
        if (!key) return { ok: false };
        const current = getBundleCart();
        const toRemove = current.filter((entry) => entry.bundleId === key).map((entry) => entry.productId);
        const next = current.filter((entry) => entry.bundleId !== key);
        setBundleCart(next);
        if (toRemove.length > 0 && Cart?.getCart && Cart?.setCart) {
            const cart = Cart.getCart();
            const filtered = cart.filter((item) => !toRemove.includes(item.id));
            Cart.setCart(filtered);
        }
        return { ok: true, removed: toRemove };
    }

    function calculateDiscount(cartItems) {
        const cart = Array.isArray(cartItems) ? cartItems : [];
        if (cart.length === 0) return { discount: 0, bundles: [] };

        const map = new Map(cart.map((item) => [String(item.id || ''), item]));
        let totalDiscount = 0;
        const applied = [];

        bundles.forEach((bundle) => {
            const items = Array.isArray(bundle.items) ? bundle.items : [];
            if (!items.length) return;
            const ok = items.every((id) => map.has(id));
            if (!ok) return;

            const sum = items.reduce((acc, id) => acc + (Number(map.get(id)?.price) || 0), 0);
            if (sum <= 0) return;

            let discount = 0;
            if (bundle.discountType === 'percent') {
                discount = (sum * Number(bundle.discountValue || 0)) / 100;
            } else if (bundle.discountType === 'fixed') {
                discount = Number(bundle.discountValue || 0);
            }
            discount = Pricing.roundMoney(Math.max(0, Math.min(sum, discount)));
            if (discount > 0) {
                totalDiscount += discount;
                applied.push({ id: bundle.id, title: bundle.title, discount });
            }
        });

        return { discount: Pricing.roundMoney(totalDiscount), bundles: applied };
    }

    return {
        getAll,
        getById,
        getBundlesForProduct,
        addBundle,
        removeBundle,
        calculateDiscount,
        getBundleIdForProduct,
        syncWithCart,
    };
})();

// ==============================================
// Smart Curation（智能策展）
// ==============================================
const SmartCuration = (function() {
    function getProfile(seedId) {
        const recent = Utils.normalizeStringArray(Utils.readStorageJSON('recentlyViewed', []));
        const favorites = Utils.normalizeStringArray(Utils.readStorageJSON('favorites', []));
        const seedProduct = seedId ? SharedData?.getProductById?.(seedId) : null;
        const seedCategory = seedProduct?.category?.key || '';

        const categoryCounts = new Map();
        [...recent, ...favorites].forEach((id) => {
            const product = SharedData?.getProductById?.(id);
            const key = product?.category?.key;
            if (!key) return;
            categoryCounts.set(key, (categoryCounts.get(key) || 0) + 1);
        });

        const topCategories = Array.from(categoryCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map((entry) => entry[0])
            .slice(0, 2);

        return { recent, favorites, seedId, seedCategory, topCategories };
    }

    function scoreProduct(product, profile) {
        let score = 0;
        if (profile.seedCategory && product?.category?.key === profile.seedCategory) score += 50;
        if (profile.topCategories?.includes?.(product?.category?.key)) score += 30;
        if (product?.tags?.includes?.('hot')) score += 12;
        if (product?.tags?.includes?.('limited')) score += 10;
        if (product?.tags?.includes?.('preorder')) score += 6;
        score += Math.round((Number(product?.rating) || 0) * 4);
        return score;
    }

    function getRecommendations({ seedId = '', limit = 6 } = {}) {
        const all = SharedData?.getAllProducts?.() || [];
        const profile = getProfile(seedId);
        const list = all
            .filter((p) => String(p?.id || '') !== String(profile.seedId || ''))
            .map((p) => ({ product: p, score: scoreProduct(p, profile) }))
            .sort((a, b) => b.score - a.score)
            .map((entry) => entry.product)
            .filter(Boolean);
        return list.slice(0, Math.max(1, Number(limit) || 6));
    }

    return { getRecommendations };
})();

// ==============================================
// Cart Module (Modified to use Cart.updateHeaderCartCount internally)
// ==============================================
const Cart = (function() {
    const cartContainer = document.querySelector('.cart-main');

    const cartItemsContainer = cartContainer?.querySelector('.cart-items');
    const cartSummaryContainer = cartContainer?.querySelector('.cart-summary');
    const emptyCartMessage = cartContainer?.querySelector('.empty-cart-message');
    const checkoutButton = cartSummaryContainer?.querySelector('.checkout-button');
    const bundleSummary = cartSummaryContainer?.querySelector('[data-bundle-summary]');
    const bundleList = cartSummaryContainer?.querySelector('[data-bundle-list]');
    const bundleDiscountRow = cartSummaryContainer?.querySelector('[data-summary-bundle-row]');
    const bundleDiscountEl = cartSummaryContainer?.querySelector('.summary-bundle');
    const memberDiscountRow = cartSummaryContainer?.querySelector('[data-summary-member-row]');
    const memberDiscountEl = cartSummaryContainer?.querySelector('.summary-member');
    const memberBadge = cartSummaryContainer?.querySelector('[data-member-tier]');
    let clearCartButton = cartSummaryContainer?.querySelector('.cart-clear-button') || null;
    const recommendationContainer = cartContainer?.querySelector('[data-cart-recommendations]');
    const recommendationsGrid = recommendationContainer?.querySelector('.recommendations-grid');
    let dragBound = false;
    let draggingItem = null;
    let cartItemDelegationBound = false;
    let bundleActionBound = false;

    function clampQuantity(raw) {
        return globalThis.ShouwbanCore.clampQuantity(raw);
    }

    function normalizeCartItems(items) {
        if (!Array.isArray(items)) return [];
        const out = [];

        items.forEach((raw) => {
            if (!raw || typeof raw !== 'object') return;
            const id = typeof raw.id === 'string' ? raw.id.trim() : String(raw.id || '').trim();
            if (!id) return;

            const quantity = Number.parseInt(raw.quantity, 10);
            const safeQuantityRaw = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
            const safeQuantity = Math.min(99, safeQuantityRaw);

            const product = (typeof SharedData !== 'undefined' && SharedData.getProductById)
                ? SharedData.getProductById(id)
                : null;

            const derivedPrice = Number(product?.price);
            const rawPrice = Number(raw.price);
            const safePrice = Number.isFinite(rawPrice) && rawPrice >= 0
                ? rawPrice
                : (Number.isFinite(derivedPrice) && derivedPrice >= 0 ? derivedPrice : 0);

            const derivedName = typeof product?.name === 'string' && product.name.trim().length > 0 ? product.name.trim() : '';
            const derivedSeries = typeof product?.series === 'string' ? product.series.trim() : '';
            const derivedImage = typeof product?.images?.[0]?.thumb === 'string' ? product.images[0].thumb.trim() : '';

            const name = typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : (derivedName || '[手办名称]');
            const series = typeof raw.series === 'string' && raw.series.trim().length > 0 ? raw.series.trim() : derivedSeries;
            const image =
                typeof raw.image === 'string' && raw.image.trim().length > 0
                    ? raw.image.trim()
                    : (derivedImage || 'assets/images/figurine-1.svg');

            out.push({ id, name, series, price: safePrice, quantity: safeQuantity, image });
        });

        return out;
    }

    // --- Cart State Management --- 
    function getCart() {
        return normalizeCartItems(Utils.readStorageJSON('cart', []));
    }

    // Internal function to update header count
    function _updateHeaderCartCount(cart) {
         if (typeof Header !== 'undefined' && Header.updateCartCount) {
            const totalQuantity = (Array.isArray(cart) ? cart : []).reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
            Header.updateCartCount(totalQuantity);
        }
    }

    function updateHeaderCartCount(cartOrItems) {
        const normalized = normalizeCartItems(cartOrItems);
        _updateHeaderCartCount(normalized);
        return normalized;
    }

    function saveCart(cart) {
        const normalized = normalizeCartItems(cart);
        Utils.writeStorageJSON('cart', normalized);
        BundleDeals?.syncWithCart?.(normalized);
        _updateHeaderCartCount(normalized); // Use internal function
        Utils.dispatchChanged('cart');
    }
    
    // --- Rendering Functions --- (Keep existing renderCartItem, renderCart, updateCartSummary)
    function renderCartItem(item) {
         // ... (no changes needed here)
          const rawId = String(item?.id || '').trim();
        const encodedId = rawId ? encodeURIComponent(rawId) : '';
        const detailHref = rawId ? `product-detail.html?id=${encodedId}` : 'products.html';

        const safeIdAttr = Utils.escapeHtml(rawId);
        const safeName = Utils.escapeHtml(item?.name || '[手办名称]');
        const safeSeries = Utils.escapeHtml(item?.series || '[系列/来源占位]');
        const safeImage = Utils.escapeHtml(item?.image || 'assets/images/figurine-1.svg');
        const bundleId = BundleDeals?.getBundleIdForProduct?.(rawId) || '';
        const inventoryInfo = InventoryPulse?.getInfo?.(rawId);
        const inventoryStatus = InventoryPulse?.getStatus?.(inventoryInfo);
        const bundleBadge = bundleId
            ? `<span class="badge badge-bundle" data-bundle-id="${Utils.escapeHtml(bundleId)}">套装</span>`
            : '';
        const inventoryBadge = inventoryStatus?.label
            ? `<span class="badge badge-inventory badge-inventory--${Utils.escapeHtml(inventoryStatus.tone || 'in')}">${Utils.escapeHtml(inventoryStatus.label)}</span>`
            : '';
        const badgesHtml = [bundleBadge, inventoryBadge].filter(Boolean).join('');

        const price = typeof item?.price === 'number' ? item.price : Number(item?.price) || 0;
        const q = Number.parseInt(item?.quantity, 10);
        const quantity = Number.isFinite(q) && q > 0 ? q : 1;
        const subtotal = price * quantity;

        return `
            <div class="cart-item" data-product-id="${safeIdAttr}" draggable="true">
                <div class="cart-item__drag" title="拖拽排序" aria-hidden="true">${Icons.svgHtml('icon-grip-vertical')}</div>
                <div class="cart-item__image">
                    <a href="${detailHref}">
                        <img src="${safeImage}" alt="${safeName}">
                    </a>
                </div>
                <div class="cart-item__info">
                    <h4 class="cart-item__title"><a href="${detailHref}">${safeName}</a></h4>
                    <p class="cart-item__series">${safeSeries}</p>
                    ${badgesHtml ? `<div class="cart-item__badges">${badgesHtml}</div>` : ''}
                    ${bundleId ? `<button type="button" class="cta-button-secondary cart-item__bundle-remove" data-bundle-remove="${Utils.escapeHtml(bundleId)}">移除套装</button>` : ''}
                    <span class="cart-item__price">¥${price.toFixed(2)}</span>
                </div>
                <div class="cart-item__quantity quantity-selector">
                    <button class="quantity-selector__button minus" aria-label="减少数量" ${quantity <= 1 ? 'disabled' : ''}>-</button>
                    <input class="quantity-selector__input" type="number" value="${quantity}" min="1" max="99" inputmode="numeric" aria-label="商品数量">
                    <button class="quantity-selector__button plus" aria-label="增加数量" ${quantity >= 99 ? 'disabled' : ''}>+</button>
                </div>
                <div class="cart-item__total">
                    <span>小计:</span> ¥<span class="subtotal-value">${subtotal.toFixed(2)}</span>
                </div>
                <div class="cart-item__remove">
                    <button class="remove-btn" aria-label="移除商品">${Icons.svgHtml('icon-trash')}</button>
                </div>
            </div>
        `;
    }

    function renderRecommendationCard(product) {
        if (!product) return '';
        const id = String(product.id || '').trim();
        if (!id) return '';
        const safeId = Utils.escapeHtml(id);
        const name = Utils.escapeHtml(product.name || '未命名手办');
        const series = Utils.escapeHtml(product.series || '');
        const image = product.images?.[0]?.thumb || 'assets/images/figurine-1.svg';
        const safeImage = Utils.escapeHtml(image);
        const price = typeof product.price === 'number' ? `￥${product.price.toFixed(2)}` : '价格待定';
        const detailHref = `product-detail.html?id=${encodeURIComponent(id)}`;

        return `
            <article class="recommendation-card">
                <a href="${detailHref}">
                    <img src="${safeImage}" alt="${name}" loading="lazy" decoding="async">
                </a>
                <div class="recommendation-card__title">${name}</div>
                <div class="recommendation-card__series">${series}</div>
                <div class="recommendation-card__price">${price}</div>
                <div class="recommendation-card__action">
                    <button class="product-card__quick-add" type="button" data-product-id="${safeId}">加入购物车</button>
                </div>
            </article>
        `;
    }

    function renderRecommendations(cart) {
        if (!recommendationContainer || !recommendationsGrid) return;
        if (cart.length === 0) {
            recommendationContainer.style.display = 'none';
            return;
        }
        recommendationContainer.style.display = 'block';
        if (typeof SharedData === 'undefined' || !SharedData.getAllProducts) return;

        const allProducts = SharedData.getAllProducts();
        const cartProducts = cart
            .map((item) => SharedData.getProductById?.(item.id))
            .filter(Boolean);
        const cartCategories = new Set(cartProducts.map((p) => p.category?.key).filter(Boolean));
        const cartIds = new Set(cart.map((item) => item.id));

        let pool = allProducts.filter((p) => !cartIds.has(p.id));
        if (cartCategories.size > 0) {
            pool = pool.filter((p) => cartCategories.has(p.category?.key));
        }
        const picks = pool.slice(0, 3);

        recommendationsGrid.innerHTML = picks.length
            ? picks.map(renderRecommendationCard).join('')
            : '<p class="text-center">暂无可用推荐，继续探索更多收藏吧。</p>';

        if (typeof Favorites !== 'undefined' && Favorites.syncButtons) {
            Favorites.syncButtons(recommendationsGrid);
        }
        if (typeof Compare !== 'undefined' && Compare.syncButtons) {
            Compare.syncButtons(recommendationsGrid);
        }
    }
    
    function renderCart() {
        // ... (no changes needed here)
         if (!cartItemsContainer || !cartSummaryContainer || !emptyCartMessage) return;

        const cart = getCart();
        cartItemsContainer.setAttribute('aria-busy', 'true');
        cartItemsContainer.innerHTML = ''; // Clear existing items

        if (cart.length === 0) {
            emptyCartMessage.style.display = 'block';
            cartSummaryContainer.style.display = 'none'; // Hide summary
            cartItemsContainer.style.display = 'none'; // Hide items container
        } else {
            emptyCartMessage.style.display = 'none';
            cartSummaryContainer.style.display = 'block'; // Show summary
            cartItemsContainer.style.display = 'block'; // Show items container
            ensureClearCartButton();
            cartItemsContainer.innerHTML = cart.map((item) => renderCartItem(item)).join('');
            updateCartSummary(cart);
            bindDragAndDrop();
        }
        renderRecommendations(cart);
        cartItemsContainer.setAttribute('aria-busy', 'false');
    }

    function updateCartSummary(cart) {
        const subtotalElement = cartSummaryContainer?.querySelector('.summary-subtotal');
        const shippingElement = cartSummaryContainer?.querySelector('.summary-shipping');
        const totalElement = cartSummaryContainer?.querySelector('.total-price');
        const discountElement = cartSummaryContainer?.querySelector('.summary-discount');
        const discountRow = cartSummaryContainer?.querySelector('[data-summary-discount-row]');
         
        if (!subtotalElement || !shippingElement || !totalElement) return;

        const subtotal = globalThis.ShouwbanCore.calculateCartSubtotal(cart);
        const promo = typeof Promotion !== 'undefined' && Promotion.get ? Promotion.get() : null;
        const discount = typeof Promotion !== 'undefined' && Promotion.calculateDiscount
            ? Promotion.calculateDiscount(subtotal, promo)
            : 0;
        const bundleInfo = typeof BundleDeals !== 'undefined' && BundleDeals.calculateDiscount
            ? BundleDeals.calculateDiscount(cart)
            : { discount: 0, bundles: [] };
        const bundleDiscount = Number(bundleInfo?.discount) || 0;
        const memberBenefits = typeof Rewards !== 'undefined' && Rewards.getTierBenefits
            ? Rewards.getTierBenefits(Rewards.getPoints?.() || 0)
            : null;
        const memberDiscount = typeof Rewards !== 'undefined' && Rewards.calcTierDiscount
            ? Rewards.calcTierDiscount(Math.max(0, subtotal - discount - bundleDiscount))
            : 0;
        const region = typeof ShippingRegion !== 'undefined' && ShippingRegion.get ? ShippingRegion.get() : 'cn-east';
        const shippingCost = typeof Pricing !== 'undefined' && Pricing.calculateShipping
            ? Pricing.calculateShipping({
                subtotal,
                discount: discount + bundleDiscount + memberDiscount,
                region,
                promotion: promo,
                membership: memberBenefits,
            })
            : 0;
        const total = Math.max(
            0,
            Pricing.roundMoney(subtotal - discount - bundleDiscount - memberDiscount)
                + Pricing.roundMoney(shippingCost),
        );

        UXMotion.tweenMoney(subtotalElement, subtotal);
        UXMotion.tweenMoney(shippingElement, shippingCost);
        UXMotion.tweenMoney(totalElement, total);

        if (discountElement && discountRow) {
            const show = discount > 0;
            discountRow.style.display = show ? 'flex' : 'none';
            UXMotion.tweenMoney(discountElement, discount, { prefix: '- ' });
        }

        if (bundleDiscountEl && bundleDiscountRow) {
            const show = bundleDiscount > 0;
            bundleDiscountRow.style.display = show ? 'flex' : 'none';
            UXMotion.tweenMoney(bundleDiscountEl, bundleDiscount, { prefix: '- ' });
        }

        if (memberDiscountEl && memberDiscountRow) {
            const show = memberDiscount > 0;
            memberDiscountRow.style.display = show ? 'flex' : 'none';
            UXMotion.tweenMoney(memberDiscountEl, memberDiscount, { prefix: '- ' });
        }

        if (bundleSummary && bundleList) {
            if (bundleInfo?.bundles?.length) {
                bundleSummary.style.display = 'block';
                bundleList.innerHTML = bundleInfo.bundles.map((b) => `
                    <div class="bundle-row">
                        <div class="bundle-row__title">${Utils.escapeHtml(b.title || '套装优惠')}</div>
                        <div class="bundle-row__actions">
                            <span class="bundle-row__price">- ${Utils.escapeHtml(Pricing.formatCny(b.discount || 0))}</span>
                            <button type="button" class="cta-button-secondary bundle-row__remove" data-bundle-remove="${Utils.escapeHtml(b.id || '')}">移除</button>
                        </div>
                    </div>
                `).join('');
            } else {
                bundleSummary.style.display = 'none';
                bundleList.innerHTML = '';
            }
        }

        if (memberBadge) {
            const tier = Rewards?.getTier?.();
            if (tier) {
                memberBadge.textContent = `${tier.label} 会员`;
            }
        }

        if (checkoutButton) {
            checkoutButton.classList.toggle('disabled', cart.length === 0);
            if(cart.length === 0) {
                 checkoutButton.setAttribute('aria-disabled', 'true');
                 checkoutButton.removeAttribute('href'); 
            } else {
                 checkoutButton.removeAttribute('aria-disabled');
                 checkoutButton.setAttribute('href', 'checkout.html');
            }
        }
    }

    function ensureClearCartButton() {
        if (!cartSummaryContainer) return null;
        if (clearCartButton) return clearCartButton;

        clearCartButton = document.createElement('button');
        clearCartButton.type = 'button';
        clearCartButton.className = 'cta-button-secondary cart-clear-button';
        clearCartButton.textContent = '清空购物车';
        clearCartButton.setAttribute('aria-label', '清空购物车');

        const continueLink = cartSummaryContainer.querySelector('.continue-shopping-link');
        if (continueLink) cartSummaryContainer.insertBefore(clearCartButton, continueLink);
        else cartSummaryContainer.appendChild(clearCartButton);

        clearCartButton.addEventListener('click', () => {
            const cart = getCart();
            if (cart.length === 0) return;
            const ok = window.confirm('确定要清空购物车吗？你可以在提示条中撤销。');
            if (!ok) return;
            const snapshot = cart.map((item) => ({ ...item }));
            setCart([]);
            Toast?.show?.({
                message: '购物车已清空',
                type: 'success',
                durationMs: 5200,
                actionLabel: '撤销',
                onAction: () => setCart(snapshot),
            });
        });

        return clearCartButton;
    }

    // --- Event Handlers --- (Delegation to avoid per-item listeners / rerender)
    function syncItemQuantityButtons(itemElement, quantity) {
        if (!itemElement) return;
        const minusBtn = itemElement.querySelector('.quantity-selector__button.minus');
        const plusBtn = itemElement.querySelector('.quantity-selector__button.plus');
        if (minusBtn) minusBtn.disabled = quantity <= 1;
        if (plusBtn) plusBtn.disabled = quantity >= 99;
    }

    function updateItemSubtotal(itemElement, item) {
        if (!itemElement || !item) return;
        const subtotalEl = itemElement.querySelector('.subtotal-value');
        if (!subtotalEl) return;
        const subtotal = (Number(item.price) || 0) * (Number(item.quantity) || 1);
        UXMotion.tweenNumber(subtotalEl, subtotal, {
            duration: 260,
            formatter: (n) => Pricing.roundMoney(n).toFixed(2),
        });
    }

    function handleQuantityChange(productId, newQuantity, options = {}) {
        const rerender = options.rerender !== false;
        const itemElement = options.itemElement || null;

        const cart = getCart();
        const itemIndex = cart.findIndex((item) => item.id === productId);
        if (itemIndex < 0) return;

        let safeQuantity = clampQuantity(newQuantity);
        const prevQuantity = Number(cart[itemIndex]?.quantity) || 1;
        const product = SharedData?.getProductById?.(productId);
        const stockCheck = InventoryPulse?.canAdd?.(product || productId, safeQuantity, 0);
        if (stockCheck && stockCheck.ok === false && !stockCheck.preorder) {
            const available = Math.max(1, Math.min(safeQuantity, Number(stockCheck.available) || 1));
            safeQuantity = available;
            if (typeof Toast !== 'undefined' && Toast.show) {
                Toast.show(stockCheck.reason || '库存不足，已调整数量', 'info', 1800);
            }
        }
        if (prevQuantity === safeQuantity && !rerender) {
            syncItemQuantityButtons(itemElement, safeQuantity);
            updateItemSubtotal(itemElement, cart[itemIndex]);
            updateCartSummary(cart);
            return;
        }

        cart[itemIndex].quantity = safeQuantity;
        saveCart(cart);

        if (cartContainer && rerender) {
            renderCart();
            return;
        }

        // Incremental UI update (avoid full rerender)
        if (itemElement) {
            const input = itemElement.querySelector('.quantity-selector__input');
            if (input) input.value = String(safeQuantity);
            syncItemQuantityButtons(itemElement, safeQuantity);
            updateItemSubtotal(itemElement, cart[itemIndex]);
        }
        updateCartSummary(cart);
    }

    function handleRemoveItem(productId, options = {}) {
        const rerender = options.rerender !== false;
        const itemElement = options.itemElement || null;

        const cart = getCart();
        const removed = cart.find((item) => item.id === productId) || null;
        const snapshot = cart.map((item) => ({ ...item }));
        const next = cart.filter((item) => item.id !== productId);
        if (next.length === cart.length) return;

        saveCart(next);

        if (cartContainer && rerender) {
            renderCart();
        } else {
            // Incremental UI update (avoid full rerender)
            try { itemElement?.remove?.(); } catch { /* ignore */ }
            if (next.length === 0) {
                renderCart();
            } else {
                updateCartSummary(next);
                renderRecommendations(next);
            }
        }

        const removedName = String(removed?.name || '').trim() || '商品';
        Toast?.show?.({
            message: `已移除「${removedName}」`,
            type: 'info',
            durationMs: 5200,
            actionLabel: '撤销',
            onAction: () => setCart(snapshot),
        });
    }

    function bindCartItemDelegation() {
        if (!cartItemsContainer || cartItemDelegationBound) return;
        cartItemDelegationBound = true;

        cartItemsContainer.addEventListener('click', (event) => {
            const target = event?.target;

            const bundleRemoveBtn = target?.closest?.('[data-bundle-remove]');
            if (bundleRemoveBtn) {
                const bundleId = bundleRemoveBtn.dataset.bundleRemove || bundleRemoveBtn.getAttribute('data-bundle-remove');
                if (bundleId) {
                    BundleDeals?.removeBundle?.(bundleId);
                    if (typeof Toast !== 'undefined' && Toast.show) {
                        Toast.show('已移除套装商品', 'info', 1600);
                    }
                }
                return;
            }

            const minusBtn = target?.closest?.('.quantity-selector__button.minus');
            const plusBtn = target?.closest?.('.quantity-selector__button.plus');
            const removeBtn = target?.closest?.('.remove-btn');
            if (!minusBtn && !plusBtn && !removeBtn) return;

            const itemElement = target?.closest?.('.cart-item');
            const productId = itemElement?.dataset?.productId;
            if (!itemElement || !productId) return;

            if (removeBtn) {
                handleRemoveItem(productId, { rerender: false, itemElement });
                return;
            }

            const quantityInput = itemElement.querySelector('.quantity-selector__input');
            const current = clampQuantity(quantityInput?.value);
            const next = minusBtn ? Math.max(1, current - 1) : Math.min(99, current + 1);
            if (quantityInput) quantityInput.value = String(next);

            handleQuantityChange(productId, next, { rerender: false, itemElement });
        });

        cartItemsContainer.addEventListener('input', (event) => {
            const input = event?.target;
            if (!input?.classList?.contains?.('quantity-selector__input')) return;
            input.value = String(input.value || '').replace(/[^0-9]/g, '');
        });

        cartItemsContainer.addEventListener('change', (event) => {
            const input = event?.target;
            if (!input?.classList?.contains?.('quantity-selector__input')) return;
            const itemElement = input.closest?.('.cart-item');
            const productId = itemElement?.dataset?.productId;
            if (!itemElement || !productId) return;

            const next = clampQuantity(input.value);
            input.value = String(next);
            handleQuantityChange(productId, next, { rerender: false, itemElement });
        });

        if (cartSummaryContainer && !bundleActionBound) {
            bundleActionBound = true;
            cartSummaryContainer.addEventListener('click', (event) => {
                const target = event?.target;
                const btn = target?.closest?.('[data-bundle-remove]');
                if (!btn) return;
                const bundleId = btn.dataset.bundleRemove || btn.getAttribute('data-bundle-remove');
                if (!bundleId) return;
                BundleDeals?.removeBundle?.(bundleId);
                if (typeof Toast !== 'undefined' && Toast.show) {
                    Toast.show('已移除套装商品', 'info', 1600);
                }
            });
        }
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.cart-item:not(.is-dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
    }

    function commitOrderFromDom() {
        if (!cartItemsContainer) return;
        const ids = Array.from(cartItemsContainer.querySelectorAll('.cart-item'))
            .map((el) => el.dataset.productId)
            .filter(Boolean);
        if (ids.length === 0) return;
        const cart = getCart();
        const map = new Map(cart.map((item) => [item.id, item]));
        const next = ids.map((id) => map.get(id)).filter(Boolean);
        saveCart(next);
        renderCart();
    }

    function bindDragAndDrop() {
        if (!cartItemsContainer || dragBound) return;
        dragBound = true;

        cartItemsContainer.addEventListener('dragstart', (event) => {
            const item = event.target?.closest?.('.cart-item');
            if (!item) return;
            draggingItem = item;
            item.classList.add('is-dragging');
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
            }
        });

        cartItemsContainer.addEventListener('dragover', (event) => {
            if (!draggingItem) return;
            event.preventDefault();
            const afterElement = getDragAfterElement(cartItemsContainer, event.clientY);
            if (!afterElement) {
                cartItemsContainer.appendChild(draggingItem);
            } else if (afterElement !== draggingItem) {
                cartItemsContainer.insertBefore(draggingItem, afterElement);
            }
        });

        cartItemsContainer.addEventListener('dragend', () => {
            if (!draggingItem) return;
            draggingItem.classList.remove('is-dragging');
            draggingItem = null;
            commitOrderFromDom();
        });
    }

    // --- Initialization --- 
    function init() {
        bindCartItemDelegation();
        refresh();
        if (cartItemsContainer) {
            cartItemsContainer.setAttribute('aria-live', 'polite');
            cartItemsContainer.setAttribute('aria-busy', 'false');
        }
    }

    function refresh() {
        // 始终更新 Header 购物车数量（让所有页面都能显示正确角标）
        const cart = getCart();
        _updateHeaderCartCount(cart);

        // 仅在购物车页做完整渲染
        if (cartContainer) renderCart();
    }

    function setCart(items) {
        saveCart(items);
        if (cartContainer) renderCart();
    }

    function addItem(product, quantity = 1) {
        if (!product || !product.id) return { added: 0 };
        let safeQty = Math.min(99, Math.max(1, Number(quantity) || 1));
        const cart = getCart();
        const existing = cart.find((item) => item.id === product.id);
        const existingQty = existing ? Number(existing.quantity) || 0 : 0;
        const stockCheck = InventoryPulse?.canAdd?.(product, safeQty, existingQty);
        if (stockCheck && stockCheck.ok === false && !stockCheck.preorder) {
            const available = Math.max(0, Number(stockCheck.available) || 0);
            const allowed = Math.max(0, available - existingQty);
            if (allowed <= 0) {
                Toast?.show?.(stockCheck.reason || '暂时缺货', 'info', 1800);
                return { added: 0 };
            }
            safeQty = Math.min(safeQty, allowed);
            Toast?.show?.(stockCheck.reason || '库存不足，已调整数量', 'info', 1800);
        }
        if (existing) {
            existing.quantity = Math.min(99, existing.quantity + safeQty);
        } else {
            cart.push({
                id: product.id,
                name: product.name || '[手办名称]',
                series: product.series || '',
                price: Number(product.price) || 0,
                quantity: safeQty,
                image: product.images?.[0]?.thumb || 'assets/images/figurine-1.svg'
            });
        }
        saveCart(cart);
        if (cartContainer) renderCart();
        return { added: safeQty };
    }

    // Expose functions needed by other modules
    return { 
        init: init, 
        getCart: getCart,
        refresh: refresh,
        setCart: setCart,
        addItem: addItem,
        updateHeaderCartCount: updateHeaderCartCount // Expose wrapper that normalizes input
    };
})();

// ==============================================
// Quick Add Module (Product Cards)
// ==============================================
const QuickAdd = (function() {
    function handleClick(event) {
        const btn = event.target?.closest?.('.product-card__quick-add');
        if (!btn) return;
        event.preventDefault();
        event.stopPropagation();

        const id = btn.dataset.productId;
        if (!id || typeof SharedData === 'undefined' || !SharedData.getProductById) return;
        const product = SharedData.getProductById(id);
        if (!product) {
            if (typeof Toast !== 'undefined' && Toast.show) {
                Toast.show('商品信息加载失败', 'info', 1600);
            }
            return;
        }

        const result = typeof Cart !== 'undefined' && Cart.addItem ? Cart.addItem(product, 1) : { added: 1 };

        // Micro-interaction: fly to cart (progressive enhancement)
        try {
            const card = btn.closest('.product-card');
            const img = card?.querySelector?.('img') || null;
            UXMotion?.flyToCart?.(img || card || btn);
        } catch {
            // ignore
        }

        if (typeof Celebration !== 'undefined' && Celebration.fire) {
            Celebration.fire(btn);
        }
        if (typeof Cinematic !== 'undefined') {
            Cinematic.shimmerOnce?.(btn);
            Cinematic.pulse?.(btn, { scale: 1.08, duration: 0.28 });
        }
        try {
            const original = btn.dataset.originalLabel || btn.textContent || '快速加入';
            if (!btn.dataset.originalLabel) btn.dataset.originalLabel = original;
            btn.textContent = '已加入';
            window.setTimeout(() => {
                try { btn.textContent = btn.dataset.originalLabel || original; } catch { /* ignore */ }
            }, 720);
        } catch {
            // ignore
        }
        if (typeof Toast !== 'undefined' && Toast.show) {
            Toast.show(`已加入购物车 +${result.added || 1}`, 'success', 1600);
        }
    }

    function init() {
        document.addEventListener('click', handleClick);
    }

    return { init };
})();

// ==============================================
// ==============================================
// Cross Tab Sync (storage event)
// ==============================================
const CrossTabSync = (function() {
    function handleStorage(event) {
        const key = event?.key;
        if (!key) return;

        try {
            if (key === 'theme') {
                if (typeof Theme !== 'undefined' && Theme.getResolvedTheme && Theme.applyTheme) {
                    Theme.applyTheme(Theme.getResolvedTheme(), { persist: false });
                }
                return;
            }

            if (key === 'a11y') {
                Accessibility?.init?.();
                Utils.dispatchChanged('a11y');
                return;
            }

            if (key === 'favorites') {
                if (typeof Favorites !== 'undefined') {
                    const ids = typeof Favorites.getIds === 'function' ? Favorites.getIds() : [];
                    Favorites.updateHeaderCount?.(ids);
                    Favorites.syncButtons?.(document);
                }
                Utils.dispatchChanged('favorites');
                return;
            }

            if (key === 'cart') {
                const cart = (typeof Cart !== 'undefined' && typeof Cart.getCart === 'function') ? Cart.getCart() : [];
                Cart.updateHeaderCartCount?.(cart);
                Cart.refresh?.();
                Checkout.refresh?.();
                return;
            }

            if (key === 'compare') {
                if (typeof Compare !== 'undefined') {
                    const ids = typeof Compare.getIds === 'function' ? Compare.getIds() : [];
                    Compare.updateHeaderCount?.(ids);
                    Compare.syncButtons?.(document);
                }
                Utils.dispatchChanged('compare');
                return;
            }

            if (key === 'promotion') {
                Utils.dispatchChanged('promo');
                return;
            }

            if (key === 'shippingRegion') {
                Utils.dispatchChanged('shipping');
                return;
            }

            if (key === 'orders') {
                if (typeof Orders !== 'undefined') {
                    Orders.updateHeaderCount?.(Orders.getAll?.() || []);
                }
                Utils.dispatchChanged('orders');
                return;
            }

            if (key === 'rewards') {
                if (typeof Rewards !== 'undefined') {
                    Rewards.updateHeaderBadge?.(Rewards.getPoints?.() || 0);
                }
                Utils.dispatchChanged('rewards');
                return;
            }

            if (key === 'addressBook') {
                Utils.dispatchChanged('addressbook');
                Checkout.refresh?.();
                return;
            }

            if (key === 'priceAlerts') {
                PriceAlerts?.checkAndNotify?.();
                Utils.dispatchChanged('pricealerts');
                return;
            }

            if (key === 'recentlyViewed') {
                RecentlyViewed?.refresh?.();
                return;
            }
        } catch {
            // ignore
        }
    }

    function init() {
        window.addEventListener('storage', handleStorage);
    }

    return { init };
})();

// ==============================================
// Tooling (Lazy Modules)
// - 将 Diagnostics / Command Palette 拆为独立模块并按需加载，降低首屏解析成本
// - Root static：继承入口 `?v=` 做缓存穿透；Vite：走常规 import 由打包器接管
// ==============================================
const LazyTooling = (function() {
    function getRuntimeVersionFromEntry() {
        try {
            const url = new URL(import.meta.url);
            const v = url.searchParams.get('v') || '';
            return String(v || "");
        } catch {
            return "";
        }
    }

    const runtimeVersion = getRuntimeVersionFromEntry();
    const isViteEnv = Boolean(import.meta && import.meta.env);

    function withVersionQuery(p) {
        if (!runtimeVersion) return p;
        const q = encodeURIComponent(runtimeVersion);
        return p + "?v=" + q;
    }

    function importModule(modulePath) {
        const p = String(modulePath || "");
        if (!p) return Promise.resolve(null);

        if (isViteEnv) return import(modulePath);
        return import(/* @vite-ignore */ withVersionQuery(modulePath));
    }

    return { runtimeVersion, isViteEnv, importModule };
})();

const Diagnostics = (function() {
    let api = null;
    let loading = null;

    async function ensure() {
        if (api) return api;
        if (loading) return loading;

        loading = LazyTooling.importModule('./modules/diagnostics.js')
            .then((mod) => {
                const factory = mod && mod.createDiagnostics;
                api = typeof factory === 'function' ? factory() : null;
                try { api?.init?.(); } catch { /* ignore */ }
                return api;
            })
            .catch(() => null);

        return loading;
    }

    function isHealthEnabled() {
        try {
            const url = new URL(window.location.href);
            const v = url.searchParams.get('health');
            return v === '1' || v === 'true';
        } catch {
            return false;
        }
    }

    function init() {
        // Expose proxy for console usage without forcing module load.
        try {
            if (!globalThis.ShouwbanDiagnostics) globalThis.ShouwbanDiagnostics = Diagnostics;
        } catch {
            // ignore
        }

        // Auto-start only when explicitly enabled via URL param.
        if (isHealthEnabled()) {
            void ensure().then((d) => {
                try { d?.watch?.({ intervalMs: 5000, clear: false }); } catch { /* ignore */ }
            });
        }
    }

    function start() { void ensure().then((d) => d?.start?.()); }
    function stop() { void ensure().then((d) => d?.stop?.()); }
    function print(options) { void ensure().then((d) => d?.print?.(options)); }
    function watch(options) { void ensure().then((d) => d?.watch?.(options)); }
    function unwatch() { void ensure().then((d) => d?.unwatch?.()); }

    function snapshot() {
        // Keep a sync signature for console usage: return cached snapshot when available.
        try { return api?.snapshot?.() || null; } catch { return null; }
    }

    return { init, start, stop, snapshot, print, watch, unwatch };
})();

const CommandPalette = (function() {
    let api = null;
    let loading = null;
    let bound = false;

    function isEditableTarget(target) {
        const el = target && target.nodeType === 1 ? target : null;
        if (!el) return false;
        const tag = String(el.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
        return Boolean(el.isContentEditable);
    }

    async function ensure() {
        if (api) return api;
        if (loading) return loading;

        loading = LazyTooling.importModule('./modules/command-palette.js')
            .then((mod) => {
                const factory = mod && mod.createCommandPalette;
                api = typeof factory === 'function'
                    ? factory(
                        { Utils, Icons, Toast, Theme, Diagnostics, ErrorShield },
                        { bindGlobalHotkeys: false },
                    )
                    : null;
                return api;
            })
            .catch(() => null);

        return loading;
    }

    function open(prefill = '') {
        void ensure().then((p) => {
            try { p?.open?.(prefill); } catch { /* ignore */ }
        });
    }

    function close() {
        if (!api) return;
        try { api.close?.(); } catch { /* ignore */ }
    }

    function handleGlobalKeydown(event) {
        if (!event) return;
        if (event.defaultPrevented) return;

        if (isEditableTarget(event.target)) {
            const isCmdK = (event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'K');
            if (!isCmdK) return;
        }

        const isCmdK = (event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'K');
        if (isCmdK) {
            event.preventDefault();
            open();
            return;
        }

        if (!isEditableTarget(event.target) && event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            open();
        }
    }

    function init() {
        if (bound) return;
        bound = true;
        document.addEventListener('keydown', handleGlobalKeydown);
    }

    return { init, open, close };
})();

// ==============================================
// Page Modules (code splitting: page-scoped)
// ==============================================
const PageModules = (function() {
  function getRuntimeVersionFromEntry() {
    try {
      const url = new URL(import.meta.url);
      const v = url.searchParams.get('v') || '';
      return String(v || "");
    } catch {
      return "";
    }
  }

  const runtimeVersion = getRuntimeVersionFromEntry();
  const isViteEnv = Boolean(import.meta && import.meta.env);

  const importers = {
    "index.html": () => import("./pages/homepage.js"),
    "products.html": () => import("./pages/product-listing.js"),
    "category.html": () => import("./pages/product-listing.js"),
    "product-detail.html": () => import("./pages/product-detail.js"),
    "checkout.html": () => import("./pages/checkout.js"),
    "compare.html": () => import("./pages/compare.js"),
    "orders.html": () => import("./pages/orders.js"),
    "account.html": () => import("./pages/account.js"),
    "order-success.html": () => import("./pages/order-success.js"),
    "static-page.html": () => import("./pages/static-page.js"),
    "offline.html": () => import("./pages/offline.js"),
  };

  const rootPaths = {
    "index.html": "./pages/homepage.js",
    "products.html": "./pages/product-listing.js",
    "category.html": "./pages/product-listing.js",
    "product-detail.html": "./pages/product-detail.js",
    "checkout.html": "./pages/checkout.js",
    "compare.html": "./pages/compare.js",
    "orders.html": "./pages/orders.js",
    "account.html": "./pages/account.js",
    "order-success.html": "./pages/order-success.js",
    "static-page.html": "./pages/static-page.js",
    "offline.html": "./pages/offline.js",
  };

  function withVersionQuery(p) {
    if (!runtimeVersion) return p;
    const q = encodeURIComponent(runtimeVersion);
    return p + "?v=" + q;
  }

  function importPageModule(page) {
    const key = String(page || "");
    const importer = importers[key];
    if (!importer) return null;

    if (isViteEnv) return importer();
    const p = rootPaths[key];
    if (!p) return null;
    return import(/* @vite-ignore */ withVersionQuery(p));
  }

  function createRuntimeContext() {
    return {
      runtimeVersion,
      Utils, Icons, Toast, Theme, Accessibility, Header, SharedData, StateHub, Telemetry, Logger, ErrorShield,
      Rewards, Cinematic, ViewTransitions, NavigationTransitions, ShippingRegion,
      SmoothScroll, ScrollProgress, BackToTop, ScrollAnimations, ImageFallback,
      LazyLoad, Favorites, Compare, Orders, AddressBook, PriceAlerts, Cart,
      Promotion, QuickAdd, ServiceWorker, PWAInstall, CrossTabSync, Prefetch,
      Http, Skeleton, VirtualScroll, DataPortability, Pricing, UXMotion, Celebration,
      StorageKit, Perf, PerfVitals, InventoryPulse, BundleDeals, WatchCenter, OrderJourney, SmartCuration,
    };
  }

  function initPage(page, promise, ctx) {
    const p = promise || importPageModule(page);
    if (!p) return;
    p.then((mod) => {
      if (!mod || typeof mod.init !== "function") return;
      mod.init(ctx);
    }).catch((err) => {
      console.warn("PageModules: failed to load/init page module.", err);
      try { Toast?.show?.("页面功能模块加载失败，可尝试刷新页面", "warning", 2400); } catch { /* ignore */ }
    });
  }

  return { importPageModule, createRuntimeContext, initPage };
})();

// ==============================================
// Application Initialization
// ==============================================
const App = {
    init: function() {
        const page = Utils.getPageName();
        const pageModulePromise = PageModules.importPageModule(page);

        StorageKit.ensureSchema();
        Accessibility.init();
        ErrorShield.init();
        PerfVitals.init();

        const idle = (fn, timeoutMs) => {
            const task = typeof fn === 'function' ? fn : null;
            if (!task) return;
            const timeout = Math.max(1, Number(timeoutMs) || 1200);

            try {
                if (typeof Perf !== 'undefined' && Perf && typeof Perf.idle === 'function') {
                    Perf.idle(() => task(), { timeout });
                    return;
                }
            } catch { /* ignore */ }

            try {
                const ric = window.requestIdleCallback;
                if (typeof ric === 'function') {
                    ric(() => task(), { timeout });
                    return;
                }
            } catch { /* ignore */ }

            setTimeout(() => task(), timeout);
        };

        // 全站基础：尽量保持“薄启动”，重模块按页初始化
        Header.init();
        Rewards.init(); // 注入会员入口后再做首屏入场动效
        WatchCenter.init();
        Theme.init();
        ShippingRegion.init();
        SmoothScroll.init();
        ScrollAnimations.init();
        ImageFallback.init();
        LazyLoad.init();
        Favorites.init();
        Compare.init();
        Orders.init();
        AddressBook.init();
        PriceAlerts.init();
        Cart.init(); // Init Cart early so others can use its exposed functions
        Promotion.init();
        QuickAdd.init();

        // Tooling：懒加载 bootstrap（不强制加载模块，仅绑定快捷键/暴露控制台入口）
        CommandPalette.init();
        Diagnostics.init();

        // 非关键增强：延后到空闲时，降低首屏主线程压力（Open/Closed：增量扩展 init 时序）
        idle(() => {
            try { Telemetry.init(); } catch { /* ignore */ }
            try { Cinematic.init(); } catch { /* ignore */ }
            try { ViewTransitions.init(); } catch { /* ignore */ }
            try { NavigationTransitions.init(); } catch { /* ignore */ }
            try { ScrollProgress.init(); } catch { /* ignore */ }
            try { BackToTop.init(); } catch { /* ignore */ }
            try { ServiceWorker.init(); } catch { /* ignore */ }
            try { PWAInstall.init(); } catch { /* ignore */ }
            try { CrossTabSync.init(); } catch { /* ignore */ }
        }, 900);

        // 页面级初始化：模块按需加载（真正代码分割）
        PageModules.initPage(page, pageModulePromise, PageModules.createRuntimeContext());

        // URL 参数触发的一次性提示（避免刷新重复弹出）
        try {
            const url = new URL(window.location.href);
            const params = url.searchParams;
            const orderStatus = params.get('order');
            if (orderStatus === 'success') {
                if (typeof Toast !== 'undefined' && Toast.show) {
                    Toast.show('订单提交成功（模拟）', 'success');
                }
                params.delete('order');
                const nextSearch = params.toString();
                const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
                if (window.history && window.history.replaceState) {
                    window.history.replaceState({}, document.title, nextUrl);
                }
            }
        } catch (e) {
            console.warn('App: URL toast init failed.', e);
        }
    }
};

document.addEventListener('DOMContentLoaded', App.init);
