# 任务清单: UI 重叠/塌陷热修复

目录: `helloagents/plan/202601181631_ui-overlap-hotfix/`

---

## 1. UI（结构与交互）
- [√] 1.1 修复 `index.html` 结构性多余闭合标签，保证 Header/Hero/Curation 区块 DOM 嵌套正确
- [√] 1.2 在 `scripts/main.js` 的 Header 模块中，让移动端菜单与搜索栏/下拉互斥，避免 overlay 叠加遮挡

## 2. 版本与缓存
- [√] 2.1 统一缓存穿透版本号 bump 到 `20260118.1`（HTML、sw.js、Task_Status）

## 3. 安全检查
- [√] 3.1 检查是否引入敏感信息/危险操作（无）

## 4. 文档更新
- [√] 4.1 更新 `helloagents/CHANGELOG.md` 记录本次修复与版本 bump
- [√] 4.2 更新 `helloagents/history/index.md` 追加变更索引与归档记录
- [√] 4.3 更新 `helloagents/wiki/modules/ui.md` 补充本次修复的“注意事项/防护”条目

## 5. 测试
- [√] 5.1 执行 `npm run verify`
- [√] 5.2 执行 `npm test`
