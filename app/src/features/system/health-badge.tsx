"use client";

import { useEffect, useState } from "react";
import { api, type Health } from "@/lib/client";
import { useT } from "@/lib/i18n";
import { ModelSettings } from "@/features/settings/model-settings";
import { useLLMSettings } from "@/lib/store/llm-settings";

/** Tiny live indicator: whether this deployment can reach a model, and in which mode. */
export function HealthBadge() {
  const [health, setHealth] = useState<Health | null | "error">(null);
  const { t } = useT();
  const byok = useLLMSettings((s) => s.byok);
  useEffect(() => {
    api.health().then(setHealth, () => setHealth("error"));
  }, [byok]);

  const ready = health !== null && health !== "error" && (health.serverKey || !!byok);
  const label =
    health === null ? t("health.checking") : health === "error" ? t("health.unreachable") : ready ? t("polish.modelConfigured") : t("health.noKey");
  const tone = health === null ? "bg-muted-foreground/40" : ready ? "bg-primary" : "bg-destructive";

  return (
    <ModelSettings
      trigger={
        <button type="button" data-testid="health-badge" className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs whitespace-nowrap text-muted-foreground transition-colors hover:bg-muted">
          <span className={`size-1.5 rounded-full ${tone}`} aria-hidden />
          {label}
        </button>
      }
    />
  );
}
