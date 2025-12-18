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
- [!] `StaticPage` 内容为占位对象，导致静态内容页出现 `undefined`/标题错误
- [!] `PDP` 选择器与 HTML 类名不一致，导致商品详情页无法渲染
- [!] `ProductListing` 排序监听被占位符替换，导致排序无效

## 3. 执行清单（2025-12-18）
- [x] 修复关键功能：PDP 选择器、StaticPage 内容、列表页排序监听
- [x] 新增收藏体系：`favorites.html` + 商品卡片收藏按钮 + 头部收藏入口与计数（`localStorage`）
- [x] 新增主题切换：浅色/深色一键切换；head 预注入避免闪烁（跟随系统/记忆偏好）
- [x] 新增 PWA 离线兜底：`sw.js` + `offline.html`（仅 https/localhost 生效）
- [x] 缓存穿透统一版本号：`20251218.2`（`main.css`/`extensions.css`/`main.js`）
- [x] 强化校验脚本：`scripts/validate.mjs` 增加主题注入/扩展样式/离线与 SW 文件强校验
- [x] CI 加固：GitHub Actions 增加 `sw.js` 语法检查
