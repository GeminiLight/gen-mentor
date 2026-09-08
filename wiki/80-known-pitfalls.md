<!-- Last verified: 2026-09-09 -->

# 已知的坑

格式：现象 / 原因 / 解法 / 教训。

## reasoning 模型把 token 预算花在思考上，返回空字符串

现象：`glm-5.3-flash` 给 `max_tokens=16` 时 HTTP 200、`content` 为空，`usage` 里 15 个
`reasoning_tokens`。
原因：思考先消耗输出预算，预算耗尽不报错。
解法：结构化调用给足预算（几千 token 起），或设 `LLM_OPENAI_THINKING=disabled` 并传
`thinking:false`。`openaiArgs` 把关思考做成 opt-in，因为官方 OpenAI 端点会拒绝该字段。
教训：空字符串不是"模型没话说"，先看 `usage`。

## 网关不支持结构化输出格式

现象：`output_config.format` / `response_format` 被网关忽略或报错。
解法：prompt 里要求 JSON，`extractJSON` 宽松解析：剥围栏、去前后废话、修尾逗号、转义字符串内
换行、修中文引号、补截断尾巴。

## shadcn CLI 需要访问 ui.shadcn.com

现象：`shadcn init` 连接超时。
解法：确认代理环境变量后重试。`-b` 参数现在是组件库（`radix|base|aria`），预设用 `-p nova`。

## Next 16 的 `LayoutProps` 全局类型依赖 `next typegen`

现象：`tsc --noEmit` 报 `Cannot find name 'LayoutProps'`。
原因：该类型由 `next build` / `next typegen` 生成到 `.next/types`。
解法：布局与页面显式写 props 类型，不依赖生成的全局类型，`tsc` 才能独立于构建运行。

## verify-ui 截图到的是上一次构建

现象：CSS 完全未加载、页面裸 HTML，a11y 报 `color-contrast`。
原因：`pnpm start` 会 fork 出 node 进程，只 kill 子 shell 会留下监听者；下一轮起服务时
`EADDRINUSE`，Playwright 打到的是旧构建，静态资源哈希对不上，CSS 404。
解法：`verify-ui.sh` 启动前后都按端口 `lsof -ti tcp:PORT | xargs kill`。
教训：截图不对劲先看 `/tmp/gm/app.log` 有没有 `EADDRINUSE`。

## shadcn init 会把 `--font-sans` 写成自引用

现象：全站退化成衬线体。
原因：`shadcn init` 改写 `globals.css` 时把 `@theme inline` 里的 `--font-sans` 写成
`var(--font-sans)`，而 `next/font` 注入的是 `--font-geist-sans`。自引用无效，浏览器回落默认字体。
解法：`--font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, …`。换字体时同步
`layout.tsx` 的 `variable` 名与这一行。
