import type { Dict } from "./en";

/** 应用外壳的中文文案：模型设置与命令面板。键与 en-shell.ts 一一对应。 */
export const settings: Dict["settings"] = {
  title: "模型",
  lede: "当前使用服务端配置的模型。填入自己的密钥可以换供应商，或用自己的额度。",
  usingOwn: "正在使用你的密钥 {key}。",
  provider: "供应商",
  providerOpenAI: "OpenAI 兼容",
  providerAnthropic: "Anthropic",
  apiKey: "API 密钥",
  baseUrl: "接口地址（可选）",
  fastModel: "快速模型",
  smartModel: "强模型",
  privacy: "密钥只保存在这个浏览器里，随每次请求发送，服务端不存储。",
  test: "测试",
  testing: "测试中…",
  testOk: "{model} 用 {ms} ms 回答了“{reply}”。",
  testFailed: "模型没有回答。",
  save: "保存",
  saved: "模型已保存",
  useServer: "改用服务端模型",
  cleared: "已改用服务端模型",
  noKeyTitle: "尚未配置模型",
  noKeyBody: "这个部署没有模型密钥。填入你自己的密钥即可开始。",
};

export const command: Dict["command"] = {
  open: "搜索",
  title: "搜索",
  description: "页面、课程和目标",
  placeholder: "搜索…",
  empty: "没有匹配项。",
  pages: "页面",
  sessions: "课程",
  switchGoal: "目标",
  appearance: "外观",
  newGoal: "新目标",
  toggleTheme: "切换主题",
  language: "切换语言",
};
