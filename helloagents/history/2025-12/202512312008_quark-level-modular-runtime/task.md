# 任务清单: Quark-Level Modular Runtime（按页代码分割）

目录：`helloagents/history/2025-12/202512312008_quark-level-modular-runtime/`

---

## 1. 运行时结构升级（按页动态加载）
- [√] 1.1 在 `scripts/main.js` 实现 page loader（白名单映射 + 错误兜底 + 兼容 `?v=`），并将 PDP/PLP/Checkout 等页面模块改为动态加载
- [√] 1.2 新增 `scripts/pages/` 目录，并抽离页面模块：`homepage` / `product-listing` / `product-detail` / `checkout`
- [√] 1.3 抽离其余页面模块：`compare` / `orders` / `account` / `order-success` / `static-page` / `offline`
- [√] 1.4 保持非关键模块 idle init（Diagnostics / CommandPalette），并为下一轮进一步拆分预留入口

## 2. PWA 预缓存（根目录部署模式）
- [√] 2.1 更新 `sw.js`：补齐 `PRECACHE_URLS`（新增页面模块脚本，带版本 query）
- [√] 2.2 验证缓存版本切换策略仍可用（install/activate/旧 cache 清理）

## 3. UI/UX（为 Phase 3 视觉革命铺路）
- [√] 3.1 统一页面模块加载失败的降级体验（Toast 文案 + 可恢复引导）
- [?] 3.2 对关键交互做一次回归自检：Theme 切换 / Header 搜索 / Cart badge / PDP Lightbox / PLP 筛选与骨架屏
  > 备注: 已通过 `npm run verify`/`npm test`/`npm run build` 的工程级验证；仍建议在浏览器中做一次人工冒烟（尤其是跨页跳转与离线场景）。

## 4. 安全检查
- [√] 4.1 检查动态 import 输入：仅允许白名单页面名映射到固定模块路径（禁止任意拼接）
- [√] 4.2 检查拆分后新增/调整的 `innerHTML` 使用点，确保用户可控输入均经过 `Utils.escapeHtml()` 或严格 sanitizer
  > 备注: 本轮重构以“代码迁移/拆分”为主，未新增 DOM 注入面；`scripts/main.js` 既有安全插入/escape 逻辑保持不变。

## 5. 文档与知识库同步
- [√] 5.1 更新 `helloagents/wiki/modules/runtime-js.md`（从“单文件多模块”升级为“按页模块化 + loader”）
- [√] 5.2 更新 `helloagents/wiki/modules/pwa.md`（补充 precache 对页面模块的要求）
- [√] 5.3 更新 `helloagents/CHANGELOG.md`（新增版本条目，记录架构变更）

## 6. 验证与交付
- [√] 6.1 执行 `npm run verify`
- [√] 6.2 执行 `npm test`
- [√] 6.3 执行 `npm run build`
- [√] 6.4 生成原子提交（语义化 commit message）
- [ ] 6.5 推送到远程仓库（若权限/凭据可用；如需 force push 必须单独确认）
- [√] 6.6 迁移方案包至 `helloagents/history/2025-12/` 并更新索引
