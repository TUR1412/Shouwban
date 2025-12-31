/* Page Module
   - 按页代码分割：仅在目标页面 init() 触发时创建模块（避免 scripts/main.js 单体膨胀）
   - 运行时依赖通过 init(ctx) 注入：兼容根目录部署 ?v= 缓存穿透与 Vite 构建
*/

let StaticPage = null;
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

  // Static Page Content Module (Uses SharedData for consistency if needed later)
  // ==============================================
  StaticPage = (function() {
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
                      <p>当前默认不依赖运行时第三方 CDN 资源：图标使用本地 SVG Sprite，字体使用系统字体栈。</p>
                      <p>如你在二次开发中引入第三方资源（字体/CDN/统计脚本等），建议同时配置 CSP，并在隐私政策中明确说明其数据收集范围。</p>
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

  try { StaticPage.init(); } catch (e) { console.warn('Page module init failed: static-page.js', e); }
}
