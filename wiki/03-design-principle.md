<!-- Last verified: 2026-09-09 | Current stage: M0 -->

# 设计原则

token 的唯一来源是 `app/src/app/globals.css`。改色改到那里，组件里不写死颜色，
`gate.sh` 对 `.ts/.tsx` 里的十六进制、`rgb()`、`oklch()` 命中上限为 0。

## 方向

参照 Linear、Vercel、Raycast 的克制。信息密度可以高，但要有呼吸感。一套中性灰阶加单一强调色，
强调色只用于当前进度和主行动，用在第三处就说明它不该是强调色。

字号阶梯不超过 6 级，字重不超过 3 种。正文行宽 62 到 75 字符，行高 1.7。

动效只服务于状态连续性，时长 120 到 240 毫秒，尊重 `prefers-reduced-motion`。

每个异步边界必须有 skeleton，禁止占满页面的 spinner。十秒级的 agent 调用要有阶段性文字进度。

明暗两套主题都是一等公民。主题用 `.dark` class 切换，默认跟随系统。

## 游戏化

每个游戏化元素背后必须有真实数据支撑，能追溯到具体学习记录。技能树由技能差距输出驱动，
掌握度用环形，测验做即时判定与单次测验内连击，学习足迹用真实学习时长。不做登录奖励、
虚拟货币、排行榜、空洞徽章。

## 当前 token

M0 使用 shadcn radix-nova 预设的中性 token（`--background`、`--foreground`、`--primary`、
`--muted`、`--border`、`--radius` 等），M2 会在此基础上定义 GenMentor 自己的调色板、
宽度 token 与动效时长。M2 之前不要在组件里引入新的视觉常量。
