"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client";
import { useT } from "@/lib/i18n";
import { useActiveGoal, useArchive } from "@/lib/store";
import { masteryRate } from "@/lib/store/derive";
import { ArchivePanel } from "./archive-panel";
import { HabitsCard } from "./habits-card";

export function ProfileView() {
  const goal = useActiveGoal();
  const { hydrated, updateGoal, recordMastery } = useArchive();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const noteOk = note.trim().length >= 8;
  const noteInvalid = touched && !noteOk;
  const { t } = useT();
  if (!hydrated) return <Skeleton className="h-64 rounded-xl" data-loading="" />;
  if (!goal) {
    return (
      <div className="space-y-6">
        <EmptyState title={t("common.noActiveGoal")} body={t("profile.emptyBody")} action={<Button asChild><Link href="/onboarding">{t("common.startWithGoal")}</Link></Button>} />
        <ArchivePanel />
      </div>
    );
  }
  const p = goal.learner_profile;

  const update = async () => {
    if (!noteOk) {
      setTouched(true);
      noteRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      const { learner_profile } = await api.profile({ mode: "update", learner_profile: p, learner_interactions: { additional_information: note.trim() }, learner_information: goal.learner_information });
      updateGoal(goal.id, { learner_profile });
      recordMastery(goal.id, masteryRate(learner_profile), learner_profile.cognitive_status.overall_progress);
      setNote("");
      setTouched(false);
      toast.success(t("profile.updated"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("profile.updateFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={t("profile.title")} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.background")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>{p.learner_information}</p>
            <div>
              <p className="eyebrow">{t("profile.goal")}</p>
              <p className="mt-1">{p.learning_goal}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.cognitive")}</CardTitle>
            <CardDescription>{t("profile.overall", { n: p.cognitive_status.overall_progress })}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="eyebrow">{t("profile.mastered")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.cognitive_status.mastered_skills.length === 0 && <span className="text-muted-foreground">{t("profile.noneYet")}</span>}
                {p.cognitive_status.mastered_skills.map((s) => (
                  <Badge key={s.name} className="bg-success-soft text-success">
                    {s.name} · {t(`levels.${s.proficiency_level}`)}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow">{t("profile.inProgress")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.cognitive_status.in_progress_skills.map((s) => (
                  <Badge key={s.name} variant="outline">
                    {s.name} · {t(`levels.${s.current_proficiency_level}`)} → {t(`levels.${s.required_proficiency_level}`)}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("profile.preferences")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p>
              <span className="text-muted-foreground">{t("profile.contentStyle")} · </span>
              {p.learning_preferences.content_style}
            </p>
            <p>
              <span className="text-muted-foreground">{t("profile.activityType")} · </span>
              {p.learning_preferences.activity_type}
            </p>
            {p.learning_preferences.additional_notes && <p className="text-muted-foreground">{p.learning_preferences.additional_notes}</p>}
          </CardContent>
        </Card>
        <HabitsCard goal={goal} />
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("profile.tellTitle")}</CardTitle>
            <CardDescription>{t("profile.tellLede")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="note" className="sr-only">
              {t("profile.tellLabel")}
            </Label>
            <Textarea
              ref={noteRef}
              id="note"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              placeholder={t("profile.tellPlaceholder")}
              aria-invalid={noteInvalid || undefined}
              aria-describedby={noteInvalid ? "note-error" : undefined}
            />
            {noteInvalid && (
              <p id="note-error" className="text-xs text-destructive" role="alert">
                {t("profile.tellRequired")}
              </p>
            )}
            <Button onClick={() => void update()} disabled={busy}>
              {busy ? t("profile.updating") : t("profile.update")}
            </Button>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <ArchivePanel />
        </div>
      </div>
    </>
  );
}
