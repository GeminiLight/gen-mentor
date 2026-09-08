"use client";

import Link from "next/link";
import { useState } from "react";
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
import { useActiveGoal, useArchive } from "@/lib/store";
import { masteryRate } from "@/lib/store/derive";
import { ArchivePanel } from "./archive-panel";

export function ProfileView() {
  const goal = useActiveGoal();
  const { hydrated, updateGoal, recordMastery } = useArchive();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (!hydrated) return <Skeleton className="h-64 rounded-xl" data-loading="" />;
  if (!goal) {
    return (
      <div className="space-y-6">
        <EmptyState title="No active goal" body="The learner profile is built during onboarding." action={<Button asChild><Link href="/onboarding">Start with a goal</Link></Button>} />
        <ArchivePanel />
      </div>
    );
  }
  const p = goal.learner_profile;

  const update = async () => {
    setBusy(true);
    try {
      const { learner_profile } = await api.profile({ mode: "update", learner_profile: p, learner_interactions: { additional_information: note.trim() }, learner_information: goal.learner_information });
      updateGoal(goal.id, { learner_profile });
      recordMastery(goal.id, masteryRate(learner_profile), learner_profile.cognitive_status.overall_progress);
      setNote("");
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Learner profile" title="How GenMentor sees you" description="Rebuilt by the profiler each time you complete a session. Tell it what it is missing." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Background</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>{p.learner_information}</p>
            <div>
              <p className="eyebrow">Goal</p>
              <p className="mt-1">{p.learning_goal}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cognitive status</CardTitle>
            <CardDescription>Overall progress {p.cognitive_status.overall_progress}%</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <p className="eyebrow">Mastered</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.cognitive_status.mastered_skills.length === 0 && <span className="text-muted-foreground">None yet</span>}
                {p.cognitive_status.mastered_skills.map((s) => (
                  <Badge key={s.name} className="bg-success-soft text-success">
                    {s.name} · {s.proficiency_level}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow">In progress</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.cognitive_status.in_progress_skills.map((s) => (
                  <Badge key={s.name} variant="outline">
                    {s.name} · {s.current_proficiency_level} → {s.required_proficiency_level}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Learning preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p>
              <span className="text-muted-foreground">Content style · </span>
              {p.learning_preferences.content_style}
            </p>
            <p>
              <span className="text-muted-foreground">Activity type · </span>
              {p.learning_preferences.activity_type}
            </p>
            {p.learning_preferences.additional_notes && <p className="text-muted-foreground">{p.learning_preferences.additional_notes}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Behavioral patterns</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm leading-relaxed">
            <p>{p.behavioral_patterns.system_usage_frequency}</p>
            <p>{p.behavioral_patterns.session_duration_engagement}</p>
            {p.behavioral_patterns.motivational_triggers && <p className="text-muted-foreground">{p.behavioral_patterns.motivational_triggers}</p>}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tell the profiler something</CardTitle>
            <CardDescription>New experience, a preference it got wrong, time you can commit. The whole profile is rebuilt with it.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="note" className="sr-only">
              Additional information
            </Label>
            <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} disabled={busy} placeholder="I finished a SQL course last month and prefer short sessions on weekday evenings." />
            <Button onClick={() => void update()} disabled={busy || note.trim().length < 8}>
              {busy ? "Updating…" : "Update profile"}
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
