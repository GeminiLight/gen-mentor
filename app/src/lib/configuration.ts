/** JSON tasks compare data, never execute learner or model supplied code. */
export function configurationObject(text: string): Record<string, unknown> | null {
  if (text.length > 12000) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
    const pending: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
    while (pending.length) {
      const current = pending.pop()!;
      if (current.depth > 40 || (typeof current.value === "number" && !Number.isFinite(current.value))) return null;
      if (current.value !== null && typeof current.value === "object") {
        pending.push(...Object.values(current.value).map((child) => ({ value: child, depth: current.depth + 1 })));
      }
    }
    return value as Record<string, unknown>;
  } catch { return null; }
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, v]) => `${JSON.stringify(key)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sameConfiguration(a: string, b: string): boolean {
  const left = configurationObject(a), right = configurationObject(b);
  return left !== null && right !== null && canonical(left) === canonical(right);
}

export function validOrder(order: number[], size: number): boolean {
  return order.length === size && new Set(order).size === size && order.every((i) => Number.isInteger(i) && i >= 0 && i < size);
}
