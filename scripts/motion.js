/* Motion-lite (local)
   - 仅实现本项目用到的 `Motion.animate()`
   - 额外增强：`Motion.spring()`（阻尼弹簧关键帧生成，用于物理级微交互）
   - 基于 Web Animations API（WAAPI）
   - 支持 Motion 风格的简写属性：x / y / scale / rotate
   - 兼容本项目现有用法：duration/delay 默认按“秒”理解（<20 视为秒）
*/

(function () {
  'use strict';

  const root = typeof globalThis !== 'undefined' ? globalThis : window;

  const existingMotion =
    root.Motion && typeof root.Motion.animate === 'function' ? root.Motion : null;

  const supportsWAAPI =
    typeof Element !== 'undefined' &&
    Element.prototype &&
    typeof Element.prototype.animate === 'function';

  function prefersReducedMotion() {
    // 1) 用户显式偏好（A11y 中心）：html[data-motion="reduce"]
    try {
      const doc = root.document || (typeof document !== 'undefined' ? document : null);
      const el = doc && doc.documentElement ? doc.documentElement : null;
      if (el && el.dataset && el.dataset.motion === 'reduce') return true;
    } catch {
      // ignore
    }

    // 2) 系统偏好：prefers-reduced-motion
    try {
      return Boolean(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch {
      return false;
    }
  }

  function toMs(value, fallbackMs) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallbackMs;
    if (n <= 0) return 0;
    // Motion 习惯使用“秒”；若传入较大值则视为 ms
    return n < 20 ? Math.round(n * 1000) : Math.round(n);
  }

  function easingToString(easing) {
    if (
      Array.isArray(easing) &&
      easing.length === 4 &&
      easing.every((x) => typeof x === 'number' && Number.isFinite(x))
    ) {
      const [x1, y1, x2, y2] = easing;
      return `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`;
    }
    return typeof easing === 'string' ? easing : undefined;
  }

  function getStyleValue(element, prop) {
    try {
      const cs = getComputedStyle(element);
      const direct = cs && typeof cs[prop] === 'string' ? cs[prop] : '';
      return direct || cs.getPropertyValue(prop) || '';
    } catch {
      return '';
    }
  }

  function pickKeyframeValue(value, index) {
    if (Array.isArray(value)) return value[Math.min(index, value.length - 1)];
    return value;
  }

  function toNumber(value, fallback) {
    const n = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function buildTransform(x, y, scale, rotate) {
    const tx = toNumber(x, 0);
    const ty = toNumber(y, 0);
    const sc = toNumber(scale, 1);
    const rot = toNumber(rotate, 0);
    return `translate3d(${tx}px, ${ty}px, 0) scale(${sc}) rotate(${rot}deg)`;
  }

  function normalizeKeyframes(element, keyframes) {
    if (Array.isArray(keyframes)) return keyframes;
    if (!keyframes || typeof keyframes !== 'object') return [];

    const kf = keyframes;
    const keys = Object.keys(kf);

    const hasTransformShorthand =
      'x' in kf || 'y' in kf || 'scale' in kf || 'rotate' in kf;
    const hasExplicitTransform = 'transform' in kf;

    let frameCount = 0;
    keys.forEach((key) => {
      const v = kf[key];
      if (Array.isArray(v)) frameCount = Math.max(frameCount, v.length);
      else frameCount = Math.max(frameCount, 2);
    });
    if (frameCount <= 0) frameCount = 2;

    const frames = [];
    for (let i = 0; i < frameCount; i += 1) {
      const frame = {};

      // Transform shorthand -> transform keyframes
      if (!hasExplicitTransform && hasTransformShorthand) {
        frame.transform = buildTransform(
          pickKeyframeValue(kf.x, i),
          pickKeyframeValue(kf.y, i),
          pickKeyframeValue(kf.scale, i),
          pickKeyframeValue(kf.rotate, i),
        );
      }

      // Other properties
      keys.forEach((key) => {
        if (key === 'x' || key === 'y' || key === 'scale' || key === 'rotate') return;
        const v = kf[key];
        if (Array.isArray(v)) {
          frame[key] = pickKeyframeValue(v, i);
          return;
        }

        // 标量：首帧用 computed style，后续用目标值（模拟 Motion 的 from->to）
        if (i === 0) {
          const current = getStyleValue(element, key);
          frame[key] = current || v;
        } else {
          frame[key] = v;
        }
      });

      frames.push(frame);
    }

    return frames;
  }

  function animate(element, keyframes, options) {
    if (!supportsWAAPI || !element) return null;

    const opts = options && typeof options === 'object' ? options : {};
    const reduced = prefersReducedMotion();
    const duration = reduced ? 0 : toMs(opts.duration, 300);
    const delay = reduced ? 0 : toMs(opts.delay, 0);
    const easing = easingToString(opts.easing) || 'linear';
    const fill = typeof opts.fill === 'string' ? opts.fill : 'both';

    const frames = normalizeKeyframes(element, keyframes);
    if (!frames.length) return null;

    try {
      return element.animate(frames, { duration, delay, easing, fill });
    } catch {
      return null;
    }
  }

  function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  function parsePx(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    const n = Number.parseFloat(raw.replace(/px$/i, ''));
    return Number.isFinite(n) ? n : null;
  }

  function readTransformParts(element) {
    const fallback = { x: 0, y: 0, scale: 1, rotate: 0 };
    if (!element) return fallback;

    const raw = getStyleValue(element, 'transform');
    if (!raw || raw === 'none') return fallback;

    try {
      const Matrix =
        root.DOMMatrixReadOnly ||
        root.WebKitCSSMatrix ||
        root.DOMMatrix ||
        null;
      if (!Matrix) return fallback;
      const m = new Matrix(raw);

      const x = Number(m.m41) || 0;
      const y = Number(m.m42) || 0;

      // 2D scale + rotate approximation.
      const a = Number(m.m11) || 1;
      const b = Number(m.m12) || 0;
      const scale = Math.sqrt(a * a + b * b) || 1;
      const rotate = (Math.atan2(b, a) * 180) / Math.PI || 0;

      return { x, y, scale, rotate };
    } catch {
      return fallback;
    }
  }

  function resolveSpringPairNumber(element, key, raw, fallbackFrom, fallbackTo) {
    if (Array.isArray(raw) && raw.length > 0) {
      const from = toNumber(raw[0], fallbackFrom);
      const to = toNumber(raw[raw.length - 1], fallbackTo);
      return { from, to };
    }

    const to = toNumber(raw, fallbackTo);
    let from = fallbackFrom;

    // Prefer current computed transform as "from" when possible.
    try {
      const t = readTransformParts(element);
      if (key === 'x') from = toNumber(t.x, fallbackFrom);
      if (key === 'y') from = toNumber(t.y, fallbackFrom);
      if (key === 'scale') from = toNumber(t.scale, fallbackFrom);
      if (key === 'rotate') from = toNumber(t.rotate, fallbackFrom);
    } catch {
      // ignore
    }

    return { from, to };
  }

  function resolveSpringPairPx(element, prop, raw) {
    if (Array.isArray(raw) && raw.length > 0) {
      const fromPx = Number.isFinite(Number(raw[0]))
        ? Number(raw[0])
        : parsePx(raw[0]);
      const toPx = Number.isFinite(Number(raw[raw.length - 1]))
        ? Number(raw[raw.length - 1])
        : parsePx(raw[raw.length - 1]);
      if (fromPx != null && toPx != null) return { fromPx, toPx };
      return { fromPx: null, toPx: null };
    }

    const toPx = Number.isFinite(Number(raw)) ? Number(raw) : parsePx(raw);
    const fromPx = parsePx(getStyleValue(element, prop));
    if (fromPx == null || toPx == null) return { fromPx: null, toPx: null };
    return { fromPx, toPx };
  }

  function resolveSpringPairOpacity(element, raw) {
    if (Array.isArray(raw) && raw.length > 0) {
      const from = clampNumber(toNumber(raw[0], 1), 0, 1);
      const to = clampNumber(toNumber(raw[raw.length - 1], 1), 0, 1);
      return { from, to };
    }

    const to = clampNumber(raw, 0, 1);
    const from = clampNumber(getStyleValue(element, 'opacity'), 0, 1);
    return { from, to };
  }

  function springProgress(options = {}) {
    const opts = options && typeof options === 'object' ? options : {};
    const stiffness = clampNumber(opts.stiffness ?? 220, 1, 5000);
    const damping = clampNumber(opts.damping ?? 28, 0, 5000);
    const mass = clampNumber(opts.mass ?? 1, 0.001, 100);
    const initialVelocity = clampNumber(opts.velocity ?? 0, -500, 500);

    const restDelta = clampNumber(opts.restDelta ?? 0.001, 0.00001, 0.1);
    const restSpeed = clampNumber(opts.restSpeed ?? 0.001, 0.00001, 2);

    const sampleRate = clampNumber(opts.sampleRate ?? 60, 30, 240);
    const dt = 1 / sampleRate; // seconds
    const maxDurationMs = clampNumber(
      toMs(opts.maxDuration ?? opts.maxDurationMs, 900),
      1,
      5000,
    );
    const maxSteps = Math.ceil((maxDurationMs / 1000) / dt);

    let x = 0;
    let v = initialVelocity;
    const target = 1;
    const out = [0];
    let steps = 0;

    while (steps < maxSteps) {
      // Damped spring towards target (semi-implicit Euler).
      const displacement = x - target;
      const springForce = -stiffness * displacement;
      const dampingForce = -damping * v;
      const a = (springForce + dampingForce) / mass;

      v += a * dt;
      x += v * dt;
      out.push(x);
      steps += 1;

      if (Math.abs(target - x) <= restDelta && Math.abs(v) <= restSpeed) break;
    }

    const durationMs = Math.max(1, Math.round(steps * dt * 1000));
    return { out, durationMs };
  }

  function spring(element, keyframes, options) {
    if (!supportsWAAPI || !element) return null;

    const opts = options && typeof options === 'object' ? options : {};
    const reduced = prefersReducedMotion();
    const delay = reduced ? 0 : toMs(opts.delay, 0);
    const fill = typeof opts.fill === 'string' ? opts.fill : 'both';

    // Spring currently supports: object keyframes + x/y/scale/rotate + width/height/opacity.
    if (!keyframes || typeof keyframes !== 'object' || Array.isArray(keyframes)) {
      return animate(element, keyframes, opts);
    }

    if (reduced) {
      return animate(element, keyframes, { ...opts, duration: 0, delay: 0, fill });
    }

    // Explicit transform string is hard to spring safely; fallback.
    if ('transform' in keyframes) {
      return animate(element, keyframes, opts);
    }

    const hasX = 'x' in keyframes;
    const hasY = 'y' in keyframes;
    const hasScale = 'scale' in keyframes;
    const hasRotate = 'rotate' in keyframes;
    const shouldTransform = hasX || hasY || hasScale || hasRotate;

    const xPair = shouldTransform
      ? resolveSpringPairNumber(element, 'x', keyframes.x, 0, 0)
      : null;
    const yPair = shouldTransform
      ? resolveSpringPairNumber(element, 'y', keyframes.y, 0, 0)
      : null;
    const scalePair = shouldTransform
      ? resolveSpringPairNumber(element, 'scale', keyframes.scale, 1, 1)
      : null;
    const rotatePair = shouldTransform
      ? resolveSpringPairNumber(element, 'rotate', keyframes.rotate, 0, 0)
      : null;

    const widthPair =
      'width' in keyframes ? resolveSpringPairPx(element, 'width', keyframes.width) : null;
    const heightPair =
      'height' in keyframes ? resolveSpringPairPx(element, 'height', keyframes.height) : null;
    const opacityPair =
      'opacity' in keyframes ? resolveSpringPairOpacity(element, keyframes.opacity) : null;

    const hasAny =
      Boolean(shouldTransform) ||
      (widthPair && widthPair.fromPx != null && widthPair.toPx != null) ||
      (heightPair && heightPair.fromPx != null && heightPair.toPx != null) ||
      Boolean(opacityPair);
    if (!hasAny) return animate(element, keyframes, opts);

    const s = springProgress(opts);
    const progress = s.out;
    const durationComputed = s.durationMs;
    const duration = clampNumber(toMs(opts.duration, durationComputed), 0, 5000);

    const frames = progress.map((p) => {
      const frame = {};

      if (shouldTransform) {
        const x = xPair ? xPair.from + (xPair.to - xPair.from) * p : 0;
        const y = yPair ? yPair.from + (yPair.to - yPair.from) * p : 0;
        const scale = scalePair ? scalePair.from + (scalePair.to - scalePair.from) * p : 1;
        const rotate = rotatePair ? rotatePair.from + (rotatePair.to - rotatePair.from) * p : 0;
        frame.transform = buildTransform(x, y, scale, rotate);
      }

      if (widthPair && widthPair.fromPx != null && widthPair.toPx != null) {
        const w = widthPair.fromPx + (widthPair.toPx - widthPair.fromPx) * p;
        frame.width = `${Math.max(0, w).toFixed(2)}px`;
      }

      if (heightPair && heightPair.fromPx != null && heightPair.toPx != null) {
        const h = heightPair.fromPx + (heightPair.toPx - heightPair.fromPx) * p;
        frame.height = `${Math.max(0, h).toFixed(2)}px`;
      }

      if (opacityPair) {
        const o = opacityPair.from + (opacityPair.to - opacityPair.from) * p;
        frame.opacity = clampNumber(o, 0, 1);
      }

      return frame;
    });

    try {
      return element.animate(frames, { duration, delay, easing: 'linear', fill });
    } catch {
      return null;
    }
  }

  // 已存在 Motion（例如外部注入）则不覆盖 animate；仅在可能时补齐 spring。
  if (existingMotion && typeof existingMotion.animate === 'function') {
    try {
      if (typeof existingMotion.spring !== 'function') existingMotion.spring = spring;
    } catch {
      // ignore
    }
    return;
  }

  root.Motion = { animate, spring };
})();
