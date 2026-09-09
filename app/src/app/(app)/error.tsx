"use client";

import { useEffect } from "react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

/** Route-level error boundary: say what broke, keep the shell, offer a way back. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);
  const { t } = useT();
  return (
    <EmptyState
      title={t("common.errorTitle")}
      body={error.message || t("common.errorBody")}
      action={
        <Button onClick={reset} variant="outline">
          {t("common.tryAgain")}
        </Button>
      }
    />
  );
}
