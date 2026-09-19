# GenMentor 产品审计:结构层问题

审计日期:2026-09-19。代码基线:`87a7d13`。性质:产品与功能层面的原始评审与处置;
界面级缺陷已由 [09-09 深度审视](review-2026-09-09-ui-ux-deep-audit.md)与 09-19 四轮迭代覆盖,不重复。

界面工艺与单课闭环不是当前主要短板。本轮把视角抬到屏幕之外:回访机制、数据耐久性、
冷启动成本、内容可信度、以及学习证据到路径的闭环。结论:无 P0 阻断;五个 P1 结构问题,
其中数据耐久性(A01)被低估;产品提案承诺的"随掌握度变化重排路径"在产品里没有对应机制(A07)。

## 方法与证据边界

- 证据来自代码通读(页面、store、pipeline、prompts、settings)、全套 wiki 文档、09-19 当天
  四份评审与当日 verify-ui 产物(9 路由 × 3 视口 × 2 主题截图、axe、172 项浏览器测试)。
- 另用独立探索 agent 做了全量功能地图与流程核对;孤儿代码与未接线能力以 grep 复核。
- 本轮未实跑浏览器(评审环境无法直接查看截图),视觉与 a11y 引用当日刚完成的审计结论,不复检。
- A01 中 WebKit 的 7 天脚本可写存储清除政策来自 WebKit 公开文档(*Full Third-Party Cookie
  Blocking and More*, 2020),未在实体设备实测;该条以此为前提,动手前需先验证。
- A02、A03 是产品推断而非用户实测,标注为假设;它们也是历轮评审承认"未做真实学习者任务测试"的部分。

## P1 结构问题

### A01 · 档案存储与产品承诺冲突,WebKit 政策可能造成真实数据丢失

- **现象**:学习档案存单浏览器 localStorage(`lib/store/index.ts:78`),导出导入是唯一备份手段。
- **证据**:WebKit 对脚本可写存储(localStorage、IndexedDB、SW)执行 7 天无交互清除,仅加入主屏幕
  豁免;iOS 全部浏览器为 WebKit。全仓无 manifest、无 Service Worker(`public/` 仅 SVG,layout 无
  `<link rel="manifest">`),即无 PWA、无离线、无主屏安装路径。清浏览器数据同样归零;
  手机与电脑双设备只能手动搬运 JSON。
- **影响**:停学一周以上的 iPhone/Safari 用户回来档案被静默清空,这正是"时间零散"受众的常态行为;
  产品最值钱的资产(持续更新的画像)放在最脆弱的介质里。
- **方向**:PWA 专项(manifest + SW + 主屏安装引导,顺带获得离线阅读,教材本就在本地)、
  导出提醒("距上次导出 N 天")、`navigator.storage.persist()`。动手前先在实体 Safari 验证清除行为。

### A02 · 回访机制为零

- **现象**:全仓无任何 notification/reminder 代码;首页书桌显示下一课,但产品从不与学习者约定"下次何时回来"。
- **影响**:无账号无遥测是硬约束,但约束不禁止本地手段。MOOC 时代的流失率已经验证完全指望自发回访的下场。
- **方向**:与 A01 合并为同一 PWA 专项:本地通知、学习日程 .ics 导出(路径本就排好 sessions)、
  完成一课时约定下次复习时间并显示在首页。

### A03 · 公开实例冷启动门槛与受众错配

- **现象**:公开部署无服务端 key,BYOK 是第一道墙:注册 API、拿 key、理解 fast/smart 两档模型。
  首页示例路径是静态预览(`features/system/path-preview.tsx`,带 previewNote),不是可操作的体验;
  replay 基础设施只服务于 dev 与 E2E。BYOK 按 token 计费,而 UI 无任何成本量级提示
  (全仓无 cost/token 文案)。
- **影响**:模型配置 UI 再打磨,门槛也是结构性的;受众是"准备转岗的职业人士",不是网关用户。
- **方向**:replay fixture 包装为"免 key 试学一个示例目标"(体验完整闭环后再引导配置);
  配置页与生成前给成本量级提示(smart 档一课 4 次以上调用)。

### A04 · 教材默认无 grounding 且不标示

- **现象**:公开实例无 `TAVILY_API_KEY`,教材纯模型记忆生成、零引用;prompt 规定无资源时不写引用标记
  (`lib/prompts/knowledge-drafter.ts`),学习者无从分辨教材是否经过核实。文库已隐藏 0 来源,但阅读页
  无等价标示。导师的 `use_search` 默认 false 且没有任何调用方置 true(`lib/schemas/requests.ts:72`),
  即使服务端配了 Tavily 导师也永远不搜索。
- **影响**:受众是职业学习者,学错概念的代价真实存在;这是信任问题。
- **方向**:阅读页诚实标示"本文档由模型生成,未联网核实";BYOK 允许自带搜索 key;导师检索开关。

### A05 · 内容语言不受控

- **现象**:UI 中英双语 248 键,但 12 组 prompt 全英文逐字迁移,无任何输出语言指令
  (`lib/prompts/` grep 无语言控制)。`lib/i18n/index.ts:5-6` 注释自述 "Agent output follows the
  learner's own language",这是愿望,不是机制。
- **影响**:中文用户写技术目标可能得到英文教材、测验或解释,或中英混杂,直接削弱专业工具可信度。
- **方向**:按 M6 评测流程加语言指令,与其他 prompt 改动成批做并重录 fixture(流程见 known-pitfalls)。

## P2 学习效果缺口

### A06 · 测验题型被硬编码锁死(P1 级体验、P2 级证据)【本轮修复】

- **现象**:`lib/pipeline.ts:99` 硬编码 `single_choice_count: 3, true_false_count: 1`,多选与简答计数
  从未传入。而请求 schema 四类计数齐全(`lib/schemas/requests.ts:30-33`)、响应 schema、测验 UI
  (多选确认状态机、简答自评)、判分、草稿恢复、复习队列全部支持,单元测试已有多选用例
  (`lib/agents/__tests__/quiz-feedback-tutor.test.ts:37`)。
- **影响**:产品最丰富的测验交互只在未来复习路径可达,正常学习永远 3 单选 + 1 判断,全部再认、
  无回忆题型,评估效度受限。原论文实现同样只用 3 单选(`learning_content_creator.py:119`),
  解锁是超出基线的产品决策。
- **处置**:改为 2 单选 + 1 多选 + 1 判断 + 1 简答,共 5 题,时长与原 4 题接近;重录 quiz fixture。

### A07 · 学习证据到路径的箭头不存在

- **现象**:`api.simulateFeedback` 有 route 有实现但零组件调用(`lib/client.ts:132`);
  `schedulePath` 的 `task: "refine"` 在请求 schema 里存在但 UI 只发过 create 与 reschedule;
  重排对话框只收自由文本,不带任何测验证据;练习刻意不进入掌握度(`lib/quiz-review.ts:27`,
  该设计本身正确)。
- **影响**:产品提案承诺"随掌握度变化重排路径"(`wiki/00-product-proposal.md`),实际兑现的只有
  测验→画像;论文的 feedback-simulator → path-refine 闭环在产品里缺席,九个 agent 有一个半没进产品。
- **方向**:立专项 spec:复习队列与画像变化 → 带解释、需确认的重排建议;simulator 决定产品化或删除。

### A08 · 每课冷启动无预生成

- **现象**:流水线按需跑(`features/session/session-view.tsx:109-119` 首开触发),全仓无 prefetch;
  smart 档一课 4 次以上串行调用,known-pitfalls 载明网关关思考后仍 18 秒起。
- **影响**:碎片时间学习者每次坐下先等一到三分钟。
- **方向**:完成当前课后 idle 预生成下一课,可取消,BYOK 成本 opt-in;checkpoint 机制已支持。

### A09 · 学完之后没有弧线

- **现象**:路径全部完成的收尾是一句话(`lib/i18n/zh.ts:47`);复习队列按错题/漏答计数排序,无时间
  维度(`lib/quiz-review.ts:34-40` 注释自认 no retention claim);无基于更新画像的下一目标建议(全仓无)。
- **影响**:画像随学习更新是产品最值钱的差异点,但目标完成即终点;三周前掌握的技能不会自己浮出。
- **方向**:完成态给下一步(相邻目标建议、保持性复习计划);时间维度的复习排序需先定义语义再动。

### A10 · 跨目标不通

- **现象**:文库、进展、画像、导师历史全部按 `active_goal_id` 作用域;技能映射 per-goal,相邻目标
  重复生成相同内容。
- **影响**:"终身学习者"定位与"档案持续积累"承诺只在单目标内成立。此项在 backlog 已有,以定位论
  优先级被低估。
- **方向**:技能归一跨目标聚合(`lib/learning-evidence.ts` 已有 NFKC skillKey 可复用)→ 跨目标文库
  与技能总览;工程量大,先立 spec。

### A11 · 画像 init 编造行为数据仍发模型

- **现象**:backlog 已载明 profiler init 的 `behavioral_patterns` 是编造的("每周登录 4 次"),UI 已
  改为档案派生的真实活动,但编造文本仍随画像发回模型参与后续生成。
- **影响**:踩在"游戏化元素必须有真实数据支撑"红线上,且污染生成输入。
- **方向**:backlog 原方案(prompt 输出"尚无记录"或代码回写 activitySummary),随 A05 批量 prompt
  迭代一起做。

## P3

### A12 · 首页与 onboarding 无错误边界【本轮修复】

- **现象**:`/` 与 `/onboarding` 在 `(app)` 路由组之外,无 error.tsx/loading.tsx;仓库无根级
  error.tsx 与 global-error.tsx。onboarding 恰是流程最复杂、最易抛错的页面。
- **影响**:新用户在最高价值页面看到 Next 默认错误屏(英文)。
- **处置**:补根级 error.tsx,复用 `(app)` 边界的 EmptyState 与现有词条
  ("你的数据没有受影响,请重试",与设计原则"说明已完成的部分会保留"一致)。global-error 刻意不加:
  根 layout 逻辑极少,如需再议。

### A13 · 长调用无客户端超时与取消;自动继续会无人值守计费

- **现象**:流水线与 onboarding 调用无 AbortSignal 与取消入口,唯一显式超时是 models 列表 15 秒
  (`lib/client.ts:108`),全产品唯一取消是导师 Stop;复习确认屏的 3 分钟自动继续会在无人值守时
  触发 profile init + 路径生成两次真实计费调用(`features/onboarding/review-controls.tsx`)。
- **方向**:长调用加客户端超时与取消;自动继续对 BYOK 的无人值守计费评估边界,或改为仅提醒。

### A14 · BYOK key 明文 localStorage

- **现象**:key 存 `genmentor.llm.v1` 明文,每请求读取(`lib/client.ts:43-51`)。研究演示可接受,
  但它是全应用最敏感的值。
- **方向**:文档明示风险;本地优先架构下无更好方案,不改代码。

### A15 · 进展页双进度数同屏

- **现象**:证据派生的环与标注"估计"的模型折线同屏(`features/progress/progress-view.tsx:35-49`),
  两套语义均有标识但差异未解释。
- **方向**:补一句图注说明口径即可,属润色。

### A16 · 孤儿与死代码

- **现象**:`MasteryRing` 导出未使用(`features/progress/mastery-ring.tsx:13`);`useCompleteSession`
  的 `completing` 恒为 false,完成按钮的等待态不可达(`features/session/use-complete-session.ts:19`)。
  首页 `PathPreview` 与真实生成产物样式一致,靠 previewNote 区分,可接受。
- **方向**:MasteryRing 接入或删除;`completing` 移除或接真实状态。

## 本轮处置

- 修复 A06(题型解锁)与 A12(根级错误边界),实现见路线图"产品审计与低成本修复(2026-09-19)"。
- A01/A02 合并立项:PWA + 导出提醒 + 回访约定,动手前先实体 Safari 验证清除行为。
- A03 以 replay 试学为最小切入;A05 连同 A11 走 M6 评测流程成批做。
- A07、A10 各立 spec 后再动手;其余进 `wiki/85-backlog.md`,优先级建议随条目标注。

## 验证

- `make gate` 通过(类型、lint、单元与 replay 下 agents E2E)。
- `GENMENTOR_LLM_MODE=replay make verify-ui` 全绿:Playwright 195 项通过(修复前两轮分别为
  194 通过 1 失败:journeys 测验题未答全、profile-update fixture 缺失),9 路由 × 3 视口 × 2 主题
  截图齐全。
- A06 fixture 重录:按 known-pitfalls 的重建法从旧 fixture 字节级还原请求体,经 `record` 模式服务
  重录 quiz(`976a79f4`,题型计数 2/1/1/1 被模型如实遵守)与 profile-update(`9f776842`,新
  quiz_performance 为 5 答、4 计分、3 正确、多选答错);旧 fixture `f856a3c8`、`b60bd241` 在
  全量运行的使用日志中为 0 次,已删除。journeys.spec 同步改为作答全部四类题型。
- A12 探针:临时在 `HomeView` 与 `OnboardingPage` 的浏览器端渲染中抛错(空消息 Error),
  生产构建 + `pnpm start` 下 `/` 与 `/onboarding` 均渲染根边界,本地化标题、兜底正文与重试
  按钮三者命中;探针后补丁已还原。边界优先显示 `error.message`、无消息才落词典文案,与
  `(app)/error.tsx:15` 既有行为一致。
- 未验证:实体 Safari 的存储清除行为(A01 前置);`976a79f4` fixture 的简答判分路径
  (e2e 只走"已作答"分支,自评交互由 polish-quiz 既有用例覆盖)。
