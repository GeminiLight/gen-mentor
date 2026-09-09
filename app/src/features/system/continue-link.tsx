"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { useArchive } from "@/lib/store";

/** Returning learners get straight back to their path; the landing page never blocks them. */
export function ContinueLink() {
  const { goals, hydrated } = useArchive();
  const { t } = useT();
  if (!hydrated || goals.length === 0) return null;
  return (
    <Link href="/learning-path" className="inline-flex items-center gap-1 text-sm font-medium text-brand underline-offset-4 hover:underline" data-testid="continue-link">
      {t("home.continue")} <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}
