/* Page Module
   - 按页代码分割：仅在目标页面 init() 触发时创建模块（避免 scripts/main.js 单体膨胀）
   - 运行时依赖通过 init(ctx) 注入：兼容根目录部署 ?v= 缓存穿透与 Vite 构建
*/

let ProductListing = null;
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
    Seo,
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
  } = ctx;

  // Product Listing / Category / Search Results Module (Modified to use SharedData)
  // ==============================================
  ProductListing = (function(){
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
              ? `<span class="product-card__rating">${Icons.svgHtml('icon-star-filled')}${ratingValue.toFixed(1)}${Number.isFinite(reviewCount) && reviewCount > 0 ? `<small>(${reviewCount})</small>` : ''}</span>`
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
          const inventoryStatus = typeof InventoryPulse !== 'undefined' && InventoryPulse.getStatus
              ? InventoryPulse.getStatus(InventoryPulse.getInfo?.(safeProduct))
              : null;
          if (inventoryStatus?.tone === 'low') {
              badges.push('<span class="product-card__badge product-card__badge--stock-low">库存紧张</span>');
          } else if (inventoryStatus?.tone === 'out') {
              badges.push('<span class="product-card__badge product-card__badge--stock-out">暂时缺货</span>');
          } else if (inventoryStatus?.tone === 'preorder') {
              badges.push('<span class="product-card__badge product-card__badge--preorder">预售中</span>');
          }
          const bundleHints = typeof BundleDeals !== 'undefined' && BundleDeals.getBundlesForProduct
              ? BundleDeals.getBundlesForProduct(id).length
              : 0;
          if (bundleHints > 0) {
              badges.push('<span class="product-card__badge product-card__badge--bundle">套装</span>');
          }
  
          const badgesHTML = badges.length > 0 ? `<div class="product-card__badges">${badges.join('')}</div>` : '';
          const favBtnHTML = id !== '#'
              ? `<button class="favorite-btn" type="button" data-product-id="${safeIdAttr}" aria-label="加入收藏" aria-pressed="false">
                      ${Icons.svgHtml('icon-heart')}
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
      const advancedFilterToggle = listingContainer.querySelector('.filter-toggle');
      const sortStorageKey = 'plpSort';
      const filterStorageKey = 'plpFilter';
      const viewStorageKey = 'plpViewMode';
      const advancedFilterStorageKey = 'plpFiltersV2';
  
      const defaultAdvancedFilters = Object.freeze({
          categories: [],
          tags: [],
          status: [],
          rarity: [],
          priceMin: null,
          priceMax: null,
          ratingMin: null,
      });
  
      const advancedFilterAtom =
          typeof StateHub !== 'undefined' && StateHub.atom
              ? StateHub.atom(advancedFilterStorageKey, defaultAdvancedFilters, { scope: 'plpFiltersV2' })
              : null;
  
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
      let hasRenderedOnce = false;
      let advancedFilters = defaultAdvancedFilters;
      let filterDialog = null;
      let lastPrefetchProductId = '';
      let allProductsCache = [];
      let baseTitle = '';
      let stressCount = 0; // URL 参数：?stress=100000（仅用于性能压测/演示）
      let forceVirtual = false; // URL 参数：?virtual=1（强制列表虚拟化）
  
      function clampStressCount(raw) {
          const clamp = globalThis.ShouwbanCore?.clampInt;
          if (typeof clamp === 'function') {
              return clamp(raw, { min: 0, max: 100000, fallback: 0 });
          }
          const n = Number.parseInt(String(raw ?? ''), 10);
          if (!Number.isFinite(n)) return 0;
          return Math.max(0, Math.min(100000, n));
      }
  
      function destroyVirtualList() {
          try {
              if (typeof VirtualScroll !== 'undefined' && typeof VirtualScroll.destroy === 'function') {
                  VirtualScroll.destroy(productGrid);
              }
          } catch {
              // ignore
          }
      }
  
      function hydrateVirtualImages(root) {
          const host = root && root.nodeType === 1 ? root : null;
          if (!host) return;
          host.querySelectorAll('img[data-src]').forEach((img) => {
              const src = img.getAttribute('data-src');
              if (!src) return;
              img.src = src;
              img.removeAttribute('data-src');
              img.classList.remove('lazyload');
          });
      }
  
      function measureListCardHeight(sampleProduct) {
          if (!productGrid) return 280;
          let marker = null;
          try {
              marker = document.createElement('div');
              marker.style.position = 'absolute';
              marker.style.visibility = 'hidden';
              marker.style.pointerEvents = 'none';
              marker.style.left = '0';
              marker.style.right = '0';
              marker.style.top = '0';
              marker.innerHTML = createProductCardHTML(sampleProduct);
              productGrid.appendChild(marker);
  
              const card = marker.querySelector('.product-card') || marker.firstElementChild;
              const rect = card ? card.getBoundingClientRect() : marker.getBoundingClientRect();
              const h = Math.round(rect.height);
              marker.remove();
              return Math.max(180, Math.min(560, Number.isFinite(h) ? h : 280));
          } catch {
              try { marker?.remove?.(); } catch { /* ignore */ }
              return 280;
          }
      }
  
      function getStressProduct(index) {
          const list = Array.isArray(allProductsCache) ? allProductsCache : [];
          if (list.length === 0) return null;
          const i = Math.max(0, Number(index) || 0);
          const base = list[i % list.length];
          if (!base) return null;
          const baseId = String(base.id || '').trim() || 'P000';
          // __S 后缀由 SharedData.getProductById() 统一映射回基础商品
          return { ...base, id: `${baseId}__S${i}` };
      }
  
      function mountVirtualList({ itemCount, getItem } = {}) {
          if (!productGrid) return;
          if (typeof VirtualScroll === 'undefined' || typeof VirtualScroll.mountList !== 'function') return;
  
          const clamp = globalThis.ShouwbanCore?.clampInt;
          const count = typeof clamp === 'function'
              ? clamp(itemCount, { min: 0, max: 100000, fallback: 0 })
              : Math.max(0, Math.min(100000, Number(itemCount) || 0));
  
          const getter = typeof getItem === 'function' ? getItem : () => null;
          if (count <= 0) {
              destroyVirtualList();
              productGrid.innerHTML = '';
              return;
          }
  
          destroyVirtualList();
          productGrid.setAttribute('aria-busy', 'true');
          productGrid.innerHTML = '';
  
          const sample = getter(0);
          const rowH = measureListCardHeight(sample);
  
          VirtualScroll.mountList({
              container: productGrid,
              itemCount: count,
              getItem: getter,
              itemHeight: rowH,
              gap: 18,
              overscan: 10,
              maxPoolSize: 220,
              renderItem: (row, product) => {
                  if (!row) return;
                  row.innerHTML = product ? createProductCardHTML(product) : '';
                  hydrateVirtualImages(row);
                  Favorites?.syncButtons?.(row);
                  Compare?.syncButtons?.(row);
                  PriceAlerts?.syncButtons?.(row);
              },
          });
  
          productGrid.setAttribute('aria-busy', 'false');
      }
  
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
  
      function normalizePickList(value, allowed) {
          const allow = new Set(Array.isArray(allowed) ? allowed : []);
          const list = Utils.normalizeStringArray(Array.isArray(value) ? value : []);
          return Array.from(new Set(list.filter((x) => allow.has(x))));
      }
  
      function normalizeNumberOrNull(value, { min = 0, max = 999999 } = {}) {
          const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
          if (!Number.isFinite(n)) return null;
          const clamped = Math.min(max, Math.max(min, n));
          return clamped;
      }
  
      function normalizeAdvancedFilters(raw) {
          const obj = raw && typeof raw === 'object' ? raw : {};
          const categories = normalizePickList(obj.categories, ['scale', 'nendoroid', 'figma', 'other']);
          const tags = normalizePickList(obj.tags, ['hot', 'limited', 'preorder']);
          const status = normalizePickList(obj.status, ['预售', '现货']);
          const rarity = normalizePickList(obj.rarity, ['限定', '常规']);
          const priceMin = normalizeNumberOrNull(obj.priceMin, { min: 0, max: 999999 });
          const priceMax = normalizeNumberOrNull(obj.priceMax, { min: 0, max: 999999 });
          const ratingMin = normalizeNumberOrNull(obj.ratingMin, { min: 0, max: 5 });
  
          // 价格区间纠偏：min > max 时交换，避免 UI 输入导致“无结果”
          if (Number.isFinite(priceMin) && Number.isFinite(priceMax) && priceMin > priceMax) {
              return { categories, tags, status, rarity, priceMin: priceMax, priceMax: priceMin, ratingMin };
          }
  
          return { categories, tags, status, rarity, priceMin, priceMax, ratingMin };
      }
  
      function isAdvancedFiltersActive(filters) {
          const f = filters && typeof filters === 'object' ? filters : defaultAdvancedFilters;
          if (Array.isArray(f.categories) && f.categories.length > 0) return true;
          if (Array.isArray(f.tags) && f.tags.length > 0) return true;
          if (Array.isArray(f.status) && f.status.length > 0) return true;
          if (Array.isArray(f.rarity) && f.rarity.length > 0) return true;
          if (Number.isFinite(Number(f.priceMin)) || Number.isFinite(Number(f.priceMax))) return true;
          if (Number.isFinite(Number(f.ratingMin))) return true;
          return false;
      }
  
      function setAdvancedFilters(next, options = {}) {
          const opts = options && typeof options === 'object' ? options : {};
          advancedFilters = normalizeAdvancedFilters(next);
          try { advancedFilterAtom?.set?.(advancedFilters, opts); } catch { /* ignore */ }
          updateActiveFilterPills(getSortLabel(currentSort), getFilterLabel(currentFilter));
      }
  
      function updateListingMeta(total) {
          if (!listingSummary) return;
          const safeTotal = Number.isFinite(total) ? total : 0;
          const sortLabel = getSortLabel(currentSort);
          const filterLabel = getFilterLabel(currentFilter);
          const advLabel = isAdvancedFiltersActive(advancedFilters) ? ' · 多级筛选' : '';
          listingSummary.textContent = `共 ${safeTotal} 件藏品 · ${sortLabel} · ${filterLabel}${advLabel}`;
          updateActiveFilterPills(sortLabel, filterLabel);
      }
  
      function updateActiveFilterPills(sortLabel, filterLabel) {
          if (!activeFiltersContainer) return;
          const pills = [];
          if (currentFilter && currentFilter !== 'all') {
              pills.push(`<span class="filter-pill filter-pill--accent">快速：${Utils.escapeHtml(filterLabel)}</span>`);
          }
  
          // 多级筛选 pills（OR within group, AND across groups）
          const f = advancedFilters && typeof advancedFilters === 'object' ? advancedFilters : defaultAdvancedFilters;
          const tagMap = { hot: '热门', limited: '限定', preorder: '预售' };
  
          const categoryName = (key) => {
              try {
                  if (typeof SharedData !== 'undefined' && typeof SharedData.getCategoryName === 'function') {
                      return SharedData.getCategoryName(key);
                  }
              } catch {
                  // ignore
              }
              const map = { scale: '比例手办', nendoroid: '粘土人', figma: 'Figma', other: '其他手办' };
              return map[key] || key;
          };
  
          const formatMoney = (value) => {
              const n = Number(value);
              if (!Number.isFinite(n)) return '';
              try {
                  if (typeof Pricing !== 'undefined' && typeof Pricing.formatCny === 'function') {
                      return Pricing.formatCny(n);
                  }
              } catch {
                  // ignore
              }
              return `￥${n.toFixed(2)}`;
          };
  
          (f.categories || []).forEach((key) => {
              pills.push(`<span class="filter-pill">分类：${Utils.escapeHtml(categoryName(key))}</span>`);
          });
  
          (f.tags || []).forEach((key) => {
              const label = tagMap[key] || key;
              pills.push(`<span class="filter-pill">标签：${Utils.escapeHtml(label)}</span>`);
          });
  
          (f.status || []).forEach((key) => {
              pills.push(`<span class="filter-pill">状态：${Utils.escapeHtml(key)}</span>`);
          });
  
          (f.rarity || []).forEach((key) => {
              pills.push(`<span class="filter-pill">稀有：${Utils.escapeHtml(key)}</span>`);
          });
  
          const hasMin = Number.isFinite(Number(f.priceMin));
          const hasMax = Number.isFinite(Number(f.priceMax));
          if (hasMin || hasMax) {
              const minText = hasMin ? formatMoney(f.priceMin) : '不限';
              const maxText = hasMax ? formatMoney(f.priceMax) : '不限';
              pills.push(`<span class="filter-pill">价格：${Utils.escapeHtml(`${minText} - ${maxText}`)}</span>`);
          }
  
          if (Number.isFinite(Number(f.ratingMin))) {
              pills.push(`<span class="filter-pill">评分：≥${Utils.escapeHtml(String(Number(f.ratingMin).toFixed(1)))}</span>`);
          }
  
          if (currentSort && currentSort !== 'default') {
              pills.push(`<span class="filter-pill">排序：${Utils.escapeHtml(sortLabel)}</span>`);
          }
          if (currentView && currentView !== 'grid') {
              const viewLabel = currentView === 'list' ? '列表视图' : '网格视图';
              pills.push(`<span class="filter-pill">视图：${Utils.escapeHtml(viewLabel)}</span>`);
          }
  
          // 防止 pills 过多撑爆布局：最多显示 8 个
          const maxPills = 8;
          if (pills.length > maxPills) {
              const more = pills.length - (maxPills - 1);
              const head = pills.slice(0, maxPills - 1);
              head.push(`<span class="filter-pill">+${Utils.escapeHtml(String(more))}</span>`);
              activeFiltersContainer.innerHTML = head.join('');
              return;
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
          setAdvancedFilters(defaultAdvancedFilters, { silent: true });
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
  
      // --- Advanced Filter Dialog (多级智能筛选引擎 UI) ---
      function ensureFilterDialog() {
          if (filterDialog) return filterDialog;
          if (!document.body) return null;
  
          const categoryName = (key) => {
              try {
                  if (typeof SharedData !== 'undefined' && typeof SharedData.getCategoryName === 'function') {
                      return SharedData.getCategoryName(key);
                  }
              } catch {
                  // ignore
              }
              const map = { scale: '比例手办', nendoroid: '粘土人', figma: 'Figma', other: '其他手办' };
              return map[key] || key;
          };
  
          const dialog = document.createElement('dialog');
          dialog.className = 'glass-dialog filter-dialog';
          dialog.setAttribute('aria-label', '高级筛选');
          dialog.innerHTML = `
            <div class="glass-dialog__card filter-dialog__card">
                <div class="glass-dialog__header">
                    <h3 class="glass-dialog__title">多级智能筛选</h3>
                    <p class="glass-dialog__subtitle text-muted">分类 · 标签 · 价格 · 评分 · 状态（实时预览）</p>
                </div>
                <div class="filter-dialog__content">
                    <div class="filter-section">
                        <h4 class="filter-section__title">分类</h4>
                        <div class="filter-options">
                            ${['scale', 'nendoroid', 'figma', 'other'].map((key) => `
                                <label class="filter-option">
                                    <input type="checkbox" name="adv-category" value="${Utils.escapeHtml(key)}" />
                                    <span>${Utils.escapeHtml(categoryName(key))}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
  
                    <div class="filter-section">
                        <h4 class="filter-section__title">标签</h4>
                        <div class="filter-options">
                            ${[
                                { key: 'hot', label: '热门' },
                                { key: 'limited', label: '限定' },
                                { key: 'preorder', label: '预售' },
                            ].map((item) => `
                                <label class="filter-option">
                                    <input type="checkbox" name="adv-tag" value="${Utils.escapeHtml(item.key)}" />
                                    <span>${Utils.escapeHtml(item.label)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
  
                    <div class="filter-section">
                        <h4 class="filter-section__title">状态 / 稀有度</h4>
                        <div class="filter-options">
                            ${['预售', '现货'].map((label) => `
                                <label class="filter-option">
                                    <input type="checkbox" name="adv-status" value="${Utils.escapeHtml(label)}" />
                                    <span>${Utils.escapeHtml(label)}</span>
                                </label>
                            `).join('')}
                            ${['限定', '常规'].map((label) => `
                                <label class="filter-option">
                                    <input type="checkbox" name="adv-rarity" value="${Utils.escapeHtml(label)}" />
                                    <span>${Utils.escapeHtml(label)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
  
                    <div class="filter-section">
                        <h4 class="filter-section__title">价格区间（￥）</h4>
                        <div class="filter-range">
                            <input class="glass-dialog__input" type="number" inputmode="decimal" placeholder="最低价" min="0" step="1" data-filter-field="priceMin" />
                            <span class="filter-range__sep">—</span>
                            <input class="glass-dialog__input" type="number" inputmode="decimal" placeholder="最高价" min="0" step="1" data-filter-field="priceMax" />
                        </div>
                    </div>
  
                    <div class="filter-section">
                        <h4 class="filter-section__title">最低评分</h4>
                        <select class="glass-dialog__input" data-filter-field="ratingMin" aria-label="最低评分">
                            <option value="">不限</option>
                            <option value="4.0">4.0+</option>
                            <option value="4.5">4.5+</option>
                            <option value="4.8">4.8+</option>
                        </select>
                    </div>
  
                    <div class="filter-dialog__preview text-muted">
                        符合条件：<strong data-filter-preview-count>0</strong> 件
                    </div>
                </div>
                <div class="glass-dialog__actions filter-dialog__actions">
                    <button type="button" class="cta-button-secondary" data-filter-reset>重置</button>
                    <button type="button" class="cta-button-secondary" data-filter-close>关闭</button>
                    <button type="button" class="cta-button" data-filter-apply>应用</button>
                </div>
            </div>
          `;
  
          document.body.appendChild(dialog);
          filterDialog = dialog;
  
          // 点击遮罩关闭（对话框本体作为 backdrop 点击）
          dialog.addEventListener('click', (event) => {
              if (event.target === dialog) {
                  try { dialog.close(); } catch { /* ignore */ }
              }
          });
  
          const updatePreviewDebounced = Utils.debounce(() => updateFilterDialogPreview(), 80);
          dialog.addEventListener('input', updatePreviewDebounced);
  
          dialog.addEventListener('click', (event) => {
              const applyBtn = event.target?.closest?.('[data-filter-apply]');
              const resetBtn = event.target?.closest?.('[data-filter-reset]');
              const closeBtn = event.target?.closest?.('[data-filter-close]');
  
              if (closeBtn) {
                  try { dialog.close(); } catch { /* ignore */ }
                  return;
              }
  
              if (resetBtn) {
                  setAdvancedFilters(defaultAdvancedFilters, { silent: false });
                  syncFilterDialogFromState();
                  updateFilterDialogPreview();
                  currentPage = 1;
                  renderPage();
                  Telemetry?.track?.('filters_reset', { scope: 'plp' });
                  Utils.dispatch('toast:show', { message: '已重置高级筛选', type: 'info', durationMs: 1600 });
                  return;
              }
  
              if (applyBtn) {
                  const next = readFilterDialogState();
                  setAdvancedFilters(next, { silent: false });
                  currentPage = 1;
                  renderPage();
                  Telemetry?.track?.('filters_apply', { scope: 'plp', active: isAdvancedFiltersActive(next) ? 1 : 0 });
                  Utils.dispatch('toast:show', { message: '已应用高级筛选', type: 'success', durationMs: 1600 });
                  try { dialog.close(); } catch { /* ignore */ }
              }
          });
  
          return filterDialog;
      }
  
      function readFilterDialogState() {
          const dlg = ensureFilterDialog();
          if (!dlg) return defaultAdvancedFilters;
  
          const pickChecked = (name) =>
              Array.from(dlg.querySelectorAll(`input[name="${name}"]:checked`)).map((el) => el.value);
  
          const priceMin = dlg.querySelector('[data-filter-field="priceMin"]')?.value ?? '';
          const priceMax = dlg.querySelector('[data-filter-field="priceMax"]')?.value ?? '';
          const ratingMin = dlg.querySelector('[data-filter-field="ratingMin"]')?.value ?? '';
  
          return normalizeAdvancedFilters({
              categories: pickChecked('adv-category'),
              tags: pickChecked('adv-tag'),
              status: pickChecked('adv-status'),
              rarity: pickChecked('adv-rarity'),
              priceMin,
              priceMax,
              ratingMin,
          });
      }
  
      function syncFilterDialogFromState() {
          const dlg = ensureFilterDialog();
          if (!dlg) return false;
          const f = advancedFilters && typeof advancedFilters === 'object' ? advancedFilters : defaultAdvancedFilters;
  
          const setGroup = (name, values) => {
              const set = new Set(Array.isArray(values) ? values : []);
              dlg.querySelectorAll(`input[name="${name}"]`).forEach((el) => {
                  try { el.checked = set.has(el.value); } catch { /* ignore */ }
              });
          };
  
          setGroup('adv-category', f.categories);
          setGroup('adv-tag', f.tags);
          setGroup('adv-status', f.status);
          setGroup('adv-rarity', f.rarity);
  
          const minEl = dlg.querySelector('[data-filter-field="priceMin"]');
          const maxEl = dlg.querySelector('[data-filter-field="priceMax"]');
          const ratingEl = dlg.querySelector('[data-filter-field="ratingMin"]');
  
          if (minEl) minEl.value = Number.isFinite(Number(f.priceMin)) ? String(Number(f.priceMin)) : '';
          if (maxEl) maxEl.value = Number.isFinite(Number(f.priceMax)) ? String(Number(f.priceMax)) : '';
          if (ratingEl) ratingEl.value = Number.isFinite(Number(f.ratingMin)) ? String(Number(f.ratingMin)) : '';
          return true;
      }
  
      function updateFilterDialogPreview() {
          const dlg = ensureFilterDialog();
          if (!dlg) return false;
  
          const next = readFilterDialogState();
          const list = filterProductsWith(currentProducts, currentFilter, next);
          const countEl = dlg.querySelector('[data-filter-preview-count]');
          if (countEl) countEl.textContent = String(list.length);
          return true;
      }
  
      function openFilterDialog() {
          const dlg = ensureFilterDialog();
          if (!dlg) return;
          syncFilterDialogFromState();
          updateFilterDialogPreview();
          try {
              if (!dlg.open) dlg.showModal();
          } catch {
              // ignore
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
  
      function filterProductsWith(products, quickKey, adv) {
          const base = Array.isArray(products) ? products : [];
          const quick = String(quickKey || 'all').trim() || 'all';
          const f = adv && typeof adv === 'object' ? adv : defaultAdvancedFilters;
  
          // 1) 快速筛选（兼容旧逻辑）
          const quickApplied =
              quick === 'all'
                  ? base
                  : base.filter((product) => {
                      const tags = Array.isArray(product?.tags) ? product.tags : [];
                      if (quick === 'hot') return tags.includes('hot');
                      if (quick === 'limited') return tags.includes('limited') || product?.rarity === '限定';
                      if (quick === 'preorder') return tags.includes('preorder') || product?.status === '预售';
                      return true;
                  });
  
          // 2) 多级筛选（AND across groups, OR within group）
          if (!isAdvancedFiltersActive(f)) return quickApplied;
  
          return quickApplied.filter((product) => {
              const p = product || {};
              const categoryKey = String(p.category?.key || '').trim();
              const tags = Array.isArray(p.tags) ? p.tags : [];
              const status = String(p.status || '').trim();
              const rarity = String(p.rarity || '').trim();
              const price = Number(p.price);
              const rating = Number(p.rating);
  
              if (Array.isArray(f.categories) && f.categories.length > 0) {
                  if (!categoryKey || !f.categories.includes(categoryKey)) return false;
              }
  
              if (Array.isArray(f.tags) && f.tags.length > 0) {
                  const ok = f.tags.some((t) => tags.includes(t));
                  if (!ok) return false;
              }
  
              if (Array.isArray(f.status) && f.status.length > 0) {
                  if (!status || !f.status.includes(status)) return false;
              }
  
              if (Array.isArray(f.rarity) && f.rarity.length > 0) {
                  if (!rarity || !f.rarity.includes(rarity)) return false;
              }
  
              if (Number.isFinite(Number(f.priceMin))) {
                  const v = Number.isFinite(price) ? price : 0;
                  if (v < Number(f.priceMin)) return false;
              }
  
              if (Number.isFinite(Number(f.priceMax))) {
                  const v = Number.isFinite(price) ? price : 0;
                  if (v > Number(f.priceMax)) return false;
              }
  
              if (Number.isFinite(Number(f.ratingMin))) {
                  const v = Number.isFinite(rating) ? rating : 0;
                  if (v < Number(f.ratingMin)) return false;
              }
  
              return true;
          });
      }
  
      function applyFilter(products) {
          return filterProductsWith(products, currentFilter, advancedFilters);
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
  
      function upsertPlpBreadcrumbJsonLd() {
          try {
              const upsertJsonLd = (id, data) => {
                  try {
                      if (typeof Seo?.upsertJsonLd === 'function') return Seo.upsertJsonLd(id, data);
                      const existing = document.getElementById(String(id || ''));
                      existing?.remove();
                      const script = document.createElement('script');
                      script.type = 'application/ld+json';
                      script.id = String(id || '');
                      script.textContent = JSON.stringify(JSON.parse(JSON.stringify(data ?? {})));
                      document.head.appendChild(script);
                      return true;
                  } catch {
                      return false;
                  }
              };

              const baseUrl = (() => {
                  try {
                      const u = new URL(window.location.href);
                      u.hash = '';
                      return u.toString();
                  } catch {
                      return '';
                  }
              })();
              if (!baseUrl) return;

              const canonicalBase = (() => {
                  try {
                      if (typeof Seo?.canonicalizeHref === 'function') {
                          return Seo.canonicalizeHref(baseUrl, baseUrl) || baseUrl;
                      }
                      return baseUrl;
                  } catch {
                      return baseUrl;
                  }
              })();

              const resolveUrl = (relative) => {
                  const rel = String(relative || '').trim();
                  if (!rel) return '';
                  try {
                      if (typeof Seo?.canonicalizeHref === 'function') {
                          const out = Seo.canonicalizeHref(rel, canonicalBase);
                          if (out) return out;
                      }
                  } catch {
                      // ignore
                  }
                  try {
                      const u = new URL(rel, canonicalBase);
                      u.hash = '';
                      return u.toString();
                  } catch {
                      return '';
                  }
              };

              const items = [];
              items.push({ name: '首页', item: resolveUrl('index.html') });

              const categoryNames =
                  (typeof SharedData !== 'undefined' && SharedData.getCategoryName)
                      ? SharedData.getCategoryName
                      : (key) => key;

              if (pageMode === 'category') {
                  const key = String(currentCategory || '').trim();
                  const name = String(categoryNames(key) || '').trim();
                  items.push({ name: '所有手办', item: resolveUrl('products.html') });
                  items.push({
                      name: name || '分类',
                      item: resolveUrl(`category.html?cat=${encodeURIComponent(key)}`) || baseUrl,
                  });
              } else if (pageMode === 'search') {
                  items.push({ name: '搜索结果', item: baseUrl });
              } else if (pageMode === 'favorites') {
                  items.push({ name: '所有手办', item: resolveUrl('products.html') });
                  items.push({ name: '我的收藏', item: resolveUrl('favorites.html') || baseUrl });
              } else {
                  const allName = String(categoryNames('all') || '所有手办').trim();
                  items.push({ name: allName, item: resolveUrl('products.html') || baseUrl });
              }

              const list = items
                  .filter((x) => x && x.item && x.name)
                  .map((x, idx) => ({
                      '@type': 'ListItem',
                      position: idx + 1,
                      name: String(x.name),
                      item: String(x.item),
                  }));
              if (list.length === 0) return;

              const data = {
                  '@context': 'https://schema.org',
                  '@type': 'BreadcrumbList',
                  itemListElement: list,
              };

              upsertJsonLd('plp-breadcrumbs-jsonld', data);
          } catch {
              // SEO 增强失败不影响页面主流程
          }
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
          upsertPlpBreadcrumbJsonLd();
      }
  
      // --- Render Page --- (Keep existing)
      function renderPage(options = {}) {
           const opts = options && typeof options === 'object' ? options : {};
           if (!opts.skipSkeleton && !hasRenderedOnce && stressCount <= 0 && productGrid && typeof Skeleton !== 'undefined' && Skeleton.withGridSkeleton) {
               hasRenderedOnce = true;
               Skeleton.withGridSkeleton(productGrid, () => renderPage({ skipSkeleton: true }), { count: itemsPerPage });
               return;
           }
           hasRenderedOnce = true;
  
           if (stressCount > 0 && currentView === 'list') {
               UXMotion.withViewTransition(() => {
                   mountVirtualList({ itemCount: stressCount, getItem: getStressProduct });
                   if (paginationContainer) paginationContainer.innerHTML = '';
                   updateBreadcrumbs();
                   updateTitleCount(stressCount);
                   updateListingMeta(stressCount);
               });
               return;
           }
  
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
      function upsertItemListJsonLd(productsToRender) {
          try {
              const upsertJsonLd = (id, data) => {
                  try {
                      if (typeof Seo?.upsertJsonLd === 'function') return Seo.upsertJsonLd(id, data);
                      const existing = document.getElementById(String(id || ''));
                      existing?.remove();
                      const script = document.createElement('script');
                      script.type = 'application/ld+json';
                      script.id = String(id || '');
                      script.textContent = JSON.stringify(JSON.parse(JSON.stringify(data ?? {})));
                      document.head.appendChild(script);
                      return true;
                  } catch {
                      return false;
                  }
              };

              const list = Array.isArray(productsToRender) ? productsToRender : [];
              if (list.length === 0) return;

              const baseUrl = (() => {
                  try {
                      const u = new URL(window.location.href);
                      u.hash = '';
                      return u.toString();
                  } catch {
                      return '';
                  }
              })();
              if (!baseUrl) return;

              const canonicalBase = (() => {
                  try {
                      if (typeof Seo?.canonicalizeHref === 'function') {
                          return Seo.canonicalizeHref(baseUrl, baseUrl) || baseUrl;
                      }
                      return baseUrl;
                  } catch {
                      return baseUrl;
                  }
              })();

              const resolveUrl = (relative) => {
                  const rel = String(relative || '').trim();
                  if (!rel) return '';
                  try {
                      if (typeof Seo?.canonicalizeHref === 'function') {
                          const out = Seo.canonicalizeHref(rel, canonicalBase);
                          if (out) return out;
                      }
                  } catch {
                      // ignore
                  }
                  try {
                      const u = new URL(rel, canonicalBase);
                      u.hash = '';
                      return u.toString();
                  } catch {
                      return '';
                  }
              };

              const maxItems = 60;
              const items = list.slice(0, maxItems).map((product, idx) => {
                  const id = String(product?.id || '').trim();
                  if (!id) return null;
                  const url = resolveUrl(`product-detail.html?id=${encodeURIComponent(id)}`);
                  const name = String(product?.name || id).trim();
                  if (!url || !name) return null;
                  return { '@type': 'ListItem', position: idx + 1, url, name };
              }).filter(Boolean);

              if (items.length === 0) return;

              const data = {
                  '@context': 'https://schema.org',
                  '@type': 'ItemList',
                  numberOfItems: items.length,
                  itemListElement: items,
              };

              upsertJsonLd('itemlist-jsonld', data);
          } catch {
              // SEO 增强失败不影响页面主流程
          }
      }

      function renderProducts(productsToRender) {
            // ... (no changes needed here)
             if (!productGrid) return;
           destroyVirtualList();

           const list = Array.isArray(productsToRender) ? productsToRender : [];
           upsertItemListJsonLd(list);
           if (forceVirtual && currentView === 'list' && list.length > 60) {
               mountVirtualList({ itemCount: list.length, getItem: (i) => list[i] });
               return;
           }
  
          productGrid.setAttribute('aria-busy', 'true');
          productGrid.innerHTML = '';
          if (list.length === 0) {
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
              if (currentFilter !== 'all' || isAdvancedFiltersActive(advancedFilters)) {
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
              productGrid.innerHTML = list.map((product) => createProductCardHTML(product)).join('');
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
  
          if (advancedFilterToggle) {
              advancedFilterToggle.addEventListener('click', () => {
                  openFilterDialog();
                  Telemetry?.track?.('filters_open', { scope: 'plp' });
              });
          }
  
          // Hover/指针预取：提升“列表 -> 详情”跳转首屏速度
          if (productGrid) {
              productGrid.addEventListener(
                  'pointerover',
                  (event) => {
                      const card = event.target?.closest?.('.product-card[data-product-id]');
                      const id = String(card?.dataset?.productId || '').trim();
                      if (!id || id === '#' || id === lastPrefetchProductId) return;
                      lastPrefetchProductId = id;
                      try { Prefetch?.prefetchProduct?.(id); } catch { /* ignore */ }
                  },
                  { passive: true },
              );
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
          const stressParam = urlParams.get('stress') || urlParams.get('stressCount');
          const virtualParam = urlParams.get('virtual');
          let title = categoryNames('all');
          currentProducts = [...allProducts];
          pageMode = 'all';
          currentCategory = 'all';
          forceVirtual = virtualParam === '1';
  
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
  
          // 性能压测模式：仅在“所有商品”页启用（避免影响收藏/搜索/分类的真实体验）
          const nextStress = pageMode === 'all' ? clampStressCount(stressParam) : 0;
          stressCount = nextStress;
          if (stressCount > 0) forceVirtual = true;
  
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
  
          // stress 模式强制列表视图，并禁用会导致 O(n log n) 重排的控件（避免误把“排序耗时”当成“虚拟滚动掉帧”）
          if (stressCount > 0) {
              currentView = 'list';
              applyViewMode('list', { silent: true });
  
              try { if (paginationContainer) paginationContainer.style.display = 'none'; } catch { /* ignore */ }
              try { if (sortSelect) sortSelect.disabled = true; } catch { /* ignore */ }
              try { if (resetListingBtn) resetListingBtn.disabled = true; } catch { /* ignore */ }
              try {
                  filterButtons?.forEach?.((btn) => {
                      btn.disabled = true;
                      btn.setAttribute('aria-disabled', 'true');
                  });
              } catch { /* ignore */ }
              try {
                  viewToggleButtons?.forEach?.((btn) => {
                      btn.disabled = true;
                      btn.setAttribute('aria-disabled', 'true');
                  });
              } catch { /* ignore */ }
  
              if (typeof Toast !== 'undefined' && Toast.show) {
                  Toast.show(`性能压测模式已启用：${stressCount} 条（虚拟滚动）`, 'info', 2200);
              }
          } else {
              try { if (paginationContainer) paginationContainer.style.display = ''; } catch { /* ignore */ }
              try { if (sortSelect) sortSelect.disabled = false; } catch { /* ignore */ }
              try { if (resetListingBtn) resetListingBtn.disabled = false; } catch { /* ignore */ }
              try {
                  filterButtons?.forEach?.((btn) => {
                      btn.disabled = false;
                      btn.removeAttribute('aria-disabled');
                  });
              } catch { /* ignore */ }
              try {
                  viewToggleButtons?.forEach?.((btn) => {
                      btn.disabled = false;
                      btn.removeAttribute('aria-disabled');
                  });
              } catch { /* ignore */ }
          }
          if (filterButtons && filterButtons.length > 0) {
              try {
                  const storedFilter = localStorage.getItem(filterStorageKey);
                  if (storedFilter) currentFilter = storedFilter;
              } catch { /* ignore */ }
              syncFilterButtons();
          }
  
          // 读取多级筛选（V2）
          try {
              const stored = advancedFilterAtom?.get?.();
              advancedFilters = normalizeAdvancedFilters(stored);
          } catch {
              advancedFilters = defaultAdvancedFilters;
          }
  
          // 其他标签页/模块更新筛选时同步（例如未来接入跨页面筛选面板）
          try {
              window.addEventListener('plpFiltersV2:changed', () => {
                  advancedFilters = normalizeAdvancedFilters(advancedFilterAtom?.get?.());
                  currentPage = 1;
                  renderPage();
              });
          } catch {
              // ignore
          }
  
          updateFilterCounts(currentProducts);
          renderPage();
          addEventListeners();
      }
  
      return { init: init, createProductCardHTML };
  })();
  
  // ==============================================

  try { ProductListing.init(); } catch (e) { console.warn('Page module init failed: product-listing.js', e); }
}
