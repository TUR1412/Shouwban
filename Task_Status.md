# [Shouwban-OPT-20251218] 任务看板
> **环境**: Windows 11 | **终端**: `pwsh -NoLogo -NoProfile -Command '...'` | **项目形态**: 纯静态站点 (HTML/CSS/JS) | **档位**: 3档（标准工程）
> **已激活矩阵**: [模块 A: 现代前端] + [模块 E: 终端统一/幽灵防御] + [模块 F: 需求镜像/验证]

## 1. 需求镜像 (Requirement Mirroring)
> **我的理解**: 对 `https://github.com/TUR1412/Shouwban.git` 进行「原子级审查 + 修复 + 升级扩展 + 文档美化」，目标是：开箱即用、交互稳定、视觉更现代、具备可验证的工程化防线，并保持“纯静态站点”形态。
>
> **不做什么**:
> - 不在后台启动任何长期驻留服务（只提供启动命令说明）。
> - 不引入重型框架（保持静态站点形态，避免大规模迁移到 React/Next 等）。
> - 不添加后端依赖（支付/订单/库存仅做前端演示）。

## 2. 风险清单（本轮发现）
- [x] `StaticPage` 内容为占位对象，导致静态内容页出现 `undefined`/标题错误（已修复）
- [x] `PDP` 选择器与 HTML 类名不一致，导致商品详情页无法渲染（已修复）
- [x] `ProductListing` 排序监听被占位符替换，导致排序无效（已修复）
- [x] 购物车/结算渲染直接拼接 `innerHTML` 且数据来自 `localStorage`（存在注入/XSS 风险，已修复）
- [x] `styles/main.css` 存在误拼接重复段（体积膨胀、维护风险，已修复并加入校验防回归）
- [x] 暗色主题下部分卡片背景误用“文字色变量”导致主题原子性不完整（已引入 `--color-surface` 修复）
- [x] `sw.js` 在静态资源请求失败时可能返回 `null`，导致 `respondWith` 异常（已修复）
- [x] `Cart` 模块在非购物车页“早退”导致 API 不一致、容错不足（已修复）
- [x] `:focus` 覆盖 `:focus-visible` 导致键盘焦点提示弱化（已修复）

## 3. 执行清单（2025-12-18）
- [x] 修复关键功能：PDP 选择器、StaticPage 内容、列表页排序监听
- [x] 新增收藏体系：`favorites.html` + 商品卡片收藏按钮 + 头部收藏入口与计数（`localStorage`）
- [x] 导航增强：Footer 增加收藏快捷入口
- [x] 新增主题切换：浅色/深色一键切换；head 预注入避免闪烁（跟随系统/记忆偏好）
- [x] 新增 PWA 离线兜底：`sw.js` + `offline.html`（仅 https/localhost 生效）
- [x] PWA 缓存策略：静态资源 `stale-while-revalidate` + 支持自动更新刷新（不影响首次安装）
- [x] SEO 细化：商品详情注入 `schema.org/Product` JSON-LD
- [x] 安全基线：动态文本 HTML 转义 + URL 参数 `encodeURIComponent`，避免注入风险
- [x] 安全加固：购物车/结算等关键渲染改用安全 DOM API + HTML 转义（防 `localStorage` 注入）
- [x] 可访问性：ESC 关闭搜索/菜单/下拉；购物车/收藏计数补齐 `aria-live`
- [x] 缓存穿透统一版本号：`20251218.4`（`main.css`/`extensions.css`/`main.js`）
- [x] 主题原子性：新增 `--color-surface`，暗色主题下卡片/导航/内容区块一致更新
- [x] 样式体积治理：移除 `styles/main.css` 误拼接重复段（并在校验脚本中增加重复检测）
- [x] 跨标签同步：监听 `storage` 同步主题/收藏/购物车（含结算页摘要刷新）
- [x] 协作增强：新增 Issue 表单 + PR 模板（内置版本号/校验脚本自检清单）
- [x] 强化校验脚本：`scripts/validate.mjs` 增加主题注入/扩展样式/离线与 SW 文件强校验 + 版本号一致性校验（HTML↔SW）+ main.css 重复检测
- [x] CI 加固：GitHub Actions 增加 `sw.js` 语法检查
- [x] PWA 稳健性：导航请求增加超时策略；离线优先回退缓存；目录路由回退 `index.html`
- [x] 离线体验：`offline.html` 增加网络状态提示 + 一键重试（并由 JS 驱动）
- [x] UX 增强：新增“返回顶部”按钮（兼容减少动态偏好）
- [x] UX 增强：商品详情新增“复制链接”分享按钮（Clipboard API + 降级方案）
- [x] UX 增强：购物车新增“清空购物车”按钮（确认 + Toast）
- [x] A11y 增强：Header 下拉菜单补齐 `aria-*` + 键盘打开；Header 搜索补齐 `aria-controls`/`aria-hidden`
- [x] A11y 增强：结算表单错误补齐 `aria-invalid`/`aria-describedby`，并聚焦首个错误
- [x] 工具链：新增 `scripts/bump-version.mjs` 与 `package.json`（零依赖）便于一键校验与版本号 bump
- [x] 文档：新增 `SECURITY.md`、`TROUBLESHOOTING.md`、`QUARK_ITERATIONS.md`，并进一步美化 README

## 4. 验收命令（推荐）

在项目根目录执行：

```powershell
pwsh -NoLogo -NoProfile -Command 'npm run verify'
```
