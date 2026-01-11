# 技术设计: 无障碍与偏好中心（A11y Preferences）

## 技术方案

### 核心技术
- **Runtime 模块**：新增 `scripts/modules/accessibility.js`（无 DOM 依赖，负责状态与应用）
- **UI 注入**：`account.html` + `scripts/pages/account.js`（面板与交互）
- **CSS 落地**：`styles/extensions.css`（全局字体缩放 + 高对比 token + 减少动效兜底）
- **动效尊重偏好**：`scripts/motion.js`（WAAPI 适配层在 reduced-motion 下自动降级）
- **PWA**：`sw.js` precache 补齐新模块

### 数据模型（localStorage）
存储键：`a11y`

```json
{
  "reduceMotion": false,
  "highContrast": false,
  "fontScale": 1
}
```

说明：
- `fontScale` 为 1.00~1.25，小数保留两位，用于映射 `--a11y-font-scale`。

### 运行时映射
`Accessibility.apply()` 将 `a11y` 映射到文档根元素：
- `reduceMotion=true` → `html[data-motion="reduce"]`
- `highContrast=true` → `html[data-contrast="high"]`
- `fontScale` → `html { font-size: calc(16px * var(--a11y-font-scale)) }`

### 跨标签页同步
通过既有 `CrossTabSync`（`storage` event）新增 `a11y` 分支：
- 其他标签页更新 `a11y` 后，本页调用 `Accessibility.init()` 重新应用并触发 `a11y:changed`。

## 安全与性能
- **安全：** 纯前端偏好存储，无敏感数据；不新增外链或运行时依赖。
- **性能：** `Accessibility.init()` 仅设置少量 attribute/CSS var，开销可忽略；Motion 降级减少动画成本。

## 测试与部署
- `npm run verify`：语法检查 + 结构校验（含 SW precache 覆盖新增模块）
- `npm test`：单测
- `npm run test:coverage`：核心纯函数 100% 覆盖率（守护不回退）

