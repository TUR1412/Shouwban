# 技术设计: UI 重叠/塌陷热修复

## 技术方案

### 核心技术
- 纯静态 MPA：HTML/CSS/JS
- Header 交互逻辑：`scripts/main.js` 的 Header Module
- 缓存穿透版本：资源 URL `?v=YYYYMMDD.N` + `sw.js` 的 `CACHE_NAME`

### 实现要点
- 修复 `index.html` 中 3 处多余 `</div>`，让 DOM 树结构与页面语义一致（Header、Hero、Curation 三段）。
- 在 `Header.toggleMobileMenu()` 打开菜单时：
  - 调用 `closeSearch()`，保证搜索栏关闭；
  - 调用 `closeAllDropdowns()`，收起所有下拉；
  - 同时在关闭菜单时也收起下拉，保证状态复位。
- 使用 `npm run bump:version -- 20260118.1` 统一更新缓存穿透版本号：
  - 14 个 HTML 入口的 CSS/JS query version；
  - `sw.js` 的 `CACHE_NAME` 与 precache URL；
  - `Task_Status.md` 的版本标记。

## 架构设计
无架构变更（仅页面结构修复 + 交互互斥 + 版本号更新）。

## 安全与性能
- **安全:** 无新增外部依赖，不涉及 PII/支付/权限。
- **性能:** 结构修复减少 DOM 解析的不确定性；互斥关闭避免多浮层同时渲染造成的额外重排。

## 测试与部署
- **测试:**
  - `npm run verify`（语法检查 + 结构校验）
  - `npm test`（单元测试）
- **部署:**
  - 提交变更后发布静态站点即可；版本号 bump 触发缓存更新（含 Service Worker）。
