# 任务清单: ultimate-compression（去重抽象 + 极限构建链路）

目录: `helloagents/plan/202512242220_ultimate-compression/`

---

## 1. Runtime 去重抽象
- [√] 1.1 在 `scripts/main.js` 中新增 `Utils.copyText/dispatch/dispatchChanged/generateId`
- [√] 1.2 删除重复的 copy / dispatch / generateId 实现，并完成全局替换

## 2. 极限构建（Vite + 压缩）
- [√] 2.1 在 `vite.config.mjs` 中加入多页面输入与 terser 极限压缩配置
- [√] 2.2 新增 `scripts/build-ultra.mjs`（构建 + 预压缩编排）
- [√] 2.3 新增 `scripts/compress-dist.mjs`（brotli/gzip 预压缩）
- [√] 2.4 新增 `scripts/postbuild-copy.mjs`（补齐运行时静态资源）
- [√] 2.5 更新 `package.json` scripts/devDependencies，保持运行时零依赖

## 3. HTML / PWA 版本一致性
- [√] 3.1 将 14 个 HTML 的运行时脚本升级为 `type="module"`，保留 `?v=` 版本号
- [√] 3.2 执行 `npm run bump:version -- 20251224.2` 同步更新 HTML 与 `sw.js`

## 4. 安全检查
- [√] 4.1 扫描是否引入外部 CDN、是否存在 eval/不安全注入（按 G9）

## 5. 文档更新
- [√] 5.1 更新 `README.md`（加入“极限构建（Vite）”与“未来进化蓝图”）
- [√] 5.2 更新 `THIRD_PARTY_NOTICES.md`（补充开发期依赖说明）
- [√] 5.3 同步知识库（`helloagents/CHANGELOG.md` / `helloagents/wiki/modules/*` / `helloagents/project.md`）

## 6. 测试
- [√] 6.1 执行 `npm run verify`
- [√] 6.2 执行 `npm test` 与 `npm run test:coverage`
- [√] 6.3 执行 `npm run build`（验证构建链路与预压缩产物）
