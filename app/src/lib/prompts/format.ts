/**
 * Fill a task-prompt template. Placeholders are `{snake_case}` names; every one must be
 * supplied and nothing else in the text is touched (the JSON examples inside prompts
 * contain braces too). Objects are rendered as pretty JSON, which is what the Python
 * original effectively did with `str(dict)`, only valid.
 */
export type PromptValue = string | number | boolean | null | undefined | object;

export function stringify(v: PromptValue): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v, null, 2);
}

export function fill(template: string, vars: Record<string, PromptValue>): string {
  return template.replace(/(?<!\{)\{([a-z_]+)\}(?!\})/g, (_, key: string) => {
    if (!(key in vars)) throw new Error(`Prompt placeholder {${key}} was not provided`);
    return stringify(vars[key]);
  });
}
