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

## 网关很慢，`thinking: disabled` 也只是减半

现象：`glm-5.3-flash` 对一个 37 token 的请求默认要 30 秒（2077 个 reasoning token），
传 `thinking:{type:"disabled"}` 后 18 秒，但 `usage` 里仍有 618 个 reasoning token。
profiler 这种 3KB system prompt 加 4KB 输出的调用单次超过 3 分钟，E2E 默认 180 秒超时会挂。
解法：fast 档默认 `thinking:false`（`lib/llm/index.ts#withTierDefaults`）；E2E agent spec 单测
预算 480 秒、请求 420 秒；录制时 4 路并行。
教训：这台网关上"关闭思考"是尽力而为，不是保证。真正解决延迟要靠流式输出让人看到进度。

## `next start` 不支持 `output: "standalone"`

现象：启动日志有 `⚠ "next start" does not work with "output: standalone"`，页面仍能服务但行为不可靠。
解法：只有容器镜像构建时设 `GENMENTOR_STANDALONE=1` 才输出 standalone，本地与 Vercel 都不设。

## 动态拼接的 Tailwind 类名不会被生成

现象：`/design` 上一半色块空白。
原因：`bg-${name}` 这类运行时拼接的类名 Tailwind 扫不到，只有恰好在别处静态出现过的才有样式。
解法：把完整类名写在源码里（映射表），不拼接。

## 半透明文字过不了对比度

现象：axe 报 tab 未激活态 `color-contrast`，实测 4.42:1。
原因：shadcn 用 `text-foreground/60` 做次级文字，混色结果取决于底色，不可控。
解法：次级文字一律用实色 `text-muted-foreground`，该 token 在两套主题下都按 ≥ 4.5:1 调过。

## React 把布尔 data 属性渲染成字符串 "true"

现象：`toHaveAttribute("data-learned", "")` 失败，实际值是 `"true"`。
原因：`data-x={true}` 渲染为 `data-x="true"`，只有 `data-x=""` 才是空串。
解法：断言写 `"true"`，或者用 `data-x={cond || undefined}` 配合 `toHaveAttribute` 只判存在。

## e2e 的 seed 脚本会在存储被清空后重新注入

现象：导出导入测试里清空 localStorage 再刷新，页面仍然有数据。
原因：`addInitScript` 每次导航都执行，判断的是"键不存在"。
解法：要模拟空档案就写入一个空的 archive，而不是删键。

## shiki 的 HTML 输出用不了

现象：想用 `codeToHtml` 高亮代码块。
原因：项目禁止 `dangerouslySetInnerHTML`。
解法：`codeToTokens` 拿 token，逐个渲染 `<span>`，颜色走 `--shiki-light` / `--shiki-dark` 变量随主题切换。

## 改 prompt 会让全部回放 fixture 失效

现象：改完 prompt 后 `make verify-ui` 在 replay 下大面积 "No LLM fixture"。
原因：fixture 哈希覆盖 system 与 user 全文。
解法：改 prompt 后清空 `e2e/fixtures/llm` 并在 record 模式重跑 `agents.spec` 与三条 LLM 旅程，约 25 分钟。
教训：prompt 改动要成批做，评测与重录一次完成。

## shadcn 的 `CommandDialog` 不含 cmdk 根节点

现象：打开命令面板整页崩，`Cannot read properties of undefined (reading 'subscribe')`。
原因：radix-nova 版的 `CommandDialog` 只包 Dialog，`CommandInput` / `CommandItem` 直接放进去拿不到 cmdk store。
解法：在 `CommandDialog` 里自己套一层 `<Command>`。

## 收窄字号阶梯后旧 class 静默失效

现象：首页大标题退化成 16px。
原因：`@theme` 里 `--text-*: initial` 之后 `text-4xl` 不存在，Tailwind 不报错，只是不生成。
解法：只用 xs 到 2xl 六级；截图评审时留意标题层级。

## SVG 里 `<use>` 引用的 id 与渐变 id 撞名

现象：四片叶子只画出一片。
原因：`<path id="leaf">` 与 `<linearGradient id="leaf">` 同名，`href="#leaf"` 解析到渐变。
解法：图形元素与 paint 元素分别命名。

## `vercel link` 在子目录里执行时 Root Directory 是仓库根

现象：CLI 从 `app/` 部署成功，但 GitHub 推送触发的生产部署报错。
原因：CLI 上传的是当前目录，而 Git 集成从仓库根构建；项目的 Root Directory 仍是空。
解法：`vercel api -X PATCH` 不带 teamId 会静默失败，用 REST 直接改：
`curl -X PATCH https://api.vercel.com/v9/projects/<id>?teamId=<team> -d '{"rootDirectory":"app"}'`，然后 `vercel redeploy` 验证。
教训：CLI 部署绿不代表 Git 部署绿，两条路径都要各验一次。

## `make verify-ui` 不设置 LLM 模式，默认 live

现象：verify-ui 跑到 onboarding 旅程时 5 分钟超时，`/tmp/gm/app.log` 里全是 `[api] 429 速率限制`。
原因：`verify-ui.sh` 直接 `pnpm start`，`GENMENTOR_LLM_MODE` 只在 shell 环境里，没有的话 `llmMode()` 回落到 live，
真去打网关，被限流后旅程等不到路径。
解法：`GENMENTOR_LLM_MODE=replay make verify-ui`。是否让脚本默认 replay 属于改闸门，需要所有者确认。
教训：闸门红了先看 app.log 有没有 429，再看是不是自己的改动。

## 「停止」按钮点一下反而重新发送

现象：导师抽屉里点「停止」，请求确实被 abort，但紧接着又发出一次同样的请求。
原因：停止按钮和发送按钮是同一位置的条件渲染，React 复用了同一个 `<button>` 节点。click 监听器里
`abort()` 之后，fetch 的拒绝在微任务里落地，React 同步把节点改成 `type="submit"`；浏览器随后才执行
这次点击的默认行为，看到的已经是提交按钮，于是提交了表单。
解法：两个按钮给不同的 `key` 让 React 重新挂载，停止按钮的 onClick 里 `preventDefault()`。
教训：条件渲染切换"同类型不同语义"的元素时给 key；异步状态切换发生在同一次点击的默认行为之前。


## 实时判分与多选确认不能共用锁定条件

现象：选择第一个多选项后立即判错，剩余项不可选。
原因：实时 judge 已产出 incorrect，UI 直接用 verdict 作为锁定条件，确认按钮没有参与状态机。
解法：多选题用独立的确认顺序控制锁定；选择和确认分别持久化到 quiz_draft。
教训：即时反馈适合单选；多选的编辑过程不是最终答案。Tab 切换卸载组件，也不能让答案只存在组件状态。

## 重排列表不能只更新路径数组

现象：课程换了位置，标题变成新课，正文和测验仍属于旧索引。
原因：session 以 goalId:index 为键，而重排只换 learning_path。
解法：原子更新路径和 session 映射，仅为内容身份相同的课程复用状态；已完成课程改变时拒绝重排。
教训：列表位置不等于内容身份；后续稳定 URL 迁移必须把旧档案和书签一起考虑。

## 恢复表单草稿时 Select 会发出临时空值

现象：保存固定课数后刷新，Sessions 变空，草稿里的 count 也变成空字符串。
原因：Radix Select 在表单内同步原生选择器时，选项注册与持久化状态恢复之间会产生临时空值事件。
解法：课数不允许空选项，onValueChange 忽略空字符串；历史空值按 Adaptive 显示和提交。
教训：验证草稿恢复要覆盖非默认选项，不能只测输入框或默认值。
