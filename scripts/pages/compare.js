/* Page Module
   - 按页代码分割：仅在目标页面 init() 触发时创建模块（避免 scripts/main.js 单体膨胀）
   - 运行时依赖通过 init(ctx) 注入：兼容根目录部署 ?v= 缓存穿透与 Vite 构建
*/

let ComparePage = null;
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

  // Compare Page Module (compare.html)
  // ==============================================
  ComparePage = (function() {
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

  try { ComparePage.init(); } catch (e) { console.warn('Page module init failed: compare.js', e); }
}
