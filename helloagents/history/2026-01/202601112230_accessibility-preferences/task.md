# 任务清单: 无障碍与偏好中心（A11y Preferences）

目录: `helloagents/plan/202601112230_accessibility-preferences/`

---

## 1. Runtime（A11y 偏好模块）
- [√] 1.1 新增 `scripts/modules/accessibility.js`：持久化 `a11y` 并映射到 `data-*` 与 `--a11y-font-scale`
- [√] 1.2 在 `scripts/main.js` 集成：注入到 Runtime Context、App.init 初始化、CrossTabSync 同步

## 2. UI（会员中心偏好面板）
- [√] 2.1 更新 `account.html`：新增「无障碍与偏好」卡片（reduce motion / high contrast / font scale）
- [√] 2.2 更新 `scripts/pages/account.js`：渲染、预览与持久化、监听 `a11y:changed`
- [√] 2.3 更新 `styles/extensions.css`：A11y 全局规则 + 账号页面板样式

## 3. 动效与渐进增强
- [√] 3.1 更新 `scripts/motion.js`：WAAPI 动效自动尊重用户偏好与 `prefers-reduced-motion`

## 4. 工程守护（PWA/脚本）
- [√] 4.1 更新 `sw.js`：PRECACHE_URLS 增加 `scripts/modules/accessibility.js?v=...`
- [√] 4.2 更新 `scripts/bump-version.mjs`：版本替换覆盖 `scripts/modules/*`
- [√] 4.3 更新 `scripts/validate.mjs`：required 列表与 precache 校验覆盖新增模块
- [√] 4.4 更新 `package.json`：`npm run check` 覆盖新增模块

## 5. 测试
- [√] 5.1 更新 `tests/core.test.mjs`：补齐库存相关纯函数覆盖
- [√] 5.2 执行 `npm run verify` / `npm test` / `npm run test:coverage`

