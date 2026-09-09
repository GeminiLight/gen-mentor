<!-- Last verified: 2026-09-09 | Current stage: M2 -->

# 设计原则

token 的唯一来源是 `app/src/app/globals.css`。改色改到那里，组件里不写死颜色。
`gate.sh` 对 `.ts/.tsx` 里的十六进制、`rgb()`、`oklch()` 命中上限为 0。视觉回归靶子是 `/design`
（Next 把 `_` 开头的目录视为私有不路由，所以不是 `/_design`），e2e 会在三个视口两套主题下截它。

## 方向

一张安静的书桌。冷调近中性灰阶、发丝线边框、只有一个青绿信号色，留给进度和主行动。
信息密度可以高，但要有呼吸感。参照 Linear、Vercel、Raycast 的克制，不做渐变、光斑和卡片套卡片。

## 约束是编译器执行的

`@theme` 里把 `--text-*`、`--font-weight-*`、`--shadow-*` 命名空间先 `initial` 再重定义，
所以 `text-3xl` 或 `font-bold` 这样的 class 不存在，写了不会生效，而不是靠 review 发现。

| 维度 | 取值 |
|---|---|
| 字号 | `xs` 12/16、`sm` 14/20、`base` 16/24、`lg` 20/28、`xl` 28/34、`2xl` 40/44 |
| 字重 | `normal` 400、`medium` 500、`semibold` 600 |
| 阴影 | `xs` `sm` `md` `lg`，罕用，结构靠边框 |
| 圆角 | `--radius` 0.5rem，派生 `sm` 到 `4xl` |

## 色彩

OKLCH 定义，明暗各一套，`.dark` class 切换，默认跟随系统。

| 角色 | 用途 |
|---|---|
| `background` `card` `popover` `muted` `secondary` `accent` | 表面，色相 250 到 260，chroma ≤ 0.01 |
| `foreground` `muted-foreground` | 文字。`muted-foreground` 在两套主题下对比度都 ≥ 4.5:1 |
| `brand` `brand-soft` `brand-foreground` | 唯一饱和色（色相 178）。`primary` 与 `ring` 指向它。只用于当前进度和主行动，用在第三处就说明它不该是强调色 |
| `success` `warning` `destructive` 及 `-soft` | 语义色，必须配图标或文字，不单独承载含义 |
| `level-0` 到 `level-3` | 掌握度阶梯 unlearned → advanced，由真实学习记录驱动 |
| `kt-foundational` `kt-practical` `kt-strategic` | 知识点三类。只做色块与圆点，不做文字；已用 dataviz 校验器在两套主题下通过 CVD 与对比度检查 |
| `chart-1` 到 `chart-5` | 分类图表序列，固定顺序不循环，已用校验器通过。改动前重新跑 `validate_palette.js` |

## 宽度与间距

每一个固定宽度都必须是这几个 token 之一，用 `w-(--w-rail)` 这类写法引用，不写魔数。

| Token | 值 | 用途 |
|---|---|---|
| `--w-rail` | 15rem | 桌面导航栏 |
| `--w-col` | 30rem | 手机单列阅读 |
| `--w-content` | 70rem | 页面内容最宽 |
| `--w-measure` | 68ch | 正文行长 |
| `--w-dialog` | 32.5rem | 桌面弹窗 |

间距用 Tailwind 的 4px 阶梯。组内紧，组间松。

## 动效

只服务状态连续性。`--dur-fast` 120ms、`--dur-base` 180ms、`--dur-slow` 240ms，
`--ease-out` cubic-bezier(0.2, 0, 0, 1)。所有 `transition-*` 工具类统一走 `--dur-base`。
`prefers-reduced-motion` 下三个时长归零，动画一次结束。

## 状态

每个异步边界必须有 skeleton，容器加 `data-loading` 属性以便 e2e 等待，禁止占满页面的 spinner。
十秒级 agent 调用要有阶段性文字进度，`StageList` 在运行中的阶段右侧显示已用秒数（满 2 秒才出现，
避免闪一下）。流式 JSON 一律解析后展示已成形的字段，不把原始文本给人看。
空态给下一步行动，错误态给原因和恢复方式：恢复必须从断点续跑而不是整页刷新，并说明"已完成的部分会保留"。

## 表单与破坏性操作

提交按钮不因为字段为空而禁用。空字段在提交时就地提示（`aria-invalid` 加 `role="alert"` 的一行字），焦点移到第一个空字段。
禁用只用于"正在跑"。删除、清空、重新生成这类不可逆操作一律走 Dialog，右侧主按钮是动作本身，左侧有取消，
正文写清会丢什么。会跳过"证据"的操作（未测验就标记完成）不禁止，但问一次并说明后果。

## 导航与可发现性

桌面导航栏底部是三层：导师（带文字的一行，和页面项同样式）、搜索（带 ⌘K）、图标行（模型、语言、主题）。
只有图标的按钮必须同时有 `aria-label` 和 `Tooltip`。列表行若在手机端没有悬停，就让标题链接用
`after:absolute after:inset-0` 铺满整行，按钮只是第二个可见提示。

## 工具类

`.num` 等宽数字，用于指标、表格、计时。`.eyebrow` 组标题。`.reading` 长文阅读，
行长 `--w-measure`，行高 1.7。

## 游戏化

每个游戏化元素背后必须有真实数据支撑，能追溯到具体学习记录。技能树由技能差距输出驱动，
掌握度用环形并取 `level-*` 色阶，测验做即时判定与单次测验内连击，学习足迹用真实学习时长。
不做登录奖励、虚拟货币、排行榜、空洞徽章。

## 语言

界面文案中英双语，词典在 `app/src/lib/i18n/{en,zh}.ts`，`zh` 的类型由 `en` 推导，少一个键编译不过。
组件里只写 `t("scope.key")`，不写字面文案；日期与数字用 `useT()` 返回的 `fmtDate` / `fmtNum`
按当前语言格式化。首次访问按 `navigator.language` 判断，之后随设备持久化，`<html lang>` 同步。
智能体生成的内容（目标、路径、文档、导师回复）跟随学习者自己输入的语言，不由这层翻译。

## 标识

`resources/logo.svg` 是从原 PNG 复刻的矢量版：环与叶片按测得的几何重绘，字标从位图描摹为路径，
渐变色取自采样。`resources/logo-mark.svg` 只有圆环标记，同一份复制到 `app/public/` 并作为
`app/src/app/icon.svg` 站点图标。界面里标记出现在侧栏、手机顶栏和首页；字标只在首页和 README 用，
产品内部仍以文字 "GenMentor" 为名。标识色是品牌固有色，不进入设计 token，因此放在静态文件里而不是组件中。

## 学习体验精修（2026-09-09）

回访首页以当前课程和继续动作为中心；首次访问仍保留产品介绍。路径页先呈现当前课程，
再列完整路径。阅读页只保留一个主标题，下载和重新生成归入课程选项；移动端提供折叠目录。
新增 `--w-toc: 13rem`，用于阅读目录和紧凑选项面板，不新增品牌色。

触控设备的 Button、SelectTrigger 和 TabsTrigger 最小操作区域为 44px；主学习动作显式为 44px。
手机低频语言 / 主题操作收进菜单，桌面保持直接入口；底部导航包含设备安全区。
Dialog 最大高度受 `100dvh` 约束，超出内容在内部滚动。长下一课标题与动作标签分开，避免撑破小屏。

进度页明确标记“模型估计”，自动评分不混入未评分简答题。减少动态效果偏好下阅读区取消位移。
本地草稿恢复与章节记忆是连续体验的一部分，不依赖增加装饰动效。
