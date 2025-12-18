# 安全策略（Security Policy）

本仓库为「纯静态站点模板」，不包含后端支付/订单/鉴权等真实业务，但仍可能存在前端侧安全问题（例如 XSS、链接跳转、PWA 缓存策略误用等）。

## 报告安全问题

请不要在公开 Issue 中直接披露可利用的漏洞细节。

推荐方式（优先级从高到低）：

1. 使用 GitHub 的 **Private vulnerability reporting / Security Advisories** 进行私密报告（如果仓库已开启）。
2. 若无法使用私密通道，请仅在 Issue 中描述“问题现象与影响范围”，不要附上可直接利用的 payload。

## 本项目的安全边界

- **无后端**：默认不接入真实用户体系、支付、订单、库存；结算流程为前端演示。
- **本地存储**：购物车、收藏等数据存放在浏览器 `localStorage`，属于可被用户篡改的数据源。
- **渲染原则**：对来自 `localStorage` / URL 参数的动态内容应避免直接拼接 `innerHTML`，优先使用安全 DOM API 或进行 HTML 转义。

## 建议的安全自检

- 提交前运行：`node scripts/validate.mjs`
- 修改 `sw.js` / 版本号后，确保版本一致（HTML `?v=` 与 `sw.js` 的 `CACHE_NAME`/`PRECACHE_URLS` 一致）

