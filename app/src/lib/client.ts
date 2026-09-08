/** Browser-side API client. Every call to /api goes through here. */

export interface Health {
  ok: boolean;
  provider: "openai" | "anthropic";
  serverKey: boolean;
  mode: "live" | "record" | "replay";
  models: { fast: string; smart: string };
}

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return (await res.json()) as T;
}

export const getHealth = () => getJSON<Health>("/api/health");
