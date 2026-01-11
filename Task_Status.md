# [Shouwban-OPT-20251221] 任务看板
> **环境**: Windows 11 | **终端**: `pwsh -NoLogo -Command "..."` | **项目形态**: 纯静态站点 (HTML/CSS/JS/PWA) | **档位**: 4档（架构重构）
> **已激活矩阵**: [模块 A: 现代前端] + [模块 E: 终端统一/幽灵防御] + [模块 F: 需求镜像/验证]
> **缓存穿透统一版本号**：`20260111.4`

## 1. 需求镜像 (Requirement Mirroring)
> **我的理解**: 对 `https://github.com/TUR1412/Shouwban.git` 执行「原子级审查 + 重构收敛 + 新增 3~5 个核心高级功能 + UI/UX 现代化升级 + README 重写（含架构图/徽章/部署指南）」，并在验证通过后尝试推送远程仓库；删除本地仓库属于毁灭性操作，必须单独确认后执行。
>
> **不做什么**:
> - 不在后台启动任何长期驻留服务（仅给出启动命令说明）。
> - 不引入后端依赖或真实支付（保持静态站点形态）。
> - 不在端口被占用时强启服务；不在未确认下删除仓库。

## 2. 风险清单（本轮关注）
- [x] 新增页面（对比/订单/成功页）可能导致 SW 预缓存遗漏（已同步更新 `sw.js` precache）。
- [x] 新增优惠码/运费规则可能导致总价计算不一致（已统一在 Cart/Checkout 渲染时按同一规则计算）。
- [x] localStorage 多标签页同步可能遗漏新 key（已扩展 CrossTabSync：compare/promotion/shippingRegion/orders）。
- [ ] 推送与删除动作需明确授权确认。

## 3. 执行清单（2025-12-21）
- [x] 原子级重构：补齐 storage 工具、收敛重复解析逻辑、加入 Pricing 统一计算
- [x] 高级功能 1：商品对比（列表/详情加入，对比页移除/加购）
- [x] 高级功能 2：优惠码（本地规则示例）+ 购物车/结算同步
- [x] 高级功能 3：运费估算（按配送地区与阈值）+ 配送地区选择
- [x] 高级功能 4：订单中心 + 订单成功页（模拟下单→落库→复购）
- [x] 高级功能 5：PWA 安装引导按钮（`beforeinstallprompt`）
- [x] UI/UX 现代化：新增页面与新组件玻璃拟态样式、表格/卡片可读性强化
- [x] 文档重写：README（徽章 + 架构图 + 部署指南）
- [x] 版本号统一 bump（已更新至 `20251221.1`）
- [x] 运行校验脚本 `npm run verify`
- [ ] 尝试推送远程仓库（可能受 GitHub 鉴权影响）
- [ ] 申请确认后删除本地仓库（高危，单独确认）

## 4. 第二轮递归进化（B2：共享元素过渡 + 滚动编排 · 2025-12-22）
- [x] 跨文档 View Transitions：启用 `@view-transition { navigation: auto; }` 并加全局镜头切换动画
- [x] 商品卡片 → 详情页：共享元素（图/标题/价格）变形飞入（点击时动态命名，避免同名冲突）
- [x] 购物车 → 结算：摘要卡片共享元素过渡（vt-summary）
- [x] 首页策展 Tab 指示器：Motion 驱动的 width/x 过渡（更“流体”）
- [x] 首页 Hero：滚动驱动的轻量视差（orbit 旋转 + glass 漂浮），带 IntersectionObserver 限域
- [x] 版本号 bump：`20251222.2`（已同步 HTML/SW/核心资源引用）
- [x] 有限验证：`npm run verify` + `npm test` + `npm run test:coverage`

## 5. 第三轮递归进化（B3：性能压榨 + 单测扩容 · 2025-12-22）
- [x] ScrollAnimations 支持作用域：避免全局扫描导致的重复渲染/重复观察
- [x] 商品列表/首页/最近浏览：改为“按容器触发”滚动入场，减少不必要的重绘与 IO 观察目标
- [x] 首页 Hero 视差：离屏时停止 rAF 调度（IntersectionObserver 反向限域）
- [x] Core 纯函数扩容：新增 `calculateCartSubtotal`、`calculatePromotionDiscount`，并让 Promotion 逻辑直接复用
- [x] 金额舍入修复：`roundMoney` 解决典型浮点误差（如 1.005 -> 1.01），保证价格计算稳定
- [x] CSS 性能加强：对长列表启用 `content-visibility: auto`（渐进增强，屏外跳过渲染）
- [x] 版本号 bump：`20251222.3`（已同步 HTML/SW/核心资源引用）
- [x] 有限验证：`npm run verify` + `npm test` + `npm run test:coverage`

## 6. 第四轮递归进化（B4：红蓝对抗 + 依赖瘦身 · 2025-12-22）
- [x] 动效库瘦身：移除 vendor 的 Motion One，改为自研 `Motion.animate()`（WAAPI 适配层），显著降低 payload
- [x] LazyLoad 复用观察者：单例 IntersectionObserver + 支持 root scope，减少重复创建与全局扫描
- [x] PDP XSS 加固：规格/描述渲染改为 DOM 安全插入，并对白名单标签做过滤
- [x] 运行时依赖清零：移除 Google Fonts / Font Awesome CDN，改为本地 SVG Sprite + 系统字体栈（同步更新 `THIRD_PARTY_NOTICES.md`）
- [x] 版本号 bump：`20251222.4`（已同步 HTML/SW/核心资源引用）
- [x] 有限验证：`npm run verify` + `npm test` + `npm run test:coverage`

## 7. 第五轮递归进化（B5：一致性收敛 · 2025-12-22）
- [x] Cart 小计计算复用 Core：减少浮点误差与逻辑分叉
- [x] PDP 描述过滤器兼容性修复：避免旧浏览器 `NodeList.forEach` 兼容问题
- [x] 版本号 bump：`20251222.5`（已同步 HTML/SW/核心资源引用）
- [x] 有限验证：`npm run verify` + `npm test` + `npm run test:coverage`

## 8. 第六轮递归进化（B6：Genesis Theme · 2026-01-01）
- [x] 三态主题：Light → Dark → Genesis（本地持久化）
- [x] Genesis 变体：`data-theme="dark"` + `data-variant="genesis"`（复用暗色主题覆写 + 叠加霓虹/极光 token）
- [x] UI Token 收敛：主色相关 `rgba(31, 111, 235, …)` 统一改为 `rgba(var(--color-primary-rgb), …)`，保证不同主题下光晕/徽章/边框一致
- [x] README 产品门户化：补齐 ASCII Title + Emoji 特性清单 + Genesis 主题说明
- [ ] 推送与删除动作需明确授权确认（依旧保持高危单独确认）

## 9. 第七轮递归进化（B7：A11y Center · 2026-01-11）
- [x] 无障碍与偏好中心：会员中心新增「减少动效 / 高对比 / 字体缩放（100%~125%）」
- [x] Motion 自动降级：`Motion.animate()` 同时尊重用户偏好与 `prefers-reduced-motion`
- [x] PWA precache 守护：`sw.js` 预缓存补齐 `scripts/modules/*`（新增 accessibility 模块）
- [x] 工程守护扩展：`bump-version`/`validate`/`check` 覆盖 `scripts/modules/*`
- [x] 覆盖率修复：补齐 `scripts/core.js` 库存函数单测，恢复 `npm run test:coverage` 100%

## 10. 验收命令（推荐）

```powershell
pwsh -NoLogo -Command "npm run verify"
```
