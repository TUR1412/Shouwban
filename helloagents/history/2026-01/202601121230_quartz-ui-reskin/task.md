# 任务清单: quartz-ui-reskin

目录: `helloagents/history/2026-01/202601121230_quartz-ui-reskin/`

---

## 1. 设计系统（Quartz Token）
- [√] 1.1 在 `styles/extensions.css` 追加 Quartz token（颜色/阴影/圆角/动效曲线）
- [√] 1.2 覆盖关键容器皮肤（Header / 卡片 / Toast / Dialog / 筛选条）
- [√] 1.3 统一 focus ring 与表单控件密度（输入/下拉）

## 2. 微交互与物理动效
- [√] 2.1 扩展 `scripts/motion.js`：新增 `Motion.spring()`（阻尼弹簧关键帧生成）
- [√] 2.2 扩展 `scripts/pages/homepage.js`：策展 Tabs 指示器使用 spring（含回退）

## 3. 文档与知识库
- [√] 3.1 重制双语 `README.md`
- [√] 3.2 更新 `helloagents/wiki/modules/ui.md`
- [√] 3.3 更新 `helloagents/CHANGELOG.md`
- [√] 3.4 更新 `helloagents/history/index.md`

## 4. 版本与验证
- [√] 4.1 bump 版本号到 `20260112.13`
- [√] 4.2 运行 `npm run verify`
- [√] 4.3 运行 `npm test`
- [√] 4.4 运行 `npm run build`
- [√] 4.5 运行 `npm run budget`
