/* Page Module
   - 按页代码分割：仅在目标页面 init() 触发时创建模块（避免 scripts/main.js 单体膨胀）
   - 运行时依赖通过 init(ctx) 注入：兼容根目录部署 ?v= 缓存穿透与 Vite 构建
*/

let AccountPage = null;
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

  // Account Page Module (account.html)
  // ==============================================
  AccountPage = (function() {
      const container = document.querySelector('.account-main');
      if (!container) return { init: () => {} };
  
      const pointsEl = container.querySelector('[data-rewards-points]');
      const rewardsResetBtn = container.querySelector('[data-rewards-reset]');
  
      const addressList = container.querySelector('[data-address-list]');
      const addressEmpty = container.querySelector('[data-address-empty]');
      const addressFormDetails = container.querySelector('[data-address-form]');
      const addressForm = container.querySelector('[data-address-form-body]');
      const addressOpenFormBtn = container.querySelector('[data-address-open-form]');
      const addressCancelBtn = container.querySelector('[data-address-cancel]');
  
      const alertsList = container.querySelector('[data-alert-list]');
      const alertsEmpty = container.querySelector('[data-alert-empty]');
  
      const dataExportBtn = container.querySelector('[data-data-export]');
      const dataImportBtn = container.querySelector('[data-data-import]');
      const dataFileInput = container.querySelector('[data-data-file]');
      const dataResetBtn = container.querySelector('[data-data-reset]');
  
      let didEnterCards = false;
      let didEnterAddresses = false;
      let didEnterAlerts = false;
  
      function formatRegionLabel(region) {
          try {
              return Pricing.getRegion(region).label;
          } catch {
              return '—';
          }
      }
  
      function renderRewards() {
          if (!pointsEl) return;
          const points = Rewards?.getPoints?.() || 0;
          pointsEl.setAttribute('aria-label', `可用积分：${points}`);
          UXMotion.tweenNumber(pointsEl, points, { duration: 420, formatter: (n) => String(Math.max(0, Math.round(n))) });
          try {
              const prev = Number(pointsEl.dataset.prevPoints);
              if (Number.isFinite(prev) && prev !== points && typeof Cinematic !== 'undefined') {
                  Cinematic.pulse?.(pointsEl, { scale: points > prev ? 1.08 : 1.04, duration: 0.24 });
                  if (points > prev) Cinematic.shimmerOnce?.(pointsEl, { durationMs: 520 });
              }
              pointsEl.dataset.prevPoints = String(points);
          } catch {
              // ignore
          }
      }
  
      function renderAddresses() {
          if (!addressList || !addressEmpty) return;
          const list = AddressBook?.getAll?.() || [];
          addressList.innerHTML = '';
  
          if (!list.length) {
              addressEmpty.style.display = 'block';
              return;
          }
          addressEmpty.style.display = 'none';
  
          list.forEach((x) => {
              const card = document.createElement('div');
              card.className = 'address-card';
              card.dataset.addressId = x.id;
  
              const head = document.createElement('div');
              head.className = 'address-card__head';
  
              const title = document.createElement('div');
              title.className = 'address-card__title';
              const left = [];
              if (x.label) left.push(x.label);
              if (x.name) left.push(x.name);
              if (x.phone) left.push(x.phone);
              title.textContent = left.length ? left.join(' · ') : '常用地址';
  
              const badge = document.createElement('span');
              badge.className = `address-card__badge ${x.isDefault ? 'is-default' : ''}`;
              badge.textContent = x.isDefault ? '默认' : formatRegionLabel(x.region);
  
              head.appendChild(title);
              head.appendChild(badge);
  
              const body = document.createElement('div');
              body.className = 'address-card__body';
              body.textContent = String(x.address || '');
  
              const actions = document.createElement('div');
              actions.className = 'address-card__actions';
              actions.innerHTML = `
                  <button type="button" class="cta-button-secondary address-action" data-address-default>设为默认</button>
                  <button type="button" class="cta-button-secondary address-action" data-address-edit>编辑</button>
                  <button type="button" class="cta-button-secondary address-action" data-address-remove>删除</button>
              `;
  
              card.appendChild(head);
              card.appendChild(body);
              card.appendChild(actions);
              addressList.appendChild(card);
          });
  
          if (!didEnterAddresses && typeof Cinematic !== 'undefined') {
              const entered = Cinematic.staggerEnter?.(addressList.querySelectorAll('.address-card'), {
                  y: 12,
                  blur: 10,
                  duration: 0.32,
                  stagger: 0.04,
                  maxStaggerItems: 10,
              });
              if (entered) didEnterAddresses = true;
          }
      }
  
      function renderAlerts() {
          if (!alertsList || !alertsEmpty) return;
          const list = PriceAlerts?.getAll?.() || [];
          alertsList.innerHTML = '';
  
          if (!list.length) {
              alertsEmpty.style.display = 'block';
              return;
          }
          alertsEmpty.style.display = 'none';
  
          list.forEach((a) => {
              const product = SharedData?.getProductById?.(a.productId);
              const name = String(product?.name || a.productId);
              const currentPrice = typeof product?.price === 'number' ? product.price : Number(product?.price) || 0;
              const reached = Number.isFinite(currentPrice) && currentPrice <= a.targetPrice;
  
              const row = document.createElement('div');
              row.className = `alert-row ${reached ? 'is-reached' : ''}`;
              row.dataset.productId = a.productId;
  
              const left = document.createElement('div');
              left.className = 'alert-row__left';
              left.innerHTML = `
                  <div class="alert-row__name">${Utils.escapeHtml(name)}</div>
                  <div class="alert-row__meta text-muted">
                      目标价：${Utils.escapeHtml(Pricing.formatCny(a.targetPrice))}
                      · 当前价：${Utils.escapeHtml(Pricing.formatCny(currentPrice))}
                  </div>
              `;
  
              const right = document.createElement('div');
              right.className = 'alert-row__right';
              right.innerHTML = `
                  <button type="button" class="cta-button-secondary alert-action" data-alert-edit>编辑</button>
                  <button type="button" class="cta-button-secondary alert-action" data-alert-toggle>${a.enabled ? '停用' : '启用'}</button>
                  <button type="button" class="cta-button-secondary alert-action" data-alert-remove>删除</button>
              `;
  
              row.appendChild(left);
              row.appendChild(right);
              alertsList.appendChild(row);
          });
  
          if (!didEnterAlerts && typeof Cinematic !== 'undefined') {
              const entered = Cinematic.staggerEnter?.(alertsList.querySelectorAll('.alert-row'), {
                  y: 10,
                  blur: 10,
                  duration: 0.32,
                  stagger: 0.035,
                  maxStaggerItems: 10,
              });
              if (entered) didEnterAlerts = true;
          }
      }
  
      function openAddressForm(entry) {
          if (!addressFormDetails || !addressForm) return;
          const e = entry && typeof entry === 'object' ? entry : null;
          const setVal = (name, value) => {
              const el = addressForm.querySelector(`[name=\"${name}\"]`);
              if (!el) return;
              if (el.type === 'checkbox') el.checked = Boolean(value);
              else el.value = String(value ?? '');
          };
  
          setVal('id', e?.id || '');
          setVal('label', e?.label || '');
          setVal('name', e?.name || '');
          setVal('phone', e?.phone || '');
          setVal('address', e?.address || '');
          setVal('region', e?.region || ShippingRegion?.get?.() || 'cn-east');
          setVal('isDefault', Boolean(e?.isDefault));
  
          addressFormDetails.open = true;
          addressFormDetails.scrollIntoView({ behavior: Utils.prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      }
  
      function bind() {
          rewardsResetBtn?.addEventListener?.('click', () => {
              const points = Rewards?.getPoints?.() || 0;
              if (points <= 0) return;
              const ok = window.confirm('确定清空积分吗？（仅影响本机本地存储）');
              if (!ok) return;
              Rewards?.setPoints?.(0);
              Toast?.show?.('积分已清空', 'success', 1600);
          });
  
          dataExportBtn?.addEventListener?.('click', () => {
              DataPortability?.exportBackup?.();
          });
  
          dataImportBtn?.addEventListener?.('click', () => {
              if (!dataFileInput) {
                  Toast?.show?.('当前页面缺少文件选择器，无法导入。', 'error', 2200);
                  return;
              }
              try { dataFileInput.value = ''; } catch { /* ignore */ }
              dataFileInput.click();
          });
  
          dataFileInput?.addEventListener?.('change', async () => {
              const file = dataFileInput.files && dataFileInput.files[0];
              if (!file) return;
              await DataPortability?.importBackupFromFile?.(file);
              try { dataFileInput.value = ''; } catch { /* ignore */ }
          });
  
          dataResetBtn?.addEventListener?.('click', () => {
              DataPortability?.resetAll?.();
          });
  
          addressOpenFormBtn?.addEventListener?.('click', () => openAddressForm(null));
          addressCancelBtn?.addEventListener?.('click', () => {
              if (addressFormDetails) addressFormDetails.open = false;
          });
  
          addressForm?.addEventListener?.('submit', (event) => {
              event.preventDefault();
              const fd = new FormData(addressForm);
              const id = String(fd.get('id') || '').trim();
              const entry = {
                  id: id || undefined,
                  label: String(fd.get('label') || '').trim(),
                  name: String(fd.get('name') || '').trim(),
                  phone: String(fd.get('phone') || '').trim(),
                  address: String(fd.get('address') || '').trim(),
                  region: String(fd.get('region') || '').trim(),
                  isDefault: String(fd.get('isDefault') || '') === '1',
              };
  
              AddressBook?.upsert?.(entry);
              Toast?.show?.(id ? '地址已更新' : '地址已添加', 'success', 1600);
              if (addressFormDetails) addressFormDetails.open = false;
              addressForm.reset();
          });
  
          container.addEventListener('click', (event) => {
              const addrCard = event.target?.closest?.('.address-card[data-address-id]');
              const pid = event.target?.closest?.('.alert-row[data-product-id]')?.dataset?.productId;
  
              const setDefaultBtn = event.target?.closest?.('[data-address-default]');
              if (setDefaultBtn && addrCard) {
                  const id = addrCard.dataset.addressId;
                  AddressBook?.setDefault?.(id);
                  Toast?.show?.('已设为默认地址', 'success', 1400);
                  return;
              }
  
              const editBtn = event.target?.closest?.('[data-address-edit]');
              if (editBtn && addrCard) {
                  const id = addrCard.dataset.addressId;
                  const entry = AddressBook?.getById?.(id);
                  openAddressForm(entry);
                  return;
              }
  
              const removeBtn = event.target?.closest?.('[data-address-remove]');
              if (removeBtn && addrCard) {
                  const id = addrCard.dataset.addressId;
                  const ok = window.confirm('确定删除该地址吗？');
                  if (!ok) return;
                  AddressBook?.remove?.(id);
                  Toast?.show?.('地址已删除', 'success', 1400);
                  return;
              }
  
              const alertEdit = event.target?.closest?.('[data-alert-edit]');
              if (alertEdit && pid) {
                  PriceAlerts?.openDialog?.(pid);
                  return;
              }
  
              const alertToggle = event.target?.closest?.('[data-alert-toggle]');
              if (alertToggle && pid) {
                  const current = PriceAlerts?.getByProductId?.(pid);
                  if (!current) return;
                  PriceAlerts?.update?.(pid, { enabled: !current.enabled });
                  Toast?.show?.(!current.enabled ? '提醒已启用' : '提醒已停用', 'success', 1400);
                  return;
              }
  
              const alertRemove = event.target?.closest?.('[data-alert-remove]');
              if (alertRemove && pid) {
                  const ok = window.confirm('确定删除该降价提醒吗？');
                  if (!ok) return;
                  PriceAlerts?.remove?.(pid);
                  Toast?.show?.('已删除降价提醒', 'success', 1400);
              }
          });
  
          try {
              window.addEventListener('rewards:changed', renderRewards);
              window.addEventListener('addressbook:changed', renderAddresses);
              window.addEventListener('pricealerts:changed', renderAlerts);
          } catch {
              // ignore
          }
      }
  
      function init() {
          renderRewards();
          renderAddresses();
          renderAlerts();
          bind();
          if (!didEnterCards && typeof Cinematic !== 'undefined') {
              const entered = Cinematic.staggerEnter?.(container.querySelectorAll('.account-card'), {
                  y: 14,
                  blur: 12,
                  duration: 0.38,
                  stagger: 0.05,
                  maxStaggerItems: 8,
              });
              if (entered) didEnterCards = true;
          }
      }
  
      return { init };
  })();
  
  // ==============================================

  try { AccountPage.init(); } catch (e) { console.warn('Page module init failed: account.js', e); }
}
