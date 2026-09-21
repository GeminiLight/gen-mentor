"use client";

import { LibraryBig } from "lucide-react";

import { useRef, useState } from "react";
import { FeatureIcon } from "@/components/feature-icon";
import { LibraryToolbar, type LibraryFilter } from "./library-toolbar";
import { scoredCount } from "@/lib/quiz";
import { ArrowUpRight, BookOpen, Search, Clock3, ListChecks, Layers3 } from "lucide-react";
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
  const searchInput = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<LibraryFilter>("all");
  const goal = useActiveGoal();
  const hydrated = useArchive((s) => s.hydrated);
  const { t } = useT();
  if (!hydrated) return <Skeleton className="h-64 rounded-xl" data-loading="" />;
  if (!goal) return <EmptyState icon={LibraryBig} title={t("common.noActiveGoal")} body={t("library.emptyGoalBody")} action={<Button asChild><Link href="/goals">{t("common.goToGoals")}</Link></Button>} />;

  const docs = goal.learning_path
    .map((s, i) => ({ session: s, index: i, state: goal.sessions[sessionUid(goal.id, i)] }))
    .filter((d) => d.state?.document);

  const completed = docs.filter(({ session }) => session.if_learned).length;
  const counts = { all: docs.length, reading: docs.length - completed, completed };
  const matches = docs.filter(({ session, state }) =>
    (filter === "all" || (filter === "completed" ? session.if_learned : !session.if_learned)) &&
    `${session.title} ${state?.document?.structure.title} ${state?.document?.markdown}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return (
    <>
      <PageHeader icon={LibraryBig} title={t("library.title")} description={t("polish.libraryLede")} />
      {docs.length > 0 && <LibraryToolbar inputRef={searchInput} query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} counts={counts} matches={matches.length} />}
      {docs.length > 0 && matches.length === 0 && <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
        <FeatureIcon icon={Search} /><p className="text-sm text-muted-foreground">{t("polish.noSearch")}</p>
        <Button variant="outline" onClick={() => { setQuery(""); setFilter("all"); searchInput.current?.focus(); }}>{t("polish.resetFilters")}</Button>
      </div>}
      {docs.length === 0 ? (
        <EmptyState icon={LibraryBig} title={t("library.emptyTitle")} body={t("library.emptyBody")} action={<Button asChild><Link href="/learning-path">{t("library.openPath")}</Link></Button>} />
      ) : (
        <div className="grid gap-4 @2xl/workspace:grid-cols-2 @5xl/workspace:grid-cols-3">
          {matches.map(({ session, index, state }) => (
            <Link key={index} href={`/session/${index}`} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <Card className="h-full border border-border ring-0 shadow-xs transition-[border-color,box-shadow] group-hover:border-brand/30 group-hover:shadow-md [--card-spacing:--spacing(5)]" data-testid="library-card">
                <CardHeader className="gap-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FeatureIcon icon={BookOpen} className="size-10 rounded-lg" /> {t("entry.previewLesson", { n: index + 1 })}
                    {session.if_learned && <Badge className="ml-auto bg-success-soft text-success">{t("common.learned")}</Badge>}
                  </div>
                  <CardTitle className="text-lg leading-snug">{state!.document!.structure.title}</CardTitle>
                  <CardDescription className="line-clamp-3 leading-relaxed">{state!.document!.structure.overview}</CardDescription>
                </CardHeader>
                <CardContent className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
                  <span className="num inline-flex items-center gap-1.5"><Layers3 className="size-3.5" aria-hidden />{t("library.points", { n: state!.knowledge_points?.length ?? 0 })}</span>
                  {(state!.knowledge_drafts?.some((d) => d.sources.length > 0) ?? false) && (
                    <span className="num">{t("library.sources", { n: state!.knowledge_drafts!.reduce((a, d) => a + d.sources.length, 0) })}</span>
                  )}
                  {state!.quiz_results && scoredCount(state!.quiz_results) > 0 && (
                    <span className="num inline-flex items-center gap-1.5"><ListChecks className="size-3.5" aria-hidden />{t("library.quiz", { correct: state!.quiz_results.correct, answered: scoredCount(state!.quiz_results) })}</span>
                  )}
                  {sessionMinutes(state) > 0 && <span className="num inline-flex items-center gap-1.5"><Clock3 className="size-3.5" aria-hidden />{t("common.minutes", { n: sessionMinutes(state) })}</span>}
                  <ArrowUpRight className="ml-auto size-4 text-brand transition-transform motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5" aria-hidden />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
