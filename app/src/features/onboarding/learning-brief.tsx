"use client";

import { ArrowUpRight, ArrowRight, Check, Compass, Pencil, Layers3 } from "lucide-react";
import { useOnboardingDraft } from "@/lib/store/onboarding-draft";
import { useT } from "@/lib/i18n";

/** A read-back of the user's inputs. No generated course or skill estimates. */
export function LearningBrief() {
  const { goal, info, count } = useOnboardingDraft();
  const { t } = useT();
  const title = goal.trim();
  const focus = (id: string) => document.getElementById(id)?.focus();
  return <aside className="learning-brief" aria-labelledby="brief-title">
    <div className="brief-heading"><h2 id="brief-title">{t("entry.briefTitle")}</h2><span className="brief-state"><span aria-hidden />{t("entry.briefDraft")}</span></div>
    <div className="brief-paper" data-filled={!!title}>
      <div className="brief-emblem" aria-hidden><Compass strokeWidth={1.2} /><span>GM</span></div>
      <div className="brief-goal">
        <p className="brief-label">{t("onboarding.goalLabel")}</p>
        <h3>{title || t("entry.briefEmpty")}</h3>
        {!title && <p className="brief-placeholder">{t("entry.briefEmptyBody")}</p>}
        {title && <button type="button" className="brief-edit" onClick={() => focus("goal")}><Pencil aria-hidden />{t("entry.briefEditGoal")}</button>}
      </div>
      <div className="brief-background">
        <p className="brief-label">{t("entry.briefBackground")}{info.trim().length >= 3 && <Check className="stage-check" aria-hidden />}</p>
        <p className="brief-excerpt">{info.trim() || t("entry.briefMissing")}</p>
        {info.trim() && <button type="button" className="brief-edit" onClick={() => focus("info")}><Pencil aria-hidden />{t("entry.briefEditInfo")}</button>}
      </div>
      <div className="brief-scope"><Layers3 aria-hidden /><span>{t("entry.briefScope")}</span><strong>{!count || count === "0" ? t("polish.adaptiveCount") : t("onboarding.countOption", { n: count })}</strong></div>
      <div className="brief-paper-edge" aria-hidden />
    </div>
    <div className="brief-next"><span className="brief-next-icon"><ArrowUpRight aria-hidden /></span><div><p className="brief-label">{t("entry.briefNext")}</p><p>{t("entry.briefReview")}</p></div><ArrowRight className="brief-next-arrow" aria-hidden /></div>
  </aside>;
}
