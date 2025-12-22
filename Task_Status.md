# [Shouwban-OPT-20251221] 任务看板
> **环境**: Windows 11 | **终端**: `pwsh -NoLogo -NoProfile -Command '...'` | **项目形态**: 纯静态站点 (HTML/CSS/JS/PWA) | **档位**: 4档（架构重构）
> **已激活矩阵**: [模块 A: 现代前端] + [模块 E: 终端统一/幽灵防御] + [模块 F: 需求镜像/验证]
> **缓存穿透统一版本号**：`20251222.2`

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

## 5. 验收命令（推荐）

```powershell
pwsh -NoLogo -NoProfile -Command 'npm run verify'
```
