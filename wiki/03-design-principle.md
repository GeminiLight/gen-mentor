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
| `kt-foundational` `kt-practical` `kt-strategic` | 知识点三类，低饱和、色相区分 |
| `chart-1` 到 `chart-5` | 图表序列，`chart-1` 即 brand |

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
十秒级 agent 调用要有阶段性文字进度。空态给下一步行动，错误态给原因和恢复方式。

## 工具类

`.num` 等宽数字，用于指标、表格、计时。`.eyebrow` 组标题。`.reading` 长文阅读，
行长 `--w-measure`，行高 1.7。

## 游戏化

每个游戏化元素背后必须有真实数据支撑，能追溯到具体学习记录。技能树由技能差距输出驱动，
掌握度用环形并取 `level-*` 色阶，测验做即时判定与单次测验内连击，学习足迹用真实学习时长。
不做登录奖励、虚拟货币、排行榜、空洞徽章。
