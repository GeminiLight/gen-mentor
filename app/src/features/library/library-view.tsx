"use client";

import { BookOpen } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useT } from "@/lib/i18n";
import { useActiveGoal, useArchive } from "@/lib/store";
import { sessionMinutes, sessionUid } from "@/lib/store/derive";

/** Every document generated for the active goal, whether or not the session was completed. */
export function LibraryView() {
  const goal = useActiveGoal();
  const hydrated = useArchive((s) => s.hydrated);
  const { t } = useT();
  if (!hydrated) return <Skeleton className="h-64 rounded-xl" data-loading="" />;
  if (!goal) return <EmptyState title={t("common.noActiveGoal")} body={t("library.emptyGoalBody")} action={<Button asChild><Link href="/goals">{t("common.goToGoals")}</Link></Button>} />;

  const docs = goal.learning_path
    .map((s, i) => ({ session: s, index: i, state: goal.sessions[sessionUid(goal.id, i)] }))
    .filter((d) => d.state?.document);

  return (
    <>
      <PageHeader title={t("library.title")} />
      {docs.length === 0 ? (
        <EmptyState title={t("library.emptyTitle")} body={t("library.emptyBody")} action={<Button asChild><Link href="/learning-path">{t("library.openPath")}</Link></Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {docs.map(({ session, index, state }) => (
            <Link key={index} href={`/session/${index}`} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Card className="h-full transition-colors group-hover:border-foreground/20" data-testid="library-card">
                <CardHeader>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="size-3.5" aria-hidden /> {session.id}
                    {session.if_learned && <Badge className="ml-auto bg-success-soft text-success">{t("common.learned")}</Badge>}
                  </div>
                  <CardTitle className="leading-snug">{state!.document!.structure.title}</CardTitle>
                  <CardDescription className="line-clamp-3">{state!.document!.structure.overview}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="num">{t("library.points", { n: state!.knowledge_points?.length ?? 0 })}</span>
                  {(state!.knowledge_drafts?.some((d) => d.sources.length > 0) ?? false) && (
                    <span className="num">{t("library.sources", { n: state!.knowledge_drafts!.reduce((a, d) => a + d.sources.length, 0) })}</span>
                  )}
                  {state!.quiz_results && (
                    <span className="num">{t("library.quiz", { correct: state!.quiz_results.correct, answered: state!.quiz_results.answered })}</span>
                  )}
                  {sessionMinutes(state) > 0 && <span className="num">{t("common.minutes", { n: sessionMinutes(state) })}</span>}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
