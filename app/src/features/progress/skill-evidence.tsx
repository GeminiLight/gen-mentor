"use client";

import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { useT } from "@/lib/i18n";
import type { Goal } from "@/lib/store";
import { sessionUid } from "@/lib/store/derive";
import { skillKey, targetSkills } from "@/lib/store/learning-evidence";
import { reviewNeed } from "@/lib/quiz-review";

export function SkillEvidence({ goal }: { goal: Goal }) {
  const { t } = useT();
  return <section className="mt-12">
    <h2 className="text-lg font-semibold">{t("coach.skills")}</h2>
    <p className="mt-2 text-sm text-muted-foreground">{t("journey.targetHint")}</p>
    <ul className="mt-6 divide-y border-t border-b" data-testid="mastery-rings">
      {targetSkills(goal).map((skill) => {
        const lessons = goal.learning_path.map((session, index) => ({ session, index, state: goal.sessions[sessionUid(goal.id, index)] }))
          .filter(({ session }) => session.associated_skills.some((name) => skillKey(name) === skill.key) || session.desired_outcome_when_completed.some((o) => skillKey(o.name) === skill.key));
        const selected = lessons.find(({ state }) => reviewNeed(state).total > 0) ?? lessons.find(({ session }) => !session.if_learned) ?? lessons[0];
        const evidence = lessons.filter(({ state }) => state?.quiz_results).length;
        return <li key={skill.key} className="grid gap-3 py-5 @2xl/workspace:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1.5fr)] @2xl/workspace:gap-6">
          <div className="min-w-0"><h3 className="text-sm font-medium wrap-anywhere">{skill.name}</h3><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">{skill.mastered && <Check className="size-3.5" aria-hidden />}{t(skill.mastered ? "coach.reached" : "coach.inProgress")}</p></div>
          <div><p className="text-xs text-muted-foreground">{t("coach.current")} → {t("coach.target")}</p><p className="mt-1 text-sm">{t(`levels.${skill.current}`)} → {t(`levels.${skill.required}`)}</p></div>
          <div className="min-w-0"><p className="text-xs text-muted-foreground">{t(evidence ? "coach.evidenceCount" : "coach.noEvidenceSkill", { n: evidence })}</p>
            {selected ? <Link className="mt-1 inline-flex min-h-9 pointer-coarse:min-h-11 items-center gap-1 text-sm underline decoration-border underline-offset-4 hover:decoration-foreground" href={`/session/${selected.index}${reviewNeed(selected.state).total ? "#practice" : ""}`} aria-label={`${t("coach.openLesson")}: ${selected.session.title}`}><span className="line-clamp-2">{selected.session.title}</span><ArrowUpRight className="size-4 shrink-0" aria-hidden /></Link> : <p className="mt-1 text-sm">{t("coach.notScheduled")}</p>}
          </div>
        </li>;
      })}
    </ul>
  </section>;
}
