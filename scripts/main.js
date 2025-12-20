// Main JavaScript for the figurine e-commerce website

// ==============================================
// Utility Functions
// ==============================================
const Utils = {
    // Throttle function to limit the rate of function execution
    throttle: (func, limit) => {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    },
    // Debounce function to delay function execution
    debounce: (func, delay) => {
        let timeoutId;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func.apply(context, args), delay);
        }
    },
    // Normalize current page name for both http(s) & file:// usage
    getPageNameFromPath: (pathname) => {
        const safePath = typeof pathname === 'string' ? pathname : '';
        const parts = safePath.split('/').filter(Boolean);
        const last = parts.length > 0 ? parts[parts.length - 1] : '';
        if (!last) return 'index.html';
        // 目录路径（如 /repo/ 或 /repo）也视为首页
        if (!last.includes('.')) return 'index.html';
        return last;
    },
    getPageName: () => {
        try {
            return Utils.getPageNameFromPath(window.location.pathname);
        } catch {
            return 'index.html';
        }
    },

    // Escape HTML to avoid XSS when data is later sourced from APIs
    escapeHtml: (value) => {
        const s = String(value ?? '');
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    // Safe JSON parse helper (never throws)
    safeJsonParse: (raw, fallback) => {
        try {
            return JSON.parse(raw);
        } catch {
            return fallback;
        }
    },

    prefersReducedMotion: () => {
        try {
            return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        } catch {
            return false;
        }
    }
};

// ==============================================
// Header Module
// ==============================================
const Header = (function() {
    const headerElement = document.querySelector('.header');
    const navigation = headerElement?.querySelector('.header__navigation');
    const menuToggle = headerElement?.querySelector('.header__menu-toggle');
    const dropdownItems = headerElement?.querySelectorAll('.header__nav-item--dropdown');
    const searchToggle = headerElement?.querySelector('.header__action-link[aria-label="搜索"]');
    const searchBar = headerElement?.querySelector('.header__search-bar');
    const searchContainer = searchBar?.querySelector('.container');
    const searchInput = searchBar?.querySelector('.header__search-input');
    const searchClearBtn = searchBar?.querySelector('.header__search-clear');
    const searchForm = searchBar?.querySelector('form');
    const searchSubmitBtn = searchBar?.querySelector('.header__search-submit');
    const navLinks = headerElement?.querySelectorAll('.header__nav-link:not(.header__dropdown-toggle)'); // Exclude dropdown toggle itself
    const dropdownLinks = headerElement?.querySelectorAll('.header__dropdown-item a');
    const allNavLinks = Array.from(navLinks || []).concat(Array.from(dropdownLinks || []));

    const scrollThreshold = 50;
    let searchSuggestionsBox = null;
    let activeSuggestionIndex = -1;

    function getBreakpointMd() {
        try {
            const raw = getComputedStyle(document.documentElement).getPropertyValue('--breakpoint-md') || '768px';
            const v = raw.trim();
            return v || '768px';
        } catch {
            return '768px';
        }
    }

    function isDesktopNav() {
        return window.matchMedia(`(min-width: ${getBreakpointMd()})`).matches;
    }

    function isMobileNav() {
        return window.matchMedia(`(max-width: ${getBreakpointMd()})`).matches;
    }

    function handleScroll() {
        if (!headerElement) return;
        if (window.scrollY > scrollThreshold) {
            headerElement.classList.add('header--scrolled');
        } else {
            headerElement.classList.remove('header--scrolled');
        }
    }

    function toggleMobileMenu() {
        if (!navigation || !menuToggle) return;
        const isOpen = navigation.classList.toggle('is-open');
        menuToggle.setAttribute('aria-expanded', isOpen);
        // Toggle icon (example)
        // menuToggle.innerHTML = isOpen ? '&times;' : '&#9776;';
    }

    function closeMobileMenu() {
        if (!navigation || !menuToggle || !navigation.classList.contains('is-open')) return;
        navigation.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
        // menuToggle.innerHTML = '&#9776;';
    }

    function closeSearch() {
        if (!searchBar || !searchToggle) return;
        if (!searchBar.classList.contains('is-open')) return;
        searchBar.classList.remove('is-open');
        searchToggle.setAttribute('aria-expanded', 'false');
        searchBar.setAttribute('aria-hidden', 'true');
        clearSearchSuggestions();
    }

    function toggleSearch() {
        if (!searchBar || !searchInput || !searchToggle) return;
        const isOpen = searchBar.classList.toggle('is-open');
        searchToggle.setAttribute('aria-expanded', isOpen);
        searchBar.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        if (isOpen) {
            closeMobileMenu();
            closeAllDropdowns();
            searchInput.focus();
            updateSearchClearButton();
            // Optional: Change search icon to close icon
        } else {
            clearSearchSuggestions();
            // Optional: Change close icon back to search icon
        }
    }

    function handleSearchSubmit(event) {
        event.preventDefault(); // Prevent default form submission
        const searchTerm = searchInput?.value.trim();
        if (searchTerm) {
            // Redirect to products page with search query
            window.location.href = `products.html?query=${encodeURIComponent(searchTerm)}`;
        } else {
            // Optional: Add feedback if search term is empty
            searchInput?.focus();
        }
        // Close the search bar after submission (optional)
        // if (searchBar?.classList.contains('is-open')) {
        //     toggleSearch();
        // }
    }

    function updateSearchClearButton() {
        if (!searchClearBtn || !searchInput) return;
        const hasValue = searchInput.value.trim().length > 0;
        searchClearBtn.classList.toggle('is-visible', hasValue);
        searchClearBtn.setAttribute('aria-hidden', hasValue ? 'false' : 'true');
    }

    function ensureSearchSuggestions() {
        if (!searchContainer) return null;
        if (searchSuggestionsBox) return searchSuggestionsBox;
        searchSuggestionsBox = searchContainer.querySelector('.header__search-suggestions');
        if (!searchSuggestionsBox) {
            searchSuggestionsBox = document.createElement('div');
            searchSuggestionsBox.className = 'header__search-suggestions';
            searchSuggestionsBox.id = 'header-search-suggestions';
            searchSuggestionsBox.setAttribute('role', 'listbox');
            searchSuggestionsBox.setAttribute('aria-label', '搜索建议');
            searchContainer.appendChild(searchSuggestionsBox);
        }
        return searchSuggestionsBox;
    }

    function clearSearchSuggestions() {
        const box = ensureSearchSuggestions();
        if (!box) return;
        box.innerHTML = '';
        box.classList.remove('is-visible');
        activeSuggestionIndex = -1;
        if (searchInput) searchInput.setAttribute('aria-expanded', 'false');
        if (searchInput) searchInput.removeAttribute('aria-activedescendant');
        updateSearchClearButton();
    }

    function getSearchSuggestions(query) {
        const q = String(query || '').trim().toLowerCase();
        if (!q) return [];
        if (typeof SharedData === 'undefined' || !SharedData.getAllProducts) return [];
        const all = SharedData.getAllProducts() || [];
        return all
            .filter((item) => {
                const name = String(item?.name || '').toLowerCase();
                const series = String(item?.series || '').toLowerCase();
                return name.includes(q) || series.includes(q);
            })
            .slice(0, 6);
    }

    function setActiveSuggestion(index) {
        const box = ensureSearchSuggestions();
        if (!box) return;
        const items = Array.from(box.querySelectorAll('.header__search-suggestion'));
        if (items.length === 0) return;
        const clamped = Math.max(0, Math.min(index, items.length - 1));
        items.forEach((el, i) => {
            const isActive = i === clamped;
            el.classList.toggle('is-active', isActive);
            el.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        activeSuggestionIndex = clamped;
        const activeId = items[clamped]?.id;
        if (searchInput && activeId) {
            searchInput.setAttribute('aria-activedescendant', activeId);
        }
    }

    function buildHighlightedText(text, query) {
        const fragment = document.createDocumentFragment();
        const raw = String(text || '');
        const q = String(query || '').trim();
        if (!q) {
            fragment.appendChild(document.createTextNode(raw));
            return fragment;
        }
        const lower = raw.toLowerCase();
        const lowerQ = q.toLowerCase();
        const idx = lower.indexOf(lowerQ);
        if (idx === -1) {
            fragment.appendChild(document.createTextNode(raw));
            return fragment;
        }
        const before = raw.slice(0, idx);
        const match = raw.slice(idx, idx + q.length);
        const after = raw.slice(idx + q.length);
        if (before) fragment.appendChild(document.createTextNode(before));
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = match;
        fragment.appendChild(mark);
        if (after) fragment.appendChild(document.createTextNode(after));
        return fragment;
    }

    function renderSearchSuggestions(suggestions) {
        const box = ensureSearchSuggestions();
        if (!box) return;
        box.innerHTML = '';
        if (searchInput) searchInput.removeAttribute('aria-activedescendant');

        if (!suggestions || suggestions.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'search-suggestions__empty';
            empty.textContent = '暂无匹配的手办';
            box.appendChild(empty);
            box.classList.add('is-visible');
            if (searchInput) searchInput.setAttribute('aria-expanded', 'true');
            activeSuggestionIndex = -1;
            return;
        }

        suggestions.forEach((item, index) => {
            const link = document.createElement('a');
            link.className = 'header__search-suggestion';
            link.setAttribute('role', 'option');
            link.setAttribute('aria-selected', 'false');
            link.id = `search-suggestion-${index + 1}`;
            link.dataset.index = String(index);

            const id = String(item?.id || '').trim();
            link.href = id ? `product-detail.html?id=${encodeURIComponent(id)}` : 'products.html';

            const textWrap = document.createElement('div');
            textWrap.className = 'header__search-suggestion-text';

            const name = document.createElement('span');
            const query = searchInput?.value || '';
            name.appendChild(buildHighlightedText(String(item?.name || '未命名手办'), query));
            textWrap.appendChild(name);

            const series = String(item?.series || '').trim();
            const category = String(item?.category?.name || '').trim();
            if (series || category) {
                const seriesEl = document.createElement('small');
                const line = series || category;
                seriesEl.appendChild(buildHighlightedText(line, query));
                textWrap.appendChild(seriesEl);
            }

            const price = document.createElement('span');
            price.textContent =
                typeof item?.price === 'number' ? `￥${item.price.toFixed(2)}` : '价格待定';

            link.appendChild(textWrap);
            link.appendChild(price);
            link.addEventListener('click', () => {
                clearSearchSuggestions();
            });

            box.appendChild(link);
        });

        const hint = document.createElement('div');
        hint.className = 'search-suggestions__hint';
        hint.textContent = '↑↓ 选择，回车进入详情';
        box.appendChild(hint);

        box.classList.add('is-visible');
        if (searchInput) searchInput.setAttribute('aria-expanded', 'true');
        activeSuggestionIndex = -1;
        updateSearchClearButton();
    }

    function handleSearchInput() {
        const value = searchInput?.value || '';
        const suggestions = getSearchSuggestions(value);
        if (!value.trim()) {
            clearSearchSuggestions();
            return;
        }
        renderSearchSuggestions(suggestions);
    }

    function handleSearchKeydown(event) {
        const box = ensureSearchSuggestions();
        if (!box || !box.classList.contains('is-visible')) return;
        const items = Array.from(box.querySelectorAll('.header__search-suggestion'));
        if (items.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            const next = activeSuggestionIndex + 1 >= items.length ? 0 : activeSuggestionIndex + 1;
            setActiveSuggestion(next);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            const next = activeSuggestionIndex - 1 < 0 ? items.length - 1 : activeSuggestionIndex - 1;
            setActiveSuggestion(next);
        } else if (event.key === 'Enter') {
            if (activeSuggestionIndex >= 0) {
                event.preventDefault();
                items[activeSuggestionIndex].click();
            }
        } else if (event.key === 'Escape') {
            if (searchInput && searchInput.value) {
                searchInput.value = '';
            }
            clearSearchSuggestions();
        }
    }

    function handleDropdown(dropdownItem, show) {
        const menu = dropdownItem.querySelector('.header__dropdown-menu');
        const toggle = dropdownItem.querySelector('.header__dropdown-toggle');
        if (menu) {
            if (show) {
                dropdownItem.classList.add('is-open');
                toggle?.setAttribute('aria-expanded', 'true');
                menu.setAttribute('aria-hidden', 'false');
                menu.style.display = 'block'; // Necessary for transition
                // Force reflow for transition
                void menu.offsetWidth;
                menu.style.opacity = '1';
                menu.style.visibility = 'visible';
                menu.style.transform = 'translateY(0)';
            } else {
                dropdownItem.classList.remove('is-open');
                toggle?.setAttribute('aria-expanded', 'false');
                menu.setAttribute('aria-hidden', 'true');
                menu.style.opacity = '0';
                menu.style.visibility = 'hidden';
                menu.style.transform = 'translateY(10px)';
                 // Reset display after transition (optional but good practice)
                 // setTimeout(() => { if (!dropdownItem.classList.contains('is-open')) menu.style.display = 'none'; }, 300); // Match transition duration
            }
        }
    }

    function closeAllDropdowns() {
        if (!dropdownItems || dropdownItems.length === 0) return;
        dropdownItems.forEach((item) => handleDropdown(item, false));
    }

    function handleGlobalKeydown(event) {
        if (!event || event.key !== 'Escape') return;

        const shouldCloseSearch = Boolean(searchBar?.classList.contains('is-open'));
        const shouldCloseMenu = Boolean(navigation?.classList.contains('is-open'));
        const shouldCloseDropdowns =
            Boolean(dropdownItems && Array.from(dropdownItems).some((item) => item.classList.contains('is-open')));

        if (!shouldCloseSearch && !shouldCloseMenu && !shouldCloseDropdowns) return;

        // 统一拦截一次默认行为，避免在某些浏览器里触发“退出全屏”等副作用
        event.preventDefault();

        if (shouldCloseSearch) {
            closeSearch();
            searchToggle?.focus();
        }

        if (shouldCloseDropdowns) closeAllDropdowns();

        if (shouldCloseMenu) {
            closeMobileMenu();
            menuToggle?.focus();
        }
    }

    function setActiveLink() {
        const currentUrl = new URL(window.location.href);
        const currentPage = Utils.getPageNameFromPath(currentUrl.pathname);
        const currentSearch = currentUrl.search || '';
        const currentHash = currentUrl.hash || '';

        // 先清理状态
        headerElement?.querySelectorAll('a[aria-current]').forEach((a) => a.removeAttribute('aria-current'));
        allNavLinks.forEach(link => {
            link.classList.remove('header__nav-link--active');
            link.closest('.header__nav-item--dropdown')?.classList.remove('header__nav-link--active');
        });

        const cartLink = headerElement?.querySelector('.header__action-link[href="cart.html"]');
        cartLink?.classList.remove('header__action-link--active');

        const favLink = headerElement?.querySelector('.header__action-link[href="favorites.html"]');
        favLink?.classList.remove('header__action-link--active');

        // 评分选择最佳匹配（兼容 http(s) 与 file://）
        let bestMatch = null;
        let bestScore = -1;

        allNavLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (!href || href === '#') return;

            let linkUrl;
            try {
                linkUrl = new URL(href, currentUrl);
            } catch {
                return;
            }

            const linkPage = Utils.getPageNameFromPath(linkUrl.pathname);
            if (linkPage !== currentPage) return;

            const linkSearch = linkUrl.search || '';
            const linkHash = linkUrl.hash || '';

            let score = 10; // page match
            if (linkSearch && linkSearch === currentSearch) score += 20;
            if (linkHash && linkHash === currentHash) score += 15;
            if (!linkSearch && !currentSearch) score += 5;
            if (!linkHash && !currentHash) score += 5;

            if (score > bestScore) {
                bestScore = score;
                bestMatch = link;
            }
        });

        // 分类相关页面：优先高亮“手办分类”入口
        if (['category.html', 'products.html', 'product-detail.html'].includes(currentPage)) {
            const dropdownToggle = headerElement?.querySelector('.header__dropdown-toggle[href="products.html"]');
            if (dropdownToggle) bestMatch = dropdownToggle;
        }

        if (bestMatch) {
            bestMatch.classList.add('header__nav-link--active');
            bestMatch.closest('.header__nav-item--dropdown')?.classList.add('header__nav-link--active');
            bestMatch.setAttribute('aria-current', 'page');
        }

        // 购物车页：高亮购物车图标
        if (currentPage === 'cart.html' && cartLink) {
            cartLink.classList.add('header__action-link--active');
            cartLink.setAttribute('aria-current', 'page');
        }

        // 收藏页：高亮收藏图标
        if (currentPage === 'favorites.html' && favLink) {
            favLink.classList.add('header__action-link--active');
            favLink.setAttribute('aria-current', 'page');
        }
    }

    function addEventListeners() {
        if (menuToggle) {
            menuToggle.addEventListener('click', toggleMobileMenu);
        }

        if (searchToggle) {
            searchToggle.addEventListener('click', toggleSearch);
        }

        // Close mobile menu when clicking a nav link
        navigation?.querySelectorAll('.header__nav-link:not(.header__dropdown-toggle), .header__dropdown-item a').forEach(link => {
             link.addEventListener('click', closeMobileMenu);
        });

        // Close menus if clicking outside
        document.addEventListener('click', (event) => {
            if (!headerElement) return;
            const isClickInsideHeader = headerElement.contains(event.target);
            const isClickInsideSearch = searchBar?.contains(event.target);

            if (!isClickInsideSearch) {
                clearSearchSuggestions();
            }

            if (!isClickInsideHeader) {
                closeMobileMenu();
                closeSearch();
                closeAllDropdowns();
            }
        });

        // Keyboard: ESC closes search/menu/dropdowns (可访问性增强)
        document.addEventListener('keydown', handleGlobalKeydown);

        // Dropdown handling (Desktop hover, Mobile click can be added)
         dropdownItems.forEach((item, index) => {
             const toggle = item.querySelector('.header__dropdown-toggle');
             const menu = item.querySelector('.header__dropdown-menu');
             if (toggle) {
                 toggle.setAttribute('aria-haspopup', 'true');
                 toggle.setAttribute('aria-expanded', item.classList.contains('is-open') ? 'true' : 'false');
                 if (menu) {
                     // Ensure deterministic id for aria-controls (stable across reloads)
                     if (!menu.id) menu.id = `header-dropdown-${index + 1}`;
                     toggle.setAttribute('aria-controls', menu.id);
                     menu.setAttribute('aria-hidden', item.classList.contains('is-open') ? 'false' : 'true');
                 }

                 // Keyboard: allow opening submenu without sacrificing "Enter to navigate"
                 toggle.addEventListener('keydown', (e) => {
                     if (!e) return;
                     if (e.key === 'ArrowDown' || e.key === ' ') {
                         e.preventDefault();
                         const currentlyOpen = item.classList.contains('is-open');
                         dropdownItems.forEach(otherItem => {
                             if (otherItem !== item) handleDropdown(otherItem, false);
                         });
                         handleDropdown(item, !currentlyOpen);
                         const firstLink = item.querySelector('.header__dropdown-menu a');
                         if (!currentlyOpen) firstLink?.focus?.();
                     }
                 });
             }

             // Desktop hover
             if (isDesktopNav()) {
                item.addEventListener('mouseenter', () => handleDropdown(item, true));
                item.addEventListener('mouseleave', () => handleDropdown(item, false));
             }
             // Mobile Click (Toggle)
             if (toggle) {
                 toggle.addEventListener('click', (e) => {
                     // Prevent default link behavior only if menu needs toggling on mobile
                     if (isMobileNav()) {
                          e.preventDefault();
                          const currentlyOpen = item.classList.contains('is-open');
                          // Close other open dropdowns first
                          dropdownItems.forEach(otherItem => {
                              if (otherItem !== item) handleDropdown(otherItem, false);
                          });
                          // Toggle current dropdown
                          handleDropdown(item, !currentlyOpen);
                     }
                 });
             }
        });

        // Throttle scroll event listener
        window.addEventListener('scroll', Utils.throttle(handleScroll, 100));

        // Add listener for search form submission
        if (searchForm) { // Check if the form element exists
            searchForm.addEventListener('submit', handleSearchSubmit);
        } else if (searchSubmitBtn) {
             // Fallback: If no form, listen to button click
             searchSubmitBtn.addEventListener('click', handleSearchSubmit);
        }

        // Optional: Allow Enter key in search input to trigger submit
         if (searchInput) {
             const debouncedSuggest = Utils.debounce(handleSearchInput, 160);
             searchInput.addEventListener('input', debouncedSuggest);
             searchInput.addEventListener('focus', handleSearchInput);
             searchInput.addEventListener('keydown', handleSearchKeydown);
             searchInput.addEventListener('keypress', (event) => {
                 if (event.key === 'Enter' && activeSuggestionIndex < 0) {
                     handleSearchSubmit(event);
                 }
             });
         }

        if (searchClearBtn && searchInput) {
            searchClearBtn.addEventListener('click', () => {
                searchInput.value = '';
                clearSearchSuggestions();
                searchInput.focus();
                updateSearchClearButton();
            });
        }
    }

    function init() {
        if (!headerElement) return;
        if (searchBar) {
            if (!searchBar.id) searchBar.id = 'header-search-bar';
            searchBar.setAttribute('aria-hidden', searchBar.classList.contains('is-open') ? 'false' : 'true');
            searchToggle?.setAttribute('aria-controls', searchBar.id);
        }
        if (searchClearBtn) {
            searchClearBtn.setAttribute('aria-hidden', 'true');
        }
        const suggestionBox = ensureSearchSuggestions();
        if (searchInput && suggestionBox) {
            if (!suggestionBox.id) suggestionBox.id = 'header-search-suggestions';
            searchInput.setAttribute('aria-controls', suggestionBox.id);
            searchInput.setAttribute('aria-autocomplete', 'list');
            searchInput.setAttribute('aria-expanded', 'false');
            searchInput.setAttribute('role', 'combobox');
            searchInput.setAttribute('aria-haspopup', 'listbox');
        }
        handleScroll(); // Initial check
        setActiveLink(); // Set active link on load
        addEventListeners();
    }

    return {
        init: init,
        updateCartCount: function(count) { // Expose function to update cart count
             const cartCountElement = headerElement?.querySelector('.header__cart-count');
             if (cartCountElement) {
                 const safeCount = Number(count) || 0;
                 cartCountElement.textContent = String(safeCount);
                 cartCountElement.style.display = safeCount > 0 ? 'inline-block' : 'none';
                 cartCountElement.setAttribute('aria-live', 'polite');
                 cartCountElement.setAttribute('aria-label', `购物车商品数量：${safeCount}`);
             }
         }
    };
})();

// ==============================================
// Smooth Scrolling Module
// ==============================================
const SmoothScroll = (function() {
    function init() {
        const currentUrl = new URL(window.location.href);
        const currentPage = Utils.getPageNameFromPath(currentUrl.pathname);

        // 兼容：
        // - href="#about"
        // - href="index.html#about"
        document.querySelectorAll('a[href*="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (!href || href === '#') return;

                let linkUrl;
                try {
                    linkUrl = new URL(href, currentUrl);
                } catch {
                    return;
                }

                const linkPage = Utils.getPageNameFromPath(linkUrl.pathname);
                if (linkPage !== currentPage) return;

                const hash = linkUrl.hash;
                if (!hash || hash.length < 2) return;

                try {
                    const targetElement = document.querySelector(hash);
                    if (!targetElement) return;
                    e.preventDefault();
                    const headerOffset = document.querySelector('.header')?.offsetHeight || 0;
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset - 10; // 10px buffer
                    window.scrollTo({ top: offsetPosition, behavior: Utils.prefersReducedMotion() ? 'auto' : 'smooth' });
                } catch (error) {
                    console.warn(`SmoothScroll: selector failed: ${hash}`, error);
                }
            });
        });
    }

    return { init: init };
})();

// ==============================================
// Scroll Progress Indicator
// ==============================================
const ScrollProgress = (function() {
    const bar = document.querySelector('.scroll-progress');

    function update() {
        if (!bar) return;
        const doc = document.documentElement;
        const max = Math.max(0, doc.scrollHeight - window.innerHeight);
        const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
        bar.style.width = `${Math.min(100, Math.max(0, progress)).toFixed(2)}%`;
    }

    function init() {
        if (!bar) return;
        update();
        window.addEventListener('scroll', Utils.throttle(update, 50), { passive: true });
        window.addEventListener('resize', Utils.throttle(update, 100));
    }

    return { init };
})();

// ==============================================
// Back To Top (Injected Button)
// ==============================================
const BackToTop = (function() {
    let button = null;

    function ensureButton() {
        if (button) return button;
        if (!document.body) return null;

        button = document.createElement('button');
        button.type = 'button';
        button.className = 'back-to-top';
        button.setAttribute('aria-label', '返回顶部');
        button.innerHTML = '<i class="fas fa-arrow-up" aria-hidden="true"></i>';
        document.body.appendChild(button);
        return button;
    }

    function updateVisibility() {
        const el = ensureButton();
        if (!el) return;
        const visible = window.scrollY > 520;
        el.classList.toggle('is-visible', visible);
    }

    function scrollToTop() {
        try {
            window.scrollTo({ top: 0, behavior: Utils.prefersReducedMotion() ? 'auto' : 'smooth' });
        } catch {
            window.scrollTo(0, 0);
        }
    }

    function init() {
        const el = ensureButton();
        if (!el) return;

        updateVisibility();
        window.addEventListener('scroll', Utils.throttle(updateVisibility, 120), { passive: true });
        el.addEventListener('click', scrollToTop);
    }

    return { init };
})();

// ==============================================
// Intersection Observer Animations Module
// ==============================================
const ScrollAnimations = (function() {
    function init() {
        const animatedElements = document.querySelectorAll('.fade-in-up:not(.is-visible)');

        // 可访问性：减少动态效果时直接显示（避免眩晕/不适）
        if (Utils.prefersReducedMotion()) {
            animatedElements.forEach((element) => {
                element.style.transitionDelay = '0ms';
                element.classList.add('is-visible');
            });
            return;
        }

        if (animatedElements.length > 0 && "IntersectionObserver" in window) {
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1 // Trigger when 10% visible
            });

            animatedElements.forEach((element, index) => {
                // Basic staggered delay, capped to avoid excessive delays on long lists
                const delay = Math.min(index, 10) * 50;
                element.style.transitionDelay = `${delay}ms`;
                observer.observe(element);
            });
        } else {
            // Fallback for older browsers or no elements
            animatedElements.forEach(element => element.classList.add('is-visible'));
        }
    }

    return { init: init };
})();

// ==============================================
// Lazy Loading Module
// ==============================================
const LazyLoad = (function() {
    function init() {
        const lazyImages = document.querySelectorAll('img.lazyload');

        if (lazyImages.length > 0 && "IntersectionObserver" in window) {
            const lazyImageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const lazyImage = entry.target;
                        if (lazyImage.dataset.src) {
                            lazyImage.src = lazyImage.dataset.src;
                            lazyImage.onload = () => {
                                // Optional: Actions after image is fully loaded
                                lazyImage.classList.add('loaded');
                                lazyImage.classList.remove('lazyload');
                            };
                            // Handle cases where image might fail to load
                            lazyImage.onerror = () => {
                                console.error(`Failed to load image: ${lazyImage.dataset.src}`);
                                lazyImage.classList.add('error'); // Add an error class for potential styling
                                lazyImage.classList.remove('lazyload');
                                lazyImage.src = 'assets/images/placeholder-lowquality.svg';
                            };
                        }
                        observer.unobserve(lazyImage);
                    }
                });
            }, {
                threshold: 0.01,
                rootMargin: "0px 0px 100px 0px" // Load 100px before viewport
            });

            lazyImages.forEach(lazyImage => {
                lazyImageObserver.observe(lazyImage);
            });
        } else {
            // Fallback
            lazyImages.forEach(lazyImage => {
                 if (lazyImage.dataset.src) {
                    lazyImage.src = lazyImage.dataset.src;
                    lazyImage.classList.add('loaded');
                    lazyImage.classList.remove('lazyload');
                }
            });
        }
    }

    return { init: init };
})();

// ==============================================
// Global Image Fallback
// ==============================================
const ImageFallback = (function() {
    const fallbackSrc = 'assets/images/placeholder-lowquality.svg';

    function handle(event) {
        const target = event?.target;
        if (!target || target.tagName !== 'IMG') return;
        if (target.dataset && target.dataset.fallbackApplied === '1') return;
        target.dataset.fallbackApplied = '1';
        target.classList.add('error');
        if (target.src !== fallbackSrc) {
            target.src = fallbackSrc;
        }
    }

    function init() {
        document.addEventListener('error', handle, true);
    }

    return { init };
})();

// ==============================================
// Toast / Feedback Module (轻量提示，不依赖外部库)
// ==============================================
const Toast = (function() {
    let container = null;

    function ensureContainer() {
        if (container) return container;
        container = document.querySelector('.toast-container');
        if (container) return container;

        container = document.createElement('div');
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-relevant', 'additions');
        document.body.appendChild(container);
        return container;
    }

    function show(message, type = 'info', durationMs = 2400) {
        if (!message) return;
        const root = ensureContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        root.appendChild(toast);

        // Trigger enter animation
        requestAnimationFrame(() => toast.classList.add('is-visible'));

        window.setTimeout(() => {
            toast.classList.remove('is-visible');
            toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        }, Math.max(800, durationMs));
    }

    return { show };
})();

// ==============================================
// Celebration / Confetti Module
// ==============================================
const Celebration = (function() {
    const palette = ['#1f6feb', '#ffb454', '#22d3ee', '#a78bfa', '#f472b6'];

    function fire(target, { count = 14 } = {}) {
        if (Utils.prefersReducedMotion()) return;
        const rect = target?.getBoundingClientRect?.();
        const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
        const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

        const burst = document.createElement('div');
        burst.className = 'confetti-burst';
        burst.style.position = 'fixed';
        burst.style.left = `${x}px`;
        burst.style.top = `${y}px`;
        burst.style.width = '0';
        burst.style.height = '0';

        for (let i = 0; i < count; i += 1) {
            const piece = document.createElement('span');
            piece.className = 'confetti-piece';
            piece.style.background = palette[i % palette.length];
            const angle = Math.random() * Math.PI * 2;
            const distance = 24 + Math.random() * 28;
            piece.style.setProperty('--confetti-x', `${Math.cos(angle) * distance}px`);
            piece.style.setProperty('--confetti-y', `${Math.sin(angle) * distance + 24}px`);
            piece.style.left = '0';
            piece.style.top = '0';
            burst.appendChild(piece);
        }

        document.body.appendChild(burst);
        window.setTimeout(() => burst.remove(), 1000);
    }

    return { fire };
})();

// ==============================================
// Theme Module (Light/Dark, persisted)
// ==============================================
const Theme = (function() {
    const storageKey = 'theme'; // 'light' | 'dark' | null(跟随系统)

    function getStoredTheme() {
        try {
            const v = localStorage.getItem(storageKey);
            if (v === 'light' || v === 'dark') return v;
            return null;
        } catch {
            return null;
        }
    }

    function getSystemTheme() {
        try {
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        } catch {
            return 'light';
        }
    }

    function getResolvedTheme() {
        return getStoredTheme() || getSystemTheme();
    }

    function setMetaThemeColor(theme) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) return;
        meta.setAttribute('content', theme === 'dark' ? '#0B1220' : '#00BCD4');
    }

    function updateToggleUI(theme) {
        const btn = document.querySelector('.header__theme-toggle');
        if (!btn) return;

        const isDark = theme === 'dark';
        btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
        btn.setAttribute('aria-label', isDark ? '切换到浅色模式' : '切换到深色模式');
        btn.innerHTML = isDark
            ? '<i class="fas fa-sun" aria-hidden="true"></i>'
            : '<i class="fas fa-moon" aria-hidden="true"></i>';
    }

    function applyTheme(theme, { persist = false } = {}) {
        const next = theme === 'dark' ? 'dark' : 'light';
        document.documentElement.dataset.theme = next;
        setMetaThemeColor(next);
        updateToggleUI(next);

        if (persist) {
            try { localStorage.setItem(storageKey, next); } catch { /* ignore */ }
        }
    }

    function toggleTheme() {
        const current = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next, { persist: true });
        if (typeof Toast !== 'undefined' && Toast.show) {
            Toast.show(next === 'dark' ? '已切换深色模式' : '已切换浅色模式', 'info', 1600);
        }
    }

    function init() {
        // 由 head 内联脚本提前设置 data-theme，避免闪烁；这里负责补齐 UI 状态与监听
        const theme = document.documentElement.dataset.theme || getResolvedTheme();
        applyTheme(theme, { persist: false });

        const btn = document.querySelector('.header__theme-toggle');
        if (btn) btn.addEventListener('click', toggleTheme);

        // 当未设置手动偏好时，跟随系统变化
        try {
            const mql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
            if (!mql) return;
            const onChange = () => {
                const stored = getStoredTheme();
                if (stored) return;
                applyTheme(getSystemTheme(), { persist: false });
            };
            if (typeof mql.addEventListener === 'function') mql.addEventListener('change', onChange);
            else if (typeof mql.addListener === 'function') mql.addListener(onChange);
        } catch {
            // ignore
        }
    }

    return { init, applyTheme, toggleTheme, getResolvedTheme };
})();

// ==============================================
// Favorites / Wishlist Module (localStorage)
// ==============================================
const Favorites = (function() {
    const storageKey = 'favorites'; // string[] of product IDs

    function safeParseArray(raw) {
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter((x) => typeof x === 'string' && x.trim().length > 0);
        } catch {
            return [];
        }
    }

    function getIds() {
        try {
            return safeParseArray(localStorage.getItem(storageKey));
        } catch {
            return [];
        }
    }

    function setIds(ids) {
        try {
            const clean = Array.from(new Set((ids || []).filter((x) => typeof x === 'string' && x.trim().length > 0)));
            localStorage.setItem(storageKey, JSON.stringify(clean));
            return clean;
        } catch {
            return [];
        }
    }

    function isFavorite(id) {
        if (!id) return false;
        return getIds().includes(id);
    }

    function updateHeaderCount(idsOrCount) {
        const el = document.querySelector('.header__fav-count');
        if (!el) return;

        const count = Array.isArray(idsOrCount) ? idsOrCount.length : Number(idsOrCount) || 0;
        el.textContent = String(count);
        el.style.display = count > 0 ? 'inline-block' : 'none';
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-label', `收藏数量：${count}`);
    }

    function applyButtonState(btn, active) {
        if (!btn) return;
        const isActive = Boolean(active);
        btn.classList.toggle('is-favorite', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        btn.setAttribute('aria-label', isActive ? '取消收藏' : '加入收藏');

        const icon = btn.querySelector('i');
        if (icon) {
            icon.classList.toggle('fa-solid', isActive);
            icon.classList.toggle('fa-regular', !isActive);
        }
    }

    function syncButtons(root = document) {
        if (!root || !root.querySelectorAll) return;
        const ids = getIds();
        root.querySelectorAll('.favorite-btn[data-product-id]').forEach((btn) => {
            const productId = btn.dataset.productId;
            applyButtonState(btn, ids.includes(productId));
        });
    }

    function dispatchChanged() {
        try {
            window.dispatchEvent(new CustomEvent('favorites:changed'));
        } catch {
            // ignore
        }
    }

    function toggle(id) {
        if (!id) return false;
        const current = new Set(getIds());
        const has = current.has(id);
        if (has) current.delete(id);
        else current.add(id);
        const next = setIds(Array.from(current));
        updateHeaderCount(next);
        dispatchChanged();
        return !has;
    }

    function handleClick(event) {
        const btn = event.target?.closest?.('.favorite-btn');
        if (!btn) return;
        const id = btn.dataset.productId;
        if (!id) return;

        event.preventDefault();
        event.stopPropagation();

        const nowActive = toggle(id);
        applyButtonState(btn, nowActive);
        if (nowActive && typeof Celebration !== 'undefined' && Celebration.fire) {
            Celebration.fire(btn);
        }
        if (typeof Toast !== 'undefined' && Toast.show) {
            Toast.show(nowActive ? '已加入收藏' : '已取消收藏', nowActive ? 'success' : 'info', 1600);
        }
    }

    function init() {
        updateHeaderCount(getIds());
        document.addEventListener('click', handleClick);
        syncButtons(document);
    }

    return { init, getIds, setIds, isFavorite, toggle, syncButtons, updateHeaderCount };
})();

// ==============================================
// Service Worker Module (PWA offline support)
// ==============================================
const ServiceWorker = (function() {
    function canRegister() {
        try {
            if (!('serviceWorker' in navigator)) return false;
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            return window.location.protocol === 'https:' || isLocalhost;
        } catch {
            return false;
        }
    }

    async function init() {
        if (!canRegister()) return;
        try {
            const registration = await navigator.serviceWorker.register('sw.js');

            // 自动更新：发现新 SW 后跳过等待并刷新（仅在“更新”场景触发）
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                refreshing = true;
                window.location.reload();
            });

            const trySkipWaiting = (worker) => {
                if (!worker) return;
                if (!navigator.serviceWorker.controller) return; // 首次安装不刷新
                try {
                    if (typeof Toast !== 'undefined' && Toast.show) {
                        Toast.show('发现新版本，正在更新…', 'info', 1600);
                    }
                    worker.postMessage({ type: 'SKIP_WAITING' });
                } catch {
                    // ignore
                }
            };

            // 如果已经处于 waiting，立即触发
            if (registration.waiting) trySkipWaiting(registration.waiting);

            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                if (!newWorker) return;

                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed') {
                        trySkipWaiting(newWorker);
                    }
                });
            });
        } catch (e) {
            console.warn('ServiceWorker 注册失败（可忽略）:', e);
        }
    }

    return { init };
})();

// ==============================================
// Shared Data (Simulated)
// ==============================================
const SharedData = (function() {
    const rawProducts = [
        // Scale Figures
        { 
            id: 'P001', 
            name: '初音未来 魔法未来 2023 Ver.', 
            category: { name: '比例手办', key: 'scale' }, 
            series: 'Character Vocal Series 01 初音未来', 
            price: 899.00, 
            originalPrice: 999.00, 
            description: '<p>以魔法未来2023主视觉形象为原型制作的1/7比例手办登场！由 LAM 绘制的充满活力的初音未来形象立体化。</p><p>服装细节、带有层次感的发型以及充满跃动感的姿态都经过精心制作。敬请将充满庆典氛围的特别版初音未来带回家吧！</p>', 
            specs: [ 
                { label: '制造商', value: 'Good Smile Company' }, 
                { label: '分类', value: '1/7比例手办' }, 
                { label: '发售日期', value: '2024/08' }, 
                { label: '原型制作', value: 'カタハライタシ' }, 
                { label: '材质', value: '塑料制' }, 
                { label: '尺寸', value: '全高约250mm' } 
            ], 
            images: [ 
                { thumb: 'assets/images/figurine-1.svg', large: 'assets/images/figurine-1.svg', alt: '初音未来 魔法未来 2023 正面图' },
                { thumb: 'assets/images/figurine-2.svg', large: 'assets/images/figurine-2.svg', alt: '初音未来 魔法未来 2023 侧面图' },
                { thumb: 'assets/images/figurine-3.svg', large: 'assets/images/figurine-3.svg', alt: '初音未来 魔法未来 2023 背面图' },
                { thumb: 'assets/images/figurine-4.svg', large: 'assets/images/figurine-4.svg', alt: '初音未来 魔法未来 2023 特写图' }
            ],
            dateAdded: '2024-01-15' // Keep dateAdded for sorting
        },
        { 
            id: 'P002', 
            name: '艾尔登法环 梅琳娜', 
            category: { name: '比例手办', key: 'scale' }, 
            series: '艾尔登法环', 
            price: 750.00, 
            description: '<p>《艾尔登法环》中的关键角色，引导褪色者前进的防火女梅琳娜，以优雅的姿态手办化。</p>', 
            specs: [
                { label: '制造商', value: 'Max Factory' }, 
                { label: '比例', value: '1/7' }, 
                { label: '材质', value: 'PVC & ABS' }
            ], 
            images: [
                { thumb: 'assets/images/figurine-2.svg', large: 'assets/images/figurine-2.svg', alt: '梅琳娜 正面' }
            ],
            dateAdded: '2024-01-10'
        },
        { 
            id: 'P006', // Match ID from original listing data
            name: '莱莎的炼金工房 莱莎琳·斯托特', 
            category: { name: '比例手办', key: 'scale' }, 
            series: '莱莎的炼金工房', 
            price: 920.00, 
            description: '<p>《莱莎的炼金工房～常暗女王与秘密藏身处～》中的主角「莱莎琳‧斯托特」化身为比例模型！</p>', 
            specs: [
                { label: '制造商', value: 'Good Smile Company' },
                { label: '比例', value: '1/7' },
                { label: '发售日期', value: '2021/11' } 
            ],
            images: [
                { thumb: 'assets/images/figurine-6.svg', large: 'assets/images/figurine-6.svg', alt: '莱莎琳·斯托特' } // Using placeholder as large for now
            ],
            dateAdded: '2023-12-20'
        },
        // Nendoroids
        { 
            id: 'P003', 
            name: '粘土人 孤独摇滚 后藤一里', 
            category: { name: '粘土人', key: 'nendoroid' }, 
            series: '孤独摇滚！', 
            price: 320.00, 
            description: '<p>来自超人气动画《孤独摇滚！》，主角"小孤独"后藤一里化身为粘土人登场！附带多种表情和配件，再现剧中的各种名场面吧！</p>', 
            specs: [
                { label: '制造商', value: 'Good Smile Company' }, 
                { label: '系列', value: '粘土人' }, 
                { label: '尺寸', value: '全高约100mm' }
            ], 
            images: [
                { thumb: 'assets/images/figurine-3.svg', large: 'assets/images/figurine-3.svg', alt: '后藤一里 粘土人' }
            ],
            dateAdded: '2024-02-01'
        },
        { 
            id: 'P007', 
            name: '粘土人 间谍过家家 阿尼亚·福杰', 
            category: { name: '粘土人', key: 'nendoroid' }, 
            series: '间谍过家家', 
            price: 299.00, 
            description: '<p>出自电视动画《SPY×FAMILY 间谍过家家》，「阿尼亚·福杰」化身为粘土人！</p>', 
            specs: [
                { label: '制造商', value: 'Good Smile Arts Shanghai' },
                { label: '系列', value: '粘土人' },
                { label: '尺寸', value: '全高约100mm' }
            ],
            images: [
                { thumb: 'assets/images/figurine-1.svg', large: 'assets/images/figurine-1.svg', alt: '阿尼亚·福杰 粘土人' }
            ],
            dateAdded: '2023-11-05'
        },
         { 
            id: 'P008', 
            name: '粘土人 电锯人 帕瓦', 
            category: { name: '粘土人', key: 'nendoroid' }, 
            series: '电锯人', 
            price: 310.00, 
            description: '<p>出自电视动画《链锯人》，「帕瓦」化身为粘土人登场！</p>', 
             specs: [
                { label: '制造商', value: 'Good Smile Company' },
                { label: '系列', value: '粘土人' },
                { label: '尺寸', value: '全高约100mm' }
            ],
             images: [
                 { thumb: 'assets/images/figurine-2.svg', large: 'assets/images/figurine-2.svg', alt: '帕瓦 粘土人' }
            ],
             dateAdded: '2024-01-25' 
        },
        // Figma
         { 
            id: 'P004', 
            name: 'figma 鬼灭之刃 灶门炭治郎 DX版', 
            category: { name: 'Figma', key: 'figma' }, 
            series: '鬼灭之刃', 
            price: 580.00, 
             description: '<p>出自电视动画《鬼灭之刃》，主角「灶门炭治郎」化身为figma可动模型再次登场！DX版追加丰富配件。</p>', 
             specs: [
                 { label: '制造商', value: 'Max Factory' },
                 { label: '系列', value: 'figma' },
                 { label: '尺寸', value: '全高约135mm' }
            ],
             images: [
                 { thumb: 'assets/images/figurine-4.svg', large: 'assets/images/figurine-4.svg', alt: '灶门炭治郎 figma' }
            ],
             dateAdded: '2023-10-15' 
        },
         { 
            id: 'P009', 
            name: 'figma 赛马娘 Pretty Derby 东海帝皇', 
            category: { name: 'Figma', key: 'figma' }, 
            series: '赛马娘 Pretty Derby', 
            price: 550.00, 
             description: '<p>出自游戏《赛马娘Pretty Derby》，不屈的赛马娘「东海帝皇」化身为figma模型登场！</p>', 
             specs: [
                 { label: '制造商', value: 'Max Factory' },
                 { label: '系列', value: 'figma' },
                 { label: '尺寸', value: '全高约130mm' }
            ],
             images: [
                 { thumb: 'assets/images/figurine-3.svg', large: 'assets/images/figurine-3.svg', alt: '东海帝皇 figma' }
            ],
             dateAdded: '2024-02-10' 
        },
        // Other
         { 
            id: 'P005', 
            name: 'POP UP PARADE hololive 噶呜·古拉', 
            category: { name: '其他手办', key: 'other' }, 
            series: 'hololive production', 
            price: 250.00, 
             description: '<p>「POP UP PARADE」是全新的模型系列商品，让人不禁手滑订购的亲民价格、方便摆饰的全高17～18cm尺寸、短期内发售等，拥有令模型粉丝开心的各项特点。</p>', 
             specs: [
                 { label: '制造商', value: 'Good Smile Company' },
                 { label: '系列', value: 'POP UP PARADE' },
                 { label: '尺寸', value: '全高约160mm' }
            ],
             images: [
                 { thumb: 'assets/images/figurine-5.svg', large: 'assets/images/figurine-5.svg', alt: '噶呜·古拉 POP UP PARADE' }
            ],
             dateAdded: '2023-09-30' 
        },
         { 
            id: 'P010', 
            name: 'MODEROID PUI PUI 天竺鼠车车', 
            category: { name: '其他手办', key: 'other' }, 
            series: 'PUI PUI 天竺鼠车车', 
            price: 180.00, 
             description: '<p>出自超人气定格动画《PUI PUI 天竺鼠车车》，天竺鼠车车们化身为组装模型！</p>', 
             specs: [
                 { label: '制造商', value: 'Good Smile Company' },
                 { label: '系列', value: 'MODEROID' },
                 { label: '分类', value: '组装模型' }
            ],
             images: [
                 { thumb: 'assets/images/figurine-4.svg', large: 'assets/images/figurine-4.svg', alt: '天竺鼠车车 MODEROID' }
            ],
             dateAdded: '2023-11-20' 
        }
    ];

    const allProducts = rawProducts.map((product, index) => {
        const rating = Number.isFinite(Number(product.rating))
            ? Number(product.rating)
            : Number((4.6 + (index % 4) * 0.1).toFixed(1));
        const reviewCount = Number.isFinite(Number(product.reviewCount))
            ? Number(product.reviewCount)
            : 120 + index * 27;
        const rarity = typeof product.rarity === 'string' ? product.rarity : (index % 3 === 0 ? '限定' : '常规');
        const status = typeof product.status === 'string' ? product.status : (index % 4 === 0 ? '预售' : '现货');
        const tags = Array.isArray(product.tags) ? [...product.tags] : [];

        if (rarity === '限定' && !tags.includes('limited')) tags.push('limited');
        if (status === '预售' && !tags.includes('preorder')) tags.push('preorder');
        if (rating >= 4.8 && !tags.includes('hot')) tags.push('hot');

        const dateAdded = product.dateAdded
            ? product.dateAdded
            : new Date(2024, 0, 1 + index * 18).toISOString().slice(0, 10);

        return {
            ...product,
            rating,
            reviewCount,
            rarity,
            status,
            tags,
            dateAdded
        };
    });

    const categoryNames = {
        scale: '比例手办',
        nendoroid: '粘土人',
        figma: 'Figma',
        other: '其他手办',
        all: '所有手办'
    };

    function getProductById(id) {
        const key = String(id || '').trim();
        if (!key) return null;
        return allProducts.find((item) => item.id === key) || null;
    }

    function getProductsByIds(ids) {
        const list = Array.isArray(ids) ? ids : [];
        if (list.length === 0) return [];
        const map = new Map(allProducts.map((item) => [item.id, item]));
        return list
            .map((id) => map.get(String(id || '').trim()))
            .filter(Boolean);
    }

    function getCurationProducts(key) {
        const list = [...allProducts];
        if (key === 'hot') {
            return list.filter((p) => p.tags?.includes('hot')).slice(0, 6);
        }
        if (key === 'new') {
            return list
                .sort((a, b) => Date.parse(b.dateAdded || '') - Date.parse(a.dateAdded || ''))
                .slice(0, 6);
        }
        if (key === 'limited') {
            return list.filter((p) => p.tags?.includes('limited')).slice(0, 6);
        }
        return list.slice(0, 6);
    }

    return {
        getAllProducts: () => allProducts,
        getCategoryName: (key) => categoryNames[key] || key, // Helper to get category name
        getProductById,
        getProductsByIds,
        getCurationProducts
    };
})();

// ==============================================
// Recently Viewed Module (localStorage)
// ==============================================
const RecentlyViewed = (function() {
    const storageKey = 'recentlyViewed';
    const maxItems = 6;

    const container = document.querySelector('.recently-viewed');
    const grid = container?.querySelector('.recently-viewed__grid');
    const emptyState = container?.querySelector('.recently-viewed__empty');
    const clearBtn = container?.querySelector('.recently-viewed__clear');

    function getIds() {
        try {
            const parsed = Utils.safeJsonParse(localStorage.getItem(storageKey), []);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter((id) => typeof id === 'string' && id.trim().length > 0);
        } catch {
            return [];
        }
    }

    function saveIds(ids) {
        try {
            const clean = Array.from(
                new Set((ids || []).map((id) => String(id || '').trim()).filter((id) => id)),
            );
            localStorage.setItem(storageKey, JSON.stringify(clean));
            return clean;
        } catch {
            return [];
        }
    }

    function record(id) {
        const key = String(id || '').trim();
        if (!key) return;
        const ids = getIds();
        const next = [key, ...ids.filter((x) => x !== key)].slice(0, maxItems);
        saveIds(next);
        try {
            window.dispatchEvent(new CustomEvent('recent:changed'));
        } catch {
            // ignore
        }
    }

    function clearAll() {
        saveIds([]);
        try {
            window.dispatchEvent(new CustomEvent('recent:changed'));
        } catch {
            // ignore
        }
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

        grid.innerHTML = '';
        products.forEach((product) => {
            if (typeof ProductListing !== 'undefined' && ProductListing.createProductCardHTML) {
                grid.innerHTML += ProductListing.createProductCardHTML(product);
            }
        });

        container.classList.remove('is-empty');
        if (clearBtn) clearBtn.disabled = false;
        if (typeof LazyLoad !== 'undefined' && LazyLoad.init) LazyLoad.init();
        if (typeof Favorites !== 'undefined' && Favorites.syncButtons) Favorites.syncButtons(grid);
        if (typeof ScrollAnimations !== 'undefined' && ScrollAnimations.init) ScrollAnimations.init();
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
const PDP = (function() {
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
    const maxQuantity = 99;

    let favoriteBtn = actionsContainer?.querySelector('.favorite-btn--pdp') || null;
    let shareBtn = actionsContainer?.querySelector('.share-btn--pdp') || null;

    let currentProductData = null;

    function ensureFavoriteButton(productId) {
        if (!actionsContainer) return null;
        if (!favoriteBtn) {
            favoriteBtn = document.createElement('button');
            favoriteBtn.type = 'button';
            favoriteBtn.className = 'favorite-btn favorite-btn--pdp';
            favoriteBtn.setAttribute('aria-label', '加入收藏');
            favoriteBtn.setAttribute('aria-pressed', 'false');
            favoriteBtn.innerHTML =
                '<i class="fa-regular fa-heart" aria-hidden="true"></i><span class="favorite-btn__text">收藏</span>';
            actionsContainer.appendChild(favoriteBtn);
        }

        if (productId) favoriteBtn.dataset.productId = productId;
        if (typeof Favorites !== 'undefined' && Favorites.syncButtons) Favorites.syncButtons(actionsContainer);
        return favoriteBtn;
    }

    function ensureShareButton() {
        if (!actionsContainer) return null;
        if (!shareBtn) {
            shareBtn = document.createElement('button');
            shareBtn.type = 'button';
            shareBtn.className = 'share-btn share-btn--pdp';
            shareBtn.setAttribute('aria-label', '复制当前商品链接');
            shareBtn.innerHTML = '<i class="fas fa-link" aria-hidden="true"></i><span class="share-btn__text">复制链接</span>';
            actionsContainer.appendChild(shareBtn);
        }
        return shareBtn;
    }

    async function copyToClipboard(text) {
        const value = String(text || '');
        if (!value) return false;

        // Prefer modern clipboard API (requires secure context)
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(value);
                return true;
            }
        } catch {
            // ignore and fallback
        }

        // Fallback: temporary textarea + execCommand (legacy)
        try {
            const textarea = document.createElement('textarea');
            textarea.value = value;
            textarea.setAttribute('readonly', 'true');
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '0';
            document.body.appendChild(textarea);
            textarea.select();
            const ok = document.execCommand && document.execCommand('copy');
            textarea.remove();
            return Boolean(ok);
        } catch {
            return false;
        }
    }

    function initShareButton() {
        const btn = ensureShareButton();
        if (!btn) return;
        btn.addEventListener('click', async () => {
            const url = (() => {
                try { return new URL(window.location.href).toString(); } catch { return window.location.href; }
            })();

            const ok = await copyToClipboard(url);
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
        ensureShareButton();
        if (typeof RecentlyViewed !== 'undefined' && RecentlyViewed.record) {
            RecentlyViewed.record(product.id);
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
                const icon = document.createElement("i");
                icon.className = "fas fa-star";
                icon.setAttribute("aria-hidden", "true");
                ratingElement.appendChild(icon);
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
        priceElement.textContent = typeof product.price === "number" ? `￥${product.price.toFixed(2)}` : "价格待定";
        if (originalPriceElement) {
            if (product.originalPrice && product.originalPrice > product.price) {
                originalPriceElement.textContent = `¥${product.originalPrice.toFixed(2)}`;
                originalPriceElement.style.display = 'inline';
            } else {
                originalPriceElement.style.display = 'none';
            }
        }

        // Update Image Gallery (Handle missing thumbnailContainer gracefully)
        if (product.images && product.images.length > 0) {
            mainImage.src = product.images[0].large;
            mainImage.alt = product.images[0].alt || product.name;
            mainImage.decoding = 'async';
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
                product.specs.forEach(spec => {
                    const specItem = document.createElement('li');
                    specItem.classList.add('product-specs__item');
                    specItem.innerHTML = `
                        <span class="product-specs__label">${spec.label}:</span>
                        <span class="product-specs__value">${spec.value}</span>
                    `;
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
                 const descHeader = descriptionContainer.querySelector('h4');
                 descriptionContainer.querySelectorAll('p').forEach(p => p.remove());
                 if (descHeader) {
                    descHeader.insertAdjacentHTML('afterend', product.description);
                 } else {
                     descriptionContainer.innerHTML = `<h4>商品描述</h4>${product.description}`;
                 }
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

        const productToAdd = {
            id: currentProductData.id,
            name: currentProductData.name,
            price: currentProductData.price,
            image: currentProductData.images && currentProductData.images.length > 0 ? currentProductData.images[0].thumb : 'assets/images/figurine-1.svg',
            quantity: parseInt(quantityInput.value, 10) || 1
        };

        let cart = [];
        try {
            if (typeof Cart !== 'undefined' && typeof Cart.getCart === 'function') {
                cart = Cart.getCart();
            } else {
                const parsed = Utils.safeJsonParse(localStorage.getItem('cart'), []);
                cart = Array.isArray(parsed) ? parsed : [];
            }
        } catch {
            cart = [];
        }
        const existingItemIndex = cart.findIndex(item => item.id === productToAdd.id);

        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += productToAdd.quantity;
        } else {
            cart.push(productToAdd);
        }

        // 优先走 Cart.setCart：统一归一化/事件派发/本地写入
        if (typeof Cart !== 'undefined' && typeof Cart.setCart === 'function') {
            Cart.setCart(cart);
        } else {
            try { localStorage.setItem('cart', JSON.stringify(cart)); } catch { /* ignore */ }

            // Fallback：至少更新头部角标
            if (typeof Cart !== 'undefined' && Cart.updateHeaderCartCount) {
                Cart.updateHeaderCartCount(cart);
            } else {
                console.error("PDP Error: Cart module or updateHeaderCartCount function not available.");
                if (typeof Header !== 'undefined' && Header.updateCartCount) {
                    const totalQuantity = cart.reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
                    Header.updateCartCount(totalQuantity);
                }
            }
        }

        // Visual feedback (Keep existing)
        const originalText = addToCartBtn.innerHTML;
        addToCartBtn.innerHTML = '已添加 <i class="fas fa-check"></i>';
        addToCartBtn.disabled = true;
        setTimeout(() => {
            if (addToCartBtn) {
                 addToCartBtn.innerHTML = originalText;
                 addToCartBtn.disabled = false;
            }
        }, 1500);

        if (typeof Toast !== 'undefined' && Toast.show) {
            const addedCount = productToAdd.quantity > 1 ? ` ×${productToAdd.quantity}` : '';
            Toast.show(`已加入购物车${addedCount}`, 'success');
        }
        if (typeof Celebration !== 'undefined' && Celebration.fire) {
            Celebration.fire(addToCartBtn);
        }
    }

    function initAddToCart() {
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', handleAddToCart);
        }
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
        } else {
            console.error("PDP module initialization failed due to population errors.");
        }
    }

    return { init: init };
})();

// ==============================================
// Cart Module (Modified to use Cart.updateHeaderCartCount internally)
// ==============================================
const Cart = (function() {
    const cartContainer = document.querySelector('.cart-main');

    const cartItemsContainer = cartContainer?.querySelector('.cart-items');
    const cartSummaryContainer = cartContainer?.querySelector('.cart-summary');
    const emptyCartMessage = cartContainer?.querySelector('.empty-cart-message');
    const checkoutButton = cartSummaryContainer?.querySelector('.checkout-button');
    let clearCartButton = cartSummaryContainer?.querySelector('.cart-clear-button') || null;
    const recommendationContainer = cartContainer?.querySelector('[data-cart-recommendations]');
    const recommendationsGrid = recommendationContainer?.querySelector('.recommendations-grid');
    let dragBound = false;
    let draggingItem = null;

    function normalizeCartItems(items) {
        if (!Array.isArray(items)) return [];
        const out = [];

        items.forEach((raw) => {
            if (!raw || typeof raw !== 'object') return;
            const id = typeof raw.id === 'string' ? raw.id.trim() : String(raw.id || '').trim();
            if (!id) return;

            const quantity = Number.parseInt(raw.quantity, 10);
            const safeQuantityRaw = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
            const safeQuantity = Math.min(99, safeQuantityRaw);

            const price = Number(raw.price);
            const safePrice = Number.isFinite(price) && price >= 0 ? price : 0;

            const name = typeof raw.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : '[手办名称]';
            const series = typeof raw.series === 'string' ? raw.series.trim() : '';
            const image =
                typeof raw.image === 'string' && raw.image.trim().length > 0 ? raw.image.trim() : 'assets/images/figurine-1.svg';

            out.push({ id, name, series, price: safePrice, quantity: safeQuantity, image });
        });

        return out;
    }

    // --- Cart State Management --- 
    function getCart() {
        const parsed = Utils.safeJsonParse(localStorage.getItem('cart'), []);
        return normalizeCartItems(parsed);
    }

    // Internal function to update header count
    function _updateHeaderCartCount(cart) {
         if (typeof Header !== 'undefined' && Header.updateCartCount) {
            const totalQuantity = (Array.isArray(cart) ? cart : []).reduce((sum, item) => sum + (Number(item?.quantity) || 0), 0);
            Header.updateCartCount(totalQuantity);
        }
    }

    function updateHeaderCartCount(cartOrItems) {
        const normalized = normalizeCartItems(cartOrItems);
        _updateHeaderCartCount(normalized);
        return normalized;
    }

    function dispatchChanged() {
        try { window.dispatchEvent(new CustomEvent('cart:changed')); } catch { /* ignore */ }
    }

    function saveCart(cart) {
        const normalized = normalizeCartItems(cart);
        try { localStorage.setItem('cart', JSON.stringify(normalized)); } catch { /* ignore */ }
        _updateHeaderCartCount(normalized); // Use internal function
        dispatchChanged();
    }
    
    // --- Rendering Functions --- (Keep existing renderCartItem, renderCart, updateCartSummary)
    function renderCartItem(item) {
         // ... (no changes needed here)
          const rawId = String(item?.id || '').trim();
        const encodedId = rawId ? encodeURIComponent(rawId) : '';
        const detailHref = rawId ? `product-detail.html?id=${encodedId}` : 'products.html';

        const safeIdAttr = Utils.escapeHtml(rawId);
        const safeName = Utils.escapeHtml(item?.name || '[手办名称]');
        const safeSeries = Utils.escapeHtml(item?.series || '[系列/来源占位]');
        const safeImage = Utils.escapeHtml(item?.image || 'assets/images/figurine-1.svg');

        const price = typeof item?.price === 'number' ? item.price : Number(item?.price) || 0;
        const q = Number.parseInt(item?.quantity, 10);
        const quantity = Number.isFinite(q) && q > 0 ? q : 1;
        const subtotal = price * quantity;

        return `
            <div class="cart-item" data-product-id="${safeIdAttr}" draggable="true">
                <div class="cart-item__drag" title="拖拽排序" aria-hidden="true"><i class="fas fa-grip-vertical"></i></div>
                <div class="cart-item__image">
                    <a href="${detailHref}">
                        <img src="${safeImage}" alt="${safeName}">
                    </a>
                </div>
                <div class="cart-item__info">
                    <h4 class="cart-item__title"><a href="${detailHref}">${safeName}</a></h4>
                    <p class="cart-item__series">${safeSeries}</p> 
                    <span class="cart-item__price">¥${price.toFixed(2)}</span>
                </div>
                <div class="cart-item__quantity quantity-selector">
                    <button class="quantity-selector__button minus" aria-label="减少数量" ${quantity <= 1 ? 'disabled' : ''}>-</button>
                    <input class="quantity-selector__input" type="number" value="${quantity}" min="1" max="99" inputmode="numeric" aria-label="商品数量">
                    <button class="quantity-selector__button plus" aria-label="增加数量">+</button>
                </div>
                <div class="cart-item__total">
                    <span>小计:</span> ¥<span class="subtotal-value">${subtotal.toFixed(2)}</span>
                </div>
                <div class="cart-item__remove">
                    <button class="remove-btn" aria-label="移除商品"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
        `;
    }

    function renderRecommendationCard(product) {
        if (!product) return '';
        const id = String(product.id || '').trim();
        if (!id) return '';
        const safeId = Utils.escapeHtml(id);
        const name = Utils.escapeHtml(product.name || '未命名手办');
        const series = Utils.escapeHtml(product.series || '');
        const image = product.images?.[0]?.thumb || 'assets/images/figurine-1.svg';
        const safeImage = Utils.escapeHtml(image);
        const price = typeof product.price === 'number' ? `￥${product.price.toFixed(2)}` : '价格待定';
        const detailHref = `product-detail.html?id=${encodeURIComponent(id)}`;

        return `
            <article class="recommendation-card">
                <a href="${detailHref}">
                    <img src="${safeImage}" alt="${name}" loading="lazy" decoding="async">
                </a>
                <div class="recommendation-card__title">${name}</div>
                <div class="recommendation-card__series">${series}</div>
                <div class="recommendation-card__price">${price}</div>
                <div class="recommendation-card__action">
                    <button class="product-card__quick-add" type="button" data-product-id="${safeId}">加入购物车</button>
                </div>
            </article>
        `;
    }

    function renderRecommendations(cart) {
        if (!recommendationContainer || !recommendationsGrid) return;
        if (cart.length === 0) {
            recommendationContainer.style.display = 'none';
            return;
        }
        recommendationContainer.style.display = 'block';
        if (typeof SharedData === 'undefined' || !SharedData.getAllProducts) return;

        const allProducts = SharedData.getAllProducts();
        const cartProducts = cart
            .map((item) => SharedData.getProductById?.(item.id))
            .filter(Boolean);
        const cartCategories = new Set(cartProducts.map((p) => p.category?.key).filter(Boolean));
        const cartIds = new Set(cart.map((item) => item.id));

        let pool = allProducts.filter((p) => !cartIds.has(p.id));
        if (cartCategories.size > 0) {
            pool = pool.filter((p) => cartCategories.has(p.category?.key));
        }
        const picks = pool.slice(0, 3);

        recommendationsGrid.innerHTML = picks.length
            ? picks.map(renderRecommendationCard).join('')
            : '<p class="text-center">暂无可用推荐，继续探索更多收藏吧。</p>';

        if (typeof Favorites !== 'undefined' && Favorites.syncButtons) {
            Favorites.syncButtons(recommendationsGrid);
        }
    }
    
    function renderCart() {
        // ... (no changes needed here)
         if (!cartItemsContainer || !cartSummaryContainer || !emptyCartMessage) return;

        const cart = getCart();
        cartItemsContainer.setAttribute('aria-busy', 'true');
        cartItemsContainer.innerHTML = ''; // Clear existing items

        if (cart.length === 0) {
            emptyCartMessage.style.display = 'block';
            cartSummaryContainer.style.display = 'none'; // Hide summary
            cartItemsContainer.style.display = 'none'; // Hide items container
        } else {
            emptyCartMessage.style.display = 'none';
            cartSummaryContainer.style.display = 'block'; // Show summary
            cartItemsContainer.style.display = 'block'; // Show items container
            ensureClearCartButton();
            cart.forEach(item => {
                cartItemsContainer.innerHTML += renderCartItem(item);
            });
            updateCartSummary(cart);
            addCartItemEventListeners(); // Re-attach listeners after rendering
            bindDragAndDrop();
        }
        renderRecommendations(cart);
        cartItemsContainer.setAttribute('aria-busy', 'false');
    }

    function updateCartSummary(cart) {
         // ... (no changes needed here)
        const subtotalElement = cartSummaryContainer?.querySelector('.summary-subtotal');
        const shippingElement = cartSummaryContainer?.querySelector('.summary-shipping');
        const totalElement = cartSummaryContainer?.querySelector('.total-price');
        
        if (!subtotalElement || !shippingElement || !totalElement) return;

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingCost = 0; // Placeholder for shipping calculation
        const total = subtotal + shippingCost;

        subtotalElement.textContent = `¥${subtotal.toFixed(2)}`;
        shippingElement.textContent = `¥${shippingCost.toFixed(2)}`;
        totalElement.textContent = `¥${total.toFixed(2)}`;

        if (checkoutButton) {
            checkoutButton.classList.toggle('disabled', cart.length === 0);
            if(cart.length === 0) {
                 checkoutButton.setAttribute('aria-disabled', 'true');
                 checkoutButton.removeAttribute('href'); 
            } else {
                 checkoutButton.removeAttribute('aria-disabled');
                 checkoutButton.setAttribute('href', 'checkout.html');
            }
        }
    }

    function ensureClearCartButton() {
        if (!cartSummaryContainer) return null;
        if (clearCartButton) return clearCartButton;

        clearCartButton = document.createElement('button');
        clearCartButton.type = 'button';
        clearCartButton.className = 'cta-button-secondary cart-clear-button';
        clearCartButton.textContent = '清空购物车';
        clearCartButton.setAttribute('aria-label', '清空购物车');

        const continueLink = cartSummaryContainer.querySelector('.continue-shopping-link');
        if (continueLink) cartSummaryContainer.insertBefore(clearCartButton, continueLink);
        else cartSummaryContainer.appendChild(clearCartButton);

        clearCartButton.addEventListener('click', () => {
            const cart = getCart();
            if (cart.length === 0) return;
            const ok = window.confirm('确定要清空购物车吗？此操作不可撤销。');
            if (!ok) return;
            setCart([]);
            if (typeof Toast !== 'undefined' && Toast.show) {
                Toast.show('购物车已清空', 'success', 1800);
            }
        });

        return clearCartButton;
    }

    // --- Event Handlers --- (Keep existing handleQuantityChange, handleRemoveItem, addCartItemEventListeners)
    function handleQuantityChange(productId, newQuantity) {
       // ... (no changes needed here)
         let cart = getCart();
        const itemIndex = cart.findIndex(item => item.id === productId);

        if (itemIndex > -1 && newQuantity >= 1) {
            const safeQuantity = Math.min(99, Math.max(1, newQuantity));
            cart[itemIndex].quantity = safeQuantity;
            saveCart(cart);
            renderCart(); // Re-render the cart to update subtotals and summary
        } else if (itemIndex > -1 && newQuantity < 1) {
             cart[itemIndex].quantity = 1;
             saveCart(cart);
             renderCart();
        }
    }

    function handleRemoveItem(productId) {
         // ... (no changes needed here)
         let cart = getCart();
        cart = cart.filter(item => item.id !== productId);
        saveCart(cart);
        renderCart(); // Re-render the cart
    }

    function addCartItemEventListeners() {
        // ... (no changes needed here)
         cartItemsContainer.querySelectorAll('.cart-item').forEach(itemElement => {
            const productId = itemElement.dataset.productId;
            const quantityInput = itemElement.querySelector('.quantity-selector__input');
            const minusBtn = itemElement.querySelector('.quantity-selector__button.minus');
            const plusBtn = itemElement.querySelector('.quantity-selector__button.plus');
            const removeBtn = itemElement.querySelector('.remove-btn');
            
            if (quantityInput && minusBtn && plusBtn) {
                const syncButtons = () => {
                    const qty = parseInt(quantityInput.value, 10) || 1;
                    minusBtn.disabled = qty <= 1;
                    plusBtn.disabled = qty >= 99;
                };
                syncButtons();

                minusBtn.addEventListener('click', () => {
                    let currentQuantity = parseInt(quantityInput.value, 10);
                    if (currentQuantity > 1) {
                        quantityInput.value = currentQuantity - 1;
                        handleQuantityChange(productId, currentQuantity - 1);
                    }
                    syncButtons();
                });

                plusBtn.addEventListener('click', () => {
                    let currentQuantity = parseInt(quantityInput.value, 10);
                    if (currentQuantity < 99) {
                        quantityInput.value = currentQuantity + 1;
                        handleQuantityChange(productId, currentQuantity + 1);
                    }
                    syncButtons();
                });

                quantityInput.addEventListener('change', () => {
                    let newQuantity = parseInt(quantityInput.value, 10);
                    if (isNaN(newQuantity) || newQuantity < 1) {
                        newQuantity = 1;
                        quantityInput.value = 1;
                    }
                    if (newQuantity > 99) {
                        newQuantity = 99;
                        quantityInput.value = 99;
                    }
                    handleQuantityChange(productId, newQuantity);
                    syncButtons();
                });
                 quantityInput.addEventListener('input', () => {
                    quantityInput.value = quantityInput.value.replace(/[^0-9]/g, '');
                 });
            }

            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    handleRemoveItem(productId);
                });
            }
        });
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.cart-item:not(.is-dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
    }

    function commitOrderFromDom() {
        if (!cartItemsContainer) return;
        const ids = Array.from(cartItemsContainer.querySelectorAll('.cart-item'))
            .map((el) => el.dataset.productId)
            .filter(Boolean);
        if (ids.length === 0) return;
        const cart = getCart();
        const map = new Map(cart.map((item) => [item.id, item]));
        const next = ids.map((id) => map.get(id)).filter(Boolean);
        saveCart(next);
        renderCart();
    }

    function bindDragAndDrop() {
        if (!cartItemsContainer || dragBound) return;
        dragBound = true;

        cartItemsContainer.addEventListener('dragstart', (event) => {
            const item = event.target?.closest?.('.cart-item');
            if (!item) return;
            draggingItem = item;
            item.classList.add('is-dragging');
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
            }
        });

        cartItemsContainer.addEventListener('dragover', (event) => {
            if (!draggingItem) return;
            event.preventDefault();
            const afterElement = getDragAfterElement(cartItemsContainer, event.clientY);
            if (!afterElement) {
                cartItemsContainer.appendChild(draggingItem);
            } else if (afterElement !== draggingItem) {
                cartItemsContainer.insertBefore(draggingItem, afterElement);
            }
        });

        cartItemsContainer.addEventListener('dragend', () => {
            if (!draggingItem) return;
            draggingItem.classList.remove('is-dragging');
            draggingItem = null;
            commitOrderFromDom();
        });
    }

    // --- Initialization --- 
    function init() {
        refresh();
        if (cartItemsContainer) {
            cartItemsContainer.setAttribute('aria-live', 'polite');
            cartItemsContainer.setAttribute('aria-busy', 'false');
        }
    }

    function refresh() {
        // 始终更新 Header 购物车数量（让所有页面都能显示正确角标）
        const cart = getCart();
        _updateHeaderCartCount(cart);

        // 仅在购物车页做完整渲染
        if (cartContainer) renderCart();
    }

    function setCart(items) {
        saveCart(items);
        if (cartContainer) renderCart();
    }

    function addItem(product, quantity = 1) {
        if (!product || !product.id) return { added: 0 };
        const safeQty = Math.min(99, Math.max(1, Number(quantity) || 1));
        const cart = getCart();
        const existing = cart.find((item) => item.id === product.id);
        if (existing) {
            existing.quantity = Math.min(99, existing.quantity + safeQty);
        } else {
            cart.push({
                id: product.id,
                name: product.name || '[手办名称]',
                series: product.series || '',
                price: Number(product.price) || 0,
                quantity: safeQty,
                image: product.images?.[0]?.thumb || 'assets/images/figurine-1.svg'
            });
        }
        saveCart(cart);
        if (cartContainer) renderCart();
        return { added: safeQty };
    }

    // Expose functions needed by other modules
    return { 
        init: init, 
        getCart: getCart,
        refresh: refresh,
        setCart: setCart,
        addItem: addItem,
        updateHeaderCartCount: updateHeaderCartCount // Expose wrapper that normalizes input
    };
})();

// ==============================================
// Quick Add Module (Product Cards)
// ==============================================
const QuickAdd = (function() {
    function handleClick(event) {
        const btn = event.target?.closest?.('.product-card__quick-add');
        if (!btn) return;
        event.preventDefault();
        event.stopPropagation();

        const id = btn.dataset.productId;
        if (!id || typeof SharedData === 'undefined' || !SharedData.getProductById) return;
        const product = SharedData.getProductById(id);
        if (!product) {
            if (typeof Toast !== 'undefined' && Toast.show) {
                Toast.show('商品信息加载失败', 'info', 1600);
            }
            return;
        }

        const result = typeof Cart !== 'undefined' && Cart.addItem ? Cart.addItem(product, 1) : { added: 1 };
        if (typeof Celebration !== 'undefined' && Celebration.fire) {
            Celebration.fire(btn);
        }
        if (typeof Toast !== 'undefined' && Toast.show) {
            Toast.show(`已加入购物车 +${result.added || 1}`, 'success', 1600);
        }
    }

    function init() {
        document.addEventListener('click', handleClick);
    }

    return { init };
})();

// ==============================================
// Checkout Module (Modified to use SharedData and Cart.getCart)
// ==============================================
const Checkout = (function() {
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

    const draftKey = 'checkoutDraft';
    const nameInput = checkoutForm?.querySelector('#name');
    const phoneInput = checkoutForm?.querySelector('#phone');
    const addressInput = checkoutForm?.querySelector('#address');

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
        try {
            const parsed = Utils.safeJsonParse(localStorage.getItem(draftKey), null);
            if (!parsed || typeof parsed !== 'object') return null;
            return parsed;
        } catch {
            return null;
        }
    }

    function writeDraft(data) {
        try {
            localStorage.setItem(draftKey, JSON.stringify(data));
        } catch {
            // ignore
        }
    }

    function clearDraft() {
        try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    }

    function collectDraft() {
        return {
            name: nameInput?.value?.trim() || '',
            phone: phoneInput?.value?.trim() || '',
            address: addressInput?.value?.trim() || '',
            payment: checkoutForm?.querySelector('input[name="payment"]:checked')?.value || '',
        };
    }

    function applyDraft() {
        const draft = readDraft();
        if (!draft) return;

        if (nameInput && draft.name) nameInput.value = draft.name;
        if (phoneInput && draft.phone) phoneInput.value = draft.phone;
        if (addressInput && draft.address) addressInput.value = draft.address;

        if (draft.payment && paymentOptions && paymentOptions.length > 0) {
            paymentOptions.forEach((option) => {
                option.checked = option.value === draft.payment;
            });
        }

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
    function renderOrderSummary() {
        if (!orderSummaryItemsContainer || !summarySubtotalEl || !summaryShippingEl || !summaryTotalEl) {
             console.error("Checkout Error: Order summary elements not found.");
             return;
        }

        // Use Cart module to get data
        const cart = (typeof Cart !== 'undefined' && Cart.getCart) ? Cart.getCart() : []; 
        orderSummaryItemsContainer.innerHTML = '';

        if (cart.length === 0) {
            orderSummaryItemsContainer.innerHTML = '<p class="text-center text-muted">购物车为空，无法结算。</p>';
            summarySubtotalEl.textContent = formatPrice(0);
            summaryShippingEl.textContent = formatPrice(0);
            summaryTotalEl.textContent = formatPrice(0);
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

        const shippingCost = 0; 
        const total = subtotal + shippingCost;

        summarySubtotalEl.textContent = formatPrice(subtotal);
        summaryShippingEl.textContent = formatPrice(shippingCost);
        summaryTotalEl.textContent = formatPrice(total);

        if(placeOrderButton) placeOrderButton.disabled = false;
    }

    // --- Event Handling --- (Keep handlePaymentSelection, handlePlaceOrder, addEventListeners)
    function handlePaymentSelection() {
       // ... (no changes needed here)
          const paymentSection = document.getElementById('payment-method');
        const errorElement = paymentSection?.querySelector('.error-message');
        if (errorElement) errorElement.remove();
    }

    function handlePlaceOrder(event) {
        // ... (no changes needed here, but uses Cart.updateHeaderCartCount now)
         event.preventDefault(); 

        if (validateForm()) {
            const formData = new FormData(checkoutForm);
            const shippingAddress = {
                name: formData.get('name'),
                phone: formData.get('phone'),
                address: formData.get('address')
            };
            const paymentMethod = formData.get('payment');
            const currentCart = (typeof Cart !== 'undefined' && Cart.getCart) ? Cart.getCart() : [];
            const orderData = {
                shippingAddress: shippingAddress,
                paymentMethod: paymentMethod,
                cartItems: currentCart,
            };

             // 订单提交成功（模拟）：跳回首页并展示提示

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
             window.location.href = 'index.html?order=success';
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
    }

    // --- Initialization ---
    function init() {
        if (checkoutContainer) { // Check if on checkout page
             renderOrderSummary();
             applyDraft();
             addEventListeners();

             // 同标签页内购物车变化（例如从其他模块写入）时刷新摘要
             try {
                 window.addEventListener('cart:changed', renderOrderSummary);
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
// Static Page Content Module (Uses SharedData for consistency if needed later)
// ==============================================
const StaticPage = (function() {
    // ... (Keep existing StaticPage, maybe use SharedData.getCategoryName later if needed)
    const staticContainer = document.querySelector('.static-page-main');
    if (!staticContainer) return { init: () => {} };

    const contentArea = staticContainer.querySelector('#static-content-area');
    const pageTitleElement = staticContainer.querySelector('#static-page-title'); 
    const breadcrumbPageNameElement = staticContainer.querySelector('#breadcrumb-page-name');
    const metaDescriptionTag = document.querySelector('meta[name="description"]');

    const pageContents = {
        faq: {
            title: '常见问题',
            description: '关于购买、预售、物流、售后与正品保障的常见问题解答。',
            content: `
                <section class="static-section">
                    <h2>关于本项目</h2>
                    <p>这是一个纯静态多页电商示例站点，用于演示落地页、商品列表/详情、购物车与结算流程。</p>
                    <p><strong>注意：</strong>本站不接入真实支付与后端订单系统，结算页为模拟下单。</p>
                </section>

                <section class="static-section">
                    <h2>商品与预售</h2>
                    <h3>Q：商品数据来自哪里？</h3>
                    <p>A：示例商品数据内置在 <code>scripts/main.js</code> 的 <code>SharedData</code> 中，便于快速修改与二次开发。</p>
                    <h3>Q：可以对接真实 API 吗？</h3>
                    <p>A：可以。推荐将商品与库存改为接口拉取，并将购物车/订单写入服务端数据库。</p>
                </section>

                <section class="static-section">
                    <h2>购物车与结算</h2>
                    <h3>Q：购物车会丢失吗？</h3>
                    <p>A：购物车使用浏览器 <code>localStorage</code> 存储，刷新页面不会丢失（但清理浏览器数据会清空）。</p>
                    <h3>Q：为什么我双击打开 HTML 会有跳转/资源问题？</h3>
                    <p>A：某些浏览器在 <code>file://</code> 下对资源与导航有安全限制，建议使用本地静态服务器预览（README 有命令）。</p>
                </section>

                <section class="static-section">
                    <h2>联系我们</h2>
                    <p>如需定制为真实项目（会员/支付/订单/库存/后台管理），欢迎基于此模板继续扩展。</p>
                    <p><a class="cta-button-secondary" href="index.html#contact">前往联系</a></p>
                </section>
            `.trim(),
        },
        privacy: {
            title: '隐私政策',
            description: '说明本示例站点在本地存储、外部资源与信息安全方面的行为与边界。',
            content: `
                <section class="static-section">
                    <h2>我们收集什么信息？</h2>
                    <p>本项目为纯静态示例站点，不包含后端服务，默认情况下不会将您的个人信息上传到服务器。</p>
                    <ul>
                        <li><strong>本地存储：</strong>为了模拟购物车，本项目会在浏览器 <code>localStorage</code> 中保存购物车条目（商品 ID、数量等）。</li>
                        <li><strong>表单输入：</strong>结算页表单仅用于前端校验与演示，不会提交到服务器。</li>
                    </ul>
                </section>

                <section class="static-section">
                    <h2>第三方资源</h2>
                    <p>页面可能使用第三方公共资源（例如字体与图标 CDN）。这些服务可能会记录基础访问日志（如 IP、User-Agent）。</p>
                    <p>若你需要完全离线/内网可用，建议将字体与图标改为本地自托管，并在部署时配置严格的内容安全策略（CSP）。</p>
                </section>

                <section class="static-section">
                    <h2>如何清理本地数据？</h2>
                    <p>你可以在浏览器开发者工具中清理站点数据，或手动删除本地存储项。</p>
                    <p>示例：清空购物车会移除 <code>localStorage</code> 中的 <code>cart</code>。</p>
                </section>
            `.trim(),
        },
        tos: {
            title: '服务条款',
            description: '本项目作为示例站点的使用条款与免责声明。',
            content: `
                <section class="static-section">
                    <h2>项目性质</h2>
                    <p>本仓库为演示用途的静态前端模板，旨在展示页面结构、交互与基础电商流程。</p>
                </section>

                <section class="static-section">
                    <h2>免责声明</h2>
                    <ul>
                        <li>本项目不提供真实支付、真实订单履约、真实库存同步等商业能力。</li>
                        <li>示例数据、价格与品牌名称仅用于展示，不构成任何商业承诺。</li>
                        <li>在将本模板用于生产环境前，请自行完成安全审计、隐私合规与接口鉴权等工作。</li>
                    </ul>
                </section>

                <section class="static-section">
                    <h2>许可与二次开发</h2>
                    <p>你可以在遵守仓库许可（如已添加）与第三方资源许可的前提下进行二次开发与商业化部署。</p>
                </section>
            `.trim(),
        },
        default: {
            title: '页面未找到',
            description: '请求的页面不存在，建议返回首页或浏览商品列表。',
            content: `
                <section class="static-section">
                    <h2>抱歉，页面不存在</h2>
                    <p>你访问的页面不存在或参数不正确。</p>
                    <p>
                        <a class="cta-button-secondary" href="index.html">返回首页</a>
                        <a class="cta-button-secondary" href="products.html">浏览所有商品</a>
                    </p>
                </section>
            `.trim(),
        },
    };
     
     function loadContent() {
        // ... (Keep existing loadContent)
         if (!contentArea || !pageTitleElement || !breadcrumbPageNameElement || !metaDescriptionTag) {
            console.error('Static page elements not found.');
            if(contentArea) contentArea.innerHTML = pageContents.default.content;
            return;
        }
        const urlParams = new URLSearchParams(window.location.search);
        const pageKey = urlParams.get('page');
        let pageData;
        if (pageKey && pageContents[pageKey]) {
            pageData = pageContents[pageKey];
        } else {
            pageData = pageContents.default;
        }
        if (!pageData?.title || !pageData?.content) pageData = pageContents.default;
        document.title = `${pageData.title} - 塑梦潮玩`;
        if (pageData.description) metaDescriptionTag.setAttribute('content', pageData.description);
        pageTitleElement.textContent = pageData.title;
        breadcrumbPageNameElement.textContent = pageData.title;
        contentArea.innerHTML = pageData.content;
        setActiveNavLink(pageKey);
    }

    function setActiveNavLink(pageKey) {
        // ... (Keep existing setActiveNavLink)
         const headerNav = document.querySelector('.header__navigation');
        if (!headerNav) return;
        headerNav.querySelectorAll('a[href^="static-page.html"]').forEach(link => {
            link.classList.remove('header__nav-link--active');
        });
        if (pageKey) {
            const activeLink = headerNav.querySelector(`a[href="static-page.html?page=${pageKey}"]`);
            if (activeLink) {
                activeLink.classList.add('header__nav-link--active');
            }
        }
    }

    function init() {
        if (staticContainer) { // Check if on static page
             loadContent();
        }
    }

    return { init: init };
})();


// ==============================================
// Product Listing / Category / Search Results Module (Modified to use SharedData)
// ==============================================
const ProductListing = (function(){
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
            ? `<span class="product-card__rating"><i class="fas fa-star" aria-hidden="true"></i>${ratingValue.toFixed(1)}${Number.isFinite(reviewCount) && reviewCount > 0 ? `<small>(${reviewCount})</small>` : ''}</span>`
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

        const badgesHTML = badges.length > 0 ? `<div class="product-card__badges">${badges.join('')}</div>` : '';
        const favBtnHTML = id !== '#'
            ? `<button class="favorite-btn" type="button" data-product-id="${safeIdAttr}" aria-label="加入收藏" aria-pressed="false">
                    <i class="fa-regular fa-heart" aria-hidden="true"></i>
               </button>`
            : '';
        const quickAddHTML = id !== '#'
            ? `<button class="product-card__quick-add" type="button" data-product-id="${safeIdAttr}" aria-label="加入购物车">快速加入</button>`
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
    const paginationContainer = listingContainer.querySelector('.pagination');
    const breadcrumbContainer = listingContainer.querySelector('.breadcrumb-nav .breadcrumb');
    const sortStorageKey = 'plpSort';
    const filterStorageKey = 'plpFilter';
    const viewStorageKey = 'plpViewMode';

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
    let allProductsCache = [];
    let baseTitle = '';

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

    function updateListingMeta(total) {
        if (!listingSummary) return;
        const safeTotal = Number.isFinite(total) ? total : 0;
        const sortLabel = getSortLabel(currentSort);
        const filterLabel = getFilterLabel(currentFilter);
        listingSummary.textContent = `共 ${safeTotal} 件藏品 · ${sortLabel} · ${filterLabel}`;
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
            case 'name-asc': sortedProducts.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')); break;
            default: break;
        }
        return sortedProducts;
    }

    function applyFilter(products) {
        if (currentFilter === 'all') return products;
        return (products || []).filter((product) => {
            const tags = product?.tags || [];
            if (currentFilter === 'hot') return tags.includes('hot');
            if (currentFilter === 'limited') return tags.includes('limited') || product?.rarity === '限定';
            if (currentFilter === 'preorder') return tags.includes('preorder') || product?.status === '预售';
            return true;
        });
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
    }

    // --- Render Page --- (Keep existing)
    function renderPage() {
         // ... (no changes needed here)
         const filteredProducts = applyFilter(currentProducts);
         const sortedProducts = sortProducts(filteredProducts, currentSort);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const productsForPage = sortedProducts.slice(startIndex, endIndex);
        renderProducts(productsForPage);
        renderPagination(sortedProducts.length);
        updateBreadcrumbs();
        updateTitleCount(sortedProducts.length);
        updateListingMeta(sortedProducts.length);
        if (typeof ScrollAnimations !== 'undefined' && ScrollAnimations.init) {
             ScrollAnimations.init();
        }
    }

    // --- Render Products Grid --- (Keep existing)
    function renderProducts(productsToRender) {
         // ... (no changes needed here)
          if (!productGrid) return;
        productGrid.setAttribute('aria-busy', 'true');
        productGrid.innerHTML = '';
        if (productsToRender.length === 0) {
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
            emptyMessageElement.appendChild(link);
            productGrid.appendChild(emptyMessageElement);
        } else {
            productsToRender.forEach(product => {
                productGrid.innerHTML += createProductCardHTML(product);
            });
        }
        productGrid.setAttribute('aria-busy', 'false');
        if (typeof LazyLoad !== 'undefined' && LazyLoad.init) { LazyLoad.init(); }
        if (typeof Favorites !== 'undefined' && Favorites.syncButtons) { Favorites.syncButtons(productGrid); }
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
        let title = categoryNames('all');
        currentProducts = [...allProducts];
        pageMode = 'all';
        currentCategory = 'all';

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
        if (filterButtons && filterButtons.length > 0) {
            try {
                const storedFilter = localStorage.getItem(filterStorageKey);
                if (storedFilter) currentFilter = storedFilter;
            } catch { /* ignore */ }
            syncFilterButtons();
        }
        updateFilterCounts(currentProducts);
        renderPage();
        addEventListeners();
    }

    return { init: init, createProductCardHTML };
})();

// ==============================================
// Homepage Specific Module (Modified to use SharedData)
// ==============================================
const Homepage = (function() {
    const featuredGrid = document.querySelector('#product-gallery .gallery-grid');
    const numberOfFeatured = 3;
    const curationSection = document.querySelector('.curation');
    const curationGrid = curationSection?.querySelector('[data-curation-grid]');
    const curationTabs = curationSection?.querySelectorAll('[data-curation-tab]');
    const curationIndicator = curationSection?.querySelector('.curation-tabs__indicator');
    const tabStorageKey = 'homeCurationTab';

    function populateFeaturedProducts() {
        if (!featuredGrid) return;

        // Enhanced Check: Ensure SharedData and ProductListing with its function are available
        if (typeof SharedData === 'undefined' || !SharedData.getAllProducts ||
            typeof ProductListing === 'undefined' || typeof ProductListing.createProductCardHTML !== 'function') {
            console.error("Homepage Error: SharedData or ProductListing module/functions unavailable.");
            featuredGrid.innerHTML = '<p class="product-listing__empty-message text-center">加载精选商品失败。</p>'; // Use class instead of inline style
            return;
        }

        const allProducts = SharedData.getAllProducts();
        const createCardHTML = ProductListing.createProductCardHTML; // Corrected function name

        if (!allProducts || allProducts.length === 0) {
             featuredGrid.innerHTML = '<p class="product-listing__empty-message text-center">暂无精选商品展示。</p>'; // Use class
             return;
        }

        // Slice products, considering if there are fewer than numberOfFeatured
        const featuredProducts = allProducts.slice(0, Math.min(numberOfFeatured, allProducts.length));
        featuredGrid.innerHTML = '';
        featuredProducts.forEach(product => {
            featuredGrid.innerHTML += createCardHTML(product);
        });

        // Re-initialize lazy/animations (Keep existing)
        if (typeof LazyLoad !== 'undefined' && LazyLoad.init) { LazyLoad.init(); }
        if (typeof Favorites !== 'undefined' && Favorites.syncButtons) { Favorites.syncButtons(featuredGrid); }
        if (typeof ScrollAnimations !== 'undefined' && ScrollAnimations.init) { ScrollAnimations.init(); }
    }

    function moveIndicator(target) {
        if (!curationIndicator || !target) return;
        const parentRect = target.parentElement?.getBoundingClientRect();
        const rect = target.getBoundingClientRect();
        if (!parentRect) return;
        const x = rect.left - parentRect.left;
        curationIndicator.style.width = `${rect.width}px`;
        curationIndicator.style.transform = `translateX(${x}px)`;
    }

    function renderCuration(tabKey) {
        if (!curationGrid || typeof SharedData === 'undefined' || !SharedData.getCurationProducts) return;
        const list = SharedData.getCurationProducts(tabKey);
        if (!list || list.length === 0) {
            curationGrid.innerHTML = '<p class="product-listing__empty-message text-center">暂无策展内容。</p>';
            return;
        }
        if (typeof ProductListing === 'undefined' || typeof ProductListing.createProductCardHTML !== 'function') return;
        curationGrid.innerHTML = list.map((product) => ProductListing.createProductCardHTML(product)).join('');
        if (typeof LazyLoad !== 'undefined' && LazyLoad.init) { LazyLoad.init(); }
        if (typeof Favorites !== 'undefined' && Favorites.syncButtons) { Favorites.syncButtons(curationGrid); }
        if (typeof ScrollAnimations !== 'undefined' && ScrollAnimations.init) { ScrollAnimations.init(); }
    }

    function activateTab(button) {
        if (!button) return;
        const key = button.dataset.curationTab || 'hot';
        curationTabs?.forEach((btn) => {
            const active = btn === button;
            btn.classList.toggle('is-active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        moveIndicator(button);
        try { localStorage.setItem(tabStorageKey, key); } catch { /* ignore */ }
        renderCuration(key);
    }

    function initCuration() {
        if (!curationSection || !curationTabs || curationTabs.length === 0) return;
        curationTabs.forEach((btn) => {
            btn.addEventListener('click', () => activateTab(btn));
        });
        let initialKey = 'hot';
        try {
            const stored = localStorage.getItem(tabStorageKey);
            if (stored) initialKey = stored;
        } catch { /* ignore */ }
        const initialBtn = Array.from(curationTabs).find((btn) => btn.dataset.curationTab === initialKey) || curationTabs[0];
        activateTab(initialBtn);
        window.addEventListener('resize', Utils.throttle(() => {
            const active = curationSection.querySelector('.curation-tab.is-active');
            moveIndicator(active);
        }, 200));
    }

    function init() {
        // ... (Keep existing check for homepage)
         if (Utils.getPageName() === 'index.html' && featuredGrid) populateFeaturedProducts();
         if (Utils.getPageName() === 'index.html') initCuration();
    }

    return { init: init };
})();

// ==============================================
// Offline Page Module (offline.html)
// ==============================================
const OfflinePage = (function() {
    const container = document.querySelector('.offline-main');
    if (!container) return { init: () => {} };

    const statusEl = container.querySelector('#offline-status');
    const retryBtn = container.querySelector('#offline-retry');

    function renderStatus() {
        if (!statusEl) return;
        const online = Boolean(navigator && navigator.onLine);
        statusEl.textContent = online ? '网络已恢复，可重试加载。' : '当前离线：可浏览已缓存内容。';
    }

    function handleRetry() {
        try { window.location.reload(); } catch { /* ignore */ }
    }

    function init() {
        renderStatus();
        window.addEventListener('online', renderStatus);
        window.addEventListener('offline', renderStatus);
        if (retryBtn) retryBtn.addEventListener('click', handleRetry);
    }

    return { init };
})();

// ==============================================
// Cross Tab Sync (storage event)
// ==============================================
const CrossTabSync = (function() {
    function handleStorage(event) {
        const key = event?.key;
        if (!key) return;

        try {
            if (key === 'theme') {
                if (typeof Theme !== 'undefined' && Theme.getResolvedTheme && Theme.applyTheme) {
                    Theme.applyTheme(Theme.getResolvedTheme(), { persist: false });
                }
                return;
            }

            if (key === 'favorites') {
                if (typeof Favorites !== 'undefined') {
                    const ids = typeof Favorites.getIds === 'function' ? Favorites.getIds() : [];
                    Favorites.updateHeaderCount?.(ids);
                    Favorites.syncButtons?.(document);
                }
                try { window.dispatchEvent(new CustomEvent('favorites:changed')); } catch { /* ignore */ }
                return;
            }

            if (key === 'cart') {
                const cart = (typeof Cart !== 'undefined' && typeof Cart.getCart === 'function') ? Cart.getCart() : [];
                Cart.updateHeaderCartCount?.(cart);
                Cart.refresh?.();
                Checkout.refresh?.();
                return;
            }

            if (key === 'recentlyViewed') {
                RecentlyViewed?.refresh?.();
                return;
            }
        } catch {
            // ignore
        }
    }

    function init() {
        window.addEventListener('storage', handleStorage);
    }

    return { init };
})();

// ==============================================
// Application Initialization
// ==============================================
const App = {
    init: function() {
        // Initialize modules in order of dependency or desired execution
        // SharedData doesn't need init as it's just data
        Header.init();
        Theme.init();
        SmoothScroll.init();
        ScrollProgress.init();
        BackToTop.init();
        ScrollAnimations.init(); 
        ImageFallback.init();
        LazyLoad.init(); 
        Favorites.init();
        Cart.init(); // Init Cart early so others can use its exposed functions
        QuickAdd.init();
        Homepage.init(); 
        RecentlyViewed.init();
        PDP.init(); 
        Checkout.init();
        StaticPage.init();
        OfflinePage.init();
        ProductListing.init();
        ServiceWorker.init();
        CrossTabSync.init();

        // URL 参数触发的一次性提示（避免刷新重复弹出）
        try {
            const url = new URL(window.location.href);
            const params = url.searchParams;
            const orderStatus = params.get('order');
            if (orderStatus === 'success') {
                if (typeof Toast !== 'undefined' && Toast.show) {
                    Toast.show('订单提交成功（模拟）', 'success');
                }
                params.delete('order');
                const nextSearch = params.toString();
                const nextUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${url.hash}`;
                if (window.history && window.history.replaceState) {
                    window.history.replaceState({}, document.title, nextUrl);
                }
            }
        } catch (e) {
            console.warn('App: URL toast init failed.', e);
        }
    }
};

document.addEventListener('DOMContentLoaded', App.init);
