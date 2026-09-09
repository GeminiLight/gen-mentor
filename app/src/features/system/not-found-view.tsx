"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";

export function NotFoundView() {
  const { t } = useT();
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="text-xl font-semibold">{t("common.notFoundTitle")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">{t("common.notFoundBody")}</p>
      <Button asChild>
        <Link href="/goals">{t("common.notFoundAction")}</Link>
      </Button>
    </main>
  );
}
