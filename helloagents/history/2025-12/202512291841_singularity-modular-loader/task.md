# 任务清单: Singularity Modular Loader

目录：`helloagents/plan/202512291841_singularity-modular-loader/`

---

## 1. 运行时结构优化（按页初始化）
- [√] 1.1 调整 `scripts/main.js` 的 `App.init()`：基础模块全站 init，页面模块按页 init
- [√] 1.2 将 Diagnostics / CommandPalette 延后到空闲初始化

## 2. 新功能：数据导入/导出（Account）
- [√] 2.1 在 `account.html` 增加“数据管理”UI（导入/导出/清空）
- [√] 2.2 在 `scripts/main.js` 增加 `DataPortability` 模块：导入/导出/校验/覆盖/刷新
- [√] 2.3 导入/清空后保证 UI 一致性（自动 reload + Toast 提示）

## 3. 构建与依赖瘦身
- [√] 3.1 移除 `package.json` 中 `terser` devDependency
- [√] 3.2 修改 `vite.config.mjs`：使用 `esbuild` minify（保持 drop_console/debugger）
- [√] 3.3 更新 `THIRD_PARTY_NOTICES.md` 与知识库，确保依赖声明准确

## 4. 安全检查
- [√] 4.1 导入功能输入校验（schema/白名单/大小限制）
- [√] 4.2 检查 `innerHTML` 使用点：新增导入逻辑不进入 DOM，写入仅限 localStorage 白名单键

## 5. 文档与知识库同步
- [√] 5.1 更新 `README.md`（数据导入导出、构建链路变更）
- [√] 5.2 更新 `helloagents/project.md` 与 `helloagents/wiki/modules/tooling.md`
- [√] 5.3 更新 `helloagents/CHANGELOG.md`（新增版本条目）

## 6. 验证与交付
- [√] 6.1 执行 `npm run verify`
- [√] 6.2 执行 `npm test`
- [√] 6.3 推送到远程仓库（若权限/凭据可用）
- [√] 6.4 迁移方案包至 `helloagents/history/2025-12/` 并更新索引
