# 贡献指南（Contributing）

感谢你愿意一起把 Shouwban 做得更稳、更漂亮、更易维护。

## 开发约定

- **终端统一**：Windows 环境建议统一使用 `pwsh -NoLogo -Command "..."`
- **项目形态**：保持纯静态（HTML/CSS/JS），不引入重型框架与后端依赖
- **避免长驻服务（默认）**：本地预览可用 Python/http-server；如需使用 Vite（开发服务器/极限构建），再执行 `npm install`

## 本地预览

推荐使用本地静态服务器，而不是双击打开 HTML：

```powershell
pwsh -NoLogo -Command "python -m http.server 5173"
```

访问：`http://localhost:5173/index.html`

## 原子级自检

提交前建议先通过校验脚本：

```powershell
pwsh -NoLogo -Command "node scripts/validate.mjs"
```

该脚本会强制检查：HTML 引用版本号是否统一、`sw.js` 的缓存版本是否与 HTML 一致、以及关键文件/引用是否完整。

如果改动涉及 JS/SW，推荐额外做语法检查：

```powershell
pwsh -NoLogo -Command "node --check scripts/main.js; node --check sw.js"
```

也可以使用 `npm` 脚本（`verify`/`bump:version` 无需安装依赖包）：

```powershell
pwsh -NoLogo -Command "npm run verify"
```

## 修改静态资源后的版本号（很重要）

当你修改 `styles/main.css` / `styles/extensions.css` / `scripts/main.js` / `sw.js` 等核心资源时，请同步更新版本号，避免浏览器/Service Worker 缓存导致“改了没生效”：

1. 更新所有 HTML 中的引用版本号：`?v=...`
2. 更新 `sw.js` 中的 `CACHE_NAME` 与 `PRECACHE_URLS`
3. 运行 `node scripts/validate.mjs` 确认引用一致且资源存在

推荐使用一键脚本统一 bump：

```powershell
pwsh -NoLogo -Command "node scripts/bump-version.mjs 20251224.2"
```

或：

```powershell
pwsh -NoLogo -Command "npm run bump:version -- 20251224.2"
```

## 安全问题披露

请不要在公开 Issue 中直接披露可利用的漏洞细节；详见 `SECURITY.md`。

## 提交信息建议

建议使用以下前缀（无需拘泥，但尽量一致）：

- `feat:` 新功能
- `fix:` 修复问题
- `docs:` 文档更新
- `chore:` 工程维护（例如版本号 bump）
- `security:` 安全加固
