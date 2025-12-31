/* Page Module
   - 按页代码分割：仅在目标页面 init() 触发时创建模块（避免 scripts/main.js 单体膨胀）
   - 运行时依赖通过 init(ctx) 注入：兼容根目录部署 ?v= 缓存穿透与 Vite 构建
*/

let OrdersPage = null;
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

  // Orders Page Module (orders.html)
  // ==============================================
  OrdersPage = (function() {
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
                  const ok = await Utils.copyText(copyBtn.dataset.orderId);
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

  try { OrdersPage.init(); } catch (e) { console.warn('Page module init failed: orders.js', e); }
}
