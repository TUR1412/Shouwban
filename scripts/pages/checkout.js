/* Page Module
   - 按页代码分割：仅在目标页面 init() 触发时创建模块（避免 scripts/main.js 单体膨胀）
   - 运行时依赖通过 init(ctx) 注入：兼容根目录部署 ?v= 缓存穿透与 Vite 构建
*/

let Checkout = null;
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
    BundleDeals,
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

  // Checkout Module (Modified to use SharedData and Cart.getCart)
  // ==============================================
  Checkout = (function() {
      const checkoutContainer = document.querySelector('.checkout-main');
      if (!checkoutContainer) return { init: () => {} };
  
      const checkoutForm = checkoutContainer.querySelector('#checkout-form'); 
      const orderSummaryItemsContainer = checkoutContainer.querySelector('.order-summary__items');
      const summarySubtotalEl = checkoutContainer.querySelector('.order-summary .summary-subtotal');
      const summaryShippingEl = checkoutContainer.querySelector('.order-summary .summary-shipping');
      const summaryTotalEl = checkoutContainer.querySelector('.order-summary .total-price');
      const paymentOptions = checkoutContainer.querySelectorAll('.payment-options input[name="payment"]');
      const placeOrderButton = checkoutContainer.querySelector('.place-order-button');
      const clearFormButton = checkoutContainer.querySelector('.checkout-clear-button');
      const addressBookSelect = checkoutForm?.querySelector('[data-address-book-select]');
      const saveAddressToggle = checkoutForm?.querySelector('[data-address-book-save]');
  
      const rewardsToggle = checkoutContainer.querySelector('[data-rewards-toggle]');
      const rewardsAvailableEl = checkoutContainer.querySelector('[data-rewards-available]');
      const rewardsDiscountEl = checkoutContainer.querySelector('.order-summary .summary-rewards-discount');
      const rewardsDiscountRow = checkoutContainer.querySelector('.order-summary [data-summary-rewards-row]');
      const bundleDiscountEl = checkoutContainer.querySelector('.order-summary .summary-bundle');
      const bundleDiscountRow = checkoutContainer.querySelector('.order-summary [data-summary-bundle-row]');
      const memberDiscountEl = checkoutContainer.querySelector('.order-summary .summary-member');
      const memberDiscountRow = checkoutContainer.querySelector('.order-summary [data-summary-member-row]');
      const memberBadge = checkoutContainer.querySelector('[data-member-tier]');
      const memberPerks = checkoutContainer.querySelector('[data-member-perks]');
  
      const draftKey = 'checkoutDraft';
      const usePointsKey = 'checkoutUsePoints';
      const nameInput = checkoutForm?.querySelector('#name');
      const phoneInput = checkoutForm?.querySelector('#phone');
      const addressInput = checkoutForm?.querySelector('#address');
      const regionSelect = checkoutForm?.querySelector('#region');
  
      let lastTotal = NaN;
  
      function syncPaymentOptionUI() {
          try {
              paymentOptions?.forEach?.((option) => {
                  const host = option?.closest?.('.payment-option');
                  if (!host) return;
                  host.classList.toggle('is-selected', Boolean(option.checked));
              });
          } catch {
              // ignore
          }
      }
  
      // --- Helper Functions --- (Keep formatPrice, clearError, showError)       
        function formatPrice(price) {
            return `¥${price.toFixed(2)}`;
        }
      function clearError(inputElement) {
          // ... (no changes needed here)
           const formGroup = inputElement.closest('.form-group');
          if (!formGroup) return;
          const errorElement = formGroup.querySelector('.error-message');
          inputElement.classList.remove('input-error');
          inputElement.removeAttribute('aria-invalid');
          if (errorElement?.id && inputElement.getAttribute('aria-describedby') === errorElement.id) {
              inputElement.removeAttribute('aria-describedby');
          }
          if (errorElement) {
              errorElement.remove();
          }
      }
  
      function showError(inputElement, message) {
          // ... (no changes needed here)
           const formGroup = inputElement.closest('.form-group');
          if (!formGroup) return;
          clearError(inputElement); // Remove previous error first
          inputElement.classList.add('input-error');
          inputElement.setAttribute('aria-invalid', 'true');
          const errorElement = document.createElement('span');
          errorElement.className = 'error-message';
          errorElement.textContent = message;
          try {
              const base = String(inputElement.id || inputElement.name || 'field').replace(/[^a-zA-Z0-9_-]/g, '');
              errorElement.id = `error-${base || 'field'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
              inputElement.setAttribute('aria-describedby', errorElement.id);
          } catch {
              // ignore
          }
          inputElement.parentNode.insertBefore(errorElement, inputElement.nextSibling);
      }
  
      function readDraft() {
          const parsed = Utils.readStorageJSON(draftKey, null);
          if (!parsed || typeof parsed !== 'object') return null;
          return parsed;
      }
  
      function writeDraft(data) {
          Utils.writeStorageJSON(draftKey, data);
      }
  
      function clearDraft() {
          Utils.removeStorage(draftKey);
      }
  
      function collectDraft() {
          return {
              name: nameInput?.value?.trim() || '',
              phone: phoneInput?.value?.trim() || '',
              address: addressInput?.value?.trim() || '',
              region: regionSelect?.value || '',
              payment: checkoutForm?.querySelector('input[name="payment"]:checked')?.value || '',
          };
      }
  
      function applyDraft() {
          const draft = readDraft();
          if (!draft) return;
  
          if (nameInput && draft.name) nameInput.value = draft.name;
          if (phoneInput && draft.phone) phoneInput.value = draft.phone;
          if (addressInput && draft.address) addressInput.value = draft.address;
  
          if (regionSelect && draft.region) {
              ShippingRegion?.syncAllSelects?.();
              regionSelect.value = String(draft.region || '');
              ShippingRegion?.set?.(regionSelect.value, { silent: true });
          }
  
          if (draft.payment && paymentOptions && paymentOptions.length > 0) {     
              paymentOptions.forEach((option) => {
                  option.checked = option.value === draft.payment;
              });
          }
          syncPaymentOptionUI();
  
          if (typeof Toast !== 'undefined' && Toast.show) {
              Toast.show('已恢复上次填写的收货信息（本地保存）', 'info', 2000);   
          }
      }
  
      function clearForm() {
          if (!checkoutForm) return;
          checkoutForm.reset();
          clearDraft();
          checkoutForm.querySelectorAll('.input-error').forEach((el) => el.classList.remove('input-error'));
          checkoutForm.querySelectorAll('.error-message').forEach((el) => el.remove());
          syncPaymentOptionUI();
      }
  
      // --- Validation Logic --- (Keep validateInput, validateForm)
      function validateInput(inputElement) {
          // ... (no changes needed here)
            let isValid = true;
          const value = inputElement.value.trim();
          const fieldName = inputElement.previousElementSibling?.textContent || inputElement.name;
  
          if (inputElement.required && value === '') {
              showError(inputElement, `${fieldName}不能为空`);
              isValid = false;
          } else {
              clearError(inputElement);
          }
  
          if (isValid && inputElement.type === 'tel') {
              const phoneRegex = /^1[3-9]\d{9}$/;
              if (!phoneRegex.test(value)) {
                  showError(inputElement, '请输入有效的手机号码');
                  isValid = false;
              } else {
                  clearError(inputElement);
              }
          }
          return isValid;
      }
      function validateForm() {
          // ... (no changes needed here)
           if (!checkoutForm) return false;
          let isFormValid = true;
          const inputsToValidate = checkoutForm.querySelectorAll('input[required], textarea[required], select[required]');
  
          inputsToValidate.forEach(input => {
              if (!validateInput(input)) {
                  isFormValid = false;
              }
          });
  
          let paymentSelected = false;
          paymentOptions.forEach(option => {
              if (option.checked) {
                  paymentSelected = true;
              }
          });
  
          const paymentSection = document.getElementById('payment-method');
          const errorElement = paymentSection?.querySelector('.error-message');
          if(errorElement) errorElement.remove(); // Clear previous payment error
  
          if (!paymentSelected && paymentOptions.length > 0) { // Only validate if options exist
              console.warn("请选择支付方式");
              if (paymentSection) {
                  const newErrorElement = document.createElement('span');
                  newErrorElement.className = 'error-message';
                  newErrorElement.textContent = '请选择一个支付方式';
                  newErrorElement.style.display = 'block'; 
                  newErrorElement.style.marginTop = 'var(--spacing-sm)';
                   newErrorElement.style.color = 'var(--color-error)'; // Ensure error color
                  paymentSection.appendChild(newErrorElement);
              }
              isFormValid = false;
          } 
          return isFormValid;
      }
  
      // --- Order Summary Logic --- (Modified to use Cart.getCart)
      function renderOrderSummary(options = {}) {
          if (!orderSummaryItemsContainer || !summarySubtotalEl || !summaryShippingEl || !summaryTotalEl) {
               console.error("Checkout Error: Order summary elements not found.");
               return;
           }
          const animateItems = Boolean(options.animateItems);
  
          // Use Cart module to get data
          const cart = (typeof Cart !== 'undefined' && Cart.getCart) ? Cart.getCart() : []; 
          orderSummaryItemsContainer.innerHTML = '';
  
          if (cart.length === 0) {
              orderSummaryItemsContainer.innerHTML = '<p class="text-center text-muted">购物车为空，无法结算。</p>';
              UXMotion.tweenMoney(summarySubtotalEl, 0);
              UXMotion.tweenMoney(summaryShippingEl, 0);
              UXMotion.tweenMoney(summaryTotalEl, 0);
              lastTotal = 0;
              const discountEl = checkoutContainer.querySelector('.order-summary .summary-discount');
              const discountRow = checkoutContainer.querySelector('.order-summary [data-summary-discount-row]');
              if (discountEl && discountRow) {
                  discountRow.style.display = 'none';
                  UXMotion.tweenMoney(discountEl, 0, { prefix: '- ' });
              }
              if (rewardsDiscountEl && rewardsDiscountRow) {
                  rewardsDiscountRow.style.display = 'none';
                  UXMotion.tweenMoney(rewardsDiscountEl, 0, { prefix: '- ' });
              }
              if (bundleDiscountEl && bundleDiscountRow) {
                  bundleDiscountRow.style.display = 'none';
                  UXMotion.tweenMoney(bundleDiscountEl, 0, { prefix: '- ' });
              }
              if (memberDiscountEl && memberDiscountRow) {
                  memberDiscountRow.style.display = 'none';
                  UXMotion.tweenMoney(memberDiscountEl, 0, { prefix: '- ' });
              }
              if(placeOrderButton) placeOrderButton.disabled = true;
              return;
          }
  
          let subtotal = 0;
          cart.forEach(item => {
              subtotal += item.price * item.quantity;
              const itemElement = document.createElement('div');
              itemElement.className = 'summary-item';
  
              const img = document.createElement('img');
              img.src = String(item.image || 'assets/images/figurine-1.svg');
              img.alt = `${String(item.name || '[手办名称]')} 缩略图`;
  
              const nameSpan = document.createElement('span');
              nameSpan.textContent = `${String(item.name || '[手办名称]')} x ${item.quantity}`;
  
              const priceSpan = document.createElement('span');
              priceSpan.textContent = formatPrice(item.price * item.quantity);
  
              itemElement.appendChild(img);
              itemElement.appendChild(nameSpan);
              itemElement.appendChild(priceSpan);
              orderSummaryItemsContainer.appendChild(itemElement);
          });
  
          if (animateItems && typeof Cinematic !== 'undefined') {
              Cinematic.staggerEnter?.(orderSummaryItemsContainer.querySelectorAll('.summary-item'), {
                  y: 10,
                  blur: 10,
                  duration: 0.32,
                  stagger: 0.03,
                  maxStaggerItems: 10,
              });
          }
  
          const promo = typeof Promotion !== 'undefined' && Promotion.get ? Promotion.get() : null;
          const discount = typeof Promotion !== 'undefined' && Promotion.calculateDiscount
              ? Promotion.calculateDiscount(subtotal, promo)
              : 0;
          const bundleInfo = typeof BundleDeals !== 'undefined' && BundleDeals.calculateDiscount
              ? BundleDeals.calculateDiscount(cart)
              : { discount: 0, bundles: [] };
          const bundleDiscount = Number(bundleInfo?.discount) || 0;
          const memberBenefits = typeof Rewards !== 'undefined' && Rewards.getTierBenefits
              ? Rewards.getTierBenefits(Rewards.getPoints?.() || 0)
              : null;
          const memberDiscount = typeof Rewards !== 'undefined' && Rewards.calcTierDiscount
              ? Rewards.calcTierDiscount(Math.max(0, subtotal - discount - bundleDiscount))
              : 0;
          const availablePoints = typeof Rewards !== 'undefined' && Rewards.getPoints ? Rewards.getPoints() : 0;
          if (rewardsAvailableEl) rewardsAvailableEl.textContent = `可用 ${availablePoints} 积分`;
          const usePoints = rewardsToggle
              ? Boolean(rewardsToggle.checked)
              : Boolean(Utils.readStorageJSON(usePointsKey, false));
          const maxMerch = Math.max(0, Pricing.roundMoney(subtotal - discount - bundleDiscount - memberDiscount));
          const maxPoints = Math.floor(maxMerch * 100);
          const pointsUsed = usePoints ? Math.min(maxPoints, Number(availablePoints) || 0) : 0;
          const rewardsDiscount = typeof Rewards !== 'undefined' && Rewards.calcDiscountByPoints
              ? Rewards.calcDiscountByPoints(pointsUsed)
              : 0;
          const region = typeof ShippingRegion !== 'undefined' && ShippingRegion.get ? ShippingRegion.get() : 'cn-east';
          const shippingCost = typeof Pricing !== 'undefined' && Pricing.calculateShipping
              ? Pricing.calculateShipping({
                  subtotal,
                  discount: discount + rewardsDiscount + bundleDiscount + memberDiscount,
                  region,
                  promotion: promo,
                  membership: memberBenefits,
              })
              : 0;
          const total = Math.max(
              0,
              Pricing.roundMoney(subtotal - discount - rewardsDiscount - bundleDiscount - memberDiscount)
                  + Pricing.roundMoney(shippingCost),
          );
  
          UXMotion.tweenMoney(summarySubtotalEl, subtotal);
          const discountEl = checkoutContainer.querySelector('.order-summary .summary-discount');
          const discountRow = checkoutContainer.querySelector('.order-summary [data-summary-discount-row]');
          if (discountEl && discountRow) {
              const show = discount > 0;
              const animated = typeof Cinematic !== 'undefined' && Cinematic.toggleDisplay
                  ? Cinematic.toggleDisplay(discountRow, show, { display: 'flex', y: 10, blur: 10, duration: 0.26 })
                  : false;
              if (!animated) discountRow.style.display = show ? 'flex' : 'none';
              UXMotion.tweenMoney(discountEl, discount, { prefix: '- ' });
          }
          if (rewardsDiscountEl && rewardsDiscountRow) {
              const show = rewardsDiscount > 0;
              const animated = typeof Cinematic !== 'undefined' && Cinematic.toggleDisplay
                  ? Cinematic.toggleDisplay(rewardsDiscountRow, show, { display: 'flex', y: 10, blur: 10, duration: 0.26 })
                  : false;
              if (!animated) rewardsDiscountRow.style.display = show ? 'flex' : 'none';
              UXMotion.tweenMoney(rewardsDiscountEl, rewardsDiscount, { prefix: '- ' });
              try {
                  rewardsDiscountEl.setAttribute(
                      'aria-label',
                      show
                          ? `积分抵扣：${Pricing.formatCny(rewardsDiscount)}（使用 ${pointsUsed} 积分）`
                          : '积分抵扣：0',
                  );
              } catch {
                  // ignore
              }
          }
          if (bundleDiscountEl && bundleDiscountRow) {
              const show = bundleDiscount > 0;
              const animated = typeof Cinematic !== 'undefined' && Cinematic.toggleDisplay
                  ? Cinematic.toggleDisplay(bundleDiscountRow, show, { display: 'flex', y: 10, blur: 10, duration: 0.26 })
                  : false;
              if (!animated) bundleDiscountRow.style.display = show ? 'flex' : 'none';
              UXMotion.tweenMoney(bundleDiscountEl, bundleDiscount, { prefix: '- ' });
          }
          if (memberDiscountEl && memberDiscountRow) {
              const show = memberDiscount > 0;
              const animated = typeof Cinematic !== 'undefined' && Cinematic.toggleDisplay
                  ? Cinematic.toggleDisplay(memberDiscountRow, show, { display: 'flex', y: 10, blur: 10, duration: 0.26 })
                  : false;
              if (!animated) memberDiscountRow.style.display = show ? 'flex' : 'none';
              UXMotion.tweenMoney(memberDiscountEl, memberDiscount, { prefix: '- ' });
          }
          if (memberBadge) {
              const tier = Rewards?.getTier?.();
              memberBadge.textContent = tier ? `${tier.label} 会员` : '会员';
          }
          if (memberPerks) {
              const perks = [];
              const pct = Number(memberBenefits?.discountPercent) || 0;
              const freeOverDelta = Number(memberBenefits?.freeOverDelta) || 0;
              if (pct > 0) perks.push(`${pct}% 会员折扣`);
              if (freeOverDelta > 0) perks.push(`包邮门槛下调 ¥${freeOverDelta}`);
              const extra = Array.isArray(memberBenefits?.perks) ? memberBenefits.perks : [];
              const list = [...perks, ...extra];
              memberPerks.innerHTML = list.length
                  ? list.map((item) => `<span class="member-perk">${Utils.escapeHtml(item)}</span>`).join('')
                  : '<span class="member-perk">基础权益</span>';
          }
          UXMotion.tweenMoney(summaryShippingEl, shippingCost);
          UXMotion.tweenMoney(summaryTotalEl, total);
          try {
              if (typeof Cinematic !== 'undefined') {
                  const totalRow = checkoutContainer.querySelector('.order-summary .total-row') || summaryTotalEl;
                  const prev = Number(lastTotal);
                  if (Number.isFinite(prev) && Math.abs(total - prev) > 0.009) {
                      Cinematic.pulse?.(totalRow, { scale: 1.04, duration: 0.26 });
                      Cinematic.shimmerOnce?.(totalRow, { durationMs: 560 });
                  }
              }
              lastTotal = total;
          } catch {
              lastTotal = total;
          }
  
          if(placeOrderButton) placeOrderButton.disabled = false;
      }
  
      // --- Event Handling --- (Keep handlePaymentSelection, handlePlaceOrder, addEventListeners)
      function handlePaymentSelection() {
         // ... (no changes needed here)
            const paymentSection = document.getElementById('payment-method');     
          const errorElement = paymentSection?.querySelector('.error-message');   
          if (errorElement) errorElement.remove();
          syncPaymentOptionUI();
      }
  
      function handlePlaceOrder(event) {
          event.preventDefault(); 
   
          if (validateForm()) {
              const formData = new FormData(checkoutForm);
              const shippingAddress = {
                  name: String(formData.get('name') || ''),
                  phone: String(formData.get('phone') || ''),
                  address: String(formData.get('address') || ''),
              };
              const paymentMethod = String(formData.get('payment') || '');
              const region = String(formData.get('region') || ShippingRegion?.get?.() || '');
              const currentCart = (typeof Cart !== 'undefined' && Cart.getCart) ? Cart.getCart() : [];
  
              const subtotal = currentCart.reduce((sum, item) => sum + (Number(item?.price) || 0) * (Number(item?.quantity) || 1), 0);
              const promo = typeof Promotion !== 'undefined' && Promotion.get ? Promotion.get() : null;
              const promoDiscount = typeof Promotion !== 'undefined' && Promotion.calculateDiscount
                  ? Promotion.calculateDiscount(subtotal, promo)
                  : 0;
              const bundleInfo = typeof BundleDeals !== 'undefined' && BundleDeals.calculateDiscount
                  ? BundleDeals.calculateDiscount(currentCart)
                  : { discount: 0, bundles: [] };
              const bundleDiscount = Number(bundleInfo?.discount) || 0;
              const memberDiscount = typeof Rewards !== 'undefined' && Rewards.calcTierDiscount
                  ? Rewards.calcTierDiscount(Math.max(0, subtotal - promoDiscount - bundleDiscount))
                  : 0;

              const availablePoints = typeof Rewards !== 'undefined' && Rewards.getPoints ? Rewards.getPoints() : 0;
              const usePoints = rewardsToggle
                  ? Boolean(rewardsToggle.checked)
                  : Boolean(Utils.readStorageJSON(usePointsKey, false));
              const maxMerch = Math.max(
                  0,
                  Pricing.roundMoney(subtotal - promoDiscount - bundleDiscount - memberDiscount),
              );
              const maxPoints = Math.floor(maxMerch * 100);
              const pointsUsed = usePoints ? Math.min(maxPoints, Number(availablePoints) || 0) : 0;
              const rewardsDiscount = typeof Rewards !== 'undefined' && Rewards.calcDiscountByPoints
                  ? Rewards.calcDiscountByPoints(pointsUsed)
                  : 0;
  
              const order = (typeof Orders !== 'undefined' && Orders.create)
                  ? Orders.create({ items: currentCart, shippingAddress, paymentMethod, region, rewards: { pointsUsed, discount: rewardsDiscount } })
                  : null;
  
              // 地址簿：可选保存（降低复购摩擦）
              try {
                  const saveAddress = String(formData.get('saveAddress') || '') === '1';
                  if (saveAddress && typeof AddressBook !== 'undefined' && AddressBook.upsert) {
                      AddressBook.upsert({
                          label: '结算保存',
                          name: shippingAddress.name,
                          phone: shippingAddress.phone,
                          address: shippingAddress.address,
                          region,
                          isDefault: true,
                      });
                      Toast?.show?.('已保存到地址簿', 'success', 1600);
                  }
              } catch {
                  // ignore
              }
  
              // 积分：先扣后返（更贴近真实电商）
              try {
                  if (usePoints && pointsUsed > 0 && typeof Rewards !== 'undefined') {
                      Rewards.consumePoints?.(pointsUsed);
                  }
                  const earned = typeof Rewards !== 'undefined' && Rewards.calcEarnedPoints
                  ? Rewards.calcEarnedPoints(Math.max(0, subtotal - promoDiscount - bundleDiscount - memberDiscount - rewardsDiscount))
                  : 0;
                  if (earned > 0 && typeof Rewards !== 'undefined') {
                      Rewards.addPoints?.(earned);
                      Toast?.show?.(`获得积分 +${earned}`, 'success', 1800);
                  }
              } catch {
                  // ignore
              }
   
              // 清空购物车（优先走统一入口，确保归一化与事件派发）
              if (typeof Cart !== 'undefined' && typeof Cart.setCart === 'function') {
                  Cart.setCart([]);
              } else {
                  try { localStorage.removeItem('cart'); } catch { /* ignore */ }
  
                  // Fallback：至少更新头部角标
                  if (typeof Cart !== 'undefined' && Cart.updateHeaderCartCount) {
                      Cart.updateHeaderCartCount([]);
                  } else {
                      console.error("Checkout Error: Cannot update header cart count.");
                  }
              }
              clearDraft();
  
              const orderId = String(order?.id || '').trim();
              window.location.href = orderId
                  ? `order-success.html?oid=${encodeURIComponent(orderId)}`
                  : 'index.html?order=success';
          } else {
              const firstInvalidInput = checkoutForm.querySelector('.input-error');
              const firstError = checkoutForm.querySelector('.input-error, .error-message');
              const behavior = Utils.prefersReducedMotion() ? 'auto' : 'smooth';
              firstError?.scrollIntoView({ behavior, block: 'center' });
              firstInvalidInput?.focus?.();
          }
      }
  
      function addEventListeners() {
          // ... (no changes needed here)
           if (checkoutForm && placeOrderButton) {
              checkoutForm.addEventListener('submit', handlePlaceOrder);
  
              const inputsToValidate = checkoutForm.querySelectorAll('input[required], textarea[required], select[required]');
              inputsToValidate.forEach(input => {
                  input.addEventListener('blur', () => validateInput(input));
                  input.addEventListener('input', () => clearError(input)); 
              });
  
              const inputsToDraft = checkoutForm.querySelectorAll('input, textarea, select');
              const debouncedSaveDraft = Utils.debounce(() => {
                  writeDraft(collectDraft());
              }, 240);
              inputsToDraft.forEach((input) => {
                  input.addEventListener('input', debouncedSaveDraft);
                  input.addEventListener('change', debouncedSaveDraft);
              });
  
              paymentOptions.forEach(option => {
                  option.addEventListener('change', handlePaymentSelection);
              });
  
              if (clearFormButton) {
                  clearFormButton.addEventListener('click', () => {
                      const ok = window.confirm('确定清空当前填写的收货信息吗？');
                      if (!ok) return;
                      clearForm();
                      if (typeof Toast !== 'undefined' && Toast.show) {
                          Toast.show('已清空收货信息', 'info', 1800);
                      }
                  });
              }
          }
  
          if (rewardsToggle) {
              rewardsToggle.checked = Boolean(Utils.readStorageJSON(usePointsKey, false));
              rewardsToggle.addEventListener('change', () => {
                  try { localStorage.setItem(usePointsKey, rewardsToggle.checked ? 'true' : 'false'); } catch { /* ignore */ }
                  renderOrderSummary();
              });
          }
  
          if (addressBookSelect && checkoutForm) {
              AddressBook?.fillSelect?.(addressBookSelect);
              addressBookSelect.addEventListener('change', () => {
                  const id = addressBookSelect.value;
                  const entry = AddressBook?.getById?.(id);
                  if (!entry) return;
                  AddressBook.applyToCheckoutForm?.(entry, checkoutForm);
                  try { ShippingRegion?.set?.(entry.region); } catch { /* ignore */ }
                  renderOrderSummary();
                  Toast?.show?.('已应用常用地址', 'success', 1400);
              });
          }
      }
  
      // --- Initialization ---
      function init() {
           if (checkoutContainer) { // Check if on checkout page
                if (rewardsToggle) {
                    rewardsToggle.checked = Boolean(Utils.readStorageJSON(usePointsKey, false));
                }
                renderOrderSummary({ animateItems: true });
                applyDraft();
                syncPaymentOptionUI();
                addEventListeners();
  
                // 同标签页内购物车变化（例如从其他模块写入）时刷新摘要
                try {
                    window.addEventListener('cart:changed', () => renderOrderSummary({ animateItems: true }));
                } catch {
                    // ignore
                }
           }
      }
  
      function refresh() {
          if (!checkoutContainer) return;
          renderOrderSummary();
      }
  
      return { init: init, refresh };
  })();
  
  
  // ==============================================

  try { Checkout.init(); } catch (e) { console.warn('Page module init failed: checkout.js', e); }
}
