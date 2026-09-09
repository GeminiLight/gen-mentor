"use client";

import { KeyRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client";
import { useT } from "@/lib/i18n";
import { useLLMSettings } from "@/lib/store/llm-settings";
import { ModelSettings } from "./model-settings";

/** Shown until a model is reachable: the deployment has no key and the learner has not added one. */
export function NoKeyBanner() {
  const { t } = useT();
  const byok = useLLMSettings((s) => s.byok);
  const [serverKey, setServerKey] = useState<boolean | null>(null);
  useEffect(() => {
    api.health().then((h) => setServerKey(h.serverKey), () => setServerKey(false));
  }, []);
  if (serverKey !== false || byok) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-warning-soft/60 px-4 py-2.5 text-sm md:px-8" role="status" data-testid="no-key-banner">
      <p>
        <span className="font-medium">{t("settings.noKeyTitle")}</span>
        <span className="ml-2 text-muted-foreground">{t("settings.noKeyBody")}</span>
      </p>
      <ModelSettings
        trigger={
          <Button size="sm" variant="outline">
            <KeyRound aria-hidden /> {t("settings.title")}
          </Button>
        }
      />
    </div>
  );
}
