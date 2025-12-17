# [Shouwban-OPT-20251217] 任务看板
> **环境**: Windows 11 | **终端**: `pwsh -NoLogo -NoProfile -Command '...'` | **项目形态**: 纯静态站点 (HTML/CSS/JS) | **档位**: 3档（标准工程）
> **已激活矩阵**: [模块 A: 现代前端] + [模块 E: 终端统一/幽灵防御]

## 1. 需求镜像 (Requirement Mirroring)
> **我的理解**: 对 `https://github.com/TUR1412/Shouwban.git` 进行「优化升级 + 美化」，让项目开箱即用、交互正常、样式更现代，并补齐工程化与文档。
>
> **不做什么**:
> - 不在后台启动任何长期驻留服务（只提供启动命令说明，不在本回合启动）。
> - 不引入重型框架（保持静态站点形态，避免大规模迁移到 React/Next 等）。

## 2. 执行清单 (Execution)
- [x] 1) 拉取仓库到 `C:\wook\Shouwban`
- [x] 2) 识别为静态多页站点（HTML/CSS/JS），并定位关键问题：类名不一致、路径不稳、占位资源缺失、结算/购物车选择器脆弱等
- [x] 3) 工程化基础补齐（`.gitignore`/文档/目录卫生）
- [x] 4) UI 统一与交互修复（Header/Cart/Checkout/分类页结构）
- [x] 5) 运行时校验（`node --check` 等有限任务）

## 3. 第二轮：SEO / PWA / 原子级审查
- [x] 1) 全站补齐 SEO 基础元信息（`robots`/`theme-color`/`color-scheme`/OG/Twitter）
- [x] 2) 全站补齐 PWA manifest 引用，并新增 `assets/manifest.webmanifest`
- [x] 3) 新增 `robots.txt` + `sitemap.xml` + `404.html`（面向 GitHub Pages/静态托管）
- [x] 4) 统一缓存穿透版本号到 `20251217.4`（HTML 引用的 CSS/JS）
- [x] 5) 修复静态站点子路径兼容：移除 `href=\"/\"` 绝对根路径写法
- [x] 6) 原子级安全审查：所有 `target=\"_blank\"` 补齐 `rel=\"noopener noreferrer\"`
- [x] 7) 强化 `scripts/validate.mjs`：Manifest/Robots/Sitemap/target=_blank 规则强校验
