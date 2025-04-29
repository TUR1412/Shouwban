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
    const searchInput = searchBar?.querySelector('.header__search-input');
    const searchForm = searchBar?.querySelector('form');
    const searchSubmitBtn = searchBar?.querySelector('.header__search-submit');
    const navLinks = headerElement?.querySelectorAll('.header__nav-link:not(.header__dropdown-toggle)'); // Exclude dropdown toggle itself
    const dropdownLinks = headerElement?.querySelectorAll('.header__dropdown-item a');
    const allNavLinks = Array.from(navLinks || []).concat(Array.from(dropdownLinks || []));

    const scrollThreshold = 50;

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

    function toggleSearch() {
        if (!searchBar || !searchInput || !searchToggle) return;
        const isOpen = searchBar.classList.toggle('is-open');
        searchToggle.setAttribute('aria-expanded', isOpen);
        if (isOpen) {
            searchInput.focus();
            // Optional: Change search icon to close icon
        } else {
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

    function handleDropdown(dropdownItem, show) {
        const menu = dropdownItem.querySelector('.header__dropdown-menu');
        if (menu) {
            if (show) {
                dropdownItem.classList.add('is-open');
                menu.style.display = 'block'; // Necessary for transition
                // Force reflow for transition
                void menu.offsetWidth;
                menu.style.opacity = '1';
                menu.style.visibility = 'visible';
                menu.style.transform = 'translateY(0)';
            } else {
                dropdownItem.classList.remove('is-open');
                menu.style.opacity = '0';
                menu.style.visibility = 'hidden';
                menu.style.transform = 'translateY(10px)';
                 // Reset display after transition (optional but good practice)
                 // setTimeout(() => { if (!dropdownItem.classList.contains('is-open')) menu.style.display = 'none'; }, 300); // Match transition duration
            }
        }
    }

    function setActiveLink() {
        const currentPath = window.location.pathname;
        const currentSearch = window.location.search;
        const currentFullPath = currentPath + currentSearch;
        const homePaths = ['/', '/index.html'];

        // Deactivate all links first
        allNavLinks.forEach(link => {
            link.classList.remove('header__nav-link--active');
            link.closest('.header__nav-item--dropdown')?.classList.remove('header__nav-link--active');
        });
        const cartLink = headerElement?.querySelector('.header__action-link[href="cart.html"]');
        if (cartLink) cartLink.classList.remove('header__action-link--active');

        // Determine the best match
        let bestMatch = null;
        let isExactMatch = false;

        allNavLinks.forEach(link => {
            const linkHref = link.getAttribute('href');
            if (!linkHref) return;

            // Normalize link href for comparison
            let normalizedLinkHref = linkHref;
            if (normalizedLinkHref === '/') {
                 normalizedLinkHref = '/index.html'; // Treat '/' as index.html
            }
            let normalizedCurrentPath = currentPath;
             if (homePaths.includes(currentPath)) {
                 normalizedCurrentPath = '/index.html'; // Treat home paths as index.html
             }

            // 1. Exact match (path + search)
            if (linkHref === currentFullPath) {
                bestMatch = link;
                isExactMatch = true;
                return; // Found exact match, no need to check further for this link
            }

            // 2. Path match (for non-query string links)
            // Check if link href doesn't contain '?' and matches current path
            if (!isExactMatch && !linkHref.includes('?') && normalizedLinkHref === normalizedCurrentPath) {
                bestMatch = link;
            }

            // 3. Special case: Homepage (if current path is / or /index.html and link is /)
             if (!isExactMatch && homePaths.includes(currentPath) && linkHref === '/') {
                 bestMatch = link;
             }

            // 4. Special case: Category/Product pages highlight parent dropdown
            if (!isExactMatch && (currentPath === '/category.html' || currentPath === '/products.html' || currentPath === '/product-detail.html')) {
                const dropdownToggle = link.closest('.header__nav-item--dropdown')?.querySelector('.header__dropdown-toggle[href="products.html"]');
                if (dropdownToggle) {
                    // If we are on a category related page, highlight the main category toggle
                    bestMatch = dropdownToggle; // Prefer highlighting the parent toggle
                }
            }
             // 5. Special case: Anchor links on homepage (basic)
             if (!isExactMatch && linkHref.startsWith('/#') && homePaths.includes(currentPath)) {
                if (window.location.hash === linkHref.substring(1)) {
                    bestMatch = link;
                }
            }
        });

        // Activate the best match found
        if (bestMatch) {
            bestMatch.classList.add('header__nav-link--active');
            // Activate parent dropdown if the best match is inside one
            bestMatch.closest('.header__nav-item--dropdown')?.classList.add('header__nav-link--active');
        }

         // Activate Cart link specifically if on cart.html
         if (currentPath === '/cart.html' && cartLink) {
             cartLink.classList.add('header__action-link--active');
             // Ensure other nav links are not active unless intended
             if(bestMatch && bestMatch !== cartLink) {
                 bestMatch.classList.remove('header__nav-link--active');
                 bestMatch.closest('.header__nav-item--dropdown')?.classList.remove('header__nav-link--active');
             }
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
        navigation?.querySelectorAll('.header__nav-link, .header__dropdown-item a').forEach(link => {
             link.addEventListener('click', closeMobileMenu);
        });

        // Close menus if clicking outside
        document.addEventListener('click', (event) => {
            if (!headerElement) return;
            const isClickInsideHeader = headerElement.contains(event.target);

            if (!isClickInsideHeader) {
                closeMobileMenu();
                if (searchBar?.classList.contains('is-open')) {
                    toggleSearch(); // Close search if open
                }
                dropdownItems.forEach(item => handleDropdown(item, false)); // Close dropdowns
            }
        });

        // Dropdown handling (Desktop hover, Mobile click can be added)
         dropdownItems.forEach(item => {
             // Desktop hover
             if (window.matchMedia("(min-width: " + getComputedStyle(document.documentElement).getPropertyValue('--breakpoint-md') + ")").matches) {
                item.addEventListener('mouseenter', () => handleDropdown(item, true));
                item.addEventListener('mouseleave', () => handleDropdown(item, false));
             }
             // Mobile Click (Toggle)
             const toggle = item.querySelector('.header__dropdown-toggle');
             if (toggle) {
                 toggle.addEventListener('click', (e) => {
                     // Prevent default link behavior only if menu needs toggling on mobile
                     if (window.matchMedia("(max-width: " + getComputedStyle(document.documentElement).getPropertyValue('--breakpoint-md') + ")").matches) {
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
             searchInput.addEventListener('keypress', (event) => {
                 if (event.key === 'Enter') {
                     handleSearchSubmit(event);
                 }
             });
         }
    }

    function init() {
        if (!headerElement) {
            console.log('Header element not found.');
            return;
        }
        handleScroll(); // Initial check
        setActiveLink(); // Set active link on load
        addEventListeners();
        console.log('Header module initialized.');
    }

    return {
        init: init,
        updateCartCount: function(count) { // Expose function to update cart count
             const cartCountElement = headerElement?.querySelector('.header__cart-count');
             if (cartCountElement) {
                 cartCountElement.textContent = count;
                 cartCountElement.style.display = count > 0 ? 'inline-block' : 'none';
             }
         }
    };
})();

// ==============================================
// Smooth Scrolling Module
// ==============================================
const SmoothScroll = (function() {
    function init() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const hrefAttribute = this.getAttribute('href');
                if (hrefAttribute && hrefAttribute.length > 1 && hrefAttribute.startsWith('#')) {
                    try {
                        const targetElement = document.querySelector(hrefAttribute);
                        if (targetElement) {
                            e.preventDefault();
                            const headerOffset = document.querySelector('.header')?.offsetHeight || 0;
                            const elementPosition = targetElement.getBoundingClientRect().top;
                            const offsetPosition = elementPosition + window.pageYOffset - headerOffset - 10; // 10px buffer
                            window.scrollTo({
                                top: offsetPosition,
                                behavior: "smooth"
                            });
                        }
                    } catch (error) {
                        console.warn(`Smooth scroll failed for selector: ${hrefAttribute}`, error);
                    }
                }
            });
        });
        console.log('SmoothScroll module initialized.');
    }

    return { init: init };
})();

// ==============================================
// Intersection Observer Animations Module
// ==============================================
const ScrollAnimations = (function() {
    const animatedElements = document.querySelectorAll('.fade-in-up');

    function init() {
        if (animatedElements.length > 0 && "IntersectionObserver" in window) {
            const observer = new IntersectionObserver((entries, observer) => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        // Basic staggered delay, can be customized further
                         entry.target.style.transitionDelay = `${index * 50}ms`;
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            }, {
                threshold: 0.1 // Trigger when 10% visible
            });

            animatedElements.forEach(element => {
                observer.observe(element);
            });
            console.log('ScrollAnimations module initialized with IntersectionObserver.');
        } else {
            // Fallback for older browsers or no elements
            animatedElements.forEach(element => element.classList.add('is-visible'));
            if (animatedElements.length > 0) {
                console.log('ScrollAnimations: IntersectionObserver not supported, showing elements directly.');
            }
        }
    }

    return { init: init };
})();

// ==============================================
// Lazy Loading Module
// ==============================================
const LazyLoad = (function() {
    const lazyImages = document.querySelectorAll('img.lazyload');

    function init() {
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
            console.log('LazyLoad module initialized with IntersectionObserver.');
        } else {
            // Fallback
            lazyImages.forEach(lazyImage => {
                 if (lazyImage.dataset.src) {
                    lazyImage.src = lazyImage.dataset.src;
                    lazyImage.classList.add('loaded');
                    lazyImage.classList.remove('lazyload');
                }
            });
            if (lazyImages.length > 0) {
                console.log('LazyLoad: IntersectionObserver not supported, loading images directly.');
            }
        }
    }

    return { init: init };
})();

// ==============================================
// Shared Data (Simulated)
// ==============================================
const SharedData = (function() {
    const allProducts = [
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
                { thumb: 'assets/images/placeholder-figurine-thumb-1.jpg', large: 'assets/images/placeholder-figurine-large-1.jpg', alt: '初音未来 魔法未来 2023 正面图' }, 
                { thumb: 'assets/images/placeholder-figurine-thumb-2.jpg', large: 'assets/images/placeholder-figurine-large-2.jpg', alt: '初音未来 魔法未来 2023 侧面图' }, 
                { thumb: 'assets/images/placeholder-figurine-thumb-3.jpg', large: 'assets/images/placeholder-figurine-large-3.jpg', alt: '初音未来 魔法未来 2023 背面图' }, 
                { thumb: 'assets/images/placeholder-figurine-thumb-4.jpg', large: 'assets/images/placeholder-figurine-large-4.jpg', alt: '初音未来 魔法未来 2023 特写图' } 
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
                { thumb: 'assets/images/placeholder-figurine-thumb-2.jpg', large: 'assets/images/placeholder-figurine-large-2.jpg', alt: '梅琳娜 正面' }
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
                { thumb: 'assets/images/placeholder-figurine-card-6.jpg', large: 'assets/images/placeholder-figurine-card-6.jpg', alt: '莱莎琳·斯托特' } // Using card image as large for now
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
                { thumb: 'assets/images/placeholder-figurine-thumb-3.jpg', large: 'assets/images/placeholder-figurine-large-3.jpg', alt: '后藤一里 粘土人' }
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
                { thumb: 'assets/images/placeholder-figurine-card-7.jpg', large: 'assets/images/placeholder-figurine-card-7.jpg', alt: '阿尼亚·福杰 粘土人' }
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
                 { thumb: 'assets/images/placeholder-figurine-card-8.jpg', large: 'assets/images/placeholder-figurine-card-8.jpg', alt: '帕瓦 粘土人' }
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
                 { thumb: 'assets/images/placeholder-figurine-card-4.jpg', large: 'assets/images/placeholder-figurine-card-4.jpg', alt: '灶门炭治郎 figma' }
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
                 { thumb: 'assets/images/placeholder-figurine-card-9.jpg', large: 'assets/images/placeholder-figurine-card-9.jpg', alt: '东海帝皇 figma' }
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
                 { thumb: 'assets/images/placeholder-figurine-card-5.jpg', large: 'assets/images/placeholder-figurine-card-5.jpg', alt: '噶呜·古拉 POP UP PARADE' }
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
                 { thumb: 'assets/images/placeholder-figurine-card-10.jpg', large: 'assets/images/placeholder-figurine-card-10.jpg', alt: '天竺鼠车车 MODEROID' }
            ],
             dateAdded: '2023-11-20' 
        }
    ];

    const categoryNames = {
        scale: '比例手办',
        nendoroid: '粘土人',
        figma: 'Figma',
        other: '其他手办',
        all: '所有手办'
    };

    return {
        getAllProducts: () => allProducts,
        getCategoryName: (key) => categoryNames[key] || key // Helper to get category name
    };
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
    const titleElement = pdpContainer.querySelector('.product-info-pdp .product-title-pdp');
    const seriesElement = pdpContainer.querySelector('.product-info-pdp .product-series-pdp');
    const priceElement = pdpContainer.querySelector('.product-info-pdp .price-value');
    const originalPriceElement = pdpContainer.querySelector('.product-info-pdp .original-price');
    const specsList = pdpContainer.querySelector('.product-specs ul');
    const descriptionContainer = pdpContainer.querySelector('.product-description');
    const quantityInput = pdpContainer.querySelector('.quantity-selector input[type="number"]');
    const minusBtn = pdpContainer.querySelector('.quantity-selector .minus');
    const plusBtn = pdpContainer.querySelector('.quantity-selector .plus');
    const addToCartBtn = pdpContainer.querySelector('.add-to-cart-btn');

    let currentProductData = null;

    // --- Update DOM with Product Data --- (Modified error handling)
    function populatePage(product) {
         if (!product) {
            console.error("PDP Populate Error: Product data is null or undefined.");
            // Display error within the layout instead of replacing everything
            pdpContainer.innerHTML = '<div class="container text-center" style="padding: var(--spacing-xl) 0;"><p>抱歉，找不到该商品信息。</p><p><a href="/">返回首页</a> 或 <a href="products.html">浏览所有商品</a></p></div>';
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

        // Update Breadcrumbs (Handle missing breadcrumbList gracefully)
        if (breadcrumbList) {
             breadcrumbList.innerHTML = `
                 <li class="breadcrumb-item"><a href="/" class="breadcrumb__link">首页</a></li>
                 <li class="breadcrumb-item"><a href="products.html" class="breadcrumb__link">所有手办</a></li>
                 ${product.category ? `<li class="breadcrumb-item"><a href="category.html?cat=${product.category.key}" class="breadcrumb__link">${product.category.name}</a></li>` : ''}
                 <li class="breadcrumb-item active" aria-current="page">${product.name}</li>
             `;
        } else {
             console.warn("PDP Warning: Breadcrumb container not found.");
        }

        // Update Page Title
        document.title = `${product.name} - 塑梦潮玩`;

        // Update Product Info
        titleElement.textContent = product.name;
        if(seriesElement) seriesElement.textContent = product.series ? `系列: ${product.series}` : '';
        priceElement.textContent = typeof product.price === 'number' ? `¥${product.price.toFixed(2)}` : '价格待定';
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
            if (thumbnailContainer) {
                 thumbnailContainer.innerHTML = '';
                 product.images.forEach((img, index) => {
                    const thumb = document.createElement('img');
                    thumb.src = img.thumb;
                    thumb.alt = img.alt ? img.alt.replace('图', '缩略图') : `${product.name} 缩略图 ${index + 1}`;
                    thumb.dataset.large = img.large;
                    thumb.classList.add('product-gallery-pdp__thumbnail');
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
             mainImage.src = 'assets/images/placeholder-figurine-large-1.jpg'; // Fallback image
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
             if (isNaN(currentValue) || currentValue < 1) {
                 quantityInput.value = 1;
             }
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
            image: currentProductData.images && currentProductData.images.length > 0 ? currentProductData.images[0].thumb : 'assets/images/placeholder-figurine-thumb-1.jpg', 
            quantity: parseInt(quantityInput.value, 10) || 1
        };

        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItemIndex = cart.findIndex(item => item.id === productToAdd.id);

        if (existingItemIndex > -1) {
            cart[existingItemIndex].quantity += productToAdd.quantity;
        } else {
            cart.push(productToAdd);
        }

        localStorage.setItem('cart', JSON.stringify(cart));

        // **Always use Cart module's function**
        if (typeof Cart !== 'undefined' && Cart.updateHeaderCartCount) {
            Cart.updateHeaderCartCount(cart);
        } else {
             console.error("PDP Error: Cart module or updateHeaderCartCount function not available.");
             // Attempt fallback (less ideal, kept for safety but should not be needed)
             if (typeof Header !== 'undefined' && Header.updateCartCount) {
                 const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
                 Header.updateCartCount(totalQuantity);
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

        console.log('Added to cart:', productToAdd);
        console.log('Current Cart:', cart);
    }

    function initAddToCart() {
        if (addToCartBtn) {
            addToCartBtn.addEventListener('click', handleAddToCart);
        }
    }

    // --- Initialization --- (Modified to use SharedData)
    function init() {
        console.log("PDP Module Initializing...");
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
            console.log(`PDP module initialized for product: ${productToDisplay?.name || 'Not Found'}.`);
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
    // Early exit if not on Cart page
    if (!cartContainer) {
        // Return expected functions for other modules, even if Cart page isn't active
         return { 
             init: () => {},
             getCart: () => JSON.parse(localStorage.getItem('cart')) || [], // Still provide getCart
             updateHeaderCartCount: (cartData) => { // Define updateHeaderCartCount here
                  if (typeof Header !== 'undefined' && Header.updateCartCount) {
                      const cart = cartData || (JSON.parse(localStorage.getItem('cart')) || []);
                      const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
                      Header.updateCartCount(totalQuantity);
                  }
             }
         };
    }

    const cartItemsContainer = cartContainer.querySelector('.cart-items');
    const cartSummaryContainer = cartContainer.querySelector('.cart-summary');
    const emptyCartMessage = cartContainer.querySelector('.empty-cart-message');
    const checkoutButton = cartSummaryContainer?.querySelector('.checkout-button');

    // --- Cart State Management --- 
    function getCart() {
        return JSON.parse(localStorage.getItem('cart')) || [];
    }

    // Internal function to update header count
    function _updateHeaderCartCount(cart) {
         if (typeof Header !== 'undefined' && Header.updateCartCount) {
            const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
            Header.updateCartCount(totalQuantity);
        }
    }

    function saveCart(cart) {
        localStorage.setItem('cart', JSON.stringify(cart));
        _updateHeaderCartCount(cart); // Use internal function
    }
    
    // --- Rendering Functions --- (Keep existing renderCartItem, renderCart, updateCartSummary)
    function renderCartItem(item) {
         // ... (no changes needed here)
          const price = typeof item.price === 'number' ? item.price : 0;
        const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
        const subtotal = price * quantity;

        return `
            <div class="cart-item" data-product-id="${item.id}">
                <div class="cart-item__image">
                    <a href="product-detail.html?id=${item.id}">
                        <img src="${item.image || 'assets/images/placeholder-figurine-thumb-1.jpg'}" alt="${item.name || '[手办名称]'}">
                    </a>
                </div>
                <div class="cart-item__info">
                    <h4 class="cart-item__title"><a href="product-detail.html?id=${item.id}">${item.name || '[手办名称]'}</a></h4>
                    <p class="cart-item__series">${item.series || '[系列/来源占位]'}</p> 
                    <span class="cart-item__price">¥${price.toFixed(2)}</span>
                </div>
                <div class="cart-item__quantity quantity-selector">
                    <button class="quantity-selector__button minus" aria-label="减少数量" ${quantity <= 1 ? 'disabled' : ''}>-</button>
                    <input class="quantity-selector__input" type="number" value="${quantity}" min="1" aria-label="商品数量">
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
    
    function renderCart() {
        // ... (no changes needed here)
         if (!cartItemsContainer || !cartSummaryContainer || !emptyCartMessage) return;

        const cart = getCart();
        cartItemsContainer.innerHTML = ''; // Clear existing items

        if (cart.length === 0) {
            emptyCartMessage.style.display = 'block';
            cartSummaryContainer.style.display = 'none'; // Hide summary
            cartItemsContainer.style.display = 'none'; // Hide items container
        } else {
            emptyCartMessage.style.display = 'none';
            cartSummaryContainer.style.display = 'block'; // Show summary
            cartItemsContainer.style.display = 'block'; // Show items container
            cart.forEach(item => {
                cartItemsContainer.innerHTML += renderCartItem(item);
            });
            updateCartSummary(cart);
            addCartItemEventListeners(); // Re-attach listeners after rendering
        }
    }

    function updateCartSummary(cart) {
         // ... (no changes needed here)
         const subtotalElement = cartSummaryContainer?.querySelector('.summary-row:nth-child(1) span:last-child');
        const totalElement = cartSummaryContainer?.querySelector('.total-price');
        
        if (!subtotalElement || !totalElement) return;

        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const shippingCost = 0; // Placeholder for shipping calculation
        const total = subtotal + shippingCost;

        subtotalElement.textContent = `¥${subtotal.toFixed(2)}`;
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

    // --- Event Handlers --- (Keep existing handleQuantityChange, handleRemoveItem, addCartItemEventListeners)
    function handleQuantityChange(productId, newQuantity) {
       // ... (no changes needed here)
         let cart = getCart();
        const itemIndex = cart.findIndex(item => item.id === productId);

        if (itemIndex > -1 && newQuantity >= 1) {
            cart[itemIndex].quantity = newQuantity;
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
                minusBtn.addEventListener('click', () => {
                    let currentQuantity = parseInt(quantityInput.value, 10);
                    if (currentQuantity > 1) {
                        quantityInput.value = currentQuantity - 1;
                        handleQuantityChange(productId, currentQuantity - 1);
                    }
                });

                plusBtn.addEventListener('click', () => {
                    let currentQuantity = parseInt(quantityInput.value, 10);
                    quantityInput.value = currentQuantity + 1;
                    handleQuantityChange(productId, currentQuantity + 1);
                });

                quantityInput.addEventListener('change', () => {
                    let newQuantity = parseInt(quantityInput.value, 10);
                    if (isNaN(newQuantity) || newQuantity < 1) {
                        newQuantity = 1;
                        quantityInput.value = 1;
                    }
                    handleQuantityChange(productId, newQuantity);
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

    // --- Initialization --- 
    function init() {
         // Only run full init if on the cart page
         if (cartContainer) { 
            console.log('Cart module initialized.');
            renderCart(); // Initial render
         }
    }

    // Expose functions needed by other modules
    return { 
        init: init, 
        getCart: getCart,
        updateHeaderCartCount: _updateHeaderCartCount // Expose the internal function
    };
})();

// ==============================================
// Checkout Module (Modified to use SharedData and Cart.getCart)
// ==============================================
const Checkout = (function() {
    const checkoutContainer = document.querySelector('.checkout-main');
    if (!checkoutContainer) return { init: () => {} };

    const checkoutForm = checkoutContainer.querySelector('#checkout-form'); 
    const orderSummaryItemsContainer = checkoutContainer.querySelector('.order-summary__items');
    const summarySubtotalEl = checkoutContainer.querySelector('.order-summary .summary-row span:last-child'); // Simpler selector might be needed
    const summaryShippingEl = checkoutContainer.querySelector('.order-summary .summary-row:nth-of-type(2) span:last-child'); // More specific selector
    const summaryTotalEl = checkoutContainer.querySelector('.order-summary .total-price');
    const paymentOptions = checkoutContainer.querySelectorAll('.payment-options input[name="payment"]');
    const placeOrderButton = checkoutContainer.querySelector('.place-order-button');

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
        const errorElement = document.createElement('span');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        inputElement.parentNode.insertBefore(errorElement, inputElement.nextSibling);
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
            itemElement.innerHTML = `
                <img src="${item.image}" alt="${item.name} 缩略图">
                <span>${item.name} x ${item.quantity}</span>
                <span>${formatPrice(item.price * item.quantity)}</span>
            `;
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
        console.log("尝试提交订单...");

        if (validateForm()) {
            console.log("表单验证通过，准备提交...");
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

            console.log("模拟订单数据:", orderData);
             alert("订单提交成功！（模拟）");
            localStorage.removeItem('cart');
             // Use Cart module's function to update header
             if (typeof Cart !== 'undefined' && Cart.updateHeaderCartCount) {
                 Cart.updateHeaderCartCount([]); 
             } else {
                  console.error("Checkout Error: Cannot update header cart count.");
             }
             window.location.href = '/';
        } else {
            console.log("表单验证失败。");
            const firstError = checkoutForm.querySelector('.input-error, .error-message');
            firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

            paymentOptions.forEach(option => {
                option.addEventListener('change', handlePaymentSelection);
            });
        }
    }

    // --- Initialization ---
    function init() {
        if (checkoutContainer) { // Check if on checkout page
             console.log("Checkout Module Initializing...");
             renderOrderSummary();
             addEventListeners();
        }
    }

    return { init: init };
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

    const pageContents = { /* ... Keep existing page contents ... */ 
         'faq': { /* ... */ }, 'privacy': { /* ... */ }, 'tos': { /* ... */ }, 'default': { /* ... */ } 
     };
     
     function loadContent() {
        // ... (Keep existing loadContent)
         if (!contentArea || !pageTitleElement || !breadcrumbPageNameElement || !metaDescriptionTag) {
            console.error('Static page elements not found.');
            if(contentArea) contentArea.innerHTML = pageContents['default'].content;
            return;
        }
        const urlParams = new URLSearchParams(window.location.search);
        const pageKey = urlParams.get('page');
        let pageData;
        if (pageKey && pageContents[pageKey]) {
            pageData = pageContents[pageKey];
        } else {
            pageData = pageContents['default'];
        }
        document.title = `${pageData.title} - 塑梦潮玩`;
        metaDescriptionTag.setAttribute('content', pageData.description);
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
             console.log('StaticPage module initialized.');
        }
    }

    return { init: init };
})();


// ==============================================
// Animations Module (Keep existing)
// ==============================================
const Animations = (function() {
    // ... (Keep existing Animations code)
    const animatedElements = document.querySelectorAll('.fade-in-up');
    function init() { /* ... */ }
    return { init: init };
})();

// ==============================================
// Product Listing / Category / Search Results Module (Modified to use SharedData)
// ==============================================
const ProductListing = (function(){
    const listingContainer = document.querySelector('.plp-main, .category-main');
    if (!listingContainer) return { init: () => {} };

    // DOM elements (Keep existing)
    const pageTitleElement = listingContainer.querySelector('.page-title');
    const productGrid = listingContainer.querySelector('.gallery-grid.product-listing');
    const sortSelect = listingContainer.querySelector('#sort-select');
    const paginationContainer = listingContainer.querySelector('.pagination');
    const breadcrumbContainer = listingContainer.querySelector('.breadcrumb-nav .breadcrumb');

    // State Variables (Keep existing)
    let currentPage = 1;
    let itemsPerPage = 6;
    let currentSort = 'default';
    let currentProducts = []; // This will hold the filtered/searched results
    let pageMode = 'all';
    let currentQuery = '';
    let currentCategory = '';

    // --- Generate Product Card HTML --- (Use SharedData format)
    function createProductCardHTML(product) {
        // ... (Keep existing, ensure it uses product.images[0].thumb or fallback)
         const name = product.name || '[商品名称]';
        const series = product.series || '[所属系列]';
        const price = typeof product.price === 'number' ? product.price.toFixed(2) : 'N/A';
        const image = (product.images && product.images.length > 0 ? product.images[0].thumb : 'assets/images/placeholder-figurine-card-1.jpg');
        const id = product.id || '#';
        const priceHTML = typeof product.price === 'number' ? `<p class="product-card__price">¥${price}</p>` : '';

        return `
          <div class="product-card fade-in-up">
              <div class="product-card__image">
                  <a href="product-detail.html?id=${id}">
                       <img src="assets/images/placeholder-lowquality.jpg" data-src="${image}" alt="${name} - ${series}" loading="lazy" class="lazyload">
                  </a>
              </div>
              <div class="product-card__content">
                  <h4 class="product-card__title">
                      <a href="product-detail.html?id=${id}">${name}</a>
                  </h4>
                  <p class="product-card__series">${series}</p>
                  ${priceHTML} 
                  <a href="product-detail.html?id=${id}" class="product-card__button">查看详情</a>
              </div>
          </div>
        `;
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
        let breadcrumbHTML = `<li class="breadcrumb-item"><a href="/">首页</a></li>`;
        const categoryNames = (typeof SharedData !== 'undefined') ? SharedData.getCategoryName : (key) => key; // Use helper or fallback

        if (pageMode === 'category') {
            breadcrumbHTML += `<li class="breadcrumb-item"><a href="products.html">所有手办</a></li>`;
            breadcrumbHTML += `<li class="breadcrumb-item active" aria-current="page">${categoryNames(currentCategory)}</li>`;
        } else if (pageMode === 'search') {
             breadcrumbHTML += `<li class="breadcrumb-item active" aria-current="page">搜索结果: ${currentQuery}</li>`;
        } else {
             breadcrumbHTML += `<li class="breadcrumb-item active" aria-current="page">${categoryNames('all')}</li>`;
        }
        breadcrumbContainer.innerHTML = breadcrumbHTML;
    }

    // --- Render Page --- (Keep existing)
    function renderPage() {
         // ... (no changes needed here)
         const sortedProducts = sortProducts(currentProducts, currentSort);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const productsForPage = sortedProducts.slice(startIndex, endIndex);
        renderProducts(productsForPage);
        renderPagination(sortedProducts.length);
        updateBreadcrumbs();
        if (typeof ScrollAnimations !== 'undefined' && ScrollAnimations.init) {
             ScrollAnimations.init();
        }
    }

    // --- Render Products Grid --- (Keep existing)
    function renderProducts(productsToRender) {
         // ... (no changes needed here)
          if (!productGrid) return;
        productGrid.innerHTML = '';
        if (productsToRender.length === 0) {
            // Show empty message
            const emptyMessageElement = document.createElement('div');
            emptyMessageElement.classList.add('product-listing__empty-message', 'text-center'); // Add classes for styling
            let message = '暂无商品展示。';
            if (pageMode === 'search') {
                message = `抱歉，没有找到与 "${currentQuery}" 相关的商品。`;
            } else if (pageMode === 'category') {
                const categoryName = (typeof SharedData !== 'undefined' && SharedData.getCategoryName) ? SharedData.getCategoryName(currentCategory) : currentCategory;
                message = `抱歉，分类 "${categoryName}" 下暂无商品。`;
            }
            emptyMessageElement.innerHTML = `<p>${message}</p><a href="products.html" class="cta-button-secondary">浏览所有商品</a>`;
            productGrid.appendChild(emptyMessageElement);
        } else {
            productsToRender.forEach(product => {
                productGrid.innerHTML += createProductCardHTML(product);
            });
        }
        if (typeof LazyLoad !== 'undefined' && LazyLoad.init) { LazyLoad.init(); }
    }

    // --- Event Listeners Setup --- (Keep existing)
    function addEventListeners() {
        // ... (no changes needed here)
         if (sortSelect) { sortSelect.addEventListener('change', (event) => { /* ... */ }); }
    }

    // --- Initialization --- (Modified to use SharedData)
    function init() {
        if (!listingContainer || !pageTitleElement || !productGrid) return;

        const allProducts = (typeof SharedData !== 'undefined') ? SharedData.getAllProducts() : [];
        const categoryNames = (typeof SharedData !== 'undefined') ? SharedData.getCategoryName : (key)=>key;
        
        const urlParams = new URLSearchParams(window.location.search);
        const categoryKey = urlParams.get('cat');
        const searchQuery = urlParams.get('query');
        let title = categoryNames('all');
        currentProducts = [...allProducts];
        pageMode = 'all';
        currentCategory = 'all';

        if (searchQuery) {
            pageMode = 'search';
            currentQuery = searchQuery.trim();
            title = `搜索结果: "${currentQuery}"`;
            const lowerCaseQuery = currentQuery.toLowerCase();
            currentProducts = allProducts.filter(p =>
                p.name.toLowerCase().includes(lowerCaseQuery) ||
                p.series.toLowerCase().includes(lowerCaseQuery)
            );
        } else if (categoryKey && categoryNames(categoryKey) !== categoryKey) { // Check if key is valid
            pageMode = 'category';
            currentCategory = categoryKey;
            title = categoryNames(currentCategory);
            currentProducts = allProducts.filter(p => p.category?.key === currentCategory);
        } else if (window.location.pathname.includes('products.html')) {
             pageMode = 'all'; title = categoryNames('all'); currentProducts = [...allProducts];
        } else {
             currentProducts = [...allProducts]; // Fallback
        }

        pageTitleElement.textContent = title;
        document.title = `${title} - 塑梦潮玩`;
        currentPage = 1;
        currentSort = sortSelect ? sortSelect.value : 'default';
        renderPage();
        addEventListeners();
        console.log(`ProductListing module initialized in '${pageMode}' mode.`);
    }

    return { init: init };
})();

// ==============================================
// Homepage Specific Module (Modified to use SharedData)
// ==============================================
const Homepage = (function() {
    const featuredGrid = document.querySelector('#product-gallery .gallery-grid');
    const numberOfFeatured = 3;

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
        if (typeof ScrollAnimations !== 'undefined' && ScrollAnimations.init) { ScrollAnimations.init(); }
        console.log('Homepage featured products populated.');
    }

    function init() {
        // ... (Keep existing check for homepage)
         if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
             if (featuredGrid) {
                console.log('Homepage module Initializing...');
                populateFeaturedProducts();
            } else { console.log('Homepage module: Featured grid not found.'); }
        }
    }

    return { init: init };
})();

// ==============================================
// Application Initialization
// ==============================================
const App = {
    init: function() {
        console.log("App Initializing...");
        // Initialize modules in order of dependency or desired execution
        // SharedData doesn't need init as it's just data
        Utils; // Ensure Utils is processed (though it has no init)
        Header.init();
        SmoothScroll.init();
        ScrollAnimations.init(); 
        LazyLoad.init(); 
        Cart.init(); // Init Cart early so others can use its exposed functions
        Homepage.init(); 
        PDP.init(); 
        Checkout.init();
        StaticPage.init();
        ProductListing.init();
        console.log("App Initialization Complete.");
    }
};

document.addEventListener('DOMContentLoaded', App.init);