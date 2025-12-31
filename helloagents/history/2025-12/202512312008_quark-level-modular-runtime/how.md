# 实施方案（How）：Quark-Level Modular Runtime（按页代码分割）

## 1. 方案概览

核心思路：保持 `scripts/main.js` 作为全站入口与基础模块容器，但把 **页面级大模块** 抽离成独立文件，并在 `App.init()` 中按 `Utils.getPageName()` 的结果进行动态加载。

分层结构：
- **全站基础模块（always-on）**：Header / Theme / Toast / Store / SharedData / Prefetch / Skeleton / Cart badge 等。
- **页面级模块（page-scoped）**：Homepage / ProductListing / PDP / Checkout / OrdersPage / AccountPage / ComparePage / StaticPage / OfflinePage / OrderSuccessPage。
- **非关键模块（idle）**：Diagnostics / CommandPalette 等保持“空闲初始化”，并进一步具备拆分空间。

## 2. 按页动态加载策略

### 2.1 Loader 设计

在 `scripts/main.js` 内新增统一的 page loader：
- 输入：`pageName`（如 `products.html`）
- 输出：加载对应模块并执行 `init()` 的 Promise

并提供一致的失败兜底：
- 不阻断基础模块初始化
- 捕获异常并输出 warning
- 必要时通过 Toast 提示“降级但可用”

### 2.2 双运行模式兼容（根目录部署 vs Vite 构建）

> 约束：根目录静态部署依赖 `?v=YYYYMMDD.N` 的缓存策略；Vite 构建要求 import specifier 尽量静态可分析。

策略：
- **Vite 构建路径：** 使用静态字符串的 `import('./pages/xxx.js')`，让 Vite 能正常打包分 chunk。
- **根目录部署路径：** 使用运行时拼接的 `import(/* @vite-ignore */ './pages/xxx.js?v=VERSION')`，确保浏览器缓存与版本一致。

该“分支判断”封装在 loader 内，避免散落在业务模块中。

## 3. 模块拆分实施

### 3.1 文件结构（新增）
- `scripts/pages/homepage.js`
- `scripts/pages/product-listing.js`
- `scripts/pages/product-detail.js`
- `scripts/pages/checkout.js`
- `scripts/pages/orders.js`
- `scripts/pages/account.js`
- `scripts/pages/compare.js`
- `scripts/pages/static-page.js`
- `scripts/pages/offline.js`
- `scripts/pages/order-success.js`

### 3.2 依赖策略

页面模块通过从 `scripts/main.js` 导入（或导入最小导出集合）来复用既有基础能力，避免把基础模块重复拷贝到每个页面文件。

原则：
- **只抽离页面模块本身**，不在本次迭代强制“全量拆分基础模块”（降低风险）。
- 导出 API 维持最小化：页面模块只导入它所需的运行时对象/工具集合。

## 4. PWA 与缓存策略调整

根目录部署模式下，`sw.js` 的 `PRECACHE_URLS` 需要补齐新增页面模块文件（带 `?v=`）。

注意：
- `dist/` 极限构建产物默认不保证 PWA 离线（现有约定不变）
- 本次仅保证“根目录部署”离线体验不退化

## 5. 安全与性能

- **安全：** 拆分不引入新的 `innerHTML` 注入路径；对动态 import 的输入做白名单映射，禁止基于 URL 任意拼接路径。
- **性能：** 页面模块仅在目标页面解析与执行；非关键模块继续空闲初始化；保持 `save-data`/弱网策略。

## 6. 验证

- `npm run verify`
- `npm test`
- `npm run build`
- 手工验证（建议）：
  - 每个页面打开一次，确认无控制台报错、核心交互可用
  - 断网后打开 `offline.html`，确认兜底可用（根目录部署模式）

## 7. ADR

### ADR-001：采用“按页动态 import + 双运行模式兼容”

**上下文：** 单体 `scripts/main.js` 维护成本上升，且无法做到真正的按页代码分割；同时项目存在“根目录部署（带 `?v=`）”与“Vite 构建（fingerprint）”双路径。

**决策：** 在 `scripts/main.js` 引入 page loader，通过白名单映射加载页面模块；对根目录部署注入 `?v=`，对 Vite 构建保持静态可分析 import。

**替代方案：**
- 方案A：继续保持单文件，仅做按页 init（已做）→ 拒绝：无法解决解析/编译成本与维护冲突。
- 方案B：引入框架并重写 → 拒绝：超出项目定位与成本，且破坏“零依赖静态站”优势。

**影响：**
- 需要新增页面模块文件与 `sw.js` 预缓存更新
- `scripts/main.js` 将增加少量导出供页面模块复用

