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
    Accessibility,
    Header,
    SharedData,
    StateHub,
    Telemetry,
    Logger,
    ErrorShield,
    PerfVitals,
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
    WatchCenter,
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
      const tierBadge = container.querySelector('[data-tier-badge]');
      const tierPoints = container.querySelector('[data-tier-points]');
      const tierPerks = container.querySelector('[data-tier-perks]');

      const addressList = container.querySelector('[data-address-list]');
      const addressEmpty = container.querySelector('[data-address-empty]');
      const addressFormDetails = container.querySelector('[data-address-form]');
      const addressForm = container.querySelector('[data-address-form-body]');
      const addressOpenFormBtn = container.querySelector('[data-address-open-form]');
      const addressCancelBtn = container.querySelector('[data-address-cancel]');

      const watchList = container.querySelector('[data-watch-list]');
      const watchEmpty = container.querySelector('[data-watch-empty]');

      const dataExportBtn = container.querySelector('[data-data-export]');      
      const dataImportBtn = container.querySelector('[data-data-import]');      
      const dataFileInput = container.querySelector('[data-data-file]');        
      const dataResetBtn = container.querySelector('[data-data-reset]');        

      const a11yReduceMotion = container.querySelector('[data-a11y-reduce-motion]');
      const a11yHighContrast = container.querySelector('[data-a11y-high-contrast]');
      const a11yFontScale = container.querySelector('[data-a11y-font-scale]');  
      const a11yFontLabel = container.querySelector('[data-a11y-font-label]');  

      const diagCard = container.querySelector('[data-account-diagnostics]');
      const diagRefreshBtn = container.querySelector('[data-diag-refresh]');
      const diagCopyBtn = container.querySelector('[data-diag-copy]');
      const diagExportBtn = container.querySelector('[data-diag-export]');
      const diagClearLogsBtn = container.querySelector('[data-diag-clear-logs]');

      const diagKpiLogs = container.querySelector('[data-diag-kpi-logs]');
      const diagKpiLogsSub = container.querySelector('[data-diag-kpi-logs-sub]');
      const diagKpiErrors = container.querySelector('[data-diag-kpi-errors]');
      const diagKpiTelemetry = container.querySelector('[data-diag-kpi-telemetry]');
      const diagKpiTelemetrySub = container.querySelector('[data-diag-kpi-telemetry-sub]');
      const diagKpiPerf = container.querySelector('[data-diag-kpi-perf]');

      const diagPerfTable = container.querySelector('[data-diag-perf]');
      const diagErrorsEmpty = container.querySelector('[data-diag-errors-empty]');
      const diagErrorsList = container.querySelector('[data-diag-errors-list]');
      const diagOpenErrorReportBtn = container.querySelector('[data-diag-open-error-report]');
      const diagClearErrorsBtn = container.querySelector('[data-diag-clear-errors]');

      const diagOnlyErrorsToggle = container.querySelector('[data-diag-only-errors]');
      const diagCaptureConsoleToggle = container.querySelector('[data-diag-capture-console]');
      const diagLogsEmpty = container.querySelector('[data-diag-logs-empty]');
      const diagLogsList = container.querySelector('[data-diag-logs-list]');
      const diagDownloadLogsBtn = container.querySelector('[data-diag-download-logs]');

      const diagEndpointInput = container.querySelector('[data-diag-endpoint]');
      const diagSaveEndpointBtn = container.querySelector('[data-diag-save-endpoint]');
      const diagClearEndpointBtn = container.querySelector('[data-diag-clear-endpoint]');
      const diagFlushBtn = container.querySelector('[data-diag-flush]');
      const diagClearTelemetryBtn = container.querySelector('[data-diag-clear-telemetry]');
      const diagTelemetryMeta = container.querySelector('[data-diag-telemetry-meta]');

      function clampFontPct(raw) {
          const n = Math.round(Number(raw) || 100);
          if (!Number.isFinite(n)) return 100;
          const clamped = Math.min(125, Math.max(100, n));
          // step=5
          return Math.round(clamped / 5) * 5;
      }

      function pctToScale(pct) {
          const p = clampFontPct(pct);
          return Math.round((p / 100) * 100) / 100;
      }

      function getA11yCurrent() {
          if (Accessibility?.get) return Accessibility.get();
          return { reduceMotion: false, highContrast: false, fontScale: 1 };    
      }

      function renderA11y() {
          if (!Accessibility?.get) return;
          const settings = Accessibility.get();
          if (a11yReduceMotion) a11yReduceMotion.checked = Boolean(settings.reduceMotion);
          if (a11yHighContrast) a11yHighContrast.checked = Boolean(settings.highContrast);

          const pct = Math.round(Number(settings.fontScale || 1) * 100);
          const safePct = clampFontPct(pct);
          if (a11yFontScale) a11yFontScale.value = String(safePct);
          if (a11yFontLabel) a11yFontLabel.textContent = `${safePct}%`;
      }

      function previewFontScale(pct) {
          if (!Accessibility?.apply) return;
          const safePct = clampFontPct(pct);
          const scale = pctToScale(safePct);
          Accessibility.apply({ ...getA11yCurrent(), fontScale: scale });
          if (a11yFontLabel) a11yFontLabel.textContent = `${safePct}%`;
      }

      function persistA11y(next, { toast = false } = {}) {
          if (!Accessibility?.set) return;
          Accessibility.set(next);
          if (toast) Toast?.show?.('无障碍偏好已更新', 'success', 1400);
      }

      let detachConsoleCapture = null;
      let diagScheduled = false;

      function formatClock(ts) {
          const n = Number(ts);
          if (!Number.isFinite(n) || n <= 0) return '—';
          try {
              const d = new Date(n);
              const hh = String(d.getHours()).padStart(2, '0');
              const mm = String(d.getMinutes()).padStart(2, '0');
              const ss = String(d.getSeconds()).padStart(2, '0');
              return `${hh}:${mm}:${ss}`;
          } catch {
              return '—';
          }
      }

      function formatMs(v) {
          const n = Number(v);
          if (!Number.isFinite(n)) return '—';
          return `${Math.max(0, Math.round(n))}ms`;
      }

      function clampText(value, max = 120) {
          const s = String(value ?? '');
          if (s.length <= max) return s;
          return `${s.slice(0, Math.max(0, max - 1))}…`;
      }

      function resolveTelemetryEndpoint() {
          try {
              const resolved = Telemetry?.resolveEndpoint?.();
              if (typeof resolved === 'string') return resolved.trim();
          } catch {
              // ignore
          }
          try {
              const fromWindow = globalThis.__SHOUWBAN_TELEMETRY__?.endpoint || '';
              const meta = document.querySelector('meta[name="shouwban-telemetry-endpoint"]');
              const fromMeta = meta?.getAttribute?.('content') || '';
              const fromStorage = (() => {
                  try { return localStorage.getItem('sbTelemetryEndpoint') || ''; } catch { return ''; }
              })();
              return String(fromWindow || fromMeta || fromStorage || '').trim();
          } catch {
              return '';
          }
      }

      function formatEndpointBrief(endpoint) {
          const raw = String(endpoint || '').trim();
          if (!raw) return '未配置 Endpoint';
          try {
              const u = new URL(raw);
              const path = u.pathname && u.pathname !== '/' ? u.pathname : '';
              return `${u.protocol}//${u.host}${path}`;
          } catch {
              return clampText(raw, 42);
          }
      }

      function readTelemetryQueue() {
          try {
              const q = Telemetry?.getQueue?.();
              if (Array.isArray(q)) return q;
          } catch {
              // ignore
          }
          const list = Utils.readStorageJSON('sbTelemetryQueue', []);
          return Array.isArray(list) ? list : [];
      }

      function getLogs() {
          try {
              const entries = Logger?.getEntries?.();
              if (Array.isArray(entries)) return entries;
          } catch {
              // ignore
          }
          const fallback = Utils.readStorageJSON('sbLogs', []);
          return Array.isArray(fallback) ? fallback : [];
      }

      function setVisible(el, visible) {
          const node = el;
          if (!node) return;
          node.style.display = visible ? 'block' : 'none';
      }

      function clearChildren(el) {
          const node = el;
          if (!node) return;
          while (node.firstChild) node.removeChild(node.firstChild);
      }

      function renderPerf() {
          if (!diagPerfTable) return;
          clearChildren(diagPerfTable);

          const snap = PerfVitals?.snapshot?.();
          if (!snap || typeof snap !== 'object') {
              diagPerfTable.textContent = 'PerfVitals 不可用或未初始化。';
              if (diagKpiPerf) diagKpiPerf.textContent = '—';
              return;
          }

          const rows = [
              ['时间', String(snap.time || '—')],
              ['TTFB', formatMs(snap.ttfbMs)],
              ['FCP', formatMs(snap.fcpMs)],
              ['LCP', formatMs(snap.lcpMs)],
              ['CLS', snap.cls == null ? '—' : String(snap.cls)],
              ['INP(近似)', formatMs(snap.inpMs)],
              ['LongTask', `${Number(snap.longTaskCount || 0)} 次 · max ${formatMs(snap.longTaskMaxMs)} · total ${formatMs(snap.longTaskTotalMs)}`],
          ];

          rows.forEach(([k, v]) => {
              const item = document.createElement('div');
              item.className = 'diag-kv';
              const key = document.createElement('div');
              key.className = 'diag-kv__k text-muted';
              key.textContent = String(k);
              const val = document.createElement('div');
              val.className = 'diag-kv__v';
              val.textContent = String(v);
              item.appendChild(key);
              item.appendChild(val);
              diagPerfTable.appendChild(item);
          });

          if (diagKpiPerf) {
              const lcp = snap.lcpMs != null ? `LCP ${formatMs(snap.lcpMs)}` : '';
              const cls = snap.cls != null ? `CLS ${snap.cls}` : '';
              const ttfb = snap.ttfbMs != null ? `TTFB ${formatMs(snap.ttfbMs)}` : '';
              diagKpiPerf.textContent = lcp || cls || ttfb || '—';
          }
      }

      function renderErrors() {
          if (!diagErrorsList) return;
          const list = ErrorShield?.getRecent?.() || [];
          const items = Array.isArray(list) ? list.slice(-8).reverse() : [];

          clearChildren(diagErrorsList);
          setVisible(diagErrorsEmpty, items.length === 0);

          items.forEach((e) => {
              const row = document.createElement('div');
              row.className = 'diag-row diag-row--error';

              const head = document.createElement('div');
              head.className = 'diag-row__head';

              const title = document.createElement('div');
              title.className = 'diag-row__title';
              const kind = String(e?.kind || 'error');
              title.textContent = kind === 'unhandledrejection' ? 'Promise Rejection' : 'Runtime Error';

              const meta = document.createElement('div');
              meta.className = 'diag-row__meta text-muted';
              const time = String(e?.time || '');
              const msgHash = Number(e?.messageHash || 0) || 0;
              const count = Number(e?.count || 1) || 1;
              meta.textContent = `${time || '—'} · msgHash ${msgHash} · x${count}`;

              head.appendChild(title);
              head.appendChild(meta);

              const msg = document.createElement('div');
              msg.className = 'diag-row__message';
              msg.textContent = clampText(String(e?.messageRaw || ''), 120) || '—';

              row.appendChild(head);
              row.appendChild(msg);
              diagErrorsList.appendChild(row);
          });

          if (diagKpiErrors) {
              diagKpiErrors.textContent = String(Array.isArray(list) ? list.length : 0);
          }
      }

      function renderLogs() {
          if (!diagLogsList) return;
          const onlyErrors = Boolean(diagOnlyErrorsToggle?.checked);
          const list = getLogs();
          const all = Array.isArray(list) ? list : [];
          const filtered = onlyErrors
              ? all.filter((x) => String(x?.level || '').toLowerCase() === 'error' || Number(x?.levelValue || 0) >= 40)
              : all;
          const items = filtered.slice(-18).reverse();

          clearChildren(diagLogsList);
          setVisible(diagLogsEmpty, items.length === 0);

          items.forEach((e) => {
              const details = document.createElement('details');
              details.className = 'diag-log';

              const summary = document.createElement('summary');
              summary.className = 'diag-log__summary';

              const left = document.createElement('div');
              left.className = 'diag-log__left';

              const pill = document.createElement('span');
              const lvl = String(e?.level || 'info').toLowerCase();
              pill.className = `diag-pill diag-pill--${lvl}`;
              pill.textContent = lvl.toUpperCase();

              const time = document.createElement('span');
              time.className = 'diag-mono diag-log__time';
              time.textContent = formatClock(e?.ts);

              left.appendChild(pill);
              left.appendChild(time);

              const message = document.createElement('div');
              message.className = 'diag-log__message';
              message.textContent = clampText(String(e?.message || ''), 140) || '—';

              summary.appendChild(left);
              summary.appendChild(message);

              const pre = document.createElement('pre');
              pre.className = 'diag-pre';
              const payload = {
                  ts: e?.ts,
                  level: e?.level,
                  page: e?.page,
                  href: e?.href,
                  message: e?.message,
                  detail: e?.detail,
              };
              try {
                  pre.textContent = JSON.stringify(payload, null, 2);
              } catch {
                  pre.textContent = String(payload);
              }

              details.appendChild(summary);
              details.appendChild(pre);
              diagLogsList.appendChild(details);
          });

          const count = all.length;
          if (diagKpiLogs) diagKpiLogs.textContent = String(count);
          if (diagKpiLogsSub) {
              const last = all.length ? all[all.length - 1] : null;
              diagKpiLogsSub.textContent = last?.ts ? `最近：${formatClock(last.ts)}` : '—';
          }
      }

      function renderTelemetry() {
          const queue = readTelemetryQueue();
          const endpoint = resolveTelemetryEndpoint();
          const count = Array.isArray(queue) ? queue.length : 0;
          const brief = formatEndpointBrief(endpoint);

          if (diagKpiTelemetry) diagKpiTelemetry.textContent = String(count);
          if (diagKpiTelemetrySub) diagKpiTelemetrySub.textContent = brief;

          if (diagTelemetryMeta) {
              const tail = queue.slice(-5).map((x) => String(x?.name || '').trim()).filter(Boolean);
              diagTelemetryMeta.textContent = tail.length
                  ? `最近事件：${tail.join(' / ')}`
                  : '近期无事件入队。';
          }

          if (diagEndpointInput) {
              const fromStorage = (() => {
                  try { return localStorage.getItem('sbTelemetryEndpoint') || ''; } catch { return ''; }
              })();
              if (!diagEndpointInput.value) diagEndpointInput.value = String(fromStorage || '').trim();
          }
      }

      async function copyDiagnosticsSummary() {
          const nowIso = (() => {
              try { return new Date().toISOString(); } catch { return ''; }
          })();
          const ver = (() => {
              try {
                  const el = document.querySelector('script[src*=\"scripts/main.js\"]');
                  const src = el?.getAttribute?.('src') || '';
                  const m = String(src).match(/[?&]v=([^&#]+)/);
                  return m ? String(m[1] || '') : '';
              } catch {
                  return '';
              }
          })();

          const logs = getLogs();
          const errors = ErrorShield?.getRecent?.() || [];
          const perf = PerfVitals?.snapshot?.();
          const tq = readTelemetryQueue();
          const endpoint = resolveTelemetryEndpoint();

          const lines = [
              'Shouwban Diagnostics Report (local-only)',
              `time: ${nowIso || '—'}`,
              `version: ${ver || '—'}`,
              '',
              `logs: ${Array.isArray(logs) ? logs.length : 0}`,
              `errors: ${Array.isArray(errors) ? errors.length : 0}`,
              `telemetryQueue: ${Array.isArray(tq) ? tq.length : 0}`,
              `telemetryEndpoint: ${formatEndpointBrief(endpoint)}`,
              '',
          ];

          if (perf && typeof perf === 'object') {
              lines.push(
                  `perf: ttfb=${formatMs(perf.ttfbMs)} fcp=${formatMs(perf.fcpMs)} lcp=${formatMs(perf.lcpMs)} cls=${perf.cls == null ? '—' : perf.cls} inp=${formatMs(perf.inpMs)} longTasks=${Number(perf.longTaskCount || 0)}`,
                  '',
              );
          }

          const tailErrors = Array.isArray(errors) ? errors.slice(-5).reverse() : [];
          if (tailErrors.length) {
              lines.push('recentErrors:');
              tailErrors.forEach((e) => {
                  lines.push(
                      `- ${String(e?.time || '—')} ${String(e?.kind || 'error')} msgHash=${Number(e?.messageHash || 0) || 0} x${Number(e?.count || 1) || 1}`,
                  );
              });
              lines.push('');
          }

          const ok = await Utils.copyText(lines.join('\n'));
          Toast?.show?.(ok ? '诊断摘要已复制' : '复制失败', ok ? 'success' : 'warning', 1800);
          return ok;
      }

      function downloadLogsJson() {
          const list = getLogs();
          const payload = {
              schema: 'shouwban.logs.v1',
              exportedAt: (() => { try { return new Date().toISOString(); } catch { return ''; } })(),
              count: Array.isArray(list) ? list.length : 0,
              entries: Array.isArray(list) ? list : [],
          };
          const json = (() => {
              try { return JSON.stringify(payload, null, 2); } catch { return ''; }
          })();
          if (!json) return false;

          const stamp = payload.exportedAt ? String(payload.exportedAt).replace(/[:.]/g, '').replace('T', '-').replace('Z', '') : 'unknown';
          const filename = `shouwban-logs-${stamp}.json`;
          try {
              const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              a.rel = 'noopener';
              a.style.display = 'none';
              document.body.appendChild(a);
              a.click();
              a.remove();
              try { URL.revokeObjectURL(url); } catch { /* ignore */ }
              return true;
          } catch {
              return false;
          }
      }

      function scheduleRenderDiagnostics() {
          if (diagScheduled) return;
          diagScheduled = true;
          setTimeout(() => {
              diagScheduled = false;
              renderDiagnostics();
          }, 80);
      }

      function renderDiagnostics() {
          if (!diagCard) return;
          renderPerf();
          renderErrors();
          renderLogs();
          renderTelemetry();
      }

      let didEnterCards = false;
      let didEnterAddresses = false;
      let didEnterWatch = false;
  
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

      function renderTier() {
          if (!tierBadge && !tierPoints && !tierPerks) return;
          const tier = Rewards?.getTier?.();
          const points = Rewards?.getPoints?.() || 0;
          if (tierBadge) tierBadge.textContent = tier ? `${tier.label} 会员` : '会员';
          if (tierPoints) tierPoints.textContent = String(points);
          if (tierPerks) {
              const perks = Array.isArray(tier?.perks) ? tier.perks : [];
              tierPerks.innerHTML = perks.length
                  ? perks.map((perk) => `<span class="tier-perk">${Utils.escapeHtml(perk)}</span>`).join('')
                  : '<span class="tier-perk">基础权益</span>';
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
  
      function renderWatchCenter() {
          if (!watchList || !watchEmpty) return;
          const list = WatchCenter?.getUnifiedList?.() || [];
          watchList.innerHTML = '';

          if (!list.length) {
              watchEmpty.style.display = 'block';
              return;
          }
          watchEmpty.style.display = 'none';

          list.forEach((entry) => {
              const product = entry.product;
              const name = String(product?.name || entry.id);
              const price = typeof product?.price === 'number' ? product.price : Number(product?.price) || 0;
              const trend = entry.trend || { delta: 0, direction: 'flat' };
              const trendLabel = trend.direction === 'up'
                  ? `趋势 +${Pricing.formatCny(Math.abs(trend.delta))}`
                  : trend.direction === 'down'
                      ? `趋势 -${Pricing.formatCny(Math.abs(trend.delta))}`
                      : '趋势稳定';

              const row = document.createElement('div');
              row.className = 'watch-row';
              row.dataset.productId = entry.id;

              const left = document.createElement('div');
              left.className = 'watch-row__left';
              left.innerHTML = `
                  <div class="watch-row__name">${Utils.escapeHtml(name)}</div>
                  <div class="watch-row__meta text-muted">
                      当前价：${Utils.escapeHtml(Pricing.formatCny(price))}
                      · ${Utils.escapeHtml(trendLabel)}
                  </div>
                  <div class="watch-row__tags">
                      ${entry.isFavorite ? '<span class="tag">收藏</span>' : ''}
                      ${entry.hasPriceAlert ? '<span class="tag">降价提醒</span>' : ''}
                      ${entry.hasRestock ? '<span class="tag">到货提醒</span>' : ''}
                  </div>
              `;

              const right = document.createElement('div');
              right.className = 'watch-row__right';
              const detailHref = `product-detail.html?id=${encodeURIComponent(entry.id)}`;
              right.innerHTML = `
                  <a class="cta-button-secondary" href="${detailHref}">查看</a>
                  ${entry.hasPriceAlert ? '<button type="button" class="cta-button-secondary" data-alert-edit>编辑降价</button>' : ''}
                  <button type="button" class="cta-button-secondary" data-restock-toggle>${entry.hasRestock ? '关闭到货' : '到货提醒'}</button>
                  <button type="button" class="cta-button-secondary" data-watch-remove>取消关注</button>
              `;

              row.appendChild(left);
              row.appendChild(right);
              watchList.appendChild(row);
          });

          if (!didEnterWatch && typeof Cinematic !== 'undefined') {
              const entered = Cinematic.staggerEnter?.(watchList.querySelectorAll('.watch-row'), {
                  y: 10,
                  blur: 10,
                  duration: 0.32,
                  stagger: 0.035,
                  maxStaggerItems: 10,
              });
              if (entered) didEnterWatch = true;
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

          diagRefreshBtn?.addEventListener?.('click', () => {
              renderDiagnostics();
              Toast?.show?.('诊断快照已刷新', 'success', 1200);
          });

          diagCopyBtn?.addEventListener?.('click', async () => {
              await copyDiagnosticsSummary();
          });

          diagExportBtn?.addEventListener?.('click', () => {
              DataPortability?.exportBackup?.();
          });

          diagClearLogsBtn?.addEventListener?.('click', () => {
              const list = getLogs();
              const count = Array.isArray(list) ? list.length : 0;
              if (count <= 0) {
                  Toast?.show?.('暂无日志可清空', 'info', 1400);
                  return;
              }
              const ok = window.confirm(`确定清空本地日志吗？（${count} 条）`);
              if (!ok) return;
              try { Logger?.clear?.(); } catch { /* ignore */ }
              Toast?.show?.('本地日志已清空', 'success', 1600);
              scheduleRenderDiagnostics();
          });

          diagOpenErrorReportBtn?.addEventListener?.('click', () => {
              try {
                  ErrorShield?.open?.();
              } catch {
                  Toast?.show?.('错误报告不可用', 'warning', 1600);
              }
          });

          diagClearErrorsBtn?.addEventListener?.('click', () => {
              const list = ErrorShield?.getRecent?.() || [];
              const count = Array.isArray(list) ? list.length : 0;
              if (count <= 0) {
                  Toast?.show?.('暂无错误记录', 'info', 1400);
                  return;
              }
              const ok = window.confirm(`确定清空错误记录吗？（${count} 条）`);
              if (!ok) return;
              try { ErrorShield?.clear?.(); } catch { /* ignore */ }
              Toast?.show?.('错误记录已清空', 'success', 1600);
              scheduleRenderDiagnostics();
          });

          diagOnlyErrorsToggle?.addEventListener?.('change', () => {
              renderLogs();
          });

          diagCaptureConsoleToggle?.addEventListener?.('change', () => {
              const on = Boolean(diagCaptureConsoleToggle.checked);
              if (on) {
                  if (typeof Logger?.attachConsoleCapture !== 'function') {
                      Toast?.show?.('当前环境不支持 console 捕捉', 'warning', 2000);
                      diagCaptureConsoleToggle.checked = false;
                      return;
                  }
                  try { detachConsoleCapture?.(); } catch { /* ignore */ }
                  detachConsoleCapture = Logger.attachConsoleCapture({ includeDebug: false });
                  Toast?.show?.('已启用 console 捕捉（本次会话）', 'success', 1800);
                  return;
              }
              try { detachConsoleCapture?.(); } catch { /* ignore */ }
              detachConsoleCapture = null;
              Toast?.show?.('已关闭 console 捕捉', 'success', 1400);
          });

          diagDownloadLogsBtn?.addEventListener?.('click', () => {
              const ok = downloadLogsJson();
              Toast?.show?.(ok ? '日志已下载' : '下载失败', ok ? 'success' : 'warning', 1800);
          });

          diagSaveEndpointBtn?.addEventListener?.('click', () => {
              const value = String(diagEndpointInput?.value || '').trim();
              if (!value) {
                  Toast?.show?.('请输入 Endpoint 地址', 'warning', 1800);
                  return;
              }
              try {
                  const u = new URL(value);
                  if (!(u.protocol === 'http:' || u.protocol === 'https:')) throw new Error('bad_protocol');
              } catch {
                  Toast?.show?.('Endpoint 格式不正确（需为 http/https URL）', 'error', 2200);
                  return;
              }
              try { localStorage.setItem('sbTelemetryEndpoint', value); } catch { /* ignore */ }
              Toast?.show?.('Endpoint 已保存（本地）', 'success', 1600);
              scheduleRenderDiagnostics();
          });

          diagClearEndpointBtn?.addEventListener?.('click', () => {
              try { localStorage.removeItem('sbTelemetryEndpoint'); } catch { /* ignore */ }
              if (diagEndpointInput) diagEndpointInput.value = '';
              Toast?.show?.('Endpoint 已清除', 'success', 1400);
              scheduleRenderDiagnostics();
          });

          diagFlushBtn?.addEventListener?.('click', async () => {
              if (typeof Telemetry?.flush !== 'function') {
                  Toast?.show?.('Telemetry.flush 不可用', 'warning', 1800);
                  return;
              }
              try {
                  diagFlushBtn.disabled = true;
                  const r = await Telemetry.flush();
                  if (r?.ok) {
                      const sent = Number(r.sent || 0) || 0;
                      Toast?.show?.(`已上报 ${sent} 条事件`, 'success', 2200);
                  } else {
                      const reason = String(r?.reason || r?.status || 'flush_failed');
                      Toast?.show?.(`上报失败：${reason}`, 'warning', 2400);
                  }
              } catch {
                  Toast?.show?.('上报失败：网络或权限错误', 'warning', 2400);
              } finally {
                  try { diagFlushBtn.disabled = false; } catch { /* ignore */ }
                  scheduleRenderDiagnostics();
              }
          });

          diagClearTelemetryBtn?.addEventListener?.('click', () => {
              const queue = readTelemetryQueue();
              const count = Array.isArray(queue) ? queue.length : 0;
              if (count <= 0) {
                  Toast?.show?.('Telemetry 队列为空', 'info', 1400);
                  return;
              }
              const ok = window.confirm(`确定清空 Telemetry 队列吗？（${count} 条）`);
              if (!ok) return;
              try {
                  if (typeof Telemetry?.clearQueue === 'function') {
                      Telemetry.clearQueue();
                  } else {
                      localStorage.removeItem('sbTelemetryQueue');
                  }
              } catch {
                  // ignore
              }
              Toast?.show?.('Telemetry 队列已清空', 'success', 1600);
              scheduleRenderDiagnostics();
          });

          a11yReduceMotion?.addEventListener?.('change', () => {
              persistA11y({ ...getA11yCurrent(), reduceMotion: Boolean(a11yReduceMotion.checked) }, { toast: true });
          });

          a11yHighContrast?.addEventListener?.('change', () => {
              persistA11y({ ...getA11yCurrent(), highContrast: Boolean(a11yHighContrast.checked) }, { toast: true });
          });

          a11yFontScale?.addEventListener?.('input', () => {
              previewFontScale(a11yFontScale.value);
          });

          a11yFontScale?.addEventListener?.('change', () => {
              const pct = clampFontPct(a11yFontScale.value);
              persistA11y({ ...getA11yCurrent(), fontScale: pctToScale(pct) }, { toast: true });
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
              const pid = event.target?.closest?.('.watch-row[data-product-id]')?.dataset?.productId;
  
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

              const restockToggle = event.target?.closest?.('[data-restock-toggle]');
              if (restockToggle && pid) {
                  const active = WatchCenter?.toggleRestock?.(pid);
                  Toast?.show?.(active ? '已开启到货提醒' : '已关闭到货提醒', 'success', 1400);
                  return;
              }

              const watchRemove = event.target?.closest?.('[data-watch-remove]');
              if (watchRemove && pid) {
                  const ok = window.confirm('确定取消关注该商品吗？');
                  if (!ok) return;
                  try { Favorites?.remove?.(pid); } catch { /* ignore */ }
                  try { PriceAlerts?.remove?.(pid); } catch { /* ignore */ }
                  try {
                      if (WatchCenter?.isRestockWatching?.(pid)) WatchCenter.toggleRestock(pid);
                  } catch { /* ignore */ }
                  Toast?.show?.('已取消关注', 'success', 1400);
              }
          });

          try {
              window.addEventListener('rewards:changed', () => {
                  renderRewards();
                  renderTier();
              });
              window.addEventListener('addressbook:changed', renderAddresses);  
              window.addEventListener('watchcenter:changed', renderWatchCenter);
              window.addEventListener('membership:changed', renderTier);        
              window.addEventListener('a11y:changed', renderA11y);
              window.addEventListener('logs:changed', scheduleRenderDiagnostics);
          } catch {
              // ignore
          }
      }
  
      function init() {
          renderRewards();
          renderTier();
          renderAddresses();
          renderWatchCenter();
          renderA11y();
          renderDiagnostics();
          bind();
          try {
              if (window.location.hash === '#diagnostics') {
                  const panel = container.querySelector('[data-diag-panel-perf]');
                  if (panel) panel.open = true;
              }
          } catch {
              // ignore
          }
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
