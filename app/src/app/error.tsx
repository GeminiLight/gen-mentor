"use client";

import { useEffect } from "react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

/**
 * Root-level error boundary. `/` and `/onboarding` sit outside the (app) group, so before
 * this file a throw in either fell through to Next's default error screen — on the two
 * highest-stakes pages for a first-time learner. The copy mirrors the (app) boundary:
 * say the archive is untouched, offer a retry.
 */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
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
