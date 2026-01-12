# 任务清单: vt-reduced-motion-guardrail

目录: `helloagents/history/2026-01/202601130703_vt-reduced-motion-guardrail/`

---

## 1. A11y / Motion 守护
- [√] 1.1 在 `styles/extensions.css` 中为 `html[data-motion="reduce"]` 禁用共享元素命名
- [√] 1.2 在 `styles/extensions.css` 中关闭 `::view-transition-*` pseudo-elements 动画（兜底导航过渡）

## 2. 版本与验证
- [√] 2.1 bump 版本号到 `20260112.16`
- [√] 2.2 运行 `npm run verify`
- [√] 2.3 运行 `npm test`
- [√] 2.4 运行 `npm run build`
- [√] 2.5 运行 `npm run budget`

## 3. 文档与知识库
- [√] 3.1 更新 `helloagents/wiki/modules/ui.md`
- [√] 3.2 更新 `helloagents/CHANGELOG.md`
- [√] 3.3 更新 `helloagents/history/index.md`
