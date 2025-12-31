/* Page Module
   - 按页代码分割：仅在目标页面 init() 触发时创建模块（避免 scripts/main.js 单体膨胀）
   - 运行时依赖通过 init(ctx) 注入：兼容根目录部署 ?v= 缓存穿透与 Vite 构建
*/

let OfflinePage = null;
let __initialized = false;

export function init(ctx = {}) {
  if (__initialized) return;
  __initialized = true;
  const {
    Utils,
    Icons,
    Toast,
    Theme,
    Header,
    SharedData,
    StateHub,
    Telemetry,
    Rewards,
    Cinematic,
    ViewTransitions,
    NavigationTransitions,
    ShippingRegion,
    SmoothScroll,
    ScrollProgress,
    BackToTop,
    ScrollAnimations,
    ImageFallback,
    LazyLoad,
    Favorites,
    Compare,
    Orders,
    AddressBook,
    PriceAlerts,
    Cart,
    Promotion,
    QuickAdd,
    ServiceWorker,
    PWAInstall,
    CrossTabSync,
    Prefetch,
    Http,
    Skeleton,
    VirtualScroll,
    DataPortability,
    Pricing,
    UXMotion,
    Celebration,
  } = ctx;

  // Offline Page Module (offline.html)
  // ==============================================
  OfflinePage = (function() {
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

  try { OfflinePage.init(); } catch (e) { console.warn('Page module init failed: offline.js', e); }
}
