/* Page Module
   - 按页代码分割：仅在目标页面 init() 触发时创建模块（避免 scripts/main.js 单体膨胀）
   - 运行时依赖通过 init(ctx) 注入：兼容根目录部署 ?v= 缓存穿透与 Vite 构建
*/

let Homepage = null;
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
    SmartCuration,
  } = ctx;

  // Homepage Specific Module (Modified to use SharedData)
  // ==============================================
  Homepage = (function() {
      const featuredGrid = document.querySelector('#product-gallery .gallery-grid');
      const numberOfFeatured = 3;
      const curationSection = document.querySelector('.curation');
      const curationGrid = curationSection?.querySelector('[data-curation-grid]');
      const curationTabs = curationSection?.querySelectorAll('[data-curation-tab]');
      const curationIndicator = curationSection?.querySelector('.curation-tabs__indicator');
      const tabStorageKey = 'homeCurationTab';
  
      function populateFeaturedProducts() {
          if (!featuredGrid) return;
  
          const run = () => {
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
          };
  
          if (typeof Skeleton !== 'undefined' && Skeleton.withGridSkeleton) {
              Skeleton.withGridSkeleton(featuredGrid, run, { count: numberOfFeatured });
              return;
          }
  
          run();
      }
  
      function moveIndicator(target) {
          if (!curationIndicator || !target) return;
          const parentRect = target.parentElement?.getBoundingClientRect();
          const rect = target.getBoundingClientRect();
          if (!parentRect) return;
          const x = rect.left - parentRect.left;
          const width = rect.width;

          function readIndicatorState() {
              try {
                  const cs = getComputedStyle(curationIndicator);
                  const w = Number.parseFloat(cs.width);
                  const transform = cs.transform;

                  let tx = 0;
                  if (transform && transform !== 'none') {
                      const Matrix =
                          window.DOMMatrixReadOnly ||
                          window.WebKitCSSMatrix ||
                          window.DOMMatrix ||
                          null;
                      if (Matrix) {
                          const m = new Matrix(transform);
                          tx = Number(m.m41) || 0;
                      }
                  }

                  return {
                      x: Number.isFinite(tx) ? tx : 0,
                      width: Number.isFinite(w) ? w : 0,
                  };
              } catch {
                  return { x: 0, width: 0 };
              }
          }

          const prev = readIndicatorState();
          const fromXRaw = Number(curationIndicator.dataset?.indicatorX);
          const fromWRaw = Number(curationIndicator.dataset?.indicatorW);
          const fromX = Number.isFinite(fromXRaw) ? fromXRaw : prev.x;
          const fromW = Number.isFinite(fromWRaw) ? fromWRaw : prev.width;
          const safeFromX = Number.isFinite(fromX) ? fromX : x;
          const safeFromW = Number.isFinite(fromW) && fromW > 0 ? fromW : width;

          try {
              if (curationIndicator.dataset) {
                  curationIndicator.dataset.indicatorX = String(x);
                  curationIndicator.dataset.indicatorW = String(width);
              }
          } catch {
              // ignore
          }

          if (Utils.prefersReducedMotion()) {
              curationIndicator.style.width = `${width}px`;
              curationIndicator.style.transform = `translate3d(${x}px, 0, 0)`;
              return;
          }

          const motion = globalThis.Motion;
          try {
              curationIndicator.getAnimations?.().forEach((a) => a.cancel());
          } catch {
              // ignore
          }

          // Prefer physics spring when available (Motion.spring).
          if (motion && typeof motion.spring === 'function') {
              try {
                  motion.spring(
                      curationIndicator,
                      { x: [safeFromX, x], width: [safeFromW, width] },
                      { stiffness: 360, damping: 34, mass: 1, maxDuration: 0.8 },
                  );
                  return;
              } catch {
                  // ignore
              }
          }

          if (motion && typeof motion.animate === 'function') {
              try {
                  motion.animate(
                      curationIndicator,
                      { x: [safeFromX, x], width: [`${safeFromW}px`, `${width}px`] },
                      { duration: 0.42, easing: [0.22, 1, 0.36, 1] },
                  );
                  return;
              } catch {
                  // ignore
              }
          }

          curationIndicator.style.width = `${width}px`;
          curationIndicator.style.transform = `translate3d(${x}px, 0, 0)`;
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
          if (!curationGrid) return;
          const useSmart = tabKey === 'smart';
          const list = useSmart && typeof SmartCuration !== 'undefined' && SmartCuration.getRecommendations
              ? SmartCuration.getRecommendations({ seedId: '', limit: 6 })
              : (typeof SharedData !== 'undefined' && SharedData.getCurationProducts
                  ? SharedData.getCurationProducts(tabKey)
                  : []);
          if (!list || list.length === 0) {
              curationGrid.innerHTML = '<p class="product-listing__empty-message text-center">暂无策展内容。</p>';
              return;
          }
          const run = () => {
              if (typeof ProductListing === 'undefined' || typeof ProductListing.createProductCardHTML !== 'function') return;
              curationGrid.innerHTML = list.map((product) => ProductListing.createProductCardHTML(product)).join('');
              if (typeof LazyLoad !== 'undefined' && LazyLoad.init) { LazyLoad.init(curationGrid); }
              if (typeof Favorites !== 'undefined' && Favorites.syncButtons) { Favorites.syncButtons(curationGrid); }
              if (typeof Compare !== 'undefined' && Compare.syncButtons) { Compare.syncButtons(curationGrid); }
              if (typeof ViewTransitions !== 'undefined' && ViewTransitions.restoreLastProductCard) {
                  ViewTransitions.restoreLastProductCard(curationGrid);
              }
              if (typeof ScrollAnimations !== 'undefined' && ScrollAnimations.init) { ScrollAnimations.init(curationGrid, { y: 22, blur: 14, duration: 0.44, stagger: 0.032, maxStaggerItems: 12 }); }
          };
  
          if (typeof Skeleton !== 'undefined' && Skeleton.withGridSkeleton) {
              Skeleton.withGridSkeleton(curationGrid, run, { count: Math.max(3, Math.min(6, list.length)) });
              return;
          }
  
          run();
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

  try { Homepage.init(); } catch (e) { console.warn('Page module init failed: homepage.js', e); }
}
