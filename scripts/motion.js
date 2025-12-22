/* Motion-lite (local)
   - 仅实现本项目用到的 `Motion.animate()`
   - 基于 Web Animations API（WAAPI）
   - 支持 Motion 风格的简写属性：x / y / scale / rotate
   - 兼容本项目现有用法：duration/delay 默认按“秒”理解（<20 视为秒）
*/

(function () {
  'use strict';

  const root = typeof globalThis !== 'undefined' ? globalThis : window;

  // 已存在 Motion（例如外部注入）则不覆盖
  if (root.Motion && typeof root.Motion.animate === 'function') return;

  const supportsWAAPI =
    typeof Element !== 'undefined' &&
    Element.prototype &&
    typeof Element.prototype.animate === 'function';

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
    const duration = toMs(opts.duration, 300);
    const delay = toMs(opts.delay, 0);
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

  root.Motion = { animate };
})();

