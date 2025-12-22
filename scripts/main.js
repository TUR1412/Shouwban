// Main JavaScript for the figurine e-commerce website

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
        try {
            return Utils.safeJsonParse(localStorage.getItem(String(key || '')), fallback);
        } catch {
            return fallback;
        }
    },
    writeStorageJSON: (key, value) => {
        try {
            localStorage.setItem(String(key || ''), JSON.stringify(value));
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
            return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch {
            return false;
        }
    }
};

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

    function calculateShipping({ subtotal = 0, discount = 0, region = 'cn-east', promotion = null } = {}) {
        const s = roundMoney(subtotal);
        const d = roundMoney(discount);
        const merch = Math.max(0, s - d);
        const r = getRegion(region);

        // Promotion: free shipping
        if (promotion && promotion.type === 'freeship') return 0;

        // Empty cart should not charge shipping
        if (merch <= 0) return 0;

        // Threshold-based free shipping
        if (merch >= r.freeOver) return 0;

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
                clearSearchSuggestions();
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
        button.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
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
// Toast / Feedback Module (轻量提示，不依赖外部库)
// ==============================================
const Toast = (function() {
    let container = null;

    function ensureContainer() {
        if (container) return container;
        container = document.querySelector('.toast-container');
        if (container) return container;

        container = document.createElement('div');
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-relevant', 'additions');
        document.body.appendChild(container);
        return container;
    }

    function show(message, type = 'info', durationMs = 2400) {
        if (!message) return;
        const root = ensureContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        root.appendChild(toast);

        // Trigger enter animation
        requestAnimationFrame(() => toast.classList.add('is-visible'));

        window.setTimeout(() => {
            toast.classList.remove('is-visible');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        }, Math.max(800, durationMs));
    }

    return { show };
})();

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
// Theme Module (Light/Dark, persisted)
// ==============================================
const Theme = (function() {
    const storageKey = 'theme'; // 'light' | 'dark' | null(跟随系统)

    function getStoredTheme() {
        try {
            const v = localStorage.getItem(storageKey);
            if (v === 'light' || v === 'dark') return v;
            return null;
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

    function setMetaThemeColor(theme) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) return;
        meta.setAttribute('content', theme === 'dark' ? '#0B1220' : '#00BCD4');
    }

    function updateToggleUI(theme) {
        const btn = document.querySelector('.header__theme-toggle');
        if (!btn) return;

        const isDark = theme === 'dark';
        btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        btn.setAttribute('aria-label', isDark ? '切换到浅色模式' : '切换到深色模式');
        btn.innerHTML = isDark
            ? '<i class="fas fa-sun" aria-hidden="true"></i>'
            : '<i class="fas fa-moon" aria-hidden="true"></i>';
    }

    function applyTheme(theme, { persist = false } = {}) {
        const next = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.dataset.theme = next;
        setMetaThemeColor(next);
        updateToggleUI(next);

        if (persist) {
            try { localStorage.setItem(storageKey, next); } catch { /* ignore */ }
        }
    }

    function toggleTheme() {
        const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next, { persist: true });
        if (typeof Toast !== 'undefined' && Toast.show) {
            Toast.show(next === 'dark' ? '已切换深色模式' : '已切换浅色模式', 'info', 1600);
        }
    }

    function init() {
        // 由 head 内联脚本提前设置 data-theme，避免闪烁；这里负责补齐 UI 状态与监听
        const theme = document.documentElement.dataset.theme || getResolvedTheme();
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

        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-solid', isActive);
            icon.classList.toggle('fa-regular', !isActive);
        }
    }

    function syncButtons(root = document) {
        if (!root || !root.querySelectorAll) return;
        const ids = getIds();
        root.querySelectorAll('.favorite-btn[data-product-id]').forEach((btn) => {
            const productId = btn.dataset.productId;
            applyButtonState(btn, ids.includes(productId));
        });
    }

    function dispatchChanged() {
        try {
            window.dispatchEvent(new CustomEvent('favorites:changed'));
        } catch {
            // ignore
        }
    }

    function toggle(id) {
        if (!id) return false;
        const current = new Set(getIds());
        const has = current.has(id);
        if (has) current.delete(id);
        else current.add(id);
        const next = setIds(Array.from(current));
        updateHeaderCount(next);
        dispatchChanged();
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
            '<i class="fas fa-scale-balanced" aria-hidden="true"></i><span class="header__compare-count" aria-label="对比数量" style="display:none;">0</span>';

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

    function dispatchChanged() {
        try { window.dispatchEvent(new CustomEvent('compare:changed')); } catch { /* ignore */ }
    }

    function setIds(ids, options = {}) {
        const clean = Array.from(new Set(Utils.normalizeStringArray(ids))).slice(0, maxItems);
        Utils.writeStorageJSON(storageKey, clean);
        updateHeaderCount(clean);
        if (!options.silent) dispatchChanged();
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
        root.querySelectorAll('.product-card__compare[data-product-id], .compare-btn[data-product-id]').forEach((btn) => {
            const productId = btn.dataset.productId;
            applyButtonState(btn, ids.includes(productId));
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

    function dispatchChanged() {
        try { window.dispatchEvent(new CustomEvent('promo:changed')); } catch { /* ignore */ }
    }

    function set(promo) {
        if (!promo) {
            Utils.removeStorage(storageKey);
            dispatchChanged();
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
        dispatchChanged();
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
        if (!options.silent) {
            try { window.dispatchEvent(new CustomEvent('shipping:changed')); } catch { /* ignore */ }
        }
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
            '<i class="fas fa-receipt" aria-hidden="true"></i><span class="header__orders-count" aria-label="订单数量" style="display:none;">0</span>';

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

    function dispatchChanged() {
        try { window.dispatchEvent(new CustomEvent('orders:changed')); } catch { /* ignore */ }
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
        dispatchChanged();
        return safe;
    }

    function generateId() {
        try {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                return window.crypto.randomUUID();
            }
        } catch {
            // ignore
        }
        return `ORD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
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

        const pointsUsedRaw = Number.parseInt(String(rewards?.pointsUsed ?? ''), 10);
        const pointsUsed = Number.isFinite(pointsUsedRaw) && pointsUsedRaw > 0 ? Math.min(9999999, pointsUsedRaw) : 0;
        const rewardsDiscountRaw = Number(rewards?.discount);
        const rewardsDiscount = Number.isFinite(rewardsDiscountRaw) && rewardsDiscountRaw > 0 ? Pricing.roundMoney(rewardsDiscountRaw) : 0;

        const shipRegion = Pricing.getRegion(region || ShippingRegion.get()).value;
        const shipping = Pricing.calculateShipping({ subtotal, discount: discount + rewardsDiscount, region: shipRegion, promotion: promo });
        const total = Pricing.roundMoney(Math.max(0, subtotal - discount - rewardsDiscount) + shipping);

        const order = {
            id: generateId(),
            createdAt: new Date().toISOString(),
            status: 'processing',
            paymentMethod: String(paymentMethod || '').trim(),
            region: shipRegion,
            promotion: promo ? { code: promo.code, type: promo.type, value: promo.value, label: promo.label } : null,
            pricing: { subtotal, discount, rewardsDiscount, pointsUsed, shipping, total, currency: 'CNY' },
            shippingAddress: normalizeAddress(shippingAddress),
            items: safeItems,
        };

        const next = [order, ...getAll()].slice(0, maxOrders);
        saveAll(next);
        Utils.writeStorageJSON('lastOrderId', order.id);
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
        dispatchChanged();
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
// Rewards / Loyalty Points (localStorage)
// - 目标：提升复购与转化（积分抵扣 + 会员权益）
// ==============================================
const Rewards = (function() {
    const storageKey = 'rewards';

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

    function dispatchChanged() {
        try { window.dispatchEvent(new CustomEvent('rewards:changed')); } catch { /* ignore */ }
    }

    function saveState(state, options = {}) {
        const next = { points: normalizePoints(state?.points) };
        Utils.writeStorageJSON(storageKey, next);
        updateHeaderBadge(next.points);
        if (!options.silent) dispatchChanged();
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
            '<i class="fa-regular fa-user" aria-hidden="true"></i><span class="header__account-badge" aria-label="可用积分" style="display:none;">0</span>';

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

    function generateId() {
        try {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
        } catch {
            // ignore
        }
        return `ADDR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
    }

    function normalizeEntry(raw) {
        const obj = raw && typeof raw === 'object' ? raw : {};
        const id = String(obj.id || '').trim() || generateId();
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

    function dispatchChanged() {
        try { window.dispatchEvent(new CustomEvent('addressbook:changed')); } catch { /* ignore */ }
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
        if (!options.silent) dispatchChanged();
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

    function dispatchChanged() {
        try { window.dispatchEvent(new CustomEvent('pricealerts:changed')); } catch { /* ignore */ }
    }

    function saveAll(list, options = {}) {
        const safe = (Array.isArray(list) ? list : []).map(normalizeAlert).filter(Boolean);
        Utils.writeStorageJSON(storageKey, safe);
        if (!options.silent) dispatchChanged();
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

            // 自动更新：发现新 SW 后跳过等待并刷新（仅在“更新”场景触发）
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                refreshing = true;
                window.location.reload();
            });

            const trySkipWaiting = (worker) => {
                if (!worker) return;
                if (!navigator.serviceWorker.controller) return; // 首次安装不刷新
                try {
                    if (typeof Toast !== 'undefined' && Toast.show) {
                        Toast.show('发现新版本，正在更新…', 'info', 1600);
                    }
                    worker.postMessage({ type: 'SKIP_WAITING' });
                } catch {
                    // ignore
                }
            };

            // 如果已经处于 waiting，立即触发
            if (registration.waiting) trySkipWaiting(registration.waiting);

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        trySkipWaiting(newWorker);
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
        btn.innerHTML = '<i class="fas fa-download" aria-hidden="true"></i>';

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

        return {
            ...product,
            rating,
            reviewCount,
            rarity,
            status,
            tags,
            dateAdded
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

    function getProductById(id) {
        const key = String(id || '').trim();
        if (!key) return null;
        return productMap.get(key) || null;
    }

    function getProductsByIds(ids) {
        const list = Array.isArray(ids) ? ids : [];
        if (list.length === 0) return [];
        return list.map((id) => productMap.get(String(id || '').trim())).filter(Boolean);
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
// Recently Viewed Module (localStorage)
// ==============================================
const RecentlyViewed = (function() {
    const storageKey = 'recentlyViewed';
    const maxItems = 6;

    const container = document.querySelector('.recently-viewed');
    const grid = container?.querySelector('.recently-viewed__grid');
    const emptyState = container?.querySelector('.recently-viewed__empty');
    const clearBtn = container?.querySelector('.recently-viewed__clear');

    function getIds() {
        return Utils.normalizeStringArray(Utils.readStorageJSON(storageKey, []));
    }

    function saveIds(ids) {
        const clean = Array.from(new Set(Utils.normalizeStringArray(ids))).slice(0, maxItems);
        Utils.writeStorageJSON(storageKey, clean);
        return clean;
    }

    function record(id) {
        const key = String(id || '').trim();
        if (!key) return;
        const ids = getIds();
        const next = [key, ...ids.filter((x) => x !== key)].slice(0, maxItems);
        saveIds(next);
        try {
            window.dispatchEvent(new CustomEvent('recent:changed'));
        } catch {
            // ignore
        }
    }

    function clearAll() {
        saveIds([]);
        try {
            window.dispatchEvent(new CustomEvent('recent:changed'));
        } catch {
            // ignore
        }
    }

    function render() {
        if (!container || !grid) return;
        const ids = getIds();
        if (ids.length === 0) {
            grid.innerHTML = '';
            container.classList.add('is-empty');
            if (clearBtn) clearBtn.disabled = true;
            return;
        }

        const products = typeof SharedData !== 'undefined' && SharedData.getProductsByIds
            ? SharedData.getProductsByIds(ids)
            : [];

        if (!products.length) {
            grid.innerHTML = '';
            container.classList.add('is-empty');
            if (clearBtn) clearBtn.disabled = true;
            return;
        }

        if (typeof ProductListing !== 'undefined' && ProductListing.createProductCardHTML) {
            grid.innerHTML = products.map((product) => ProductListing.createProductCardHTML(product)).join('');
        } else {
            grid.innerHTML = '';
        }

        container.classList.remove('is-empty');
        if (clearBtn) clearBtn.disabled = false;
        if (typeof LazyLoad !== 'undefined' && LazyLoad.init) LazyLoad.init(grid);
        if (typeof Favorites !== 'undefined' && Favorites.syncButtons) Favorites.syncButtons(grid);
        if (typeof Compare !== 'undefined' && Compare.syncButtons) Compare.syncButtons(grid);
        if (typeof ScrollAnimations !== 'undefined' && ScrollAnimations.init) ScrollAnimations.init(grid);
    }

    function init() {
        if (!container) return;
        render();
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (getIds().length === 0) return;
                const ok = window.confirm('确定清空最近浏览记录吗？');
                if (!ok) return;
                clearAll();
                if (typeof Toast !== 'undefined' && Toast.show) {
                    Toast.show('最近浏览已清空', 'info', 1600);
                }
            });
        }
        try {
            window.addEventListener('recent:changed', render);
        } catch {
            // ignore
        }
    }

    return { init, record, getIds, clear: clearAll, refresh: render };
})();

// ==============================================
// Product Detail Page (PDP) Module (Modified to use SharedData)
// ==============================================
const PDP = (function() {
    const pdpContainer = document.querySelector('.pdp-main');
    if (!pdpContainer) {
        return { init: () => {} };
    }

    // --- DOM Element References --- (Keep existing)
    const breadcrumbList = pdpContainer.querySelector('.breadcrumb');
    const mainImage = pdpContainer.querySelector('#main-product-image');
    const thumbnailContainer = pdpContainer.querySelector('.product-gallery-pdp__thumbnails');
    const titleElement = pdpContainer.querySelector('.product-info-pdp__title');
    const seriesElement = pdpContainer.querySelector('.product-info-pdp__series');
    const ratingElement = pdpContainer.querySelector('.product-info-pdp__rating');
    const statusElement = pdpContainer.querySelector('.product-info-pdp__status');
    const priceElement = pdpContainer.querySelector('.product-info-pdp .price-value');
    const originalPriceElement = pdpContainer.querySelector('.product-info-pdp .original-price');
    const specsList = pdpContainer.querySelector('.product-specs ul');
    const descriptionContainer = pdpContainer.querySelector('.product-description');
    const quantityInput = pdpContainer.querySelector('.quantity-selector input[type="number"]');
    const minusBtn = pdpContainer.querySelector('.quantity-selector .minus');
    const plusBtn = pdpContainer.querySelector('.quantity-selector .plus');
    const addToCartBtn = pdpContainer.querySelector('.add-to-cart-btn');
    const actionsContainer = pdpContainer.querySelector('.product-actions');
    const maxQuantity = 99;

    let favoriteBtn = actionsContainer?.querySelector('.favorite-btn--pdp') || null;
    let shareBtn = actionsContainer?.querySelector('.share-btn--pdp') || null;
    let compareBtn = actionsContainer?.querySelector('.compare-btn--pdp') || null;
    let alertBtn = actionsContainer?.querySelector('.alert-btn--pdp') || null;

    let currentProductData = null;

    function ensureFavoriteButton(productId) {
        if (!actionsContainer) return null;
        if (!favoriteBtn) {
            favoriteBtn = document.createElement('button');
            favoriteBtn.type = 'button';
            favoriteBtn.className = 'favorite-btn favorite-btn--pdp';
            favoriteBtn.setAttribute('aria-label', '加入收藏');
            favoriteBtn.setAttribute('aria-pressed', 'false');
            favoriteBtn.innerHTML =
                '<i class="fa-regular fa-heart" aria-hidden="true"></i><span class="favorite-btn__text">收藏</span>';
            actionsContainer.appendChild(favoriteBtn);
        }

        if (productId) favoriteBtn.dataset.productId = productId;
        if (typeof Favorites !== 'undefined' && Favorites.syncButtons) Favorites.syncButtons(actionsContainer);
        return favoriteBtn;
    }

    function ensureCompareButton(productId) {
        if (!actionsContainer) return null;
        if (!compareBtn) {
            compareBtn = document.createElement('button');
            compareBtn.type = 'button';
            compareBtn.className = 'compare-btn compare-btn--pdp';
            compareBtn.setAttribute('aria-label', '加入对比');
            compareBtn.setAttribute('aria-pressed', 'false');
            compareBtn.innerHTML =
                '<i class="fas fa-scale-balanced" aria-hidden="true"></i><span class="compare-btn__text">对比</span>';
            actionsContainer.appendChild(compareBtn);
        }

        if (productId) compareBtn.dataset.productId = productId;
        if (typeof Compare !== 'undefined' && Compare.syncButtons) Compare.syncButtons(actionsContainer);
        return compareBtn;
    }

    function ensureShareButton() {
        if (!actionsContainer) return null;
        if (!shareBtn) {
            shareBtn = document.createElement('button');
            shareBtn.type = 'button';
            shareBtn.className = 'share-btn share-btn--pdp';
            shareBtn.setAttribute('aria-label', '复制当前商品链接');
            shareBtn.innerHTML = '<i class="fas fa-link" aria-hidden="true"></i><span class="share-btn__text">复制链接</span>';
            actionsContainer.appendChild(shareBtn);
        }
        return shareBtn;
    }

    function ensureAlertButton(productId) {
        if (!actionsContainer) return null;
        if (!alertBtn) {
            alertBtn = document.createElement('button');
            alertBtn.type = 'button';
            alertBtn.className = 'alert-btn alert-btn--pdp';
            alertBtn.setAttribute('aria-label', '设置降价提醒');
            alertBtn.setAttribute('aria-pressed', 'false');
            alertBtn.setAttribute('data-price-alert', '');
            alertBtn.innerHTML = '<i class="fas fa-bell" aria-hidden="true"></i><span class="alert-btn__text">降价提醒</span>';
            actionsContainer.appendChild(alertBtn);
        }

        if (productId) alertBtn.dataset.productId = String(productId);
        if (typeof PriceAlerts !== 'undefined' && PriceAlerts.syncButtons) PriceAlerts.syncButtons(actionsContainer);
        return alertBtn;
    }

    async function copyToClipboard(text) {
        const value = String(text || '');
        if (!value) return false;

        // Prefer modern clipboard API (requires secure context)
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(value);
                return true;
            }
        } catch {
            // ignore and fallback
        }

        // Fallback: temporary textarea + execCommand (legacy)
        try {
            const textarea = document.createElement('textarea');
            textarea.value = value;
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
    }

    function initShareButton() {
        const btn = ensureShareButton();
        if (!btn) return;
        btn.addEventListener('click', async () => {
            const url = (() => {
                try { return new URL(window.location.href).toString(); } catch { return window.location.href; }
            })();

            const ok = await copyToClipboard(url);
            if (typeof Toast !== 'undefined' && Toast.show) {
                Toast.show(ok ? '链接已复制' : '复制失败，请手动复制地址栏链接', ok ? 'success' : 'info', 2200);
            }
        });
    }

    function upsertProductJsonLd(product) {
        try {
            if (!product || !product.id) return;

            const existing = document.getElementById('product-jsonld');
            existing?.remove();

            const toPlainText = (html) => {
                const div = document.createElement('div');
                div.innerHTML = String(html ?? '');
                return (div.textContent || '').replace(/\s+/g, ' ').trim();
            };

            const images = Array.isArray(product.images)
                ? product.images
                      .map((i) => i?.large || i?.thumb)
                      .filter(Boolean)
                : [];

            const url = (() => {
                try { return new URL(window.location.href).toString(); } catch { return ''; }
            })();

            const data = {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: String(product.name || ''),
                sku: String(product.id || ''),
                category: String(product.category?.name || ''),
                image: images,
                description: toPlainText(product.description),
                brand: { '@type': 'Brand', name: '塑梦潮玩' },
                offers: {
                    '@type': 'Offer',
                    priceCurrency: 'CNY',
                    price: typeof product.price === 'number' ? product.price.toFixed(2) : undefined,
                    availability: 'https://schema.org/InStock',
                    url: url || undefined,
                },
            };

            // 移除 undefined 字段（保持 JSON 干净）
            const cleaned = JSON.parse(JSON.stringify(data));

            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.id = 'product-jsonld';
            script.textContent = JSON.stringify(cleaned);
            document.head.appendChild(script);
        } catch {
            // SEO 增强失败不影响页面主流程
        }
    }

    // --- Update DOM with Product Data --- (Modified error handling)
    function populatePage(product) {
         if (!product) {
            console.error("PDP Populate Error: Product data is null or undefined.");
            // Display error within the layout instead of replacing everything
            pdpContainer.innerHTML = '<div class="container text-center" style="padding: var(--spacing-xl) 0;"><p>抱歉，找不到该商品信息。</p><p><a href="index.html">返回首页</a> 或 <a href="products.html">浏览所有商品</a></p></div>';
            document.title = "商品未找到 - 塑梦潮玩";
             return false;
         }

        // Check essential elements needed for population (can be less strict)
         if (!mainImage || !titleElement || !priceElement) {
             console.error("PDP Populate Error: Core DOM elements (image, title, price) not found.");
             // Display error within the layout
             pdpContainer.innerHTML = '<div class="container text-center" style="padding: var(--spacing-xl) 0;"><p>页面加载错误，无法显示商品详情。</p></div>';
             return false;
         }

        currentProductData = product;
        ensureFavoriteButton(product.id);
        ensureCompareButton(product.id);
        ensureShareButton();
        ensureAlertButton(product.id);
        if (typeof RecentlyViewed !== 'undefined' && RecentlyViewed.record) {
            RecentlyViewed.record(product.id);
        }

        // Update Breadcrumbs (Handle missing breadcrumbList gracefully)
        if (breadcrumbList) {
            const safeProductName = Utils.escapeHtml(product.name || '');
            const safeCategoryKey = product.category?.key ? encodeURIComponent(product.category.key) : '';
            const safeCategoryName = Utils.escapeHtml(product.category?.name || '');

             breadcrumbList.innerHTML = `
                  <li class="breadcrumb-item"><a href="index.html" class="breadcrumb__link">首页</a></li>
                  <li class="breadcrumb-item"><a href="products.html" class="breadcrumb__link">所有手办</a></li>
                  ${product.category ? `<li class="breadcrumb-item"><a href="category.html?cat=${safeCategoryKey}" class="breadcrumb__link">${safeCategoryName}</a></li>` : ''}
                  <li class="breadcrumb-item active" aria-current="page">${safeProductName}</li>
              `;
        } else {
             console.warn("PDP Warning: Breadcrumb container not found.");
        }

        // Update Page Title
        document.title = `${product.name} - 塑梦潮玩`;
        upsertProductJsonLd(product);

        // Update Product Info
        titleElement.textContent = product.name;
        if(seriesElement) seriesElement.textContent = product.series ? `系列: ${product.series}` : '';
        if (ratingElement) {
            const rating = Number(product.rating);
            const reviewCount = Number(product.reviewCount);
            if (Number.isFinite(rating)) {
                ratingElement.innerHTML = "";
                const icon = document.createElement("i");
                icon.className = "fas fa-star";
                icon.setAttribute("aria-hidden", "true");
                ratingElement.appendChild(icon);
                const text = document.createElement("span");
                text.textContent = rating.toFixed(1);
                ratingElement.appendChild(text);
                if (Number.isFinite(reviewCount) && reviewCount > 0) {
                    const small = document.createElement("small");
                    small.textContent = "(" + reviewCount + ")";
                    ratingElement.appendChild(small);
                }
            } else {
                ratingElement.textContent = "";
            }
        }
        if (statusElement) {
            const status = typeof product.status === "string" ? product.status : "";
            statusElement.textContent = status;
            statusElement.style.display = status ? "inline-flex" : "none";
        }
        priceElement.textContent = typeof product.price === "number" ? `￥${product.price.toFixed(2)}` : "价格待定";
        if (originalPriceElement) {
            if (product.originalPrice && product.originalPrice > product.price) {
                originalPriceElement.textContent = `¥${product.originalPrice.toFixed(2)}`;
                originalPriceElement.style.display = 'inline';
            } else {
                originalPriceElement.style.display = 'none';
            }
        }

        // Update Image Gallery (Handle missing thumbnailContainer gracefully)
        if (product.images && product.images.length > 0) {
            mainImage.src = product.images[0].large;
            mainImage.alt = product.images[0].alt || product.name;
            mainImage.decoding = 'async';
            if (thumbnailContainer) {
                 thumbnailContainer.innerHTML = '';
                 product.images.forEach((img, index) => {
                    const thumb = document.createElement('img');
                    thumb.src = img.thumb;
                    thumb.alt = img.alt ? img.alt.replace('图', '缩略图') : `${product.name} 缩略图 ${index + 1}`;
                    thumb.dataset.large = img.large;
                    thumb.classList.add('product-gallery-pdp__thumbnail');
                    thumb.loading = 'lazy';
                    thumb.decoding = 'async';
                    if (index === 0) {
                        thumb.classList.add('product-gallery-pdp__thumbnail--active');
                    }
                    thumb.addEventListener('click', () => handleThumbnailClick(img));
                    thumbnailContainer.appendChild(thumb);
                 });
            } else {
                 console.warn("PDP Warning: Thumbnail container not found.");
            }
        } else {
             mainImage.src = 'assets/images/figurine-1.svg'; // Fallback image
             mainImage.alt = product.name;
             if (thumbnailContainer) thumbnailContainer.innerHTML = '';
        }

        // Update Specs (Handle missing specsList gracefully)
        const specsSection = specsList?.closest('.product-specs');
        if (specsList && specsSection) {
            if (product.specs && product.specs.length > 0) {
                specsList.innerHTML = '';
                product.specs.forEach((spec) => {
                    const labelText = String(spec?.label || '').trim();
                    const valueText = String(spec?.value || '').trim();
                    if (!labelText && !valueText) return;

                    const specItem = document.createElement('li');
                    specItem.classList.add('product-specs__item');

                    const labelEl = document.createElement('span');
                    labelEl.className = 'product-specs__label';
                    labelEl.textContent = labelText ? `${labelText}:` : '参数:';

                    const valueEl = document.createElement('span');
                    valueEl.className = 'product-specs__value';
                    valueEl.textContent = valueText || '-';

                    specItem.appendChild(labelEl);
                    specItem.appendChild(valueEl);
                    specsList.appendChild(specItem);
                });
                specsSection.style.display = 'block';
            } else {
                 specsList.innerHTML = '';
                 specsSection.style.display = 'none';
            }
        } else if (specsSection) {
             console.warn("PDP Warning: Specs list (UL) not found within specs section.");
             specsSection.style.display = 'none';
        } else {
             console.warn("PDP Warning: Specs section or list container not found.");
        }

        // Update Description (Handle missing descriptionContainer gracefully)
         if (descriptionContainer) {
              if (product.description) {
                  const sanitizeAndAppend = (host, html) => {
                      if (!host) return;

                      const allowedTags = new Set(['P', 'BR', 'STRONG', 'EM', 'B', 'I', 'UL', 'OL', 'LI', 'A', 'CODE']);
                      const isSafeHref = (href) => {
                          const raw = String(href || '').trim();
                          if (!raw) return false;
                          if (raw.startsWith('#') || raw.startsWith('/') || raw.startsWith('./') || raw.startsWith('../')) return true;
                          try {
                              const u = new URL(raw, window.location.href);
                              return u.protocol === 'https:' || u.protocol === 'http:';
                          } catch {
                              return false;
                          }
                      };

                      const walk = (node, parent) => {
                          if (!node || !parent) return;
                          const type = node.nodeType;
                          if (type === 3) { // TEXT_NODE
                              parent.appendChild(document.createTextNode(node.textContent || ''));
                              return;
                          }
                          if (type !== 1) return; // ELEMENT_NODE only

                          const tag = String(node.tagName || '').toUpperCase();
                          if (!allowedTags.has(tag)) {
                              node.childNodes?.forEach?.((child) => walk(child, parent));
                              return;
                          }

                          const el = document.createElement(tag.toLowerCase());
                          if (tag === 'A') {
                              const href = node.getAttribute?.('href');
                              if (isSafeHref(href)) {
                                  el.setAttribute('href', href);
                                  const target = String(node.getAttribute?.('target') || '').trim();
                                  if (target) el.setAttribute('target', target);
                                  if (target.toLowerCase() === '_blank') el.setAttribute('rel', 'noopener noreferrer');
                              }
                          }
                          // Allow styling hooks for static content without allowing arbitrary attrs
                          if (tag !== 'A') {
                              const className = String(node.getAttribute?.('class') || '').trim();
                              if (className) el.setAttribute('class', className);
                          }

                          node.childNodes?.forEach?.((child) => walk(child, el));
                          parent.appendChild(el);
                      };

                      const template = document.createElement('template');
                      template.innerHTML = String(html ?? '');
                      const frag = document.createDocumentFragment();
                      template.content.childNodes.forEach((child) => walk(child, frag));
                      host.appendChild(frag);
                  };

                  // Reset content while keeping a stable header
                  descriptionContainer.textContent = '';
                  const header = document.createElement('h4');
                  header.textContent = '商品描述';
                  descriptionContainer.appendChild(header);
                  sanitizeAndAppend(descriptionContainer, product.description);
                  descriptionContainer.style.display = 'block';
              } else {
                  descriptionContainer.style.display = 'none';
              }
          } else {
              console.warn("PDP Warning: Description container not found.");
         }
        return true;
    }

    // --- Image Gallery Logic --- (Keep existing)
    function handleThumbnailClick(imageData) {
        // ... (no changes needed here)
         if (!mainImage || !imageData.large) return;
        mainImage.src = imageData.large;
        mainImage.alt = imageData.alt;
        thumbnailContainer?.querySelectorAll('.product-gallery-pdp__thumbnail').forEach(t => {
            t.classList.toggle('product-gallery-pdp__thumbnail--active', t.dataset.large === imageData.large);
        });
    }

    // --- Quantity Selector Logic --- (Keep existing)
    function updateQuantity(change) {
        // ... (no changes needed here)
         if (!quantityInput || !minusBtn) return;
        let currentValue = parseInt(quantityInput.value, 10);
        if (isNaN(currentValue)) currentValue = 1;
        let newValue = currentValue + change;
        if (newValue < 1) newValue = 1;
        if (newValue > maxQuantity) newValue = maxQuantity;
        quantityInput.value = newValue;
        minusBtn.disabled = newValue <= 1;
    }

    function initQuantitySelector() {
        // ... (no changes needed here)
          if (!quantityInput || !minusBtn || !plusBtn) return;
         minusBtn.disabled = parseInt(quantityInput.value, 10) <= 1;
         minusBtn.addEventListener('click', () => updateQuantity(-1));
         plusBtn.addEventListener('click', () => updateQuantity(1));
         quantityInput.addEventListener('change', () => {
             let currentValue = parseInt(quantityInput.value, 10);
             if (isNaN(currentValue) || currentValue < 1) currentValue = 1;
             if (currentValue > maxQuantity) currentValue = maxQuantity;
             quantityInput.value = currentValue;
             minusBtn.disabled = parseInt(quantityInput.value, 10) <= 1;
         });
          quantityInput.addEventListener('input', () => {
              quantityInput.value = quantityInput.value.replace(/[^0-9]/g, '');
          });
    }

    // --- Add to Cart Logic --- (Modified to always use Cart.updateHeaderCartCount)
    function handleAddToCart() {
         if (!addToCartBtn || !quantityInput || !currentProductData) return;

        const q = Number.parseInt(quantityInput.value, 10);
        const quantity = Number.isFinite(q) && q > 0 ? Math.min(99, q) : 1;

        const result = (typeof Cart !== 'undefined' && typeof Cart.addItem === 'function')
            ? Cart.addItem(currentProductData, quantity)
            : { added: quantity };

        // Micro-interaction: fly to cart
        try {
            UXMotion?.flyToCart?.(mainImage || addToCartBtn);
        } catch {
            // ignore
        }

        // Visual feedback (Keep existing)
        const originalText = addToCartBtn.innerHTML;
        addToCartBtn.innerHTML = '已添加 <i class="fas fa-check"></i>';
        addToCartBtn.disabled = true;
        setTimeout(() => {
            if (addToCartBtn) {
                 addToCartBtn.innerHTML = originalText;
                 addToCartBtn.disabled = false;
            }
        }, 1500);

        if (typeof Toast !== 'undefined' && Toast.show) {
            const addedCount = (result.added || quantity) > 1 ? ` ×${result.added || quantity}` : '';
            Toast.show(`已加入购物车${addedCount}`, 'success');
        }
        if (typeof Celebration !== 'undefined' && Celebration.fire) {
            Celebration.fire(addToCartBtn);
        }
        if (typeof Cinematic !== 'undefined') {
            Cinematic.shimmerOnce?.(addToCartBtn, { durationMs: 620 });
            Cinematic.pulse?.(addToCartBtn, { scale: 1.06, duration: 0.26 });
        }
    }

    function initAddToCart() {
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', handleAddToCart);
        }
    }

    // --- Initialization --- (Modified to use SharedData)
    function init() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');
        let productToDisplay = null;

        if (productId && typeof SharedData !== 'undefined') {
             const allProducts = SharedData.getAllProducts();
             productToDisplay = allProducts.find(p => p.id === productId);
             if (!productToDisplay) {
                  console.warn(`PDP Init: Product with ID '${productId}' not found.`);
             }
        } else if (!productId) {
             console.warn("PDP Init: No product ID found in URL.");
        } else {
             console.error("PDP Init: SharedData module not available.");
        }

        const populated = populatePage(productToDisplay); // Handles null case internally

        if (populated) {
            initQuantitySelector();
            initAddToCart();
            initShareButton();
        } else {
            console.error("PDP module initialization failed due to population errors.");
        }
    }

    return { init: init };
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
    let clearCartButton = cartSummaryContainer?.querySelector('.cart-clear-button') || null;
    const recommendationContainer = cartContainer?.querySelector('[data-cart-recommendations]');
    const recommendationsGrid = recommendationContainer?.querySelector('.recommendations-grid');
    let dragBound = false;
    let draggingItem = null;
    let cartItemDelegationBound = false;

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

            const price = Number(raw.price);
            const safePrice = Number.isFinite(price) && price >= 0 ? price : 0;

            const name = typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : '[手办名称]';
            const series = typeof raw.series === 'string' ? raw.series.trim() : '';
            const image =
                typeof raw.image === 'string' && raw.image.trim().length > 0 ? raw.image.trim() : 'assets/images/figurine-1.svg';

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

    function dispatchChanged() {
        try { window.dispatchEvent(new CustomEvent('cart:changed')); } catch { /* ignore */ }
    }

    function saveCart(cart) {
        const normalized = normalizeCartItems(cart);
        Utils.writeStorageJSON('cart', normalized);
        _updateHeaderCartCount(normalized); // Use internal function
        dispatchChanged();
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

        const price = typeof item?.price === 'number' ? item.price : Number(item?.price) || 0;
        const q = Number.parseInt(item?.quantity, 10);
        const quantity = Number.isFinite(q) && q > 0 ? q : 1;
        const subtotal = price * quantity;

        return `
            <div class="cart-item" data-product-id="${safeIdAttr}" draggable="true">
                <div class="cart-item__drag" title="拖拽排序" aria-hidden="true"><i class="fas fa-grip-vertical"></i></div>
                <div class="cart-item__image">
                    <a href="${detailHref}">
                        <img src="${safeImage}" alt="${safeName}">
                    </a>
                </div>
                <div class="cart-item__info">
                    <h4 class="cart-item__title"><a href="${detailHref}">${safeName}</a></h4>
                    <p class="cart-item__series">${safeSeries}</p> 
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
                    <button class="remove-btn" aria-label="移除商品"><i class="fas fa-trash-alt"></i></button>
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

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const promo = typeof Promotion !== 'undefined' && Promotion.get ? Promotion.get() : null;
        const discount = typeof Promotion !== 'undefined' && Promotion.calculateDiscount
            ? Promotion.calculateDiscount(subtotal, promo)
            : 0;

        const availablePoints = typeof Rewards !== 'undefined' && Rewards.getPoints ? Rewards.getPoints() : 0;
        if (rewardsAvailableEl) rewardsAvailableEl.textContent = `可用 ${availablePoints} 积分`;

        const usePoints = rewardsToggle
            ? Boolean(rewardsToggle.checked)
            : Boolean(Utils.readStorageJSON(usePointsKey, false));
        const maxMerch = Math.max(0, Pricing.roundMoney(subtotal - discount));
        const maxPoints = Math.floor(maxMerch * 100);
        const pointsUsed = usePoints ? Math.min(maxPoints, Number(availablePoints) || 0) : 0;
        const rewardsDiscount = typeof Rewards !== 'undefined' && Rewards.calcDiscountByPoints
            ? Rewards.calcDiscountByPoints(pointsUsed)
            : 0;
        const region = typeof ShippingRegion !== 'undefined' && ShippingRegion.get ? ShippingRegion.get() : 'cn-east';
        const shippingCost = typeof Pricing !== 'undefined' && Pricing.calculateShipping
            ? Pricing.calculateShipping({ subtotal, discount: discount + rewardsDiscount, region, promotion: promo })
            : 0;
        const total = Math.max(0, Pricing.roundMoney(subtotal - discount - rewardsDiscount) + Pricing.roundMoney(shippingCost));

        UXMotion.tweenMoney(subtotalElement, subtotal);
        UXMotion.tweenMoney(shippingElement, shippingCost);
        UXMotion.tweenMoney(totalElement, total);

        if (discountElement && discountRow) {
            const show = discount > 0;
            discountRow.style.display = show ? 'flex' : 'none';
            UXMotion.tweenMoney(discountElement, discount, { prefix: '- ' });
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
            const ok = window.confirm('确定要清空购物车吗？此操作不可撤销。');
            if (!ok) return;
            setCart([]);
            if (typeof Toast !== 'undefined' && Toast.show) {
                Toast.show('购物车已清空', 'success', 1800);
            }
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

        const safeQuantity = clampQuantity(newQuantity);
        const prevQuantity = Number(cart[itemIndex]?.quantity) || 1;
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
        const next = cart.filter((item) => item.id !== productId);
        if (next.length === cart.length) return;

        saveCart(next);

        if (cartContainer && rerender) {
            renderCart();
            return;
        }

        // Incremental UI update (avoid full rerender)
        try { itemElement?.remove?.(); } catch { /* ignore */ }
        if (next.length === 0) {
            renderCart();
            return;
        }
        updateCartSummary(next);
        renderRecommendations(next);
    }

    function bindCartItemDelegation() {
        if (!cartItemsContainer || cartItemDelegationBound) return;
        cartItemDelegationBound = true;

        cartItemsContainer.addEventListener('click', (event) => {
            const target = event?.target;

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
        const safeQty = Math.min(99, Math.max(1, Number(quantity) || 1));
        const cart = getCart();
        const existing = cart.find((item) => item.id === product.id);
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
// Checkout Module (Modified to use SharedData and Cart.getCart)
// ==============================================
const Checkout = (function() {
    const checkoutContainer = document.querySelector('.checkout-main');
    if (!checkoutContainer) return { init: () => {} };

    const checkoutForm = checkoutContainer.querySelector('#checkout-form'); 
    const orderSummaryItemsContainer = checkoutContainer.querySelector('.order-summary__items');
    const summarySubtotalEl = checkoutContainer.querySelector('.order-summary .summary-subtotal');
    const summaryShippingEl = checkoutContainer.querySelector('.order-summary .summary-shipping');
    const summaryTotalEl = checkoutContainer.querySelector('.order-summary .total-price');
    const paymentOptions = checkoutContainer.querySelectorAll('.payment-options input[name="payment"]');
    const placeOrderButton = checkoutContainer.querySelector('.place-order-button');
    const clearFormButton = checkoutContainer.querySelector('.checkout-clear-button');
    const addressBookSelect = checkoutForm?.querySelector('[data-address-book-select]');
    const saveAddressToggle = checkoutForm?.querySelector('[data-address-book-save]');

    const rewardsToggle = checkoutContainer.querySelector('[data-rewards-toggle]');
    const rewardsAvailableEl = checkoutContainer.querySelector('[data-rewards-available]');
    const rewardsDiscountEl = checkoutContainer.querySelector('.order-summary .summary-rewards-discount');
    const rewardsDiscountRow = checkoutContainer.querySelector('.order-summary [data-summary-rewards-row]');

    const draftKey = 'checkoutDraft';
    const usePointsKey = 'checkoutUsePoints';
    const nameInput = checkoutForm?.querySelector('#name');
    const phoneInput = checkoutForm?.querySelector('#phone');
    const addressInput = checkoutForm?.querySelector('#address');
    const regionSelect = checkoutForm?.querySelector('#region');

    let lastTotal = NaN;

    // --- Helper Functions --- (Keep formatPrice, clearError, showError)
      function formatPrice(price) {
          return `¥${price.toFixed(2)}`;
      }
    function clearError(inputElement) {
        // ... (no changes needed here)
         const formGroup = inputElement.closest('.form-group');
        if (!formGroup) return;
        const errorElement = formGroup.querySelector('.error-message');
        inputElement.classList.remove('input-error');
        inputElement.removeAttribute('aria-invalid');
        if (errorElement?.id && inputElement.getAttribute('aria-describedby') === errorElement.id) {
            inputElement.removeAttribute('aria-describedby');
        }
        if (errorElement) {
            errorElement.remove();
        }
    }

    function showError(inputElement, message) {
        // ... (no changes needed here)
         const formGroup = inputElement.closest('.form-group');
        if (!formGroup) return;
        clearError(inputElement); // Remove previous error first
        inputElement.classList.add('input-error');
        inputElement.setAttribute('aria-invalid', 'true');
        const errorElement = document.createElement('span');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        try {
            const base = String(inputElement.id || inputElement.name || 'field').replace(/[^a-zA-Z0-9_-]/g, '');
            errorElement.id = `error-${base || 'field'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
            inputElement.setAttribute('aria-describedby', errorElement.id);
        } catch {
            // ignore
        }
        inputElement.parentNode.insertBefore(errorElement, inputElement.nextSibling);
    }

    function readDraft() {
        const parsed = Utils.readStorageJSON(draftKey, null);
        if (!parsed || typeof parsed !== 'object') return null;
        return parsed;
    }

    function writeDraft(data) {
        Utils.writeStorageJSON(draftKey, data);
    }

    function clearDraft() {
        Utils.removeStorage(draftKey);
    }

    function collectDraft() {
        return {
            name: nameInput?.value?.trim() || '',
            phone: phoneInput?.value?.trim() || '',
            address: addressInput?.value?.trim() || '',
            region: regionSelect?.value || '',
            payment: checkoutForm?.querySelector('input[name="payment"]:checked')?.value || '',
        };
    }

    function applyDraft() {
        const draft = readDraft();
        if (!draft) return;

        if (nameInput && draft.name) nameInput.value = draft.name;
        if (phoneInput && draft.phone) phoneInput.value = draft.phone;
        if (addressInput && draft.address) addressInput.value = draft.address;

        if (regionSelect && draft.region) {
            ShippingRegion?.syncAllSelects?.();
            regionSelect.value = String(draft.region || '');
            ShippingRegion?.set?.(regionSelect.value, { silent: true });
        }

        if (draft.payment && paymentOptions && paymentOptions.length > 0) {
            paymentOptions.forEach((option) => {
                option.checked = option.value === draft.payment;
            });
        }

        if (typeof Toast !== 'undefined' && Toast.show) {
            Toast.show('已恢复上次填写的收货信息（本地保存）', 'info', 2000);
        }
    }

    function clearForm() {
        if (!checkoutForm) return;
        checkoutForm.reset();
        clearDraft();
        checkoutForm.querySelectorAll('.input-error').forEach((el) => el.classList.remove('input-error'));
        checkoutForm.querySelectorAll('.error-message').forEach((el) => el.remove());
    }

    // --- Validation Logic --- (Keep validateInput, validateForm)
    function validateInput(inputElement) {
        // ... (no changes needed here)
          let isValid = true;
        const value = inputElement.value.trim();
        const fieldName = inputElement.previousElementSibling?.textContent || inputElement.name;

        if (inputElement.required && value === '') {
            showError(inputElement, `${fieldName}不能为空`);
            isValid = false;
        } else {
            clearError(inputElement);
        }

        if (isValid && inputElement.type === 'tel') {
            const phoneRegex = /^1[3-9]\d{9}$/;
            if (!phoneRegex.test(value)) {
                showError(inputElement, '请输入有效的手机号码');
                isValid = false;
            } else {
                clearError(inputElement);
            }
        }
        return isValid;
    }
    function validateForm() {
        // ... (no changes needed here)
         if (!checkoutForm) return false;
        let isFormValid = true;
        const inputsToValidate = checkoutForm.querySelectorAll('input[required], textarea[required], select[required]');

        inputsToValidate.forEach(input => {
            if (!validateInput(input)) {
                isFormValid = false;
            }
        });

        let paymentSelected = false;
        paymentOptions.forEach(option => {
            if (option.checked) {
                paymentSelected = true;
            }
        });

        const paymentSection = document.getElementById('payment-method');
        const errorElement = paymentSection?.querySelector('.error-message');
        if(errorElement) errorElement.remove(); // Clear previous payment error

        if (!paymentSelected && paymentOptions.length > 0) { // Only validate if options exist
            console.warn("请选择支付方式");
            if (paymentSection) {
                const newErrorElement = document.createElement('span');
                newErrorElement.className = 'error-message';
                newErrorElement.textContent = '请选择一个支付方式';
                newErrorElement.style.display = 'block'; 
                newErrorElement.style.marginTop = 'var(--spacing-sm)';
                 newErrorElement.style.color = 'var(--color-error)'; // Ensure error color
                paymentSection.appendChild(newErrorElement);
            }
            isFormValid = false;
        } 
        return isFormValid;
    }

    // --- Order Summary Logic --- (Modified to use Cart.getCart)
    function renderOrderSummary(options = {}) {
        if (!orderSummaryItemsContainer || !summarySubtotalEl || !summaryShippingEl || !summaryTotalEl) {
             console.error("Checkout Error: Order summary elements not found.");
             return;
         }
        const animateItems = Boolean(options.animateItems);

        // Use Cart module to get data
        const cart = (typeof Cart !== 'undefined' && Cart.getCart) ? Cart.getCart() : []; 
        orderSummaryItemsContainer.innerHTML = '';

        if (cart.length === 0) {
            orderSummaryItemsContainer.innerHTML = '<p class="text-center text-muted">购物车为空，无法结算。</p>';
            UXMotion.tweenMoney(summarySubtotalEl, 0);
            UXMotion.tweenMoney(summaryShippingEl, 0);
            UXMotion.tweenMoney(summaryTotalEl, 0);
            lastTotal = 0;
            const discountEl = checkoutContainer.querySelector('.order-summary .summary-discount');
            const discountRow = checkoutContainer.querySelector('.order-summary [data-summary-discount-row]');
            if (discountEl && discountRow) {
                discountRow.style.display = 'none';
                UXMotion.tweenMoney(discountEl, 0, { prefix: '- ' });
            }
            if (rewardsDiscountEl && rewardsDiscountRow) {
                rewardsDiscountRow.style.display = 'none';
                UXMotion.tweenMoney(rewardsDiscountEl, 0, { prefix: '- ' });
            }
            if(placeOrderButton) placeOrderButton.disabled = true;
            return;
        }

        let subtotal = 0;
        cart.forEach(item => {
            subtotal += item.price * item.quantity;
            const itemElement = document.createElement('div');
            itemElement.className = 'summary-item';

            const img = document.createElement('img');
            img.src = String(item.image || 'assets/images/figurine-1.svg');
            img.alt = `${String(item.name || '[手办名称]')} 缩略图`;

            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${String(item.name || '[手办名称]')} x ${item.quantity}`;

            const priceSpan = document.createElement('span');
            priceSpan.textContent = formatPrice(item.price * item.quantity);

            itemElement.appendChild(img);
            itemElement.appendChild(nameSpan);
            itemElement.appendChild(priceSpan);
            orderSummaryItemsContainer.appendChild(itemElement);
        });

        if (animateItems && typeof Cinematic !== 'undefined') {
            Cinematic.staggerEnter?.(orderSummaryItemsContainer.querySelectorAll('.summary-item'), {
                y: 10,
                blur: 10,
                duration: 0.32,
                stagger: 0.03,
                maxStaggerItems: 10,
            });
        }

        const promo = typeof Promotion !== 'undefined' && Promotion.get ? Promotion.get() : null;
        const discount = typeof Promotion !== 'undefined' && Promotion.calculateDiscount
            ? Promotion.calculateDiscount(subtotal, promo)
            : 0;
        const region = typeof ShippingRegion !== 'undefined' && ShippingRegion.get ? ShippingRegion.get() : 'cn-east';
        const shippingCost = typeof Pricing !== 'undefined' && Pricing.calculateShipping
            ? Pricing.calculateShipping({ subtotal, discount, region, promotion: promo })
            : 0;
        const total = Math.max(0, Pricing.roundMoney(subtotal - discount) + Pricing.roundMoney(shippingCost));

        UXMotion.tweenMoney(summarySubtotalEl, subtotal);
        const discountEl = checkoutContainer.querySelector('.order-summary .summary-discount');
        const discountRow = checkoutContainer.querySelector('.order-summary [data-summary-discount-row]');
        if (discountEl && discountRow) {
            const show = discount > 0;
            const animated = typeof Cinematic !== 'undefined' && Cinematic.toggleDisplay
                ? Cinematic.toggleDisplay(discountRow, show, { display: 'flex', y: 10, blur: 10, duration: 0.26 })
                : false;
            if (!animated) discountRow.style.display = show ? 'flex' : 'none';
            UXMotion.tweenMoney(discountEl, discount, { prefix: '- ' });
        }
        if (rewardsDiscountEl && rewardsDiscountRow) {
            const show = rewardsDiscount > 0;
            const animated = typeof Cinematic !== 'undefined' && Cinematic.toggleDisplay
                ? Cinematic.toggleDisplay(rewardsDiscountRow, show, { display: 'flex', y: 10, blur: 10, duration: 0.26 })
                : false;
            if (!animated) rewardsDiscountRow.style.display = show ? 'flex' : 'none';
            UXMotion.tweenMoney(rewardsDiscountEl, rewardsDiscount, { prefix: '- ' });
            try {
                rewardsDiscountEl.setAttribute(
                    'aria-label',
                    show
                        ? `积分抵扣：${Pricing.formatCny(rewardsDiscount)}（使用 ${pointsUsed} 积分）`
                        : '积分抵扣：0',
                );
            } catch {
                // ignore
            }
        }
        UXMotion.tweenMoney(summaryShippingEl, shippingCost);
        UXMotion.tweenMoney(summaryTotalEl, total);
        try {
            if (typeof Cinematic !== 'undefined') {
                const totalRow = checkoutContainer.querySelector('.order-summary .total-row') || summaryTotalEl;
                const prev = Number(lastTotal);
                if (Number.isFinite(prev) && Math.abs(total - prev) > 0.009) {
                    Cinematic.pulse?.(totalRow, { scale: 1.04, duration: 0.26 });
                    Cinematic.shimmerOnce?.(totalRow, { durationMs: 560 });
                }
            }
            lastTotal = total;
        } catch {
            lastTotal = total;
        }

        if(placeOrderButton) placeOrderButton.disabled = false;
    }

    // --- Event Handling --- (Keep handlePaymentSelection, handlePlaceOrder, addEventListeners)
    function handlePaymentSelection() {
       // ... (no changes needed here)
          const paymentSection = document.getElementById('payment-method');
        const errorElement = paymentSection?.querySelector('.error-message');
        if (errorElement) errorElement.remove();
    }

    function handlePlaceOrder(event) {
        event.preventDefault(); 
 
        if (validateForm()) {
            const formData = new FormData(checkoutForm);
            const shippingAddress = {
                name: String(formData.get('name') || ''),
                phone: String(formData.get('phone') || ''),
                address: String(formData.get('address') || ''),
            };
            const paymentMethod = String(formData.get('payment') || '');
            const region = String(formData.get('region') || ShippingRegion?.get?.() || '');
            const currentCart = (typeof Cart !== 'undefined' && Cart.getCart) ? Cart.getCart() : [];

            const subtotal = currentCart.reduce((sum, item) => sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 1), 0);
            const promo = typeof Promotion !== 'undefined' && Promotion.get ? Promotion.get() : null;
            const promoDiscount = typeof Promotion !== 'undefined' && Promotion.calculateDiscount
                ? Promotion.calculateDiscount(subtotal, promo)
                : 0;

            const availablePoints = typeof Rewards !== 'undefined' && Rewards.getPoints ? Rewards.getPoints() : 0;
            const usePoints = rewardsToggle
                ? Boolean(rewardsToggle.checked)
                : Boolean(Utils.readStorageJSON(usePointsKey, false));
            const maxMerch = Math.max(0, Pricing.roundMoney(subtotal - promoDiscount));
            const maxPoints = Math.floor(maxMerch * 100);
            const pointsUsed = usePoints ? Math.min(maxPoints, Number(availablePoints) || 0) : 0;
            const rewardsDiscount = typeof Rewards !== 'undefined' && Rewards.calcDiscountByPoints
                ? Rewards.calcDiscountByPoints(pointsUsed)
                : 0;

            const order = (typeof Orders !== 'undefined' && Orders.create)
                ? Orders.create({ items: currentCart, shippingAddress, paymentMethod, region, rewards: { pointsUsed, discount: rewardsDiscount } })
                : null;

            // 地址簿：可选保存（降低复购摩擦）
            try {
                const saveAddress = String(formData.get('saveAddress') || '') === '1';
                if (saveAddress && typeof AddressBook !== 'undefined' && AddressBook.upsert) {
                    AddressBook.upsert({
                        label: '结算保存',
                        name: shippingAddress.name,
                        phone: shippingAddress.phone,
                        address: shippingAddress.address,
                        region,
                        isDefault: true,
                    });
                    Toast?.show?.('已保存到地址簿', 'success', 1600);
                }
            } catch {
                // ignore
            }

            // 积分：先扣后返（更贴近真实电商）
            try {
                if (usePoints && pointsUsed > 0 && typeof Rewards !== 'undefined') {
                    Rewards.consumePoints?.(pointsUsed);
                }
                const earned = typeof Rewards !== 'undefined' && Rewards.calcEarnedPoints
                    ? Rewards.calcEarnedPoints(Math.max(0, subtotal - promoDiscount - rewardsDiscount))
                    : 0;
                if (earned > 0 && typeof Rewards !== 'undefined') {
                    Rewards.addPoints?.(earned);
                    Toast?.show?.(`获得积分 +${earned}`, 'success', 1800);
                }
            } catch {
                // ignore
            }
 
            // 清空购物车（优先走统一入口，确保归一化与事件派发）
            if (typeof Cart !== 'undefined' && typeof Cart.setCart === 'function') {
                Cart.setCart([]);
            } else {
                try { localStorage.removeItem('cart'); } catch { /* ignore */ }

                // Fallback：至少更新头部角标
                if (typeof Cart !== 'undefined' && Cart.updateHeaderCartCount) {
                    Cart.updateHeaderCartCount([]);
                } else {
                    console.error("Checkout Error: Cannot update header cart count.");
                }
            }
            clearDraft();

            const orderId = String(order?.id || '').trim();
            window.location.href = orderId
                ? `order-success.html?oid=${encodeURIComponent(orderId)}`
                : 'index.html?order=success';
        } else {
            const firstInvalidInput = checkoutForm.querySelector('.input-error');
            const firstError = checkoutForm.querySelector('.input-error, .error-message');
            const behavior = Utils.prefersReducedMotion() ? 'auto' : 'smooth';
            firstError?.scrollIntoView({ behavior, block: 'center' });
            firstInvalidInput?.focus?.();
        }
    }

    function addEventListeners() {
        // ... (no changes needed here)
         if (checkoutForm && placeOrderButton) {
            checkoutForm.addEventListener('submit', handlePlaceOrder);

            const inputsToValidate = checkoutForm.querySelectorAll('input[required], textarea[required], select[required]');
            inputsToValidate.forEach(input => {
                input.addEventListener('blur', () => validateInput(input));
                input.addEventListener('input', () => clearError(input)); 
            });

            const inputsToDraft = checkoutForm.querySelectorAll('input, textarea, select');
            const debouncedSaveDraft = Utils.debounce(() => {
                writeDraft(collectDraft());
            }, 240);
            inputsToDraft.forEach((input) => {
                input.addEventListener('input', debouncedSaveDraft);
                input.addEventListener('change', debouncedSaveDraft);
            });

            paymentOptions.forEach(option => {
                option.addEventListener('change', handlePaymentSelection);
            });

            if (clearFormButton) {
                clearFormButton.addEventListener('click', () => {
                    const ok = window.confirm('确定清空当前填写的收货信息吗？');
                    if (!ok) return;
                    clearForm();
                    if (typeof Toast !== 'undefined' && Toast.show) {
                        Toast.show('已清空收货信息', 'info', 1800);
                    }
                });
            }
        }

        if (rewardsToggle) {
            rewardsToggle.checked = Boolean(Utils.readStorageJSON(usePointsKey, false));
            rewardsToggle.addEventListener('change', () => {
                try { localStorage.setItem(usePointsKey, rewardsToggle.checked ? 'true' : 'false'); } catch { /* ignore */ }
                renderOrderSummary();
            });
        }

        if (addressBookSelect && checkoutForm) {
            AddressBook?.fillSelect?.(addressBookSelect);
            addressBookSelect.addEventListener('change', () => {
                const id = addressBookSelect.value;
                const entry = AddressBook?.getById?.(id);
                if (!entry) return;
                AddressBook.applyToCheckoutForm?.(entry, checkoutForm);
                try { ShippingRegion?.set?.(entry.region); } catch { /* ignore */ }
                renderOrderSummary();
                Toast?.show?.('已应用常用地址', 'success', 1400);
            });
        }
    }

    // --- Initialization ---
    function init() {
         if (checkoutContainer) { // Check if on checkout page
              if (rewardsToggle) {
                  rewardsToggle.checked = Boolean(Utils.readStorageJSON(usePointsKey, false));
              }
              renderOrderSummary({ animateItems: true });
              applyDraft();
              addEventListeners();

              // 同标签页内购物车变化（例如从其他模块写入）时刷新摘要
              try {
                  window.addEventListener('cart:changed', () => renderOrderSummary({ animateItems: true }));
              } catch {
                  // ignore
              }
         }
    }

    function refresh() {
        if (!checkoutContainer) return;
        renderOrderSummary();
    }

    return { init: init, refresh };
})();


// ==============================================
// Static Page Content Module (Uses SharedData for consistency if needed later)
// ==============================================
const StaticPage = (function() {
    // ... (Keep existing StaticPage, maybe use SharedData.getCategoryName later if needed)
    const staticContainer = document.querySelector('.static-page-main');
    if (!staticContainer) return { init: () => {} };

    const contentArea = staticContainer.querySelector('#static-content-area');
    const pageTitleElement = staticContainer.querySelector('#static-page-title'); 
    const breadcrumbPageNameElement = staticContainer.querySelector('#breadcrumb-page-name');
    const metaDescriptionTag = document.querySelector('meta[name="description"]');

    const pageContents = {
        faq: {
            title: '常见问题',
            description: '关于购买、预售、物流、售后与正品保障的常见问题解答。',
            content: `
                <section class="static-section">
                    <h2>关于本项目</h2>
                    <p>这是一个纯静态多页电商示例站点，用于演示落地页、商品列表/详情、购物车与结算流程。</p>
                    <p><strong>注意：</strong>本站不接入真实支付与后端订单系统，结算页为模拟下单。</p>
                </section>

                <section class="static-section">
                    <h2>商品与预售</h2>
                    <h3>Q：商品数据来自哪里？</h3>
                    <p>A：示例商品数据内置在 <code>scripts/main.js</code> 的 <code>SharedData</code> 中，便于快速修改与二次开发。</p>
                    <h3>Q：可以对接真实 API 吗？</h3>
                    <p>A：可以。推荐将商品与库存改为接口拉取，并将购物车/订单写入服务端数据库。</p>
                </section>

                <section class="static-section">
                    <h2>购物车与结算</h2>
                    <h3>Q：购物车会丢失吗？</h3>
                    <p>A：购物车使用浏览器 <code>localStorage</code> 存储，刷新页面不会丢失（但清理浏览器数据会清空）。</p>
                    <h3>Q：为什么我双击打开 HTML 会有跳转/资源问题？</h3>
                    <p>A：某些浏览器在 <code>file://</code> 下对资源与导航有安全限制，建议使用本地静态服务器预览（README 有命令）。</p>
                </section>

                <section class="static-section">
                    <h2>联系我们</h2>
                    <p>如需定制为真实项目（会员/支付/订单/库存/后台管理），欢迎基于此模板继续扩展。</p>
                    <p><a class="cta-button-secondary" href="index.html#contact">前往联系</a></p>
                </section>
            `.trim(),
        },
        privacy: {
            title: '隐私政策',
            description: '说明本示例站点在本地存储、外部资源与信息安全方面的行为与边界。',
            content: `
                <section class="static-section">
                    <h2>我们收集什么信息？</h2>
                    <p>本项目为纯静态示例站点，不包含后端服务，默认情况下不会将您的个人信息上传到服务器。</p>
                    <ul>
                        <li><strong>本地存储：</strong>为了模拟购物车，本项目会在浏览器 <code>localStorage</code> 中保存购物车条目（商品 ID、数量等）。</li>
                        <li><strong>表单输入：</strong>结算页表单仅用于前端校验与演示，不会提交到服务器。</li>
                    </ul>
                </section>

                <section class="static-section">
                    <h2>第三方资源</h2>
                    <p>页面可能使用第三方公共资源（例如字体与图标 CDN）。这些服务可能会记录基础访问日志（如 IP、User-Agent）。</p>
                    <p>若你需要完全离线/内网可用，建议将字体与图标改为本地自托管，并在部署时配置严格的内容安全策略（CSP）。</p>
                </section>

                <section class="static-section">
                    <h2>如何清理本地数据？</h2>
                    <p>你可以在浏览器开发者工具中清理站点数据，或手动删除本地存储项。</p>
                    <p>示例：清空购物车会移除 <code>localStorage</code> 中的 <code>cart</code>。</p>
                </section>
            `.trim(),
        },
        tos: {
            title: '服务条款',
            description: '本项目作为示例站点的使用条款与免责声明。',
            content: `
                <section class="static-section">
                    <h2>项目性质</h2>
                    <p>本仓库为演示用途的静态前端模板，旨在展示页面结构、交互与基础电商流程。</p>
                </section>

                <section class="static-section">
                    <h2>免责声明</h2>
                    <ul>
                        <li>本项目不提供真实支付、真实订单履约、真实库存同步等商业能力。</li>
                        <li>示例数据、价格与品牌名称仅用于展示，不构成任何商业承诺。</li>
                        <li>在将本模板用于生产环境前，请自行完成安全审计、隐私合规与接口鉴权等工作。</li>
                    </ul>
                </section>

                <section class="static-section">
                    <h2>许可与二次开发</h2>
                    <p>你可以在遵守仓库许可（如已添加）与第三方资源许可的前提下进行二次开发与商业化部署。</p>
                </section>
            `.trim(),
        },
        default: {
            title: '页面未找到',
            description: '请求的页面不存在，建议返回首页或浏览商品列表。',
            content: `
                <section class="static-section">
                    <h2>抱歉，页面不存在</h2>
                    <p>你访问的页面不存在或参数不正确。</p>
                    <p>
                        <a class="cta-button-secondary" href="index.html">返回首页</a>
                        <a class="cta-button-secondary" href="products.html">浏览所有商品</a>
                    </p>
                </section>
            `.trim(),
        },
    };
     
     function loadContent() {
        // ... (Keep existing loadContent)
         if (!contentArea || !pageTitleElement || !breadcrumbPageNameElement || !metaDescriptionTag) {
            console.error('Static page elements not found.');
            if(contentArea) contentArea.innerHTML = pageContents.default.content;
            return;
        }
        const urlParams = new URLSearchParams(window.location.search);
        const pageKey = urlParams.get('page');
        let pageData;
        if (pageKey && pageContents[pageKey]) {
            pageData = pageContents[pageKey];
        } else {
            pageData = pageContents.default;
        }
        if (!pageData?.title || !pageData?.content) pageData = pageContents.default;
        document.title = `${pageData.title} - 塑梦潮玩`;
        if (pageData.description) metaDescriptionTag.setAttribute('content', pageData.description);
        pageTitleElement.textContent = pageData.title;
        breadcrumbPageNameElement.textContent = pageData.title;
        contentArea.innerHTML = pageData.content;
        setActiveNavLink(pageKey);
    }

    function setActiveNavLink(pageKey) {
        // ... (Keep existing setActiveNavLink)
         const headerNav = document.querySelector('.header__navigation');
        if (!headerNav) return;
        headerNav.querySelectorAll('a[href^="static-page.html"]').forEach(link => {
            link.classList.remove('header__nav-link--active');
        });
        if (pageKey) {
            const activeLink = headerNav.querySelector(`a[href="static-page.html?page=${pageKey}"]`);
            if (activeLink) {
                activeLink.classList.add('header__nav-link--active');
            }
        }
    }

    function init() {
        if (staticContainer) { // Check if on static page
             loadContent();
        }
    }

    return { init: init };
})();


// ==============================================
// Product Listing / Category / Search Results Module (Modified to use SharedData)
// ==============================================
const ProductListing = (function(){
    // --- Generate Product Card HTML --- (Shared across pages)
    function createProductCardHTML(product) {
        const safeProduct = product || {};
        const rawName = safeProduct.name || '[商品名称]';
        const rawSeries = safeProduct.series || '[所属系列]';
        const name = Utils.escapeHtml(rawName);
        const series = Utils.escapeHtml(rawSeries);
        const price = typeof safeProduct.price === 'number' ? safeProduct.price.toFixed(2) : 'N/A';
        const image = (safeProduct.images && safeProduct.images.length > 0 ? safeProduct.images[0].thumb : 'assets/images/figurine-1.svg');
        const id = safeProduct.id || '#';
        const safeImage = Utils.escapeHtml(image);
        const safeIdAttr = Utils.escapeHtml(id);
        const safeAlt = Utils.escapeHtml(`${rawName} - ${rawSeries}`);
        const encodedId = id !== '#' ? encodeURIComponent(id) : '';
        const detailHref = id !== '#' ? `product-detail.html?id=${encodedId}` : '#';
        const ratingValue = Number(safeProduct.rating);
        const reviewCount = Number(safeProduct.reviewCount);
        const status = typeof safeProduct.status === 'string' ? safeProduct.status.trim() : '';
        const statusLabel = Utils.escapeHtml(status);

        const originalPrice = Number(safeProduct.originalPrice);
        let priceHTML = '';
        if (typeof safeProduct.price === 'number') {
            const originalHTML = Number.isFinite(originalPrice) && originalPrice > safeProduct.price
                ? `<span class="product-card__price-original">￥${originalPrice.toFixed(2)}</span>`
                : '';
            priceHTML = `<p class="product-card__price">￥${price}${originalHTML}</p>`;
        }

        const ratingHTML = Number.isFinite(ratingValue)
            ? `<span class="product-card__rating"><i class="fas fa-star" aria-hidden="true"></i>${ratingValue.toFixed(1)}${Number.isFinite(reviewCount) && reviewCount > 0 ? `<small>(${reviewCount})</small>` : ''}</span>`
            : '';
        const statusHTML = status ? `<span class="product-card__status">${statusLabel}</span>` : '';

        const badges = [];
        const dateAdded = safeProduct.dateAdded ? Date.parse(safeProduct.dateAdded) : NaN;
        const isNew = Number.isFinite(dateAdded) && (Date.now() - dateAdded) <= (1000 * 60 * 60 * 24 * 90);
        if (isNew) {
            badges.push('<span class="product-card__badge product-card__badge--new">NEW</span>');
        }

        if (Number.isFinite(originalPrice) && typeof safeProduct.price === 'number' && originalPrice > safeProduct.price) {
            const save = Math.max(1, Math.round(originalPrice - safeProduct.price));
            badges.push(`<span class="product-card__badge product-card__badge--sale">省￥${save}</span>`);
        }

        const badgesHTML = badges.length > 0 ? `<div class="product-card__badges">${badges.join('')}</div>` : '';
        const favBtnHTML = id !== '#'
            ? `<button class="favorite-btn" type="button" data-product-id="${safeIdAttr}" aria-label="加入收藏" aria-pressed="false">
                    <i class="fa-regular fa-heart" aria-hidden="true"></i>
               </button>`
            : '';
        const quickAddHTML = id !== '#'
            ? `<button class="product-card__quick-add" type="button" data-product-id="${safeIdAttr}" aria-label="加入购物车">快速加入</button>`
            : '';
        const compareHTML = id !== '#'
            ? `<button class="product-card__compare" type="button" data-product-id="${safeIdAttr}" aria-label="加入对比" aria-pressed="false">对比</button>`
            : '';
        const alertHTML = id !== '#'
            ? `<button class="product-card__alert" type="button" data-price-alert data-product-id="${safeIdAttr}" aria-label="设置降价提醒" aria-pressed="false"><span class="product-card__alert-text">降价提醒</span></button>`
            : '';

        return `
          <div class="product-card fade-in-up" data-product-id="${safeIdAttr}">
              <div class="product-card__image">
                  ${badgesHTML}
                  <a href="${detailHref}">
                       <img src="assets/images/placeholder-lowquality.svg" data-src="${safeImage}" alt="${safeAlt}" loading="lazy" decoding="async" class="lazyload">
                   </a>
                  ${favBtnHTML}
              </div>
              <div class="product-card__content">
                  <div class="product-card__meta">
                      ${ratingHTML}
                      ${statusHTML}
                  </div>
                  <h4 class="product-card__title">
                      <a href="${detailHref}">${name}</a>
                  </h4>
                  <p class="product-card__series">${series}</p>
                  ${priceHTML}
                   <div class="product-card__actions">
                       <a href="${detailHref}" class="product-card__button">查看详情</a>
                       ${quickAddHTML}
                       ${compareHTML}
                       ${alertHTML}
                   </div>
               </div>
          </div>
        `;
    }

    const listingContainer = document.querySelector('.plp-main, .category-main');
    if (!listingContainer) return { init: () => {}, createProductCardHTML };

    // DOM elements (Keep existing)
    const pageTitleElement = listingContainer.querySelector('.page-title');
    const productGrid = listingContainer.querySelector('.gallery-grid.product-listing');
    const sortSelect = listingContainer.querySelector('#sort-select');
    const filterButtons = listingContainer.querySelectorAll('.filter-chip');
    const viewToggleButtons = listingContainer.querySelectorAll('.view-toggle__btn');
    const listingSummary = listingContainer.querySelector('[data-listing-summary]');
    const resetListingBtn = listingContainer.querySelector('[data-reset-listing]');
    const activeFiltersContainer = listingContainer.querySelector('[data-active-filters]');
    const paginationContainer = listingContainer.querySelector('.pagination');
    const breadcrumbContainer = listingContainer.querySelector('.breadcrumb-nav .breadcrumb');
    const sortStorageKey = 'plpSort';
    const filterStorageKey = 'plpFilter';
    const viewStorageKey = 'plpViewMode';

    // State Variables (Keep existing)
    let currentPage = 1;
    let itemsPerPage = 6;
    let currentSort = 'default';
    let currentFilter = 'all';
    let currentView = 'grid';
    let currentProducts = []; // This will hold the filtered/searched results
    let pageMode = 'all';
    let currentQuery = '';
    let currentCategory = '';
    let allProductsCache = [];
    let baseTitle = '';

    function getFavoriteIdsSafe() {
        if (typeof Favorites === 'undefined' || !Favorites.getIds) return [];
        return Favorites.getIds();
    }

    function getFavoriteProducts(products) {
        const favIds = new Set(getFavoriteIdsSafe());
        return (products || []).filter((p) => favIds.has(p.id));
    }

    function setTitle(title) {
        if (pageTitleElement) pageTitleElement.textContent = title;
        document.title = `${title} - 塑梦潮玩`;
    }

    function updateTitleCount(total) {
        const countText = Number.isFinite(total) ? `（${total}）` : '';
        setTitle(`${baseTitle}${countText}`);
    }

    function getFilterLabel(filterKey) {
        const map = {
            all: '全部',
            hot: '热门',
            limited: '限定',
            preorder: '预售'
        };
        return map[filterKey] || '全部';
    }

    function getSortLabel(sortKey) {
        const map = {
            default: '默认排序',
            'price-asc': '价格升序',
            'price-desc': '价格降序',
            newest: '最新上架',
            'name-asc': '名称排序'
        };
        return map[sortKey] || '默认排序';
    }

    function updateListingMeta(total) {
        if (!listingSummary) return;
        const safeTotal = Number.isFinite(total) ? total : 0;
        const sortLabel = getSortLabel(currentSort);
        const filterLabel = getFilterLabel(currentFilter);
        listingSummary.textContent = `共 ${safeTotal} 件藏品 · ${sortLabel} · ${filterLabel}`;
        updateActiveFilterPills(sortLabel, filterLabel);
    }

    function updateActiveFilterPills(sortLabel, filterLabel) {
        if (!activeFiltersContainer) return;
        const pills = [];
        if (currentFilter && currentFilter !== 'all') {
            pills.push(`<span class="filter-pill filter-pill--accent">筛选：${Utils.escapeHtml(filterLabel)}</span>`);
        }
        if (currentSort && currentSort !== 'default') {
            pills.push(`<span class="filter-pill">排序：${Utils.escapeHtml(sortLabel)}</span>`);
        }
        if (currentView && currentView !== 'grid') {
            const viewLabel = currentView === 'list' ? '列表视图' : '网格视图';
            pills.push(`<span class="filter-pill">视图：${Utils.escapeHtml(viewLabel)}</span>`);
        }
        activeFiltersContainer.innerHTML = pills.join('');
    }

    function applyViewMode(nextView, options = {}) {
        const mode = nextView === 'list' ? 'list' : 'grid';
        currentView = mode;
        if (productGrid) {
            productGrid.dataset.view = mode;
        }
        if (viewToggleButtons && viewToggleButtons.length > 0) {
            viewToggleButtons.forEach((btn) => {
                const active = btn.dataset.view === mode;
                btn.classList.toggle('is-active', active);
                btn.setAttribute('aria-pressed', active ? 'true' : 'false');
            });
        }
        if (!options.silent) {
            try { localStorage.setItem(viewStorageKey, mode); } catch { /* ignore */ }
        }
        updateActiveFilterPills(getSortLabel(currentSort), getFilterLabel(currentFilter));
    }

    function resetListingState(options = {}) {
        const resetView = options.resetView !== false;
        currentFilter = 'all';
        currentSort = 'default';
        currentPage = 1;
        if (sortSelect) sortSelect.value = 'default';
        syncFilterButtons();
        try {
            localStorage.setItem(filterStorageKey, 'all');
            localStorage.setItem(sortStorageKey, 'default');
        } catch { /* ignore */ }
        if (resetView) {
            applyViewMode('grid');
        }
        renderPage();
        if (typeof Toast !== 'undefined' && Toast.show) {
            Toast.show('已重置筛选与排序', 'info', 1600);
        }
    }

    function updateFilterCounts(products) {
        if (!filterButtons || filterButtons.length === 0) return;
        const list = Array.isArray(products) ? products : [];
        const counts = {
            all: list.length,
            hot: 0,
            limited: 0,
            preorder: 0
        };

        list.forEach((product) => {
            const tags = Array.isArray(product?.tags) ? product.tags : [];
            if (tags.includes('hot')) counts.hot += 1;
            if (tags.includes('limited') || product?.rarity === '限定') counts.limited += 1;
            if (tags.includes('preorder') || product?.status === '预售') counts.preorder += 1;
        });

        filterButtons.forEach((btn) => {
            const key = btn.dataset.filter || 'all';
            const count = Number.isFinite(counts[key]) ? counts[key] : 0;
            let countEl = btn.querySelector('.filter-chip__count');
            if (!countEl) {
                countEl = document.createElement('span');
                countEl.className = 'filter-chip__count';
                countEl.setAttribute('aria-hidden', 'true');
                btn.appendChild(countEl);
            }
            countEl.textContent = String(count);
        });
    }

    // --- Sorting Logic --- (Keep existing)
    function sortProducts(products, sortType) {
        // ... (no changes needed here)
         const sortedProducts = [...products];
        switch (sortType) {
            case 'price-asc': sortedProducts.sort((a, b) => a.price - b.price); break;
            case 'price-desc': sortedProducts.sort((a, b) => b.price - a.price); break;
            case 'newest': sortedProducts.sort((a, b) => (b.dateAdded || '').localeCompare(a.dateAdded || '')); break;
            case 'rating-desc': sortedProducts.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0)); break;
            case 'name-asc': sortedProducts.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')); break;
            default: break;
        }
        return sortedProducts;
    }

    function applyFilter(products) {
        if (currentFilter === 'all') return products;
        return (products || []).filter((product) => {
            const tags = product?.tags || [];
            if (currentFilter === 'hot') return tags.includes('hot');
            if (currentFilter === 'limited') return tags.includes('limited') || product?.rarity === '限定';
            if (currentFilter === 'preorder') return tags.includes('preorder') || product?.status === '预售';
            return true;
        });
    }

    function syncFilterButtons() {
        if (!filterButtons || filterButtons.length === 0) return;
        filterButtons.forEach((btn) => {
            const key = btn.dataset.filter || 'all';
            const active = key === currentFilter;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    }

    function setFilter(nextFilter) {
        const key = nextFilter || 'all';
        currentFilter = key;
        try { localStorage.setItem(filterStorageKey, key); } catch { /* ignore */ }
        syncFilterButtons();
        currentPage = 1;
        renderPage();
    }

    // --- Pagination Logic --- (Keep existing)
    function renderPagination(totalItems) {
        // ... (no changes needed here)
         if (!paginationContainer) return;
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        if (totalPages <= 1) return;

        // Prev Button
        const prevLink = document.createElement('a');
        prevLink.href = '#';
        prevLink.innerHTML = '&laquo;';
        prevLink.classList.add('pagination__link');
        prevLink.setAttribute('aria-label', '上一页');
        if (currentPage === 1) {
            prevLink.classList.add('pagination__link--disabled');
            prevLink.setAttribute('aria-disabled', 'true');
        } else {
            prevLink.addEventListener('click', (e) => {
                e.preventDefault();
                goToPage(currentPage - 1);
            });
        }
        paginationContainer.appendChild(prevLink);

        // Page Number Links
        for (let i = 1; i <= totalPages; i++) {
            const pageLink = document.createElement('a');
            pageLink.href = '#';
            pageLink.textContent = i;
            pageLink.classList.add('pagination__link');
            pageLink.setAttribute('aria-label', `第 ${i} 页`);
            if (i === currentPage) {
                pageLink.classList.add('pagination__link--active');
                pageLink.setAttribute('aria-current', 'page');
            } else {
                pageLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    goToPage(i);
                });
            }
            paginationContainer.appendChild(pageLink);
        }

        // Next Button
        const nextLink = document.createElement('a');
        nextLink.href = '#';
        nextLink.innerHTML = '&raquo;';
        nextLink.classList.add('pagination__link');
        nextLink.setAttribute('aria-label', '下一页');
        if (currentPage === totalPages) {
            nextLink.classList.add('pagination__link--disabled');
            nextLink.setAttribute('aria-disabled', 'true');
        } else {
            nextLink.addEventListener('click', (e) => {
                e.preventDefault();
                goToPage(currentPage + 1);
            });
        }
        paginationContainer.appendChild(nextLink);
    }

    function goToPage(pageNumber) {
        // ... (Keep existing)
         currentPage = pageNumber;
        renderPage();
        productGrid?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // --- Update Breadcrumbs --- (Use SharedData)
    function updateBreadcrumbs() {
        if (!breadcrumbContainer) return;
        let breadcrumbHTML = `<li class="breadcrumb-item"><a href="index.html">首页</a></li>`;
        const categoryNames = (typeof SharedData !== 'undefined') ? SharedData.getCategoryName : (key) => key; // Use helper or fallback

        if (pageMode === 'category') {
            breadcrumbHTML += `<li class="breadcrumb-item"><a href="products.html">所有手办</a></li>`;
            breadcrumbHTML += `<li class="breadcrumb-item active" aria-current="page">${Utils.escapeHtml(categoryNames(currentCategory))}</li>`;
        } else if (pageMode === 'search') {
             breadcrumbHTML += `<li class="breadcrumb-item active" aria-current="page">搜索结果: ${Utils.escapeHtml(currentQuery)}</li>`;
        } else if (pageMode === 'favorites') {
            breadcrumbHTML += `<li class="breadcrumb-item"><a href="products.html">所有手办</a></li>`;
            breadcrumbHTML += `<li class="breadcrumb-item active" aria-current="page">我的收藏</li>`;
        } else {
             breadcrumbHTML += `<li class="breadcrumb-item active" aria-current="page">${Utils.escapeHtml(categoryNames('all'))}</li>`;
        }
        breadcrumbContainer.innerHTML = breadcrumbHTML;
    }

    // --- Render Page --- (Keep existing)
    function renderPage() {
         const filteredProducts = applyFilter(currentProducts);
         const sortedProducts = sortProducts(filteredProducts, currentSort);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const productsForPage = sortedProducts.slice(startIndex, endIndex);

        // Progressive enhancement: view-transition for filter/sort/render changes
        UXMotion.withViewTransition(() => {
            renderProducts(productsForPage);
            renderPagination(sortedProducts.length);
            updateBreadcrumbs();
            updateTitleCount(sortedProducts.length);
            updateListingMeta(sortedProducts.length);
        });
    }

    // --- Render Products Grid --- (Keep existing)
    function renderProducts(productsToRender) {
         // ... (no changes needed here)
          if (!productGrid) return;
        productGrid.setAttribute('aria-busy', 'true');
        productGrid.innerHTML = '';
        if (productsToRender.length === 0) {
            // Show empty message
            const emptyMessageElement = document.createElement('div');
            emptyMessageElement.classList.add('empty-state', 'text-center');
            let message = '暂无商品展示。';
            if (pageMode === 'search') {
                message = `抱歉，没有找到与 "${currentQuery}" 相关的商品。`;
            } else if (pageMode === 'category') {
                const categoryName = (typeof SharedData !== 'undefined' && SharedData.getCategoryName) ? SharedData.getCategoryName(currentCategory) : currentCategory;
                message = `抱歉，分类 "${categoryName}" 下暂无商品。`;
            } else if (pageMode === 'favorites') {
                message = '你还没有收藏任何商品。';
            }
            const img = document.createElement('img');
            img.src = 'assets/images/empty-collector.svg';
            img.alt = '';
            img.setAttribute('aria-hidden', 'true');
            img.loading = 'lazy';
            img.decoding = 'async';

            const title = document.createElement('p');
            title.className = 'empty-state__title';
            title.textContent = message;

            const link = document.createElement('a');
            link.href = 'products.html';
            link.className = 'cta-button-secondary';
            link.textContent = '浏览所有商品';

            emptyMessageElement.appendChild(img);
            emptyMessageElement.appendChild(title);
            if (currentFilter !== 'all') {
                const clearBtn = document.createElement('button');
                clearBtn.type = 'button';
                clearBtn.className = 'cta-button-secondary';
                clearBtn.textContent = '清除筛选';
                clearBtn.addEventListener('click', () => resetListingState({ resetView: false }));
                emptyMessageElement.appendChild(clearBtn);
            }
            emptyMessageElement.appendChild(link);
            productGrid.appendChild(emptyMessageElement);
        } else {
            productGrid.innerHTML = productsToRender.map((product) => createProductCardHTML(product)).join('');
        }
        productGrid.setAttribute('aria-busy', 'false');
        if (typeof LazyLoad !== 'undefined' && LazyLoad.init) { LazyLoad.init(productGrid); }
        if (typeof Favorites !== 'undefined' && Favorites.syncButtons) { Favorites.syncButtons(productGrid); }
        if (typeof Compare !== 'undefined' && Compare.syncButtons) { Compare.syncButtons(productGrid); }
        if (typeof PriceAlerts !== 'undefined' && PriceAlerts.syncButtons) { PriceAlerts.syncButtons(productGrid); }
        if (typeof ViewTransitions !== 'undefined' && ViewTransitions.restoreLastProductCard) {
            ViewTransitions.restoreLastProductCard(productGrid);
        }
        if (typeof ScrollAnimations !== 'undefined' && ScrollAnimations.init) {
            ScrollAnimations.init(productGrid, { y: 22, blur: 14, duration: 0.44, stagger: 0.032, maxStaggerItems: 12 });
        }
    }

    // --- Event Listeners Setup --- (Keep existing)
    function addEventListeners() {
        // ... (no changes needed here)
         if (sortSelect) {
             sortSelect.addEventListener('change', (event) => {
                 currentSort = event?.target?.value || 'default';
                 try { localStorage.setItem(sortStorageKey, currentSort); } catch { /* ignore */ }
                 currentPage = 1;
                 renderPage();
             });
         }
        if (filterButtons && filterButtons.length > 0) {
            filterButtons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    const key = btn.dataset.filter || 'all';
                    setFilter(key);
                });
            });
        }
        if (viewToggleButtons && viewToggleButtons.length > 0) {
            viewToggleButtons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    const mode = btn.dataset.view || 'grid';
                    applyViewMode(mode);
                });
            });
        }
        if (resetListingBtn) {
            resetListingBtn.addEventListener('click', () => resetListingState({ resetView: true }));
        }
    }

    // --- Initialization --- (Modified to use SharedData)
    function init() {
        if (!listingContainer || !pageTitleElement || !productGrid) return;
        productGrid.setAttribute('aria-live', 'polite');

        const allProducts = (typeof SharedData !== 'undefined') ? SharedData.getAllProducts() : [];
        const categoryNames = (typeof SharedData !== 'undefined') ? SharedData.getCategoryName : (key)=>key;
        allProductsCache = [...allProducts];
        const pageName = Utils.getPageName();
        
        const urlParams = new URLSearchParams(window.location.search);
        const categoryKey = urlParams.get('cat');
        const searchQuery = urlParams.get('query');
        let title = categoryNames('all');
        currentProducts = [...allProducts];
        pageMode = 'all';
        currentCategory = 'all';

        if (pageName === 'favorites.html') {
            pageMode = 'favorites';
            currentProducts = getFavoriteProducts(allProductsCache);
            title = '我的收藏';

            // 收藏变化时：实时刷新视图
            window.addEventListener('favorites:changed', () => {
                if (pageMode !== 'favorites') return;
                currentProducts = getFavoriteProducts(allProductsCache);
                currentPage = 1;
                updateFilterCounts(currentProducts);
                renderPage();
            });
        } else if (searchQuery) {
            pageMode = 'search';
            currentQuery = searchQuery.trim();
            const lowerCaseQuery = currentQuery.toLowerCase();
            currentProducts = allProducts.filter(p =>
                p.name.toLowerCase().includes(lowerCaseQuery) ||
                p.series.toLowerCase().includes(lowerCaseQuery)
            );
            title = `搜索结果: "${currentQuery}"`;
        } else if (categoryKey && categoryNames(categoryKey) !== categoryKey) { // Check if key is valid
            pageMode = 'category';
            currentCategory = categoryKey;
            currentProducts = allProducts.filter(p => p.category?.key === currentCategory);
            title = `${categoryNames(currentCategory)}`;
        } else if (pageName === 'products.html') {
             pageMode = 'all'; currentProducts = [...allProducts]; title = `${categoryNames('all')}`;
        } else {
             currentProducts = [...allProducts]; // Fallback
             title = `${categoryNames('all')}`;
        }

        baseTitle = title;
        currentPage = 1;
        if (sortSelect) {
            try {
                const storedSort = localStorage.getItem(sortStorageKey);
                if (storedSort && Array.from(sortSelect.options || []).some((opt) => opt.value === storedSort)) {
                    sortSelect.value = storedSort;
                }
            } catch { /* ignore */ }
        }
        currentSort = sortSelect ? sortSelect.value : 'default';
        if (viewToggleButtons && viewToggleButtons.length > 0) {
            try {
                const storedView = localStorage.getItem(viewStorageKey);
                if (storedView) currentView = storedView;
            } catch { /* ignore */ }
            applyViewMode(currentView, { silent: true });
        } else if (productGrid) {
            productGrid.dataset.view = currentView;
        }
        if (filterButtons && filterButtons.length > 0) {
            try {
                const storedFilter = localStorage.getItem(filterStorageKey);
                if (storedFilter) currentFilter = storedFilter;
            } catch { /* ignore */ }
            syncFilterButtons();
        }
        updateFilterCounts(currentProducts);
        renderPage();
        addEventListeners();
    }

    return { init: init, createProductCardHTML };
})();

// ==============================================
// Homepage Specific Module (Modified to use SharedData)
// ==============================================
const Homepage = (function() {
    const featuredGrid = document.querySelector('#product-gallery .gallery-grid');
    const numberOfFeatured = 3;
    const curationSection = document.querySelector('.curation');
    const curationGrid = curationSection?.querySelector('[data-curation-grid]');
    const curationTabs = curationSection?.querySelectorAll('[data-curation-tab]');
    const curationIndicator = curationSection?.querySelector('.curation-tabs__indicator');
    const tabStorageKey = 'homeCurationTab';

    function populateFeaturedProducts() {
        if (!featuredGrid) return;

        // Enhanced Check: Ensure SharedData and ProductListing with its function are available
        if (typeof SharedData === 'undefined' || !SharedData.getAllProducts ||
            typeof ProductListing === 'undefined' || typeof ProductListing.createProductCardHTML !== 'function') {
            console.error("Homepage Error: SharedData or ProductListing module/functions unavailable.");
            featuredGrid.innerHTML = '<p class="product-listing__empty-message text-center">加载精选商品失败。</p>'; // Use class instead of inline style
            return;
        }

        const allProducts = SharedData.getAllProducts();
        const createCardHTML = ProductListing.createProductCardHTML; // Corrected function name

        if (!allProducts || allProducts.length === 0) {
             featuredGrid.innerHTML = '<p class="product-listing__empty-message text-center">暂无精选商品展示。</p>'; // Use class
             return;
        }

        // Slice products, considering if there are fewer than numberOfFeatured
        const featuredProducts = allProducts.slice(0, Math.min(numberOfFeatured, allProducts.length));
        featuredGrid.innerHTML = featuredProducts.map((product) => createCardHTML(product)).join('');

        // Re-initialize lazy/animations (Keep existing)
        if (typeof LazyLoad !== 'undefined' && LazyLoad.init) { LazyLoad.init(featuredGrid); }
        if (typeof Favorites !== 'undefined' && Favorites.syncButtons) { Favorites.syncButtons(featuredGrid); }
        if (typeof Compare !== 'undefined' && Compare.syncButtons) { Compare.syncButtons(featuredGrid); }
        if (typeof ViewTransitions !== 'undefined' && ViewTransitions.restoreLastProductCard) {
            ViewTransitions.restoreLastProductCard(featuredGrid);
        }
        if (typeof ScrollAnimations !== 'undefined' && ScrollAnimations.init) { ScrollAnimations.init(featuredGrid, { y: 22, blur: 14, duration: 0.44, stagger: 0.032, maxStaggerItems: 12 }); }
    }

    function moveIndicator(target) {
        if (!curationIndicator || !target) return;
        const parentRect = target.parentElement?.getBoundingClientRect();
        const rect = target.getBoundingClientRect();
        if (!parentRect) return;
        const x = rect.left - parentRect.left;
        const width = rect.width;

        if (Utils.prefersReducedMotion()) {
            curationIndicator.style.width = `${width}px`;
            curationIndicator.style.transform = `translateX(${x}px)`;
            return;
        }

        const motion = globalThis.Motion;
        if (motion && typeof motion.animate === 'function') {
            try {
                curationIndicator.getAnimations?.().forEach((a) => a.cancel());
            } catch {
                // ignore
            }
            try {
                motion.animate(
                    curationIndicator,
                    { width: `${width}px`, transform: `translateX(${x}px)` },
                    { duration: 0.42, easing: [0.22, 1, 0.36, 1] },
                );
                return;
            } catch {
                // ignore
            }
        }

        curationIndicator.style.width = `${width}px`;
        curationIndicator.style.transform = `translateX(${x}px)`;
    }

    function initHeroChoreography() {
        if (Utils.getPageName() !== 'index.html') return;
        if (Utils.prefersReducedMotion()) return;

        const hero = document.querySelector('.hero');
        if (!hero) return;
        const visual = hero.querySelector('.hero__visual');
        const glass = visual?.querySelector('.hero__glass') || null;
        const orbit1 = visual?.querySelector('.hero__orbit--one') || null;
        const orbit2 = visual?.querySelector('.hero__orbit--two') || null;
        if (!glass && !orbit1 && !orbit2) return;

        let active = true;
        let raf = 0;

        function clamp01(value) {
            return Math.max(0, Math.min(1, value));
        }

        function setWillChange(on) {
            const v = on ? 'transform' : '';
            try {
                if (glass) glass.style.willChange = v;
                if (orbit1) orbit1.style.willChange = v;
                if (orbit2) orbit2.style.willChange = v;
            } catch {
                // ignore
            }
        }

        function update() {
            raf = 0;
            if (!active) return;

            const rect = hero.getBoundingClientRect();
            const heroHeight = Math.max(1, rect.height);
            const progress = clamp01((-rect.top) / (heroHeight * 0.85));

            const orbitSpin1 = progress * 110;
            const orbitSpin2 = -progress * 150;
            const floatY = progress * 10;
            const glassY = progress * 14;
            const glassScale = 1 - progress * 0.02;
            const glassRotate = -progress * 0.6;

            try {
                if (glass) {
                    glass.style.transform = `translate3d(0, ${glassY}px, 0) scale(${glassScale}) rotate(${glassRotate}deg)`;
                }
                if (orbit1) {
                    orbit1.style.transform = `translate3d(0, ${floatY}px, 0) rotate(${orbitSpin1}deg)`;
                }
                if (orbit2) {
                    orbit2.style.transform = `translate3d(0, ${floatY * 0.6}px, 0) rotate(${orbitSpin2}deg)`;
                }
            } catch {
                // ignore
            }
        }

        function requestUpdate() {
            if (!active) return;
            if (raf) return;
            raf = requestAnimationFrame(update);
        }

        if ('IntersectionObserver' in window) {
            try {
                const observer = new IntersectionObserver(
                    (entries) => {
                        const entry = entries && entries[0];
                        const nowActive = Boolean(entry && entry.isIntersecting);
                        if (nowActive === active) return;
                        active = nowActive;
                        setWillChange(active);
                        if (active) requestUpdate();
                    },
                    { threshold: 0, rootMargin: '200px 0px 200px 0px' },
                );
                observer.observe(hero);
            } catch {
                // ignore
            }
        }

        setWillChange(true);
        requestUpdate();
        window.addEventListener('scroll', requestUpdate, { passive: true });
        window.addEventListener('resize', Utils.throttle(requestUpdate, 120));
    }

    function renderCuration(tabKey) {
        if (!curationGrid || typeof SharedData === 'undefined' || !SharedData.getCurationProducts) return;
        const list = SharedData.getCurationProducts(tabKey);
        if (!list || list.length === 0) {
            curationGrid.innerHTML = '<p class="product-listing__empty-message text-center">暂无策展内容。</p>';
            return;
        }
        if (typeof ProductListing === 'undefined' || typeof ProductListing.createProductCardHTML !== 'function') return;
        curationGrid.innerHTML = list.map((product) => ProductListing.createProductCardHTML(product)).join('');
        if (typeof LazyLoad !== 'undefined' && LazyLoad.init) { LazyLoad.init(curationGrid); }
        if (typeof Favorites !== 'undefined' && Favorites.syncButtons) { Favorites.syncButtons(curationGrid); }
        if (typeof Compare !== 'undefined' && Compare.syncButtons) { Compare.syncButtons(curationGrid); }
        if (typeof ViewTransitions !== 'undefined' && ViewTransitions.restoreLastProductCard) {
            ViewTransitions.restoreLastProductCard(curationGrid);
        }
        if (typeof ScrollAnimations !== 'undefined' && ScrollAnimations.init) { ScrollAnimations.init(curationGrid, { y: 22, blur: 14, duration: 0.44, stagger: 0.032, maxStaggerItems: 12 }); }
    }

    function activateTab(button) {
        if (!button) return;
        const key = button.dataset.curationTab || 'hot';
        curationTabs?.forEach((btn) => {
            const active = btn === button;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        moveIndicator(button);
        try { localStorage.setItem(tabStorageKey, key); } catch { /* ignore */ }
        UXMotion.withViewTransition(() => renderCuration(key));
    }

    function initCuration() {
        if (!curationSection || !curationTabs || curationTabs.length === 0) return;
        curationTabs.forEach((btn) => {
            btn.addEventListener('click', () => activateTab(btn));
        });
        let initialKey = 'hot';
        try {
            const stored = localStorage.getItem(tabStorageKey);
            if (stored) initialKey = stored;
        } catch { /* ignore */ }
        const initialBtn = Array.from(curationTabs).find((btn) => btn.dataset.curationTab === initialKey) || curationTabs[0];
        activateTab(initialBtn);
        window.addEventListener('resize', Utils.throttle(() => {
            const active = curationSection.querySelector('.curation-tab.is-active');
            moveIndicator(active);
        }, 200));
    }

    function init() {
        // ... (Keep existing check for homepage)
         if (Utils.getPageName() === 'index.html' && featuredGrid) populateFeaturedProducts();
         if (Utils.getPageName() === 'index.html') initCuration();
         if (Utils.getPageName() === 'index.html') initHeroChoreography();
    }

    return { init: init };
})();

// ==============================================
// Offline Page Module (offline.html)
// ==============================================
const OfflinePage = (function() {
    const container = document.querySelector('.offline-main');
    if (!container) return { init: () => {} };

    const statusEl = container.querySelector('#offline-status');
    const retryBtn = container.querySelector('#offline-retry');

    function renderStatus() {
        if (!statusEl) return;
        const online = Boolean(navigator && navigator.onLine);
        statusEl.textContent = online ? '网络已恢复，可重试加载。' : '当前离线：可浏览已缓存内容。';
    }

    function handleRetry() {
        try { window.location.reload(); } catch { /* ignore */ }
    }

    function init() {
        renderStatus();
        window.addEventListener('online', renderStatus);
        window.addEventListener('offline', renderStatus);
        if (retryBtn) retryBtn.addEventListener('click', handleRetry);
    }

    return { init };
})();

// ==============================================
// Compare Page Module (compare.html)
// ==============================================
const ComparePage = (function() {
    const container = document.querySelector('.compare-main');
    if (!container) return { init: () => {} };

    const tableHost = container.querySelector('[data-compare-table]');
    const emptyHost = container.querySelector('[data-compare-empty]');
    const clearBtn = container.querySelector('[data-compare-clear]');

    function setEmpty(isEmpty) {
        if (emptyHost) emptyHost.style.display = isEmpty ? 'block' : 'none';
        if (tableHost) tableHost.style.display = isEmpty ? 'none' : 'block';
    }

    function createCellText(text) {
        const span = document.createElement('span');
        span.textContent = String(text ?? '');
        return span;
    }

    function renderTable(products) {
        if (!tableHost) return;
        tableHost.innerHTML = '';

        const tableWrap = document.createElement('div');
        tableWrap.className = 'compare-table-wrap';

        const table = document.createElement('table');
        table.className = 'compare-table';
        table.setAttribute('role', 'table');

        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');

        const headFirst = document.createElement('th');
        headFirst.scope = 'col';
        headFirst.textContent = '对比项';
        headRow.appendChild(headFirst);

        products.forEach((p) => {
            const th = document.createElement('th');
            th.scope = 'col';
            th.className = 'compare-table__product';

            const title = document.createElement('div');
            title.className = 'compare-table__title';
            title.textContent = String(p?.name || '');

            const meta = document.createElement('div');
            meta.className = 'compare-table__meta';
            meta.textContent = String(p?.series || '');

            const actions = document.createElement('div');
            actions.className = 'compare-table__head-actions';

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'cta-button-secondary compare-remove';
            removeBtn.dataset.productId = String(p?.id || '');
            removeBtn.textContent = '移除';

            const detailLink = document.createElement('a');
            detailLink.className = 'cta-button-secondary compare-detail';
            detailLink.href = p?.id ? `product-detail.html?id=${encodeURIComponent(String(p.id))}` : 'products.html';
            detailLink.textContent = '详情';

            actions.appendChild(detailLink);
            actions.appendChild(removeBtn);

            th.appendChild(title);
            th.appendChild(meta);
            th.appendChild(actions);

            headRow.appendChild(th);
        });

        thead.appendChild(headRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        const addRow = (label, renderCell) => {
            const tr = document.createElement('tr');
            const th = document.createElement('th');
            th.scope = 'row';
            th.textContent = label;
            tr.appendChild(th);
            products.forEach((p) => {
                const td = document.createElement('td');
                td.appendChild(renderCell(p));
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        };

        addRow('预览', (p) => {
            const img = document.createElement('img');
            img.loading = 'lazy';
            img.decoding = 'async';
            img.alt = `${String(p?.name || '')} 预览图`;
            img.src = String(p?.images?.[0]?.thumb || 'assets/images/figurine-1.svg');
            img.className = 'compare-table__img';
            return img;
        });

        addRow('价格', (p) => createCellText(typeof p?.price === 'number' ? Pricing.formatCny(p.price) : '—'));
        addRow('分类', (p) => createCellText(String(p?.category?.name || '—')));
        addRow('评分', (p) => {
            const rating = Number(p?.rating);
            const reviews = Number(p?.reviewCount);
            if (!Number.isFinite(rating)) return createCellText('—');
            return createCellText(`${rating.toFixed(1)}${Number.isFinite(reviews) && reviews > 0 ? `（${reviews}）` : ''}`);
        });
        addRow('状态', (p) => createCellText(String(p?.status || '—')));

        // Union of spec labels
        const labelSet = new Set();
        products.forEach((p) => {
            const specs = Array.isArray(p?.specs) ? p.specs : [];
            specs.forEach((s) => {
                const label = String(s?.label || '').trim();
                if (label) labelSet.add(label);
            });
        });

        Array.from(labelSet).slice(0, 12).forEach((specLabel) => {
            addRow(specLabel, (p) => {
                const specs = Array.isArray(p?.specs) ? p.specs : [];
                const hit = specs.find((s) => String(s?.label || '').trim() === specLabel);
                return createCellText(hit ? String(hit.value || '—') : '—');
            });
        });

        addRow('操作', (p) => {
            const wrap = document.createElement('div');
            wrap.className = 'compare-table__actions';

            const addBtn = document.createElement('button');
            addBtn.type = 'button';
            addBtn.className = 'cta-button compare-add-to-cart';
            addBtn.dataset.productId = String(p?.id || '');
            addBtn.textContent = '加入购物车';

            wrap.appendChild(addBtn);
            return wrap;
        });

        table.appendChild(tbody);
        tableWrap.appendChild(table);
        tableHost.appendChild(tableWrap);
    }

    function render() {
        const ids = Compare?.getIds?.() || [];
        if (!ids.length) {
            setEmpty(true);
            if (tableHost) tableHost.innerHTML = '';
            return;
        }

        const products = (typeof SharedData !== 'undefined' && SharedData.getProductsByIds)
            ? SharedData.getProductsByIds(ids)
            : [];

        if (!products.length) {
            setEmpty(true);
            if (tableHost) tableHost.innerHTML = '';
            return;
        }

        setEmpty(false);
        renderTable(products);
    }

    function bind() {
        clearBtn?.addEventListener?.('click', () => {
            const ids = Compare?.getIds?.() || [];
            if (!ids.length) return;
            const ok = window.confirm('确定清空对比列表吗？');
            if (!ok) return;
            Compare?.clear?.();
        });

        container.addEventListener('click', (event) => {
            const removeBtn = event.target?.closest?.('.compare-remove[data-product-id]');
            if (removeBtn) {
                const id = removeBtn.dataset.productId;
                Compare?.toggle?.(id);
                return;
            }

            const addBtn = event.target?.closest?.('.compare-add-to-cart[data-product-id]');
            if (addBtn) {
                const id = addBtn.dataset.productId;
                const product = SharedData?.getProductById?.(id);
                if (!product) {
                    Toast?.show?.('商品信息加载失败', 'info', 1600);
                    return;
                }

                Cart?.addItem?.(product, 1);

                try {
                    const rowImg = addBtn.closest('tr')?.querySelector?.('img') || null;
                    UXMotion?.flyToCart?.(rowImg || addBtn);
                } catch {
                    // ignore
                }
                Celebration?.fire?.(addBtn);
                Toast?.show?.('已加入购物车', 'success', 1600);
            }
        });

        try {
            window.addEventListener('compare:changed', render);
        } catch {
            // ignore
        }
    }

    function init() {
        render();
        bind();
    }

    return { init };
})();

// ==============================================
// Orders Page Module (orders.html)
// ==============================================
const OrdersPage = (function() {
    const container = document.querySelector('.orders-main');
    if (!container) return { init: () => {} };

    const listHost = container.querySelector('[data-orders-list]');
    const emptyHost = container.querySelector('[data-orders-empty]');
    const clearBtn = container.querySelector('[data-orders-clear]');

    function setEmpty(isEmpty) {
        if (emptyHost) emptyHost.style.display = isEmpty ? 'block' : 'none';
        if (listHost) listHost.style.display = isEmpty ? 'none' : 'grid';
    }

    function formatDate(iso) {
        const t = Date.parse(String(iso || ''));
        if (!Number.isFinite(t)) return '—';
        try {
            return new Date(t).toLocaleString('zh-CN', { hour12: false });
        } catch {
            return new Date(t).toISOString();
        }
    }

    function render() {
        if (!listHost) return;
        const orders = Orders?.getAll?.() || [];
        listHost.innerHTML = '';

        if (!orders.length) {
            setEmpty(true);
            return;
        }

        setEmpty(false);
        orders.forEach((order) => {
            const id = String(order?.id || '').trim();
            const pricing = order?.pricing || {};
            const total = Number(pricing.total);
            const itemCount = Array.isArray(order?.items) ? order.items.reduce((sum, i) => sum + (Number(i?.quantity) || 0), 0) : 0;
            const regionLabel = Pricing.getRegion(order?.region).label;

            const details = document.createElement('details');
            details.className = 'order-card';

            const summary = document.createElement('summary');
            summary.className = 'order-card__summary';

            const left = document.createElement('div');
            left.className = 'order-card__summary-left';

            const title = document.createElement('div');
            title.className = 'order-card__id';
            title.textContent = id ? `订单号：${id}` : '订单';

            const meta = document.createElement('div');
            meta.className = 'order-card__meta';
            meta.textContent = `${formatDate(order?.createdAt)} · ${itemCount} 件 · ${regionLabel}`;

            left.appendChild(title);
            left.appendChild(meta);

            const right = document.createElement('div');
            right.className = 'order-card__summary-right';
            right.textContent = Number.isFinite(total) ? Pricing.formatCny(total) : '—';

            summary.appendChild(left);
            summary.appendChild(right);
            details.appendChild(summary);

            const body = document.createElement('div');
            body.className = 'order-card__body';

            const actions = document.createElement('div');
            actions.className = 'order-card__actions';

            const rebuyBtn = document.createElement('button');
            rebuyBtn.type = 'button';
            rebuyBtn.className = 'cta-button order-rebuy';
            rebuyBtn.dataset.orderId = id;
            rebuyBtn.textContent = '再次购买';

            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'cta-button-secondary order-copy';
            copyBtn.dataset.orderId = id;
            copyBtn.textContent = '复制订单号';

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'cta-button-secondary order-remove';
            removeBtn.dataset.orderId = id;
            removeBtn.textContent = '删除记录';

            actions.appendChild(rebuyBtn);
            actions.appendChild(copyBtn);
            actions.appendChild(removeBtn);
            body.appendChild(actions);

            const itemsWrap = document.createElement('div');
            itemsWrap.className = 'order-card__items';

            const items = Array.isArray(order?.items) ? order.items : [];
            items.forEach((item) => {
                const row = document.createElement('div');
                row.className = 'order-item';

                const img = document.createElement('img');
                img.loading = 'lazy';
                img.decoding = 'async';
                img.alt = '';
                img.src = String(item?.image || 'assets/images/figurine-1.svg');

                const name = document.createElement('div');
                name.className = 'order-item__name';
                name.textContent = `${String(item?.name || '[手办名称]')} x ${Number(item?.quantity) || 1}`;

                const price = document.createElement('div');
                price.className = 'order-item__price';
                price.textContent = Pricing.formatCny((Number(item?.price) || 0) * (Number(item?.quantity) || 1));

                row.appendChild(img);
                row.appendChild(name);
                row.appendChild(price);
                itemsWrap.appendChild(row);
            });

            body.appendChild(itemsWrap);
            details.appendChild(body);
            listHost.appendChild(details);
        });
    }

    async function copyText(value) {
        const text = String(value || '');
        if (!text) return false;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch {
            // ignore
        }
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', 'true');
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            const ok = document.execCommand && document.execCommand('copy');
            textarea.remove();
            return Boolean(ok);
        } catch {
            return false;
        }
    }

    function rebuy(orderId) {
        const order = Orders?.getById?.(orderId);
        if (!order) return;
        const items = Array.isArray(order.items) ? order.items : [];
        const existing = Cart?.getCart?.() || [];
        const map = new Map(existing.map((i) => [i.id, i]));
        items.forEach((item) => {
            const id = String(item?.id || '').trim();
            if (!id) return;
            const qty = Number(item?.quantity) || 1;
            const hit = map.get(id);
            if (hit) {
                hit.quantity = Math.min(99, (Number(hit.quantity) || 0) + qty);
                return;
            }
            map.set(id, {
                id,
                name: String(item?.name || '[手办名称]'),
                series: String(item?.series || ''),
                price: Number(item?.price) || 0,
                quantity: Math.min(99, Math.max(1, qty)),
                image: String(item?.image || 'assets/images/figurine-1.svg'),
            });
        });
        Cart?.setCart?.(Array.from(map.values()));
        Toast?.show?.('已将该订单商品加入购物车', 'success', 2000);
    }

    function bind() {
        clearBtn?.addEventListener?.('click', () => {
            const orders = Orders?.getAll?.() || [];
            if (!orders.length) return;
            const ok = window.confirm('确定清空全部订单记录吗？（仅影响本机本地存储）');
            if (!ok) return;
            Orders?.clear?.();
        });

        container.addEventListener('click', async (event) => {
            const rebuyBtn = event.target?.closest?.('.order-rebuy[data-order-id]');
            if (rebuyBtn) {
                rebuy(rebuyBtn.dataset.orderId);
                return;
            }

            const copyBtn = event.target?.closest?.('.order-copy[data-order-id]');
            if (copyBtn) {
                const ok = await copyText(copyBtn.dataset.orderId);
                Toast?.show?.(ok ? '订单号已复制' : '复制失败', ok ? 'success' : 'info', 1800);
                return;
            }

            const removeBtn = event.target?.closest?.('.order-remove[data-order-id]');
            if (removeBtn) {
                const id = removeBtn.dataset.orderId;
                const ok = window.confirm('确定删除该订单记录吗？');
                if (!ok) return;
                Orders?.remove?.(id);
                return;
            }
        });

        try {
            window.addEventListener('orders:changed', render);
        } catch {
            // ignore
        }
    }

    function init() {
        render();
        bind();
    }

    return { init };
})();

// ==============================================
// Account Page Module (account.html)
// ==============================================
const AccountPage = (function() {
    const container = document.querySelector('.account-main');
    if (!container) return { init: () => {} };

    const pointsEl = container.querySelector('[data-rewards-points]');
    const rewardsResetBtn = container.querySelector('[data-rewards-reset]');

    const addressList = container.querySelector('[data-address-list]');
    const addressEmpty = container.querySelector('[data-address-empty]');
    const addressFormDetails = container.querySelector('[data-address-form]');
    const addressForm = container.querySelector('[data-address-form-body]');
    const addressOpenFormBtn = container.querySelector('[data-address-open-form]');
    const addressCancelBtn = container.querySelector('[data-address-cancel]');

    const alertsList = container.querySelector('[data-alert-list]');
    const alertsEmpty = container.querySelector('[data-alert-empty]');

    let didEnterCards = false;
    let didEnterAddresses = false;
    let didEnterAlerts = false;

    function formatRegionLabel(region) {
        try {
            return Pricing.getRegion(region).label;
        } catch {
            return '—';
        }
    }

    function renderRewards() {
        if (!pointsEl) return;
        const points = Rewards?.getPoints?.() || 0;
        pointsEl.setAttribute('aria-label', `可用积分：${points}`);
        UXMotion.tweenNumber(pointsEl, points, { duration: 420, formatter: (n) => String(Math.max(0, Math.round(n))) });
        try {
            const prev = Number(pointsEl.dataset.prevPoints);
            if (Number.isFinite(prev) && prev !== points && typeof Cinematic !== 'undefined') {
                Cinematic.pulse?.(pointsEl, { scale: points > prev ? 1.08 : 1.04, duration: 0.24 });
                if (points > prev) Cinematic.shimmerOnce?.(pointsEl, { durationMs: 520 });
            }
            pointsEl.dataset.prevPoints = String(points);
        } catch {
            // ignore
        }
    }

    function renderAddresses() {
        if (!addressList || !addressEmpty) return;
        const list = AddressBook?.getAll?.() || [];
        addressList.innerHTML = '';

        if (!list.length) {
            addressEmpty.style.display = 'block';
            return;
        }
        addressEmpty.style.display = 'none';

        list.forEach((x) => {
            const card = document.createElement('div');
            card.className = 'address-card';
            card.dataset.addressId = x.id;

            const head = document.createElement('div');
            head.className = 'address-card__head';

            const title = document.createElement('div');
            title.className = 'address-card__title';
            const left = [];
            if (x.label) left.push(x.label);
            if (x.name) left.push(x.name);
            if (x.phone) left.push(x.phone);
            title.textContent = left.length ? left.join(' · ') : '常用地址';

            const badge = document.createElement('span');
            badge.className = `address-card__badge ${x.isDefault ? 'is-default' : ''}`;
            badge.textContent = x.isDefault ? '默认' : formatRegionLabel(x.region);

            head.appendChild(title);
            head.appendChild(badge);

            const body = document.createElement('div');
            body.className = 'address-card__body';
            body.textContent = String(x.address || '');

            const actions = document.createElement('div');
            actions.className = 'address-card__actions';
            actions.innerHTML = `
                <button type="button" class="cta-button-secondary address-action" data-address-default>设为默认</button>
                <button type="button" class="cta-button-secondary address-action" data-address-edit>编辑</button>
                <button type="button" class="cta-button-secondary address-action" data-address-remove>删除</button>
            `;

            card.appendChild(head);
            card.appendChild(body);
            card.appendChild(actions);
            addressList.appendChild(card);
        });

        if (!didEnterAddresses && typeof Cinematic !== 'undefined') {
            const entered = Cinematic.staggerEnter?.(addressList.querySelectorAll('.address-card'), {
                y: 12,
                blur: 10,
                duration: 0.32,
                stagger: 0.04,
                maxStaggerItems: 10,
            });
            if (entered) didEnterAddresses = true;
        }
    }

    function renderAlerts() {
        if (!alertsList || !alertsEmpty) return;
        const list = PriceAlerts?.getAll?.() || [];
        alertsList.innerHTML = '';

        if (!list.length) {
            alertsEmpty.style.display = 'block';
            return;
        }
        alertsEmpty.style.display = 'none';

        list.forEach((a) => {
            const product = SharedData?.getProductById?.(a.productId);
            const name = String(product?.name || a.productId);
            const currentPrice = typeof product?.price === 'number' ? product.price : Number(product?.price) || 0;
            const reached = Number.isFinite(currentPrice) && currentPrice <= a.targetPrice;

            const row = document.createElement('div');
            row.className = `alert-row ${reached ? 'is-reached' : ''}`;
            row.dataset.productId = a.productId;

            const left = document.createElement('div');
            left.className = 'alert-row__left';
            left.innerHTML = `
                <div class="alert-row__name">${Utils.escapeHtml(name)}</div>
                <div class="alert-row__meta text-muted">
                    目标价：${Utils.escapeHtml(Pricing.formatCny(a.targetPrice))}
                    · 当前价：${Utils.escapeHtml(Pricing.formatCny(currentPrice))}
                </div>
            `;

            const right = document.createElement('div');
            right.className = 'alert-row__right';
            right.innerHTML = `
                <button type="button" class="cta-button-secondary alert-action" data-alert-edit>编辑</button>
                <button type="button" class="cta-button-secondary alert-action" data-alert-toggle>${a.enabled ? '停用' : '启用'}</button>
                <button type="button" class="cta-button-secondary alert-action" data-alert-remove>删除</button>
            `;

            row.appendChild(left);
            row.appendChild(right);
            alertsList.appendChild(row);
        });

        if (!didEnterAlerts && typeof Cinematic !== 'undefined') {
            const entered = Cinematic.staggerEnter?.(alertsList.querySelectorAll('.alert-row'), {
                y: 10,
                blur: 10,
                duration: 0.32,
                stagger: 0.035,
                maxStaggerItems: 10,
            });
            if (entered) didEnterAlerts = true;
        }
    }

    function openAddressForm(entry) {
        if (!addressFormDetails || !addressForm) return;
        const e = entry && typeof entry === 'object' ? entry : null;
        const setVal = (name, value) => {
            const el = addressForm.querySelector(`[name=\"${name}\"]`);
            if (!el) return;
            if (el.type === 'checkbox') el.checked = Boolean(value);
            else el.value = String(value ?? '');
        };

        setVal('id', e?.id || '');
        setVal('label', e?.label || '');
        setVal('name', e?.name || '');
        setVal('phone', e?.phone || '');
        setVal('address', e?.address || '');
        setVal('region', e?.region || ShippingRegion?.get?.() || 'cn-east');
        setVal('isDefault', Boolean(e?.isDefault));

        addressFormDetails.open = true;
        addressFormDetails.scrollIntoView({ behavior: Utils.prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    }

    function bind() {
        rewardsResetBtn?.addEventListener?.('click', () => {
            const points = Rewards?.getPoints?.() || 0;
            if (points <= 0) return;
            const ok = window.confirm('确定清空积分吗？（仅影响本机本地存储）');
            if (!ok) return;
            Rewards?.setPoints?.(0);
            Toast?.show?.('积分已清空', 'success', 1600);
        });

        addressOpenFormBtn?.addEventListener?.('click', () => openAddressForm(null));
        addressCancelBtn?.addEventListener?.('click', () => {
            if (addressFormDetails) addressFormDetails.open = false;
        });

        addressForm?.addEventListener?.('submit', (event) => {
            event.preventDefault();
            const fd = new FormData(addressForm);
            const id = String(fd.get('id') || '').trim();
            const entry = {
                id: id || undefined,
                label: String(fd.get('label') || '').trim(),
                name: String(fd.get('name') || '').trim(),
                phone: String(fd.get('phone') || '').trim(),
                address: String(fd.get('address') || '').trim(),
                region: String(fd.get('region') || '').trim(),
                isDefault: String(fd.get('isDefault') || '') === '1',
            };

            AddressBook?.upsert?.(entry);
            Toast?.show?.(id ? '地址已更新' : '地址已添加', 'success', 1600);
            if (addressFormDetails) addressFormDetails.open = false;
            addressForm.reset();
        });

        container.addEventListener('click', (event) => {
            const addrCard = event.target?.closest?.('.address-card[data-address-id]');
            const pid = event.target?.closest?.('.alert-row[data-product-id]')?.dataset?.productId;

            const setDefaultBtn = event.target?.closest?.('[data-address-default]');
            if (setDefaultBtn && addrCard) {
                const id = addrCard.dataset.addressId;
                AddressBook?.setDefault?.(id);
                Toast?.show?.('已设为默认地址', 'success', 1400);
                return;
            }

            const editBtn = event.target?.closest?.('[data-address-edit]');
            if (editBtn && addrCard) {
                const id = addrCard.dataset.addressId;
                const entry = AddressBook?.getById?.(id);
                openAddressForm(entry);
                return;
            }

            const removeBtn = event.target?.closest?.('[data-address-remove]');
            if (removeBtn && addrCard) {
                const id = addrCard.dataset.addressId;
                const ok = window.confirm('确定删除该地址吗？');
                if (!ok) return;
                AddressBook?.remove?.(id);
                Toast?.show?.('地址已删除', 'success', 1400);
                return;
            }

            const alertEdit = event.target?.closest?.('[data-alert-edit]');
            if (alertEdit && pid) {
                PriceAlerts?.openDialog?.(pid);
                return;
            }

            const alertToggle = event.target?.closest?.('[data-alert-toggle]');
            if (alertToggle && pid) {
                const current = PriceAlerts?.getByProductId?.(pid);
                if (!current) return;
                PriceAlerts?.update?.(pid, { enabled: !current.enabled });
                Toast?.show?.(!current.enabled ? '提醒已启用' : '提醒已停用', 'success', 1400);
                return;
            }

            const alertRemove = event.target?.closest?.('[data-alert-remove]');
            if (alertRemove && pid) {
                const ok = window.confirm('确定删除该降价提醒吗？');
                if (!ok) return;
                PriceAlerts?.remove?.(pid);
                Toast?.show?.('已删除降价提醒', 'success', 1400);
            }
        });

        try {
            window.addEventListener('rewards:changed', renderRewards);
            window.addEventListener('addressbook:changed', renderAddresses);
            window.addEventListener('pricealerts:changed', renderAlerts);
        } catch {
            // ignore
        }
    }

    function init() {
        renderRewards();
        renderAddresses();
        renderAlerts();
        bind();
        if (!didEnterCards && typeof Cinematic !== 'undefined') {
            const entered = Cinematic.staggerEnter?.(container.querySelectorAll('.account-card'), {
                y: 14,
                blur: 12,
                duration: 0.38,
                stagger: 0.05,
                maxStaggerItems: 8,
            });
            if (entered) didEnterCards = true;
        }
    }

    return { init };
})();

// ==============================================
// Order Success Page Module (order-success.html)
// ==============================================
const OrderSuccessPage = (function() {
    const container = document.querySelector('.order-success-main');
    if (!container) return { init: () => {} };

    const summaryHost = container.querySelector('[data-order-success]');

    function getOrderIdFromUrl() {
        try {
            const url = new URL(window.location.href);
            const id = url.searchParams.get('oid');
            return String(id || '').trim();
        } catch {
            return '';
        }
    }

    function renderEmpty() {
        if (!summaryHost) return;
        summaryHost.innerHTML =
            '<div class="empty-state"><img src="assets/images/empty-collector.svg" alt=\"\" aria-hidden=\"true\" loading=\"lazy\" decoding=\"async\"><p class=\"empty-state__title\">未找到订单信息</p><p class=\"empty-state__desc\">订单记录仅保存在本机浏览器中。</p><a class=\"cta-button\" href=\"orders.html\">查看订单中心</a><a class=\"cta-button-secondary\" href=\"products.html\">继续逛逛</a></div>';
    }

    function render() {
        if (!summaryHost) return;
        const urlId = getOrderIdFromUrl();
        const fallbackId = String(Utils.readStorageJSON('lastOrderId', '') || '').trim();
        const id = urlId || fallbackId;
        const order = Orders?.getById?.(id);
        if (!order) {
            renderEmpty();
            return;
        }

        const pricing = order.pricing || {};
        const promo = order.promotion;
        const regionLabel = Pricing.getRegion(order.region).label;

        const rows = [];
        rows.push(`<div class="order-success__headline">订单提交成功（模拟）</div>`);
        rows.push(`<div class="order-success__meta">订单号：<code>${Utils.escapeHtml(order.id)}</code> · ${Utils.escapeHtml(String(order.createdAt || '').slice(0, 19).replace('T', ' '))}</div>`);
        rows.push(`<div class="order-success__panel">`);
        rows.push(`<h3>收货信息</h3>`);
        rows.push(`<p>${Utils.escapeHtml(order.shippingAddress?.name || '')} · ${Utils.escapeHtml(order.shippingAddress?.phone || '')}</p>`);
        rows.push(`<p>${Utils.escapeHtml(order.shippingAddress?.address || '')}</p>`);
        rows.push(`<p class="text-muted">配送地区：${Utils.escapeHtml(regionLabel)}</p>`);
        rows.push(`</div>`);

        rows.push(`<div class="order-success__panel">`);
        rows.push(`<h3>商品清单</h3>`);
        rows.push(`<div class="order-success__items">`);
        (Array.isArray(order.items) ? order.items : []).forEach((item) => {
            const name = Utils.escapeHtml(item?.name || '[手办名称]');
            const qty = Number(item?.quantity) || 1;
            const img = Utils.escapeHtml(item?.image || 'assets/images/figurine-1.svg');
            const lineTotal = Pricing.formatCny((Number(item?.price) || 0) * qty);
            rows.push(
                `<div class="order-success__item"><img src="${img}" alt="" aria-hidden="true" loading="lazy" decoding="async"><div class="order-success__item-main"><div class="order-success__item-name">${name} x ${qty}</div><div class="order-success__item-sub text-muted">${Utils.escapeHtml(item?.series || '')}</div></div><div class="order-success__item-price">${Utils.escapeHtml(lineTotal)}</div></div>`,
            );
        });
        rows.push(`</div>`);
        rows.push(`</div>`);

        rows.push(`<div class="order-success__panel">`);
        rows.push(`<h3>费用</h3>`);
        rows.push(`<div class="summary-row"><span>商品小计</span><span>${Pricing.formatCny(pricing.subtotal)}</span></div>`);
        if (promo) {
            rows.push(`<div class="summary-row"><span>优惠（${Utils.escapeHtml(promo.label || promo.code)}）</span><span>- ${Pricing.formatCny(pricing.discount)}</span></div>`);
        } else {
            rows.push(`<div class="summary-row"><span>优惠</span><span>- ${Pricing.formatCny(0)}</span></div>`);
        }
        const rewardsDiscount = Number(pricing.rewardsDiscount) || 0;
        const pointsUsed = Number.parseInt(String(pricing.pointsUsed ?? ''), 10);
        if (rewardsDiscount > 0) {
            const pointsLabel = Number.isFinite(pointsUsed) && pointsUsed > 0 ? `（使用 ${pointsUsed} 积分）` : '';
            rows.push(`<div class="summary-row"><span>积分抵扣</span><span>- ${Pricing.formatCny(rewardsDiscount)}${Utils.escapeHtml(pointsLabel)}</span></div>`);
        } else {
            rows.push(`<div class="summary-row"><span>积分抵扣</span><span>- ${Pricing.formatCny(0)}</span></div>`);
        }
        rows.push(`<div class="summary-row"><span>运费</span><span>${Pricing.formatCny(pricing.shipping)}</span></div>`);
        rows.push(`<div class="summary-row total-row"><span>应付总额</span><span>${Pricing.formatCny(pricing.total)}</span></div>`);
        rows.push(`</div>`);

        rows.push(`<div class="order-success__actions">`);
        rows.push(`<a class="cta-button" href="orders.html">查看订单中心</a>`);
        rows.push(`<a class="cta-button-secondary" href="products.html">继续逛逛</a>`);
        rows.push(`</div>`);

        summaryHost.innerHTML = rows.join('');
    }

    function init() {
        render();
        try {
            const headline = container.querySelector('.order-success__headline') || summaryHost;
            if (headline && typeof Celebration !== 'undefined' && Celebration.fire) {
                Celebration.fire(headline, { count: 18 });
            }
            if (typeof Cinematic !== 'undefined') {
                Cinematic.staggerEnter?.(container.querySelectorAll('.order-success__panel'), {
                    y: 14,
                    blur: 12,
                    duration: 0.38,
                    stagger: 0.05,
                    maxStaggerItems: 10,
                });
                Cinematic.staggerEnter?.(container.querySelectorAll('.order-success__item'), {
                    y: 10,
                    blur: 10,
                    duration: 0.32,
                    stagger: 0.02,
                    maxStaggerItems: 14,
                });
                Cinematic.pulse?.(headline, { scale: 1.02, duration: 0.26 });
            }
        } catch {
            // ignore
        }
    }

    return { init };
})();

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

            if (key === 'favorites') {
                if (typeof Favorites !== 'undefined') {
                    const ids = typeof Favorites.getIds === 'function' ? Favorites.getIds() : [];
                    Favorites.updateHeaderCount?.(ids);
                    Favorites.syncButtons?.(document);
                }
                try { window.dispatchEvent(new CustomEvent('favorites:changed')); } catch { /* ignore */ }
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
                try { window.dispatchEvent(new CustomEvent('compare:changed')); } catch { /* ignore */ }
                return;
            }

            if (key === 'promotion') {
                try { window.dispatchEvent(new CustomEvent('promo:changed')); } catch { /* ignore */ }
                return;
            }

            if (key === 'shippingRegion') {
                try { window.dispatchEvent(new CustomEvent('shipping:changed')); } catch { /* ignore */ }
                return;
            }

            if (key === 'orders') {
                if (typeof Orders !== 'undefined') {
                    Orders.updateHeaderCount?.(Orders.getAll?.() || []);
                }
                try { window.dispatchEvent(new CustomEvent('orders:changed')); } catch { /* ignore */ }
                return;
            }

            if (key === 'rewards') {
                if (typeof Rewards !== 'undefined') {
                    Rewards.updateHeaderBadge?.(Rewards.getPoints?.() || 0);
                }
                try { window.dispatchEvent(new CustomEvent('rewards:changed')); } catch { /* ignore */ }
                return;
            }

            if (key === 'addressBook') {
                try { window.dispatchEvent(new CustomEvent('addressbook:changed')); } catch { /* ignore */ }
                Checkout.refresh?.();
                return;
            }

            if (key === 'priceAlerts') {
                PriceAlerts?.checkAndNotify?.();
                try { window.dispatchEvent(new CustomEvent('pricealerts:changed')); } catch { /* ignore */ }
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
// Application Initialization
// ==============================================
const App = {
    init: function() {
        // Initialize modules in order of dependency or desired execution
        // SharedData doesn't need init as it's just data
        Header.init();
        Rewards.init(); // 注入会员入口后再做首屏入场动效
        Cinematic.init();
        ViewTransitions.init();
        Theme.init();
        ShippingRegion.init();
        SmoothScroll.init();
        ScrollProgress.init();
        BackToTop.init();
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
        Homepage.init(); 
        RecentlyViewed.init();
        PDP.init(); 
        Checkout.init();
        ComparePage.init();
        OrdersPage.init();
        AccountPage.init();
        OrderSuccessPage.init();
        StaticPage.init();
        OfflinePage.init();
        ProductListing.init();
        ServiceWorker.init();
        PWAInstall.init();
        CrossTabSync.init();

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
