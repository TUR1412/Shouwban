// Command Palette (Ctrl/Cmd + K)
// - 现代产品常见的“命令面板”交互：快速跳转/搜索/切换主题
// - 纯前端实现：不依赖第三方库
// - 默认会绑定全局快捷键；可通过 options.bindGlobalHotkeys=false 关闭（用于懒加载 bootstrap）
export function createCommandPalette(deps = {}, options = {}) {
  const d = deps && typeof deps === 'object' ? deps : {};
  const opts = options && typeof options === 'object' ? options : {};

  const Utils = d.Utils;
  const Icons = d.Icons;
  const Toast = d.Toast;
  const Theme = d.Theme;
  const Diagnostics = d.Diagnostics;
  const ErrorShield = d.ErrorShield;

  const bindGlobalHotkeys = opts.bindGlobalHotkeys !== false;

  const dialogId = 'cmdk-dialog';
  const supportsDialog = typeof HTMLDialogElement !== 'undefined';

  let dialog = null;
  let input = null;
  let list = null;
  let desc = null;
  let results = [];
  let activeIndex = 0;

  function getShortcutText() {
    try {
      const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || '');
      return isMac ? '⌘ K' : 'Ctrl K';
    } catch {
      return 'Ctrl K';
    }
  }

  function isEditableTarget(target) {
    const el = target && target.nodeType === 1 ? target : null;
    if (!el) return false;
    const tag = String(el.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    return Boolean(el.isContentEditable);
  }

  function safeNavigate(href) {
    const url = String(href || '').trim();
    if (!url) return;
    window.location.href = url;
  }

  function getBaseCommands() {
    return [
      {
        id: 'go-home',
        title: '返回首页',
        desc: '打开 index.html',
        icon: 'icon-arrow-left',
        run: () => safeNavigate('index.html'),
      },
      {
        id: 'go-products',
        title: '浏览所有商品',
        desc: '打开 products.html',
        icon: 'icon-grid',
        run: () => safeNavigate('products.html'),
      },
      {
        id: 'go-cart',
        title: '打开购物车',
        desc: '打开 cart.html',
        icon: 'icon-cart',
        run: () => safeNavigate('cart.html'),
      },
      {
        id: 'go-favorites',
        title: '打开收藏',
        desc: '打开 favorites.html',
        icon: 'icon-heart',
        run: () => safeNavigate('favorites.html'),
      },
      {
        id: 'go-compare',
        title: '打开对比',
        desc: '打开 compare.html',
        icon: 'icon-scale',
        run: () => safeNavigate('compare.html'),
      },
      {
        id: 'go-orders',
        title: '打开订单中心',
        desc: '打开 orders.html',
        icon: 'icon-receipt',
        run: () => safeNavigate('orders.html'),
      },
      {
        id: 'go-account',
        title: '打开会员中心',
        desc: '打开 account.html',
        icon: 'icon-user',
        run: () => safeNavigate('account.html'),
      },
      {
        id: 'go-diagnostics',
        title: '打开诊断中心',
        desc: '打开 account.html#diagnostics',
        icon: 'icon-shield',
        run: () => safeNavigate('account.html#diagnostics'),
      },
      {
        id: 'open-error-report',
        title: '打开错误报告',
        desc: '打开 ErrorShield 报告面板',
        icon: 'icon-shield',
        run: () => ErrorShield?.open?.(),
      },
      {
        id: 'toggle-theme',
        title: '切换主题',
        desc: '深色 / 浅色模式',
        icon: 'icon-moon',
        run: () => Theme?.toggleTheme?.(),
      },
      {
        id: 'health-panorama',
        title: '系统健康全景图',
        desc: '输出 FPS / LongTask / 内存趋势',
        icon: 'icon-shield',
        run: () => Diagnostics?.print?.(),
      },
      {
        id: 'health-watch',
        title: '开始健康监控（5s）',
        desc: '每 5 秒输出一次健康快照',
        icon: 'icon-bell',
        run: () => Diagnostics?.watch?.({ intervalMs: 5000, clear: false }),
      },
      {
        id: 'health-unwatch',
        title: '停止健康监控',
        desc: '停止定时输出（保留采样）',
        icon: 'icon-x',
        run: () => Diagnostics?.unwatch?.(),
      },
      {
        id: 'copy-link',
        title: '复制当前页面链接',
        desc: '复制 URL 到剪贴板',
        icon: 'icon-link',
        run: async () => {
          const ok = (await Utils?.copyText?.(window.location.href)) === true;
          Toast?.show?.(ok ? '链接已复制' : '复制失败', ok ? 'success' : 'error', 1600);
        },
      },
    ];
  }

  function normalizeQuery(value) {
    return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
  }

  function buildResults(query) {
    const q = normalizeQuery(query);
    const base = getBaseCommands();

    if (!q) {
      return base;
    }

    const lower = q.toLowerCase();
    const filtered = base.filter((c) => {
      const hay = `${c.title} ${c.desc}`.toLowerCase();
      return hay.includes(lower);
    });

    // Always provide a search action as the last fallback.
    filtered.push({
      id: 'search-products',
      title: `搜索商品：${q}`,
      desc: '在商品列表页查看搜索结果',
      icon: 'icon-search',
      run: () => safeNavigate(`products.html?query=${encodeURIComponent(q)}`),
    });

    return filtered;
  }

  function render() {
    if (!list || !input) return;
    const query = input.value;
    results = buildResults(query);
    activeIndex = Math.min(activeIndex, Math.max(0, results.length - 1));

    if (desc) {
      desc.textContent = results.length
        ? `回车执行 · ↑↓ 选择 · Esc 关闭 · ${getShortcutText()} 打开`
        : `没有匹配项 · ${getShortcutText()} 打开`;
    }

    const svg = (icon) => {
      if (!icon) return '';
      if (!Icons || typeof Icons.svgHtml !== 'function') return '';
      return Icons.svgHtml(icon);
    };

    const escape = (value) => {
      if (Utils && typeof Utils.escapeHtml === 'function') return Utils.escapeHtml(value);
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    list.innerHTML = results
      .map((item, idx) => {
        const selected = idx === activeIndex ? 'true' : 'false';
        const icon = item.icon ? svg(item.icon) : '';
        const title = escape(item.title);
        const sub = escape(item.desc || '');
        return `
                    <button type="button" class="cmdk-item" role="option" aria-selected="${selected}" data-cmdk-index="${idx}">
                        <span class="cmdk-item__left">
                            ${icon}
                            <span class="cmdk-item__text">
                                <span class="cmdk-item__title">${title}</span>
                                ${sub ? `<span class="cmdk-item__desc">${sub}</span>` : ''}
                            </span>
                        </span>
                        <span class="cmdk-item__hint">↵</span>
                    </button>
                `.trim();
      })
      .join('');
  }

  async function runActive() {
    const item = results[activeIndex];
    if (!item || typeof item.run !== 'function') return;
    try {
      close();
      await item.run();
    } catch (e) {
      console.warn('CommandPalette: run failed', e);
      Toast?.show?.('命令执行失败', 'error', 1600);
    }
  }

  function move(delta) {
    if (!results.length) return;
    activeIndex = (activeIndex + delta + results.length) % results.length;
    render();
    // Ensure selected item is visible
    try {
      const el = list?.querySelector?.(`.cmdk-item[data-cmdk-index="${activeIndex}"]`);
      el?.scrollIntoView?.({ block: 'nearest' });
    } catch {
      // ignore
    }
  }

  function onListClick(event) {
    const btn = event.target?.closest?.('.cmdk-item[data-cmdk-index]');
    if (!btn) return;
    const idx = Number(btn.dataset.cmdkIndex);
    if (!Number.isFinite(idx)) return;
    activeIndex = idx;
    runActive();
  }

  function onDialogKeydown(event) {
    if (!event) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      move(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      move(-1);
      return;
    }
    if (event.key === 'Enter') {
      // Allow IME composition; avoid triggering while composing.
      if (event.isComposing) return;
      event.preventDefault();
      runActive();
    }
  }

  function ensureDialog() {
    if (dialog) return dialog;

    // Fallback: focus header search when dialog isn't supported.
    if (!supportsDialog) return null;

    dialog = document.createElement('dialog');
    dialog.id = dialogId;
    dialog.className = 'glass-dialog cmdk-dialog';
    dialog.innerHTML = `
            <div class="glass-dialog__card cmdk-card">
                <div class="glass-dialog__header cmdk-header">
                    <h3 class="glass-dialog__title cmdk-title">命令面板</h3>
                    <p class="glass-dialog__subtitle text-muted cmdk-subtitle">快速跳转 / 搜索 / 操作</p>
                </div>

                <div class="cmdk-input-row">
                    <input class="glass-dialog__input cmdk-input" type="search" placeholder="输入关键词或命令…（例如：购物车 / 切换主题 / 初音）" autocomplete="off" spellcheck="false" enterkeyhint="search" />
                </div>

                <div class="cmdk-meta text-muted" data-cmdk-desc></div>

                <div class="cmdk-list" role="listbox" aria-label="命令列表" data-cmdk-list></div>

                <div class="glass-dialog__actions cmdk-actions">
                    <button type="button" class="cta-button-secondary" data-cmdk-close>关闭</button>
                </div>
            </div>
        `.trim();

    document.body.appendChild(dialog);

    input = dialog.querySelector('.cmdk-input');
    list = dialog.querySelector('[data-cmdk-list]');
    desc = dialog.querySelector('[data-cmdk-desc]');

    dialog.addEventListener('keydown', onDialogKeydown);
    list?.addEventListener?.('click', onListClick);

    const closeBtn = dialog.querySelector('[data-cmdk-close]');
    closeBtn?.addEventListener?.('click', close);

    input?.addEventListener?.('input', () => {
      activeIndex = 0;
      render();
    });

    // Click backdrop to close (native dialog doesn't emit backdrop click; approximate)
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) close();
    });

    return dialog;
  }

  function open(prefill = '') {
    // Fallback: open header search bar.
    if (!supportsDialog) {
      const searchBtn = document.querySelector('.header__action-link[aria-label="搜索"]');
      const searchBar = document.querySelector('.header__search-bar');
      const searchInput = document.querySelector('.header__search-input');
      try {
        if (searchBar && !searchBar.classList.contains('is-open')) {
          searchBtn?.click?.();
        }
        searchInput?.focus?.();
        if (prefill) searchInput.value = prefill;
      } catch {
        // ignore
      }
      return;
    }

    const dlg = ensureDialog();
    if (!dlg) return;

    try {
      if (!dlg.open) dlg.showModal();
    } catch {
      // ignore
    }

    if (input) input.value = normalizeQuery(prefill);
    activeIndex = 0;
    render();
    input?.focus?.();
    input?.select?.();
  }

  function close() {
    if (!dialog) return;
    try {
      if (dialog.open) dialog.close();
    } catch {
      // ignore
    }
  }

  function handleGlobalKeydown(event) {
    if (!event) return;
    if (event.defaultPrevented) return;

    // Avoid stealing shortcuts while typing, except Escape (handled inside dialog).
    if (isEditableTarget(event.target)) {
      // Allow Ctrl/Cmd+K even when in input for power users
      const isCmdK =
        (event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'K');
      if (!isCmdK) return;
    }

    const isCmdK = (event.ctrlKey || event.metaKey) && (event.key === 'k' || event.key === 'K');
    if (isCmdK) {
      event.preventDefault();
      open();
      return;
    }

    // "/" 快捷打开（类 GitHub），但不在输入框中触发
    if (
      !isEditableTarget(event.target) &&
      event.key === '/' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      open();
    }
  }

  function init() {
    if (!bindGlobalHotkeys) return;
    document.addEventListener('keydown', handleGlobalKeydown);
  }

  return { init, open, close };
}

