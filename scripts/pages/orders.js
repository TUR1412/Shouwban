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
    OrderJourney,
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

              const pricingRows = [];
              if (Number.isFinite(pricing.subtotal)) {
                  pricingRows.push({ label: '商品小计', value: Pricing.formatCny(pricing.subtotal) });
              }
              if (Number(pricing.discount) > 0) {
                  pricingRows.push({ label: '优惠', value: `- ${Pricing.formatCny(pricing.discount)}` });
              }
              if (Number(pricing.bundleDiscount) > 0) {
                  pricingRows.push({ label: '套装优惠', value: `- ${Pricing.formatCny(pricing.bundleDiscount)}` });
              }
              if (Number(pricing.memberDiscount) > 0) {
                  pricingRows.push({ label: '会员折扣', value: `- ${Pricing.formatCny(pricing.memberDiscount)}` });
              }
              if (Number(pricing.rewardsDiscount) > 0) {
                  const pointsLabel = Number.isFinite(Number(pricing.pointsUsed)) && Number(pricing.pointsUsed) > 0
                      ? `（使用 ${pricing.pointsUsed} 积分）`
                      : '';
                  pricingRows.push({ label: '积分抵扣', value: `- ${Pricing.formatCny(pricing.rewardsDiscount)}${pointsLabel}` });
              }
              if (Number.isFinite(pricing.shipping)) {
                  pricingRows.push({ label: '运费', value: Pricing.formatCny(pricing.shipping) });
              }
              if (Number.isFinite(pricing.total)) {
                  pricingRows.push({ label: '应付总额', value: Pricing.formatCny(pricing.total), emphasis: true });
              }
              if (pricingRows.length) {
                  const pricingWrap = document.createElement('div');
                  pricingWrap.className = 'order-card__pricing';
                  pricingWrap.innerHTML = pricingRows.map((row) => `
                      <div class="order-pricing__row ${row.emphasis ? 'is-total' : ''}">
                          <span>${Utils.escapeHtml(row.label)}</span>
                          <span>${Utils.escapeHtml(row.value)}</span>
                      </div>
                  `).join('');
                  body.appendChild(pricingWrap);
              }

              const journey = OrderJourney?.getProgress?.(id) || [];
              const journeyRecord = OrderJourney?.get?.(id);
              if (journey.length) {
                  const journeyWrap = document.createElement('div');
                  journeyWrap.className = 'order-journey';
                  journeyWrap.innerHTML = `
                      <div class="order-journey__head">订单旅程</div>
                      <div class="order-journey__timeline">
                          ${journey.map((step) => `
                              <div class="order-journey__step ${step.done ? 'is-done' : ''}">
                                  <span class="order-journey__dot"></span>
                                  <div class="order-journey__content">
                                      <div class="order-journey__label">${Utils.escapeHtml(step.label)}</div>
                                      <div class="order-journey__time text-muted">${Utils.escapeHtml(formatDate(step.ts))}</div>
                                  </div>
                              </div>
                          `).join('')}
                      </div>
                  `;
                  body.appendChild(journeyWrap);
              }

              const afterSales = Array.isArray(journeyRecord?.afterSales) ? journeyRecord.afterSales : [];
              const afterSalesWrap = document.createElement('div');
              afterSalesWrap.className = 'order-after-sales';
              afterSalesWrap.innerHTML = `
                  <div class="order-after-sales__head">
                      <span>售后记录</span>
                      <button type="button" class="cta-button-secondary" data-after-sales="${Utils.escapeHtml(id)}">申请售后</button>
                  </div>
                  <div class="order-after-sales__list">
                      ${afterSales.length
                          ? afterSales.map((entry) => `
                              <div class="after-sales-row">
                                  <div class="after-sales-row__title">${Utils.escapeHtml(entry.type || '售后')}</div>
                                  <div class="after-sales-row__meta text-muted">${Utils.escapeHtml(formatDate(entry.createdAt))}</div>
                                  <div class="after-sales-row__reason">${Utils.escapeHtml(entry.reason || '无备注')}</div>
                              </div>
                          `).join('')
                          : '<div class="text-muted">暂无售后记录</div>'}
                  </div>
              `;
              body.appendChild(afterSalesWrap);

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
              const afterSalesBtn = event.target?.closest?.('[data-after-sales]');
              if (afterSalesBtn) {
                  const id = String(afterSalesBtn.dataset.afterSales || '').trim();
                  if (!id) return;
                  const type = window.prompt('售后类型（退款/补件/换货）', '补件');
                  if (type === null) return;
                  const reasonInput = window.prompt('请简述售后原因（可选）', '');
                  if (reasonInput === null) return;
                  const record = OrderJourney?.addAfterSales?.(id, { type: type.trim() || '售后申请', reason: reasonInput.trim() });
                  if (record) {
                      Toast?.show?.('售后申请已提交', 'success', 1800);
                      render();
                  }
                  return;
              }

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
              window.addEventListener('orderJourney:changed', render);
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
