/* Page Module
   - 按页代码分割：仅在目标页面 init() 触发时创建模块（避免 scripts/main.js 单体膨胀）
   - 运行时依赖通过 init(ctx) 注入：兼容根目录部署 ?v= 缓存穿透与 Vite 构建
*/

let RecentlyViewed = null;
let PDP = null;
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
    InventoryPulse,
    BundleDeals,
    WatchCenter,
    SmartCuration,
    StorageKit,
    Perf,
  } = ctx;

  // Recently Viewed Module (localStorage)
  // ==============================================
  RecentlyViewed = (function() {
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
          Utils.dispatchChanged('recent');
      }
  
      function clearAll() {
          saveIds([]);
          Utils.dispatchChanged('recent');
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
  PDP = (function() {
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
      const inventoryPanel = pdpContainer.querySelector('[data-inventory-panel]');
      const inventoryStatusEl = pdpContainer.querySelector('[data-inventory-status]');
      const inventoryMetaEl = pdpContainer.querySelector('[data-inventory-meta]');
      const bundleSection = pdpContainer.querySelector('[data-bundle-deals]');
      const bundleList = pdpContainer.querySelector('[data-bundle-list]');
      const curationSection = pdpContainer.querySelector('[data-smart-curation]');
      const curationGrid = pdpContainer.querySelector('[data-curation-grid]');
      const maxQuantity = 99;

      let favoriteBtn = actionsContainer?.querySelector('.favorite-btn--pdp') || null;
      let shareBtn = actionsContainer?.querySelector('.share-btn--pdp') || null;
      let compareBtn = actionsContainer?.querySelector('.compare-btn--pdp') || null;
      let alertBtn = actionsContainer?.querySelector('.alert-btn--pdp') || null;
      let restockBtn = actionsContainer?.querySelector('.restock-btn--pdp') || null;
  
      let currentProductData = null;
      let lightbox = null;
  
      function ensureLightbox() {
          if (lightbox) return lightbox;
  
          const dialog = document.createElement('dialog');
          dialog.className = 'glass-dialog lightbox-dialog';
          dialog.setAttribute('aria-label', '查看大图');
          dialog.innerHTML = `
              <div class="glass-dialog__card lightbox-dialog__card">
                  <div class="lightbox__header">
                      <div class="lightbox__title">查看大图</div>
                      <button type="button" class="favorite-btn lightbox__close" aria-label="关闭">
                          ${Icons.svgHtml('icon-x')}
                      </button>
                  </div>
                  <div class="lightbox__stage">
                      <button type="button" class="lightbox__nav lightbox__nav--prev" aria-label="上一张">
                          ${Icons.svgHtml('icon-arrow-left')}
                      </button>
                      <img class="lightbox__image" alt="" decoding="async">
                      <button type="button" class="lightbox__nav lightbox__nav--next" aria-label="下一张">
                          ${Icons.svgHtml('icon-arrow-right')}
                      </button>
                  </div>
                  <div class="lightbox__thumbs" aria-label="缩略图列表"></div>
              </div>
          `;
          document.body.appendChild(dialog);
  
          const imageEl = dialog.querySelector('.lightbox__image');
          const closeBtn = dialog.querySelector('.lightbox__close');
          const prevBtn = dialog.querySelector('.lightbox__nav--prev');
          const nextBtn = dialog.querySelector('.lightbox__nav--next');
          const thumbs = dialog.querySelector('.lightbox__thumbs');
  
          let images = [];
          let currentIndex = 0;
          let returnFocusEl = null;
  
          function setReturnFocus(el) {
              returnFocusEl = el && typeof el.focus === 'function' ? el : null;
          }
  
          function close() {
              try {
                  dialog.close();
              } catch {
                  try { dialog.removeAttribute('open'); } catch { /* ignore */ }
              }
          }
  
          function renderThumbs() {
              if (!thumbs) return;
              thumbs.innerHTML = '';
              images.forEach((item, i) => {
                  const btn = document.createElement('button');
                  btn.type = 'button';
                  btn.className = 'lightbox__thumb';
                  btn.dataset.index = String(i);
                  btn.setAttribute('aria-label', `查看第 ${i + 1} 张`);
  
                  const img = document.createElement('img');
                  img.src = String(item?.thumb || item?.large || '');
                  img.alt = String(item?.alt || '');
                  img.loading = 'lazy';
                  img.decoding = 'async';
  
                  btn.appendChild(img);
                  thumbs.appendChild(btn);
              });
          }
  
          function setImages(list) {
              images = Array.isArray(list) ? list : [];
              currentIndex = 0;
              renderThumbs();
          }
  
          function syncThumbState() {
              try {
                  thumbs?.querySelectorAll?.('.lightbox__thumb')?.forEach?.((b) => {
                      const idx = Number(b.dataset.index);
                      const active = Number.isFinite(idx) && idx === currentIndex;
                      b.classList.toggle('is-active', active);
                      if (active) b.setAttribute('aria-current', 'true');
                      else b.removeAttribute('aria-current');
                  });
              } catch {
                  // ignore
              }
          }
  
          function setIndex(nextIndex) {
              const len = images.length;
              if (!len) return;
  
              const raw = Number(nextIndex);
              const normalized = Number.isFinite(raw) ? Math.trunc(raw) : 0;
              currentIndex = ((normalized % len) + len) % len;
              const item = images[currentIndex];
  
              if (imageEl && item?.large) {
                  imageEl.src = String(item.large);
                  imageEl.alt = String(item.alt || currentProductData?.name || '');
                  imageEl.decoding = 'async';
              }
  
              syncThumbState();
  
              const multi = len > 1;
              if (prevBtn) prevBtn.disabled = !multi;
              if (nextBtn) nextBtn.disabled = !multi;
  
              // 同步 PDP 主图：关闭弹窗后页面保持一致（更符合“商业级”预期）
              try { handleThumbnailClick(item); } catch { /* ignore */ }
          }
  
          function step(delta) {
              const len = images.length;
              if (!len) return;
              const d = Number(delta);
              setIndex(currentIndex + (Number.isFinite(d) ? d : 1));
          }
  
          closeBtn?.addEventListener?.('click', close);
          prevBtn?.addEventListener?.('click', () => step(-1));
          nextBtn?.addEventListener?.('click', () => step(1));
  
          thumbs?.addEventListener?.('click', (event) => {
              const target = event?.target?.closest?.('.lightbox__thumb');
              if (!target) return;
              const idx = Number(target.dataset.index);
              if (!Number.isFinite(idx)) return;
              setIndex(idx);
          });
  
          dialog.addEventListener('click', (event) => {
              if (event.target === dialog) close();
          });
  
          dialog.addEventListener('keydown', (event) => {
              if (event.key === 'ArrowLeft') {
                  event.preventDefault();
                  step(-1);
              } else if (event.key === 'ArrowRight') {
                  event.preventDefault();
                  step(1);
              }
          });
  
          dialog.addEventListener('close', () => {
              try { returnFocusEl?.focus?.(); } catch { /* ignore */ }
              returnFocusEl = null;
          });
  
          lightbox = { dialog, close, setImages, setIndex, step, setReturnFocus };
          return lightbox;
      }
  
      function getCurrentImageIndex() {
          const images = currentProductData?.images;
          if (!Array.isArray(images) || images.length === 0) return 0;
  
          const currentLarge = String(mainImage?.dataset?.large || mainImage?.getAttribute?.('src') || '').trim();
          const idx = images.findIndex((img) => String(img?.large || '').trim() === currentLarge);
          return idx >= 0 ? idx : 0;
      }
  
      function openLightboxAt(index) {
          const images = currentProductData?.images;
          if (!Array.isArray(images) || images.length === 0) return;
  
          const lb = ensureLightbox();
          if (typeof lb.dialog?.showModal !== 'function') {
              const safeIndex = Math.max(0, Math.min(images.length - 1, Number(index) || 0));
              const item = images[safeIndex];
              if (item?.large) window.open(String(item.large), '_blank', 'noopener,noreferrer');
              return;
          }
  
          lb.setImages(images);
          lb.setReturnFocus(mainImage);
          lb.setIndex(index);
          try {
              if (!lb.dialog.open) lb.dialog.showModal();
          } catch {
              try { lb.dialog.setAttribute('open', ''); } catch { /* ignore */ }
          }
      }
  
      function initLightbox() {
          if (!mainImage) return;
          try {
              mainImage.style.cursor = 'zoom-in';
              mainImage.setAttribute('tabindex', '0');
              mainImage.setAttribute('role', 'button');
              mainImage.setAttribute('aria-label', '查看大图');
          } catch {
              // ignore
          }
  
          const open = () => openLightboxAt(getCurrentImageIndex());
          mainImage.addEventListener('click', open);
          mainImage.addEventListener('keydown', (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  open();
              }
          });
      }
  
      function ensureFavoriteButton(productId) {
          if (!actionsContainer) return null;
          if (!favoriteBtn) {
              favoriteBtn = document.createElement('button');
              favoriteBtn.type = 'button';
              favoriteBtn.className = 'favorite-btn favorite-btn--pdp';
              favoriteBtn.setAttribute('aria-label', '加入收藏');
              favoriteBtn.setAttribute('aria-pressed', 'false');
              favoriteBtn.innerHTML =
                  `${Icons.svgHtml('icon-heart')}<span class="favorite-btn__text">收藏</span>`;
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
                  `${Icons.svgHtml('icon-scale')}<span class="compare-btn__text">对比</span>`;
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
              shareBtn.innerHTML = `${Icons.svgHtml('icon-link')}<span class="share-btn__text">复制链接</span>`;
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
              alertBtn.innerHTML = `${Icons.svgHtml('icon-bell')}<span class="alert-btn__text">降价提醒</span>`;
              actionsContainer.appendChild(alertBtn);
          }
  
          if (productId) alertBtn.dataset.productId = String(productId);
          if (typeof PriceAlerts !== 'undefined' && PriceAlerts.syncButtons) PriceAlerts.syncButtons(actionsContainer);
          return alertBtn;
      }

      function ensureRestockButton(productId) {
          if (!actionsContainer) return null;
          if (!restockBtn) {
              restockBtn = document.createElement('button');
              restockBtn.type = 'button';
              restockBtn.className = 'restock-btn restock-btn--pdp';
              restockBtn.setAttribute('aria-label', '到货提醒');
              restockBtn.setAttribute('aria-pressed', 'false');
              restockBtn.innerHTML = `${Icons.svgHtml('icon-bell')}<span class="restock-btn__text">到货提醒</span>`;
              actionsContainer.appendChild(restockBtn);
              restockBtn.addEventListener('click', () => {
                  const id = restockBtn?.dataset?.productId;
                  if (!id) return;
                  const active = WatchCenter?.toggleRestock?.(id);
                  if (typeof Toast !== 'undefined' && Toast.show) {
                      Toast.show(active ? '已开启到货提醒' : '已关闭到货提醒', 'info', 1600);
                  }
                  syncRestockButton(id);
              });
          }

          if (productId) restockBtn.dataset.productId = String(productId);
          syncRestockButton(productId);
          return restockBtn;
      }

      function syncRestockButton(productId) {
          if (!restockBtn) return;
          const id = String(productId || restockBtn.dataset.productId || '').trim();
          if (!id) return;
          const active = WatchCenter?.isRestockWatching?.(id);
          restockBtn.classList.toggle('is-active', Boolean(active));
          restockBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
          const text = restockBtn.querySelector?.('.restock-btn__text');
          if (text) text.textContent = active ? '已开启到货提醒' : '到货提醒';
      }
  
      function initShareButton() {
          const btn = ensureShareButton();
          if (!btn) return;
          btn.addEventListener('click', async () => {
              const url = (() => {
                  try { return new URL(window.location.href).toString(); } catch { return window.location.href; }
              })();
  
              const ok = await Utils.copyText(url);
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

      function renderInventory(product) {
          if (!inventoryPanel || !product) return;
          const info = typeof InventoryPulse !== 'undefined' && InventoryPulse.getInfo
              ? InventoryPulse.getInfo(product)
              : null;
          const status = typeof InventoryPulse !== 'undefined' && InventoryPulse.getStatus
              ? InventoryPulse.getStatus(info)
              : null;
          if (!status) return;

          inventoryPanel.style.display = 'flex';
          if (inventoryStatusEl) {
              inventoryStatusEl.textContent = status.label || '库存状态';
              inventoryStatusEl.className = `inventory-status inventory-status--${status.tone || 'in'}`;
          }
          if (inventoryMetaEl) {
              const stockText = Number.isFinite(info?.stock) ? `剩余 ${info.stock} 件` : '库存未知';
              const etaText = info?.preorder && info?.eta ? `预计 ${info.eta}` : '';
              inventoryMetaEl.textContent = [stockText, etaText].filter(Boolean).join(' · ');
          }
          if (addToCartBtn && status.tone === 'out' && !info?.preorder) {
              addToCartBtn.disabled = true;
              addToCartBtn.classList.add('is-disabled');
              addToCartBtn.setAttribute('aria-disabled', 'true');
          } else if (addToCartBtn) {
              addToCartBtn.disabled = false;
              addToCartBtn.classList.remove('is-disabled');
              addToCartBtn.removeAttribute('aria-disabled');
          }
      }

      function renderBundleDeals(product) {
          if (!bundleSection || !bundleList || !product) return;
          const bundles = typeof BundleDeals !== 'undefined' && BundleDeals.getBundlesForProduct
              ? BundleDeals.getBundlesForProduct(product.id)
              : [];
          if (!bundles.length) {
              bundleSection.style.display = 'none';
              bundleList.innerHTML = '';
              return;
          }
          bundleSection.style.display = 'block';
          bundleList.innerHTML = bundles.map((bundle) => `
              <div class="bundle-card">
                  <div class="bundle-card__body">
                      <div class="bundle-card__title">${Utils.escapeHtml(bundle.title || '套装优惠')}</div>
                      <div class="bundle-card__desc text-muted">${Utils.escapeHtml(bundle.subtitle || '')}</div>
                      <div class="bundle-card__items">${(bundle.items || []).map((id) => {
                          const item = SharedData?.getProductById?.(id);
                          return `<span class="bundle-card__item">${Utils.escapeHtml(item?.name || id)}</span>`;
                      }).join('')}</div>
                  </div>
                  <button type="button" class="cta-button bundle-card__action" data-bundle-add="${Utils.escapeHtml(bundle.id || '')}">一键加入套装</button>
              </div>
          `).join('');
      }

      function renderSmartCuration(product) {
          if (!curationSection || !curationGrid || !product) return;
          const picks = typeof SmartCuration !== 'undefined' && SmartCuration.getRecommendations
              ? SmartCuration.getRecommendations({ seedId: product.id, limit: 6 })
              : [];
          if (!picks.length) {
              curationSection.style.display = 'none';
              curationGrid.innerHTML = '';
              return;
          }
          curationSection.style.display = 'block';
          curationGrid.innerHTML = picks.map((item) => {
              const id = String(item.id || '').trim();
              const href = id ? `product-detail.html?id=${encodeURIComponent(id)}` : 'products.html';
              const image = item.images?.[0]?.thumb || 'assets/images/figurine-1.svg';
              const price = Number.isFinite(Number(item.price)) ? Pricing.formatCny(item.price) : '价格待定';
              return `
                  <article class="curation-card">
                      <a href="${href}" class="curation-card__media">
                          <img src="${Utils.escapeHtml(image)}" alt="${Utils.escapeHtml(item.name || '')}" loading="lazy" decoding="async">
                      </a>
                      <div class="curation-card__body">
                          <div class="curation-card__title">${Utils.escapeHtml(item.name || '')}</div>
                          <div class="curation-card__meta text-muted">${Utils.escapeHtml(item.series || '')}</div>
                          <div class="curation-card__price">${price}</div>
                          <button type="button" class="product-card__quick-add" data-product-id="${Utils.escapeHtml(id)}">加入购物车</button>
                      </div>
                  </article>
              `;
          }).join('');
          Favorites?.syncButtons?.(curationGrid);
          Compare?.syncButtons?.(curationGrid);
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
          ensureRestockButton(product.id);
          if (typeof RecentlyViewed !== 'undefined' && RecentlyViewed.record) {
              RecentlyViewed.record(product.id);
          }
          try {
              if (Number.isFinite(Number(product.price))) {
                  StorageKit?.pushPricePoint?.(product.id, Number(product.price));
              }
          } catch {
              // 忽略趋势记录异常
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
                  ratingElement.appendChild(Icons.createSvg('icon-star-filled'));
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
          priceElement.textContent = Number.isFinite(product.price) ? Pricing.formatCny(product.price) : "价格待定";
          if (originalPriceElement) {
              if (product.originalPrice && product.originalPrice > product.price) {
                  originalPriceElement.textContent = Pricing.formatCny(product.originalPrice);
                  originalPriceElement.style.display = 'inline';
              } else {
                  originalPriceElement.style.display = 'none';
              }
          }
          renderInventory(product);
          renderBundleDeals(product);
          renderSmartCuration(product);
  
          // Update Image Gallery (Handle missing thumbnailContainer gracefully)
          if (product.images && product.images.length > 0) {
              mainImage.src = product.images[0].large;
              mainImage.alt = product.images[0].alt || product.name;        
              mainImage.decoding = 'async';
              try { mainImage.dataset.large = product.images[0].large; } catch { /* ignore */ }
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
                        Array.from(template.content.childNodes || []).forEach((child) => walk(child, frag));
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
          try { mainImage.dataset.large = imageData.large; } catch { /* ignore */ }
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
          addToCartBtn.innerHTML = `已添加 ${Icons.svgHtml('icon-check')}`;
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

      function initBundleActions() {
          if (!bundleSection) return;
          bundleSection.addEventListener('click', (event) => {
              const btn = event?.target?.closest?.('[data-bundle-add]');
              if (!btn) return;
              const bundleId = btn.dataset.bundleAdd;
              if (!bundleId) return;
              const result = BundleDeals?.addBundle?.(bundleId);
              if (result?.ok && typeof Toast !== 'undefined' && Toast.show) {
                  Toast.show('已加入套装商品', 'success', 1800);
              } else if (!result?.ok && typeof Toast !== 'undefined' && Toast.show) {
                  Toast.show(result?.reason || '套装加入失败', 'info', 1800);
              }
          });
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
              initBundleActions();
              initLightbox();
          } else {
              console.error("PDP module initialization failed due to population errors.");
          }
      }
  
      return { init: init };
  })();
  
  // ==============================================

  try { PDP.init(); } catch (e) { console.warn('Page module init failed: product-detail.js', e); }
  try { RecentlyViewed.init(); } catch (e) { console.warn('Page module init failed: product-detail.js', e); }
}
