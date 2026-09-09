"use client";

import { Pencil, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LevelSlider } from "@/components/ui/level-slider";
import { LEVEL_ORDER, type CurrentLevel } from "@/lib/schemas";
import { useT } from "@/lib/i18n";
import type { useOnboarding } from "./use-onboarding";

const LEVELS: CurrentLevel[] = ["unlearned", "beginner", "intermediate", "advanced"];
type Flow = ReturnType<typeof useOnboarding>;

export function StartingPointReview({ flow }: { flow: Flow }) {
  const { t } = useT();
  const { preview, review, editGoal, cancelEdit, saveGoal, changeLevel } = flow;
  const editing = review?.goal_draft !== undefined;
  const editable = !!review && !editing;
  return (
    <div className="space-y-8" data-testid="starting-point-review">
      <section className="space-y-3" aria-labelledby="refined-goal-label">
        <div className="flex items-center justify-between gap-3">
          <Label id="refined-goal-label" htmlFor={editing ? "refined-goal" : undefined} className="eyebrow">{t("onboarding.refinedGoal")}</Label>
          {!editing && <Button variant="ghost" size="sm" onClick={() => editGoal(preview.refined_goal ?? "")}><Pencil className="size-4" aria-hidden />{t("review.editGoal")}</Button>}
        </div>
        {editing ? (
          <div className="space-y-3">
            <Textarea id="refined-goal" value={review.goal_draft} onChange={(e) => editGoal(e.target.value)} rows={4} autoFocus aria-describedby="goal-edit-help" />
            <p id="goal-edit-help" className="text-xs text-muted-foreground">{t("review.goalEditHelp")}</p>
            <div className="flex flex-wrap gap-2"><Button onClick={saveGoal} disabled={!review.goal_draft?.trim()}>{t("review.saveGoal")}</Button><Button variant="ghost" onClick={cancelEdit}>{t("common.cancel")}</Button></div>
          </div>
        ) : <p className="max-w-(--w-measure) text-lg font-medium leading-relaxed break-words">{preview.refined_goal}</p>}
      </section>
      {preview.gaps && (
        <section aria-labelledby="skill-review-title" className="space-y-4">
          <div className="space-y-1"><h2 id="skill-review-title" className="text-base font-semibold">{t("onboarding.skillGap")}</h2><p className="text-sm text-muted-foreground">{t(editable ? "review.skillHelp" : "review.skillSummary")}</p></div>
          <ol className="divide-y border-y">
            {preview.gaps.map((g, i) => (
              <li key={g.name} className="grid gap-4 py-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-8" data-testid="skill-review-row">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="num pt-0.5 text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0"><h3 className="text-sm font-medium leading-relaxed break-words">{g.name}</h3>{!g.is_gap && <p className="mt-1 flex items-center gap-1 text-xs text-success"><Check className="size-3" aria-hidden />{t("review.targetMet")}</p>}</div>
                </div>
                {(["current_level", "required_level"] as const).map((field) => {
                  const label = t(field === "current_level" ? "review.currentLevel" : "review.targetLevel");
                  const level = g[field];
                  return (
                    <div key={field} className="min-w-0">
                      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium">{t(`levels.${level}`)}</span></div>
                      <LevelSlider value={LEVEL_ORDER[level]} min={field === "current_level" ? 0 : 1} label={`${g.name} · ${label}`} valueText={t(`levels.${level}`)} disabled={!editable} onChange={(value) => changeLevel(i, field, LEVELS[value])} />
                      <div className="flex justify-between text-xs text-muted-foreground" aria-hidden><span>{t(field === "current_level" ? "levels.unlearned" : "levels.beginner")}</span><span>{t("levels.advanced")}</span></div>
                    </div>
                  );
                })}
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
