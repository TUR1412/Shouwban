/* Page Module
   - 按页代码分割：仅在目标页面 init() 触发时创建模块（避免 scripts/main.js 单体膨胀）
   - 运行时依赖通过 init(ctx) 注入：兼容根目录部署 ?v= 缓存穿透与 Vite 构建
*/

let OrderSuccessPage = null;
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

  // Order Success Page Module (order-success.html)
  // ==============================================
  OrderSuccessPage = (function() {
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
  

  try { OrderSuccessPage.init(); } catch (e) { console.warn('Page module init failed: order-success.js', e); }
}
