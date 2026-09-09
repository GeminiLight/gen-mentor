"use client";

import { useEffect, useState } from "react";
import { api, type Health } from "@/lib/client";
import { useT } from "@/lib/i18n";

/** Tiny live indicator: whether this deployment can reach a model, and in which mode. */
export function HealthBadge() {
  const [health, setHealth] = useState<Health | null | "error">(null);
  const { t } = useT();
  useEffect(() => {
    api.health().then(setHealth, () => setHealth("error"));
  }, []);

  const ready = health !== null && health !== "error" && health.serverKey;
  const label =
    health === null ? t("health.checking") : health === "error" ? t("health.unreachable") : ready ? t("health.ready", { mode: health.mode }) : t("health.noKey");
  const tone = health === null ? "bg-muted-foreground/40" : ready ? "bg-primary" : "bg-destructive";

  return (
    <span data-testid="health-badge" className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs text-muted-foreground">
      <span className={`size-1.5 rounded-full ${tone}`} aria-hidden />
      {label}
    </span>
  );
}
